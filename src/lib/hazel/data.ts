// Static data for HazelPay
export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const CARD_THEMES = [
  { bg: 'linear-gradient(135deg,#1e293b,#0f172a,#020617)', label: 'Obsidian' },
  { bg: 'linear-gradient(135deg,#2563eb,#4338ca,#3730a3)', label: 'Royal' },
  { bg: 'linear-gradient(135deg,#9333ea,#7c3aed,#6d28d9)', label: 'Violet' },
  { bg: 'linear-gradient(135deg,#059669,#0d9488,#0f766e)', label: 'Emerald' },
  { bg: 'linear-gradient(135deg,#e11d48,#be123c,#9f1239)', label: 'Rose' },
  { bg: 'linear-gradient(135deg,#f59e0b,#ea580c,#dc2626)', label: 'Sunset' },
];

export const PAY_METHODS = [
  { id:'payshap', name:'PayShap', sub:'SA Instant Pay', icon:'Building', color:'rgba(52,211,153,0.12)', ic:'#34d399', cur:'ZAR', sym:'R' },
  { id:'mobile_money', name:'Mobile Money', sub:'MTN, Vodacom & more', icon:'Phone', color:'rgba(96,165,250,0.12)', ic:'#60a5fa', cur:'ZAR', sym:'R' },
  { id:'stellar', name:'Stellar P2P', sub:'XLM to XLM', icon:'Star', color:'rgba(192,132,252,0.12)', ic:'#c084fc', cur:'XLM', sym:'XLM' },
  { id:'usdt', name:'USDT', sub:'Tether', icon:'Coins', color:'rgba(52,211,153,0.12)', ic:'#34d399', cur:'USDT', sym:'₮' },
  { id:'xrp', name:'XRP', sub:'Ripple', icon:'ArrowLeftRight', color:'rgba(255,255,255,0.08)', ic:'#94a3b8', cur:'XRP', sym:'XRP' },
  { id:'xlm', name:'XLM', sub:'Stellar Lumens', icon:'Star', color:'rgba(99,102,241,0.12)', ic:'#818cf8', cur:'XLM', sym:'XLM' },
];

export const CRYPTO = [
  { id:'btc', name:'Bitcoin', sym:'BTC', clr:'#f7931a', price:104250, chg:2.45, bal:0.0234 },
  { id:'eth', name:'Ethereum', sym:'ETH', clr:'#627eea', price:2540.91, chg:-1.23, bal:1.2456 },
  { id:'xlm', name:'Stellar', sym:'XLM', clr:'#818cf8', price:0.0892, chg:3.67, bal:12450 },
  { id:'xrp', name:'Ripple', sym:'XRP', clr:'#94a3b8', price:2.18, chg:1.12, bal:3200 },
  { id:'usdc', name:'USDC', sym:'USDC', clr:'#60a5fa', price:1.00, chg:0.01, bal:5420 },
  { id:'usdt', name:'Tether', sym:'USDT', clr:'#34d399', price:1.00, chg:0.01, bal:320.5 },
  { id:'ada', name:'Cardano', sym:'ADA', clr:'#818cf8', price:0.45, chg:-2.18, bal:890 },
  { id:'hbar', name:'Hedera', sym:'HBAR', clr:'#94a3b8', price:0.32, chg:5.44, bal:15000 },
  { id:'xvg', name:'Verge', sym:'XVG', clr:'#00d3c9', price:0.0084, chg:4.21, bal:25000 },
  { id:'qnt', name:'Quant', sym:'QNT', clr:'#ff7a00', price:115.42, chg:-0.84, bal:12.5 },
];

export const SEARCH_USERS = [
  { id:101, name:'Ama Osei', ini:'AO', email:'ama@gmail.com', ph:'+233 24 555 1234', uid:'@amaosei', g:'from-teal-400 to-cyan-500' },
  { id:102, name:'Kofi Boateng', ini:'KB', email:'kofi.b@yahoo.com', ph:'+233 20 666 7890', uid:'@kboating', g:'from-orange-400 to-red-500' },
  { id:103, name:'Abena Darko', ini:'AD', email:'abena.d@outlook.com', ph:'+233 50 111 2233', uid:'@abenadarko', g:'from-pink-400 to-fuchsia-500' },
  { id:104, name:'Yaw Adjei', ini:'YA', email:'yaw.a@gmail.com', ph:'+233 27 888 4455', uid:'@yawadjei', g:'from-indigo-400 to-blue-500' },
  { id:105, name:'Efua Mensah', ini:'EM', email:'efua.m@lumens.app', ph:'+233 53 222 3344', uid:'@efuamensah', g:'from-rose-400 to-pink-500' },
];

