#!/usr/bin/env node
/**
 * Security regression suite. Run with `bun run security:check`.
 *
 * Two layers:
 *  1) Client-attack assertions via the anon Supabase key — confirms RLS still
 *     blocks every known-bad request (direct wallet UPDATE, broad profile
 *     read, audit-log tampering, etc.).
 *  2) SQL invariants run with the service-role key, via psql when $PGHOST is
 *     set — catches `search_path` regressions on `public.*` functions and
 *     missing append-only triggers on `audit_events`.
 *
 * Exits non-zero on the first failure so it can gate CI / pre-deploy.
 */
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function readEnvFile() {
  const p = path.join(process.cwd(), '.env');
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}
const env = { ...readEnvFile(), ...process.env };
const URL = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!URL || !ANON) {
  console.error('FAIL: missing SUPABASE URL / anon key in environment');
  process.exit(2);
}

const supa = createClient(URL, ANON, { auth: { persistSession: false } });

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  const tag = ok ? '\u2713 PASS' : '\u2717 FAIL';
  console.log(`${tag} ${name}${detail ? ' — ' + detail : ''}`);
}

async function expectErrorOrEmpty(name, promise, allow = []) {
  const { data, error } = await promise;
  if (error) return record(name, true, `blocked: ${error.code || error.message}`);
  if (Array.isArray(data) && data.length === 0) return record(name, true, 'empty result (RLS-filtered)');
  if (allow.includes('row') && data) return record(name, true, 'allowed by policy (expected)');
  record(name, false, `unexpected success: ${JSON.stringify(data).slice(0, 120)}`);
}

// --- Layer 1: anon-attack RLS checks ---------------------------------------
await expectErrorOrEmpty(
  'anon cannot read profiles',
  supa.from('profiles').select('id, phone, dob').limit(1),
);
await expectErrorOrEmpty(
  'anon cannot UPDATE any wallet balance',
  supa.from('domicile_wallets').update({ balance: 999999999 }).neq('user_id', '00000000-0000-0000-0000-000000000000').select(),
);
await expectErrorOrEmpty(
  'anon cannot INSERT into audit_events',
  supa.from('audit_events').insert({ kind: 'tamper', meta: {}, prev_hash: '0', hash: '0' }).select(),
);
await expectErrorOrEmpty(
  'anon cannot DELETE audit_events',
  supa.from('audit_events').delete().neq('id', 0).select(),
);
await expectErrorOrEmpty(
  'anon cannot read user_roles',
  supa.from('user_roles').select('*').limit(1),
);
await expectErrorOrEmpty(
  'anon cannot read messages',
  supa.from('messages').select('id, ciphertext').limit(1),
);

// wallet_deposit RPC must reject anon / invalid amounts
{
  const { error } = await supa.rpc('wallet_deposit', { p_amount: 100 });
  record('anon cannot call wallet_deposit', !!error, error ? error.message : 'no error returned');
}

// --- Layer 2: schema invariants via psql (if available) ---------------------
function tryPsql(sql) {
  try {
    const flat = sql.replace(/\s+/g, ' ').trim();
    const out = execSync(`psql -t -A -c ${JSON.stringify(flat)}`, {
      stdio: ['ignore', 'pipe', 'pipe'], env: process.env, encoding: 'utf8',
    });
    return { ok: true, out: out.trim() };
  } catch (err) {
    return { ok: false, out: String(err.stderr || err.message) };
  }
}

const probe = tryPsql('select 1');
if (probe.ok) {
  const r1 = tryPsql(`
    SELECT count(*) FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND NOT (p.proconfig::text LIKE '%search_path=%')
  `);
  record('all public.* functions have search_path set', r1.ok && r1.out === '0', `${r1.out}`);

  const r2 = tryPsql(`SELECT count(*) FROM pg_trigger WHERE tgrelid = 'public.audit_events'::regclass AND NOT tgisinternal`);
  record('audit_events has append-only triggers', r2.ok && Number(r2.out) >= 2, `triggers=${r2.out}`);

  const r3 = tryPsql(`
    SELECT count(*) FROM pg_policy
    WHERE polrelid = 'public.profiles'::regclass
      AND polname = 'Authenticated can read public profile fields'
  `);
  record('no blanket profile-read policy', r3.ok && r3.out === '0', `matches=${r3.out}`);

  const r4 = tryPsql(`
    SELECT count(*) FROM pg_policy
    WHERE polrelid = 'public.domicile_wallets'::regclass AND polcmd = 'w'
  `);
  record('no client UPDATE policy on domicile_wallets', r4.ok && r4.out === '0', `policies=${r4.out}`);
} else {
  console.log('\u2139  skipping SQL invariants (no PGHOST/psql); run with the project DB env to enable.');
}

// --- Result ----------------------------------------------------------------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.error('SECURITY REGRESSION FAILED');
  process.exit(1);
}