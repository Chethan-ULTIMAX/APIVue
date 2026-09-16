import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const BRIDGE_ID = 'apivue-public-explore-bridge';
const STYLE_ID = 'apivue-public-explore-bridge-styles';

function buildBridge(): HTMLElement {
  const wrapper = document.createElement('section');
  wrapper.id = BRIDGE_ID;
  wrapper.className = 'apivue-explore-bridge';
  wrapper.setAttribute('aria-labelledby', 'apivue-explore-bridge-title');
  wrapper.innerHTML = `
    <div class="apivue-explore-bridge-orb apivue-explore-bridge-orb-a"></div>
    <div class="apivue-explore-bridge-orb apivue-explore-bridge-orb-b"></div>
    <div class="apivue-explore-bridge-grid"></div>
    <div class="apivue-explore-preview" aria-hidden="true">
      <div class="apivue-preview-top"><span class="apivue-preview-dot"></span><span></span><span></span><span></span><i></i></div>
      <div class="apivue-preview-body"><aside><b></b><b></b><b></b><b></b><b></b></aside><main>
        <div class="apivue-preview-heading"><small>PUBLIC DATA EXPLORER</small><strong>Explore a developer profile.</strong><em></em></div>
        <div class="apivue-preview-platforms"><span>◉ GitHub</span><span>◇ Codeforces</span><span>⌘ LeetCode</span><span>✦ Codewars</span><span>▦ Stack Overflow</span></div>
        <div class="apivue-preview-panels"><div><i></i><i></i><i></i><i></i></div><div><u></u><u></u><u></u><u></u></div></div>
        <div class="apivue-preview-line"></div>
      </main></div>
    </div>
    <div class="apivue-explore-bridge-content">
      <span class="apivue-explore-kicker">NO ACCOUNT REQUIRED</span>
      <h2 id="apivue-explore-bridge-title">Explore APIVue for free.</h2>
      <p>Try real public developer data before you sign in. Pick a platform, search a profile, and see what APIVue can discover.</p>
      <a class="apivue-explore-button" href="/explore"><span>✦</span><strong>Explore for free</strong><b>→</b></a>
      <div class="apivue-explore-meta"><span>Live public data</span><span>5 platforms</span><span>No connection required</span></div>
    </div>
    <div class="apivue-explore-scan"></div>
  `;
  return wrapper;
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.apivue-explore-bridge{position:relative;isolation:isolate;min-height:700px;overflow:hidden;display:grid;place-items:center;padding:110px 24px;background:linear-gradient(180deg,#090a10,#07080d 55%,#090a10);border-top:1px solid rgba(167,139,250,.08);border-bottom:1px solid rgba(167,139,250,.08)}
.apivue-explore-bridge-grid{position:absolute;inset:0;opacity:.16;background-image:linear-gradient(rgba(148,163,184,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.08) 1px,transparent 1px);background-size:52px 52px;mask-image:radial-gradient(circle at center,#000,transparent 72%);pointer-events:none}
.apivue-explore-bridge-orb{position:absolute;border-radius:999px;filter:blur(70px);pointer-events:none;z-index:-1}.apivue-explore-bridge-orb-a{width:520px;height:520px;left:-180px;top:80px;background:rgba(124,58,237,.14);animation:apivueBridgeFloatA 9s ease-in-out infinite}.apivue-explore-bridge-orb-b{width:460px;height:460px;right:-160px;bottom:-40px;background:rgba(59,130,246,.10);animation:apivueBridgeFloatB 11s ease-in-out infinite}
.apivue-explore-preview{position:absolute;left:5vw;right:5vw;top:72px;height:470px;border:1px solid rgba(167,139,250,.13);border-radius:30px;background:linear-gradient(145deg,rgba(23,25,34,.72),rgba(10,12,18,.78));box-shadow:0 35px 100px rgba(0,0,0,.36),0 0 80px rgba(124,58,237,.07);backdrop-filter:blur(12px);transform:perspective(1400px) rotateX(2deg) scale(.98);opacity:.72;filter:blur(1.1px);overflow:hidden;transition:filter .45s ease,transform .45s ease,opacity .45s ease}.apivue-explore-bridge:hover .apivue-explore-preview{filter:blur(.35px);opacity:.86;transform:perspective(1400px) rotateX(0deg) scale(.985)}
.apivue-preview-top{height:42px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:7px;padding:0 18px}.apivue-preview-top span{width:7px;height:7px;border-radius:99px;background:rgba(148,163,184,.28)}.apivue-preview-top .apivue-preview-dot{background:#8b5cf6;box-shadow:0 0 14px #8b5cf6}.apivue-preview-top i{margin-left:auto;width:150px;height:8px;border-radius:99px;background:rgba(148,163,184,.09)}
.apivue-preview-body{display:grid;grid-template-columns:100px 1fr;height:calc(100% - 42px)}.apivue-preview-body aside{border-right:1px solid rgba(255,255,255,.05);padding:34px 20px}.apivue-preview-body aside b{display:block;height:10px;margin-bottom:20px;border-radius:5px;background:rgba(148,163,184,.10)}.apivue-preview-body aside b:first-child{background:rgba(139,92,246,.32)}.apivue-preview-body main{padding:42px}.apivue-preview-heading small{display:block;color:#a78bfa;font-size:9px;letter-spacing:.2em;font-weight:700}.apivue-preview-heading strong{display:block;margin-top:10px;color:rgba(248,250,252,.82);font-size:27px;letter-spacing:-.04em}.apivue-preview-heading em{display:block;width:65%;height:9px;margin-top:12px;border-radius:99px;background:rgba(148,163,184,.10)}.apivue-preview-platforms{display:flex;gap:10px;flex-wrap:wrap;margin-top:38px}.apivue-preview-platforms span{padding:11px 14px;border:1px solid rgba(167,139,250,.10);border-radius:12px;background:rgba(255,255,255,.035);color:rgba(226,232,240,.52);font-size:10px}.apivue-preview-panels{display:grid;grid-template-columns:1.2fr .8fr;gap:14px;margin-top:24px}.apivue-preview-panels>div{height:125px;border:1px solid rgba(255,255,255,.06);border-radius:18px;padding:20px;background:rgba(255,255,255,.025)}.apivue-preview-panels i,.apivue-preview-panels u{display:block;text-decoration:none;height:9px;margin-bottom:15px;border-radius:99px;background:rgba(148,163,184,.09)}.apivue-preview-panels i:nth-child(2){width:78%;background:rgba(139,92,246,.22)}.apivue-preview-panels i:nth-child(3){width:58%}.apivue-preview-panels u{height:13px;margin-bottom:11px;background:linear-gradient(90deg,rgba(139,92,246,.30) 70%,rgba(148,163,184,.06) 70%)}.apivue-preview-line{width:80%;height:7px;margin-top:20px;border-radius:99px;background:linear-gradient(90deg,rgba(139,92,246,.25),rgba(59,130,246,.12),transparent);animation:apivuePreviewPulse 4s ease-in-out infinite}
.apivue-explore-bridge-content{position:relative;z-index:4;width:min(620px,100%);margin-top:135px;text-align:center;padding:42px 34px;border:1px solid rgba(196,181,253,.20);border-radius:30px;background:linear-gradient(145deg,rgba(15,17,26,.88),rgba(9,11,17,.82));box-shadow:0 30px 90px rgba(0,0,0,.44),0 0 75px rgba(124,58,237,.12),inset 0 1px 0 rgba(255,255,255,.07);backdrop-filter:blur(22px);transition:transform .35s cubic-bezier(.2,.8,.2,1),border-color .35s ease,box-shadow .35s ease}.apivue-explore-bridge:hover .apivue-explore-bridge-content{transform:translateY(-8px);border-color:rgba(196,181,253,.40);box-shadow:0 42px 110px rgba(0,0,0,.52),0 0 100px rgba(124,58,237,.18),inset 0 1px 0 rgba(255,255,255,.09)}
.apivue-explore-kicker{font-size:9px;letter-spacing:.22em;color:#a78bfa;font-weight:800}.apivue-explore-bridge-content h2{margin:12px 0 0;color:#f8fafc;font-size:clamp(32px,5vw,52px);line-height:1;letter-spacing:-.055em}.apivue-explore-bridge-content p{max-width:500px;margin:18px auto 0;color:#94a3b8;font-size:14px;line-height:1.7}.apivue-explore-button{position:relative;display:inline-flex;align-items:center;gap:12px;margin-top:28px;padding:14px 18px;border-radius:14px;border:1px solid rgba(196,181,253,.25);background:linear-gradient(135deg,#7c3aed,#5b21b6);color:#fff;text-decoration:none;box-shadow:0 15px 38px rgba(91,33,182,.30);overflow:hidden;transition:transform .25s ease,box-shadow .25s ease}.apivue-explore-button:before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.24) 50%,transparent 75%);transform:translateX(-100%);animation:apivueButtonShine 4.5s ease-in-out infinite}.apivue-explore-button:hover{transform:translateY(-3px);box-shadow:0 20px 48px rgba(91,33,182,.42)}.apivue-explore-button span,.apivue-explore-button strong,.apivue-explore-button b{position:relative}.apivue-explore-button strong{font-size:13px}.apivue-explore-button b{font-size:17px;font-weight:500}.apivue-explore-meta{display:flex;justify-content:center;gap:18px;flex-wrap:wrap;margin-top:20px;color:#64748b;font-size:10px}.apivue-explore-meta span:before{content:'•';margin-right:7px;color:#8b5cf6}.apivue-explore-scan{position:absolute;z-index:3;left:8%;right:8%;top:88px;height:1px;background:linear-gradient(90deg,transparent,rgba(167,139,250,.38),transparent);box-shadow:0 0 18px rgba(167,139,250,.22);animation:apivueScan 6s ease-in-out infinite;pointer-events:none}
@keyframes apivueBridgeFloatA{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,-35px)}}@keyframes apivueBridgeFloatB{0%,100%{transform:translate(0,0)}50%{transform:translate(-45px,25px)}}@keyframes apivuePreviewPulse{0%,100%{opacity:.35;transform:scaleX(.96);transform-origin:left}50%{opacity:.8;transform:scaleX(1)}}@keyframes apivueButtonShine{0%,55%{transform:translateX(-110%)}75%,100%{transform:translateX(110%)}}@keyframes apivueScan{0%,100%{transform:translateY(0);opacity:.2}50%{transform:translateY(420px);opacity:.65}}
@media(max-width:700px){.apivue-explore-bridge{min-height:620px;padding:80px 16px}.apivue-explore-preview{left:16px;right:16px;top:50px;height:390px}.apivue-preview-body{grid-template-columns:55px 1fr}.apivue-preview-body main{padding:24px}.apivue-preview-heading strong{font-size:20px}.apivue-preview-platforms span{padding:8px 9px;font-size:8px}.apivue-explore-bridge-content{margin-top:100px;padding:32px 20px}.apivue-explore-bridge-content h2{font-size:34px}}
html.apivue-landing-light .apivue-explore-bridge{background:linear-gradient(180deg,#f8f9fd,#eef0f8,#f8f9fd);border-color:rgba(99,102,241,.10)}html.apivue-landing-light .apivue-explore-bridge-grid{opacity:.22;background-image:linear-gradient(rgba(99,102,241,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.08) 1px,transparent 1px)}html.apivue-landing-light .apivue-explore-preview{background:linear-gradient(145deg,rgba(255,255,255,.82),rgba(242,244,250,.86));border-color:rgba(99,102,241,.14);box-shadow:0 35px 100px rgba(51,65,85,.13),0 0 80px rgba(99,102,241,.08)}html.apivue-landing-light .apivue-explore-bridge-content{background:linear-gradient(145deg,rgba(255,255,255,.91),rgba(248,249,253,.88));border-color:rgba(99,102,241,.20);box-shadow:0 30px 80px rgba(51,65,85,.15),0 0 75px rgba(99,102,241,.09),inset 0 1px 0 #fff}html.apivue-landing-light .apivue-explore-bridge-content h2{color:#171923}html.apivue-landing-light .apivue-explore-bridge-content p{color:#64748b}html.apivue-landing-light .apivue-preview-heading strong{color:#1e293b}html.apivue-landing-light .apivue-preview-platforms span{background:rgba(255,255,255,.65);color:#64748b;border-color:rgba(99,102,241,.10)}
@media(prefers-reduced-motion:reduce){.apivue-explore-bridge *{animation:none!important;transition:none!important}.apivue-explore-bridge:hover .apivue-explore-preview{transform:scale(.98)}}`;
  document.head.appendChild(style);
}

export function LandingExploreBridge() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (location.pathname !== '/') return;
    installStyles();
    const insert = () => {
      if (document.getElementById(BRIDGE_ID)) return true;
      const sections = Array.from(document.querySelectorAll<HTMLElement>('body.apivue-landing section'));
      const anchor = sections.find((section) => (section.textContent ?? '').includes('Your tools already contain the data'));
      if (!anchor?.parentElement) return false;
      const bridge = buildBridge();
      anchor.insertAdjacentElement('afterend', bridge);
      bridge.querySelector<HTMLAnchorElement>('.apivue-explore-button')?.addEventListener('click', (event) => { event.preventDefault(); navigate('/explore'); });
      return true;
    };
    if (!insert()) {
      const observer = new MutationObserver(() => { if (insert()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      const timeout = window.setTimeout(() => observer.disconnect(), 8000);
      return () => { observer.disconnect(); window.clearTimeout(timeout); document.getElementById(BRIDGE_ID)?.remove(); document.getElementById(STYLE_ID)?.remove(); };
    }
    return () => { document.getElementById(BRIDGE_ID)?.remove(); document.getElementById(STYLE_ID)?.remove(); };
  }, [location.pathname, navigate]);
  return null;
}