export const GRAD_MAP: Record<string,string> = {
  'from-teal-400 to-cyan-500':'linear-gradient(135deg,#2dd4bf,#06b6d4)',
  'from-orange-400 to-red-500':'linear-gradient(135deg,#fb923c,#ef4444)',
  'from-pink-400 to-fuchsia-500':'linear-gradient(135deg,#f472b6,#d946ef)',
  'from-indigo-400 to-blue-500':'linear-gradient(135deg,#818cf8,#3b82f6)',
  'from-rose-400 to-pink-500':'linear-gradient(135deg,#fb7185,#ec4899)',
  'from-emerald-400 to-teal-500':'linear-gradient(135deg,#34d399,#14b8a6)',
  'from-amber-400 to-yellow-500':'linear-gradient(135deg,#fbbf24,#eab308)',
  'from-cyan-400 to-blue-500':'linear-gradient(135deg,#22d3ee,#3b82f6)',
  'from-lime-400 to-green-500':'linear-gradient(135deg,#a3e635,#22c55e)',
  'from-blue-400 to-indigo-500':'linear-gradient(135deg,#60a5fa,#6366f1)',
};

// All world currencies (subset of ISO 4217, common ones)
export type Currency = { code: string; name: string; symbol: string };
export const CURRENCIES: Currency[] = [
  { code:'ZAR', name:'South African Rand', symbol:'R' },
  { code:'USD', name:'US Dollar', symbol:'$' },
  { code:'EUR', name:'Euro', symbol:'€' },
  { code:'GBP', name:'British Pound', symbol:'£' },
  { code:'JPY', name:'Japanese Yen', symbol:'¥' },
  { code:'CNY', name:'Chinese Yuan', symbol:'¥' },
  { code:'INR', name:'Indian Rupee', symbol:'₹' },
  { code:'AUD', name:'Australian Dollar', symbol:'A$' },
  { code:'CAD', name:'Canadian Dollar', symbol:'C$' },
  { code:'CHF', name:'Swiss Franc', symbol:'CHF' },
  { code:'HKD', name:'Hong Kong Dollar', symbol:'HK$' },
  { code:'SGD', name:'Singapore Dollar', symbol:'S$' },
  { code:'NZD', name:'New Zealand Dollar', symbol:'NZ$' },
  { code:'SEK', name:'Swedish Krona', symbol:'kr' },
  { code:'NOK', name:'Norwegian Krone', symbol:'kr' },
  { code:'DKK', name:'Danish Krone', symbol:'kr' },
  { code:'KRW', name:'South Korean Won', symbol:'₩' },
  { code:'MXN', name:'Mexican Peso', symbol:'Mex$' },
  { code:'BRL', name:'Brazilian Real', symbol:'R$' },
  { code:'ARS', name:'Argentine Peso', symbol:'$' },
  { code:'CLP', name:'Chilean Peso', symbol:'$' },
  { code:'COP', name:'Colombian Peso', symbol:'$' },
  { code:'PEN', name:'Peruvian Sol', symbol:'S/' },
  { code:'TRY', name:'Turkish Lira', symbol:'₺' },
  { code:'RUB', name:'Russian Ruble', symbol:'₽' },
  { code:'AED', name:'UAE Dirham', symbol:'د.إ' },
  { code:'SAR', name:'Saudi Riyal', symbol:'﷼' },
  { code:'QAR', name:'Qatari Riyal', symbol:'﷼' },
  { code:'KWD', name:'Kuwaiti Dinar', symbol:'د.ك' },
  { code:'EGP', name:'Egyptian Pound', symbol:'£' },
  { code:'NGN', name:'Nigerian Naira', symbol:'₦' },
  { code:'GHS', name:'Ghanaian Cedi', symbol:'₵' },
  { code:'KES', name:'Kenyan Shilling', symbol:'KSh' },
  { code:'UGX', name:'Ugandan Shilling', symbol:'USh' },
  { code:'TZS', name:'Tanzanian Shilling', symbol:'TSh' },
  { code:'MAD', name:'Moroccan Dirham', symbol:'د.م.' },
  { code:'DZD', name:'Algerian Dinar', symbol:'د.ج' },
  { code:'TND', name:'Tunisian Dinar', symbol:'د.ت' },
  { code:'XOF', name:'West African CFA', symbol:'CFA' },
  { code:'XAF', name:'Central African CFA', symbol:'FCFA' },
  { code:'BWP', name:'Botswana Pula', symbol:'P' },
  { code:'NAD', name:'Namibian Dollar', symbol:'N$' },
  { code:'ZMW', name:'Zambian Kwacha', symbol:'ZK' },
  { code:'MZN', name:'Mozambican Metical', symbol:'MT' },
  { code:'PHP', name:'Philippine Peso', symbol:'₱' },
  { code:'THB', name:'Thai Baht', symbol:'฿' },
  { code:'IDR', name:'Indonesian Rupiah', symbol:'Rp' },
  { code:'MYR', name:'Malaysian Ringgit', symbol:'RM' },
  { code:'VND', name:'Vietnamese Dong', symbol:'₫' },
  { code:'PKR', name:'Pakistani Rupee', symbol:'₨' },
  { code:'BDT', name:'Bangladeshi Taka', symbol:'৳' },
  { code:'LKR', name:'Sri Lankan Rupee', symbol:'₨' },
  { code:'PLN', name:'Polish Zloty', symbol:'zł' },
  { code:'CZK', name:'Czech Koruna', symbol:'Kč' },
  { code:'HUF', name:'Hungarian Forint', symbol:'Ft' },
  { code:'RON', name:'Romanian Leu', symbol:'lei' },
  { code:'BGN', name:'Bulgarian Lev', symbol:'лв' },
  { code:'UAH', name:'Ukrainian Hryvnia', symbol:'₴' },
  { code:'ILS', name:'Israeli Shekel', symbol:'₪' },
  { code:'JOD', name:'Jordanian Dinar', symbol:'د.ا' },
  { code:'LBP', name:'Lebanese Pound', symbol:'ل.ل' },
  { code:'IQD', name:'Iraqi Dinar', symbol:'ع.د' },
  { code:'IRR', name:'Iranian Rial', symbol:'﷼' },
];

