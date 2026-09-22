# Real screens, a real marketing site, and going live

Four pieces of work, in an order where each one builds on the last.

## 1. Real app screens on the landing page

Sign into the app inside a test browser on your account, then photograph three
screens at phone size: the wallet home, a chat conversation, and analytics.
Those three images replace the drawn mockups in the landing page slider, and the
slider captions are updated to match what each screen actually shows.

If a screen needs data to look right (for example an empty chat), I use your own
account's real content and avoid anything that would expose private details —
no contact names, phone numbers or email addresses in the captured frames.

## 2. Turn the marketing site into real pages

Today the whole marketing site lives inside a single embedded file, and every
section (How It Works, Pricing, About, Contact, Careers, Roadmap, Terms, Privacy,
Legal) is just a hidden panel on one address. Search engines see almost nothing,
which is the last open search finding.

I will give each section its own real address:

`/how-it-works`, `/pricing`, `/about`, `/contact`, `/careers`, `/roadmap`,
`/terms`, `/privacy`, `/legal`, with the home page staying at `/`.

The existing design, wording, header, footer and styling are kept exactly as they
are — the content moves out of the embedded frame and into the page itself so it
is readable by Google and shareable as links. Each page gets its own title and
description for search and social previews.

Then:
- the sitemap lists every one of those addresses plus `/waitlist` and `/app`
- the Terms and Privacy links on the sign-in screen point to `/terms` and
  `/privacy` instead of a fragment link
- the site's own menus and footer link to the new addresses

## 3. Publish

Publish the project so the new pages, the sitemap and the crawler file are live
on lumens.money.

## 4. Google Search Console

Submit the sitemap. This one needs you: connecting Search Console requires you to
authorise your Google account, so I will start it and hand you the approval step.

## Already checked

Your database is awake and healthy, so sign-in and data requests load normally.
On your account (wuversburg@gmail.com): 513 records stored, the newest from
21 September, 42 receipt photos, and all 19 of your categories (6 income,
13 expense) are present and every record still points at a category that exists —
nothing was lost.

## Technical notes

- Marketing sections are extracted from `public/marketing.html` into per-route
  components under `src/routes/`, sharing an extracted stylesheet and
  header/footer components, so markup is server-rendered rather than iframed.
  `src/routes/index.tsx` stops rendering the iframe.
- Screens captured with Playwright against `localhost:8080/app` using a restored
  Supabase session, saved into `public/screens/`.
- `public/sitemap.xml` rewritten with the full route list; `public/robots.txt`
  keeps its sitemap directive.
- Search Console submission via the Google Search Console tooling, which
  requires user OAuth.
