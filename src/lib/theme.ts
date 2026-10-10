/** Shared look for the Aangan Studio pages (enquiry desk and performance dashboard). */
export const BASE_CSS = `
:root{--bg:#f6f2eb;--surface:#fffdf9;--ink:#2b2622;--mute:#7b7268;--line:#e8e0d4;--clay:#b5573a;--clay-soft:#f6e4dc;--sage:#58775c;--sage-soft:#e3eee4;--gold:#a97c2c;--gold-soft:#f6ecd6;--stone:#8b857b;--stone-soft:#eeeae3;--teal:#2d6a6a;--teal-soft:#dcecec;--shadow:0 1px 2px rgba(60,40,20,.05),0 6px 20px rgba(60,40,20,.05)}
@media (prefers-color-scheme:dark){:root{--bg:#171513;--surface:#211e1b;--ink:#f1ece4;--mute:#a39b90;--line:#38332d;--clay:#e08a6c;--clay-soft:#3a2620;--sage:#8fb494;--sage-soft:#22302a;--gold:#d9ae5c;--gold-soft:#352c19;--stone:#b0a99d;--stone-soft:#2b2824;--teal:#7fc0c0;--teal-soft:#1f3434;--shadow:0 1px 2px rgba(0,0,0,.3),0 6px 20px rgba(0,0,0,.25)}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 var(--font-sans),system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1040px;margin:0 auto;padding:28px 18px 72px}
.serif{font-family:var(--font-serif),Georgia,serif}
header.top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:22px}
.brand{display:flex;align-items:center;gap:12px}.mark{width:38px;height:38px;border-radius:50%;background:var(--ink);color:var(--bg);display:grid;place-items:center;font-family:var(--font-serif),serif;font-size:19px}
.brand b{display:block;font-family:var(--font-serif),serif;font-size:20px;font-weight:600;line-height:1.1}.brand span{color:var(--mute);font-size:12.5px;letter-spacing:.08em;text-transform:uppercase}
.today{color:var(--mute);font-size:13px}
.hero{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:26px 28px;box-shadow:var(--shadow);margin-bottom:18px}
.hero h1{font-family:var(--font-serif),serif;font-weight:500;font-size:30px;line-height:1.2;margin:0 0 6px;letter-spacing:-.01em}
.hero p{margin:0;color:var(--mute);max-width:62ch}
.hero.alert{border-left:5px solid var(--clay)}.hero.calm{border-left:5px solid var(--sage)}
.week{display:flex;gap:28px;flex-wrap:wrap;margin-top:18px;padding-top:16px;border-top:1px solid var(--line)}
.week div b{font-family:var(--font-serif),serif;font-size:26px;font-weight:500;display:block;line-height:1.1}.week div span{font-size:12.5px;color:var(--mute)}
h2{font-family:var(--font-serif),serif;font-weight:500;font-size:21px;margin:30px 0 4px}.lede{color:var(--mute);margin:0 0 14px;font-size:14px}
.empty{background:var(--surface);border:1px dashed var(--line);border-radius:16px;padding:42px 20px;text-align:center;color:var(--mute)}.empty b{display:block;font-family:var(--font-serif),serif;font-size:19px;color:var(--ink);margin-bottom:4px;font-weight:500}
footer{margin-top:34px;color:var(--mute);font-size:12.5px;text-align:center}
`;