export const LANGUAGES: { code: string; name: string; native: string }[] = ([
  { code:'af', name:'Afrikaans', native:'Afrikaans' },
  { code:'am', name:'Amharic', native:'አማርኛ' },
  { code:'ar', name:'Arabic', native:'العربية' },
  { code:'zh', name:'Chinese', native:'中文' },
  { code:'nl', name:'Dutch', native:'Nederlands' },
  { code:'en', name:'English', native:'English' },
  { code:'fr', name:'French', native:'Français' },
  { code:'de', name:'German', native:'Deutsch' },
  { code:'ha', name:'Hausa', native:'Hausa' },
  { code:'hi', name:'Hindi', native:'हिन्दी' },
  { code:'ig', name:'Igbo', native:'Igbo' },
  { code:'it', name:'Italian', native:'Italiano' },
  { code:'ja', name:'Japanese', native:'日本語' },
  { code:'ko', name:'Korean', native:'한국어' },
  { code:'pt', name:'Portuguese', native:'Português' },
  { code:'ru', name:'Russian', native:'Русский' },
  { code:'st', name:'Sotho', native:'Sesotho' },
  { code:'es', name:'Spanish', native:'Español' },
  { code:'sw', name:'Swahili', native:'Kiswahili' },
  { code:'sv', name:'Swedish', native:'Svenska' },
  { code:'tn', name:'Tswana', native:'Setswana' },
  { code:'tr', name:'Turkish', native:'Türkçe' },
  { code:'xh', name:'Xhosa', native:'isiXhosa' },
  { code:'yo', name:'Yoruba', native:'Yorùbá' },
  { code:'zu', name:'Zulu', native:'isiZulu' },
] as { code: string; name: string; native: string }[]).slice().sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_INCOME_CATS = [
  { id:'salary', name:'Salary', icon:'Briefcase', color:'#34d399' },
  { id:'freelance', name:'Freelance', icon:'Code', color:'#c084fc' },
  { id:'investment', name:'Investments', icon:'TrendingUp', color:'#5eead4' },
  { id:'gift', name:'Gifts', icon:'Gift', color:'#fbbf24' },
  { id:'other_in', name:'Other', icon:'Plus', color:'#60a5fa' },
];

export const DEFAULT_EXPENSE_CATS = [
  { id:'food', name:'Food & Drink', icon:'Coffee', color:'#fb923c', budget: 800 },
  { id:'shopping', name:'Shopping', icon:'ShoppingBag', color:'#f87171', budget: 1200 },
  { id:'transport', name:'Transport', icon:'Car', color:'#94a3b8', budget: 400 },
  { id:'subs', name:'Subscriptions', icon:'Music', color:'#c084fc', budget: 350 },
  { id:'bills', name:'Bills & Utilities', icon:'Receipt', color:'#5eead4', budget: 600 },
  { id:'entertainment', name:'Entertainment', icon:'PlayCircle', color:'#fbbf24', budget: 250 },
];

// Demo transactions across several months
export const SEED_TXS = [
  { name:'Shopping', cat:'shopping', icon:'ShoppingBag', ibg:'rgba(248,113,113,0.12)', ic:'#f87171', date:'2024-12-15', amt:-344.93 },
  { name:'Salary Deposit', cat:'salary', icon:'Building2', ibg:'rgba(52,211,153,0.12)', ic:'#34d399', date:'2024-12-14', amt:8500 },
  { name:'Starbucks', cat:'food', icon:'Coffee', ibg:'rgba(96,165,250,0.12)', ic:'#60a5fa', date:'2024-12-14', amt:-12.50 },
  { name:'Netflix', cat:'subs', icon:'PlayCircle', ibg:'rgba(248,113,113,0.12)', ic:'#f87171', date:'2024-12-13', amt:-15.99 },
  { name:'Uber Ride', cat:'transport', icon:'Car', ibg:'rgba(255,255,255,0.06)', ic:'#94a3b8', date:'2024-12-12', amt:-24.50 },
  { name:'Freelance Project', cat:'freelance', icon:'Code', ibg:'rgba(192,132,252,0.12)', ic:'#c084fc', date:'2024-12-11', amt:1200 },
  { name:'Groceries', cat:'food', icon:'ShoppingCart', ibg:'rgba(52,211,153,0.12)', ic:'#34d399', date:'2024-12-10', amt:-87.32 },
  { name:'Spotify', cat:'subs', icon:'Music', ibg:'rgba(192,132,252,0.12)', ic:'#c084fc', date:'2024-12-08', amt:-9.99 },
  { name:'Electric bill', cat:'bills', icon:'Receipt', ibg:'rgba(94,234,212,0.12)', ic:'#5eead4', date:'2024-12-05', amt:-180 },
  { name:'Cinema', cat:'entertainment', icon:'PlayCircle', ibg:'rgba(251,191,36,0.12)', ic:'#fbbf24', date:'2024-12-03', amt:-45 },
  { name:'Salary Deposit', cat:'salary', icon:'Building2', ibg:'rgba(52,211,153,0.12)', ic:'#34d399', date:'2024-11-14', amt:8500 },
  { name:'Zara', cat:'shopping', icon:'ShoppingBag', ibg:'rgba(248,113,113,0.12)', ic:'#f87171', date:'2024-11-21', amt:-520 },
  { name:'Restaurant', cat:'food', icon:'Coffee', ibg:'rgba(251,146,60,0.12)', ic:'#fb923c', date:'2024-11-19', amt:-78 },
  { name:'Bus pass', cat:'transport', icon:'Car', ibg:'rgba(255,255,255,0.06)', ic:'#94a3b8', date:'2024-11-02', amt:-60 },
];

export const fmtM = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtCard = (n: string) => n.replace(/(.{4})/g, '$1 ').trim();