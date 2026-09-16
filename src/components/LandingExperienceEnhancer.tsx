import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/lib/theme-context';

const REPO_URL = 'https://github.com/Chethan-ULTIMAX/APIVue';

const LANDING_STYLE_ID = 'apivue-landing-experience-styles';

function textElement(text: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>('body.apivue-landing *')).find(
    (element) => element.children.length === 0 && element.textContent?.trim() === text,
  ) ?? null;
}

function nearestSurface(element: HTMLElement | null): HTMLElement | null {
  let current = element?.parentElement ?? null;
  while (current && current !== document.body) {
    const classes = typeof current.className === 'string' ? current.className : '';
    if (classes.includes('rounded-3xl') || classes.includes('rounded-2xl')) return current;
    current = current.parentElement;
  }
  return null;
}

function addLandingSurfaceClasses() {
  const selectors = [
    '[class*="bg-[#0d1117]"]',
    '[class*="bg-zinc-950"]',
    '[class*="bg-zinc-900"]',
    '[class*="bg-black"]',
    '[class*="bg-white/[0.0"]',
    '[class*="bg-white/5"]',
    '[class*="bg-white/[0.05]"]',
  ];

  document.querySelectorAll<HTMLElement>(`body.apivue-landing ${selectors.join(',')}`).forEach((element) => {
    element.classList.add('apivue-landing-surface');
  });

  const dashboardHeading = textElement('Your personal dashboard');
  nearestSurface(dashboardHeading)?.classList.add('apivue-demo-card');
}

function makeHeaderStar(): HTMLAnchorElement {
  const cta = document.createElement('a');
  cta.href = REPO_URL;
  cta.target = '_blank';
  cta.rel = 'noreferrer';
  cta.dataset.apivueHeaderStar = 'true';
  cta.className = 'apivue-header-star';
  cta.innerHTML = '<span class="apivue-header-star-icon" aria-hidden="true">☆</span><span>Star us</span><span class="apivue-header-star-arrow" aria-hidden="true">↗</span>';
  return cta;
}

function enhanceHeader(header: HTMLElement | null) {
  if (!header || header.querySelector('[data-apivue-header-star]')) return;

  const getStarted = textElement('Get started');
  const controls = getStarted?.parentElement ?? header.querySelector('.mx-auto > div:last-child');
  if (!controls) return;

  controls.classList.add('apivue-header-actions');
  controls.appendChild(makeHeaderStar());
}

function makeFooterStar(): HTMLAnchorElement {
  const cta = document.createElement('a');
  cta.href = REPO_URL;
  cta.target = '_blank';
  cta.rel = 'noreferrer';
  cta.dataset.apivueStar = 'true';
  cta.className = 'apivue-star-cta';
  cta.innerHTML = '<span class="apivue-star-icon" aria-hidden="true">★</span><span><strong>Star APIVue on GitHub</strong><small>Support the project and follow the build</small></span><span class="apivue-star-arrow" aria-hidden="true">↗</span>';
  return cta;
}

function enhanceFooter(footer: HTMLElement | null) {
  if (!footer) return;
  footer.classList.add('apivue-enhanced-footer');
  if (!footer.querySelector('[data-apivue-star]')) {
    const cta = makeFooterStar();
    (footer.querySelector('.mx-auto') ?? footer).appendChild(cta);
  }
}

function installStyles() {
  if (document.getElementById(LANDING_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = LANDING_STYLE_ID;
  style.textContent = `
    body.apivue-landing { background: #08090d; color: #f8fafc; }
    body.apivue-landing main { isolation: isolate; }
    body.apivue-landing header { transition: background .35s ease, border-color .35s ease, box-shadow .35s ease, backdrop-filter .35s ease; }
    body.apivue-landing .apivue-header-actions { align-items: center; }
    body.apivue-landing .apivue-header-star,
    body.apivue-landing .apivue-star-cta { text-decoration: none; }
    body.apivue-landing .apivue-header-star {
      position: relative; display: inline-flex; align-items: center; gap: 7px; min-height: 38px;
      padding: 0 13px; border: 1px solid rgba(167,139,250,.24); border-radius: 12px;
      background: linear-gradient(180deg, rgba(139,92,246,.15), rgba(139,92,246,.07));
      color: #f5f3ff; font-size: 12px; font-weight: 700; letter-spacing: -.01em;
      box-shadow: 0 8px 26px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.06);
      overflow: hidden; transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease, background .22s ease;
    }
    body.apivue-landing .apivue-header-star::before {
      content: ''; position: absolute; inset: -60%; background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,.18) 50%, transparent 62%);
      transform: translateX(-70%) rotate(8deg); transition: transform .55s ease;
    }
    body.apivue-landing .apivue-header-star:hover { transform: translateY(-2px); border-color: rgba(196,181,253,.62); box-shadow: 0 12px 32px rgba(124,58,237,.2), 0 0 0 1px rgba(167,139,250,.08) inset; }
    body.apivue-landing .apivue-header-star:hover::before { transform: translateX(70%) rotate(8deg); }
    body.apivue-landing .apivue-header-star > * { position: relative; z-index: 1; }
    body.apivue-landing .apivue-header-star-icon { font-size: 17px; line-height: 1; color: #c4b5fd; }
    body.apivue-landing .apivue-header-star-arrow { opacity: .55; }

    body.apivue-landing .apivue-header-scrolled {
      background: rgba(8,9,13,.78) !important; border-bottom-color: rgba(167,139,250,.16) !important;
      box-shadow: 0 12px 45px rgba(0,0,0,.22), 0 1px 0 rgba(255,255,255,.03) inset;
      backdrop-filter: blur(18px);
    }
    html.apivue-landing-light body.apivue-landing .apivue-header-scrolled {
      background: rgba(255,255,255,.82) !important; border-bottom-color: rgba(124,58,237,.14) !important;
      box-shadow: 0 12px 38px rgba(79,70,229,.10); backdrop-filter: blur(18px);
    }

    body.apivue-landing .apivue-landing-surface {
      background: linear-gradient(145deg, rgba(22,24,32,.92), rgba(12,14,20,.92)) !important;
      border-color: rgba(255,255,255,.09) !important;
      box-shadow: 0 18px 55px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.035);
      transition: transform .3s ease, border-color .3s ease, box-shadow .3s ease, background .3s ease;
    }
    body.apivue-landing .apivue-landing-surface:hover {
      transform: translateY(-5px); border-color: rgba(167,139,250,.28) !important;
      box-shadow: 0 24px 65px rgba(0,0,0,.28), 0 0 28px rgba(124,58,237,.08);
    }

    body.apivue-landing .apivue-demo-card {
      position: relative; isolation: isolate; overflow: hidden;
      background:
        radial-gradient(circle at 50% 0%, rgba(139,92,246,.20), transparent 42%),
        radial-gradient(circle at 12% 80%, rgba(59,130,246,.10), transparent 35%),
        linear-gradient(145deg, #12141b, #080a0f 72%) !important;
      border: 1px solid rgba(167,139,250,.20) !important;
      box-shadow: 0 30px 90px rgba(0,0,0,.42), 0 0 70px rgba(124,58,237,.10), inset 0 1px 0 rgba(255,255,255,.06) !important;
      transition: transform .45s cubic-bezier(.2,.75,.2,1), box-shadow .45s ease, border-color .45s ease;
    }
    body.apivue-landing .apivue-demo-card::before {
      content: ''; position: absolute; inset: 0; z-index: -1; pointer-events: none;
      background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,.035) 45%, transparent 62%);
      transform: translateX(-65%); animation: apivueDemoSheen 8s ease-in-out infinite;
    }
    body.apivue-landing .apivue-demo-card::after {
      content: ''; position: absolute; width: 260px; height: 260px; left: 50%; top: -150px; transform: translateX(-50%);
      border-radius: 999px; background: rgba(139,92,246,.16); filter: blur(70px); z-index: -1; pointer-events: none;
    }
    body.apivue-landing .apivue-demo-card:hover {
      transform: translateY(-8px) scale(1.008); border-color: rgba(196,181,253,.42) !important;
      box-shadow: 0 42px 105px rgba(0,0,0,.48), 0 0 90px rgba(124,58,237,.16), inset 0 1px 0 rgba(255,255,255,.08) !important;
    }
    @keyframes apivueDemoSheen { 0%, 55%, 100% { transform: translateX(-70%); opacity: 0; } 65% { opacity: 1; } 82% { transform: translateX(70%); opacity: .55; } }

    body.apivue-landing .apivue-enhanced-footer {
      position: relative; overflow: hidden; background: linear-gradient(180deg, #090a0e, #06070a) !important;
      border-top: 1px solid rgba(167,139,250,.10);
    }
    body.apivue-landing .apivue-enhanced-footer::before {
      content: ''; position: absolute; left: 50%; top: -180px; width: 720px; height: 360px; transform: translateX(-50%);
      border-radius: 999px; background: radial-gradient(circle, rgba(139,92,246,.16), transparent 68%); filter: blur(16px); pointer-events: none;
    }
    body.apivue-landing .apivue-star-cta {
      position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; margin-top: 26px; width: fit-content;
      padding: 13px 16px; border: 1px solid rgba(167,139,250,.20); border-radius: 16px;
      background: linear-gradient(135deg, rgba(139,92,246,.16), rgba(59,130,246,.07)); color: #f8fafc;
      box-shadow: 0 16px 45px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.05);
      transition: transform .25s ease, border-color .25s ease, box-shadow .25s ease;
    }
    body.apivue-landing .apivue-star-cta:hover { transform: translateY(-4px); border-color: rgba(196,181,253,.42); box-shadow: 0 24px 60px rgba(0,0,0,.25), 0 0 35px rgba(124,58,237,.12); }
    body.apivue-landing .apivue-star-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: rgba(139,92,246,.18); color: #c4b5fd; font-size: 17px; }
    body.apivue-landing .apivue-star-cta strong, body.apivue-landing .apivue-star-cta small { display: block; }
    body.apivue-landing .apivue-star-cta strong { font-size: 13px; }
    body.apivue-landing .apivue-star-cta small { margin-top: 2px; color: #94a3b8; font-size: 11px; }
    body.apivue-landing .apivue-star-arrow { margin-left: auto; color: #c4b5fd; }

    html.apivue-landing-light body.apivue-landing {
      background: #f7f8fc; color: #181a24;
    }
    html.apivue-landing-light body.apivue-landing .apivue-landing-surface {
      background: linear-gradient(145deg, rgba(255,255,255,.96), rgba(247,248,252,.96)) !important;
      border-color: rgba(99,102,241,.13) !important;
      box-shadow: 0 18px 48px rgba(30,41,59,.08), inset 0 1px 0 rgba(255,255,255,.9);
    }
    html.apivue-landing-light body.apivue-landing .apivue-landing-surface:hover {
      border-color: rgba(124,58,237,.28) !important; box-shadow: 0 26px 60px rgba(79,70,229,.13), 0 0 30px rgba(124,58,237,.06);
    }
    html.apivue-landing-light body.apivue-landing .apivue-demo-card {
      background:
        radial-gradient(circle at 50% 0%, rgba(139,92,246,.16), transparent 42%),
        radial-gradient(circle at 10% 82%, rgba(59,130,246,.08), transparent 35%),
        linear-gradient(145deg, #ffffff, #f5f6fb 78%) !important;
      border-color: rgba(124,58,237,.18) !important;
      box-shadow: 0 30px 80px rgba(51,65,85,.14), 0 0 65px rgba(124,58,237,.08), inset 0 1px 0 #fff !important;
    }
    html.apivue-landing-light body.apivue-landing .apivue-demo-card:hover {
      border-color: rgba(124,58,237,.34) !important; box-shadow: 0 40px 90px rgba(51,65,85,.18), 0 0 75px rgba(124,58,237,.12), inset 0 1px 0 #fff !important;
    }
    html.apivue-landing-light body.apivue-landing .apivue-demo-card [class*="text-white"] { color: #171923 !important; }
    html.apivue-landing-light body.apivue-landing .apivue-demo-card [class*="text-zinc-500"],
    html.apivue-landing-light body.apivue-landing .apivue-demo-card [class*="text-zinc-400"] { color: #64748b !important; }
    html.apivue-landing-light body.apivue-landing .apivue-header-star {
      color: #312e81; background: linear-gradient(180deg, rgba(139,92,246,.12), rgba(99,102,241,.06));
      border-color: rgba(99,102,241,.18); box-shadow: 0 8px 25px rgba(79,70,229,.08), inset 0 1px 0 rgba(255,255,255,.9);
    }
    html.apivue-landing-light body.apivue-landing .apivue-header-star:hover { border-color: rgba(124,58,237,.35); box-shadow: 0 12px 30px rgba(79,70,229,.13); }
    html.apivue-landing-light body.apivue-landing .apivue-enhanced-footer { background: linear-gradient(180deg, #f4f5fa, #eef0f7) !important; border-top-color: rgba(99,102,241,.12); }
    html.apivue-landing-light body.apivue-landing .apivue-star-cta { color: #1e1b4b; background: linear-gradient(135deg, rgba(139,92,246,.10), rgba(59,130,246,.05)); border-color: rgba(99,102,241,.18); box-shadow: 0 16px 40px rgba(51,65,85,.09); }
    html.apivue-landing-light body.apivue-landing .apivue-star-cta small { color: #64748b; }

    @media (prefers-reduced-motion: reduce) {
      body.apivue-landing *, body.apivue-landing *::before, body.apivue-landing *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
    }
  `;
  document.head.appendChild(style);
}

export function LandingExperienceEnhancer() {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    if (location.pathname !== '/') return;

    const body = document.body;
    const root = document.documentElement;
    body.classList.add('apivue-landing');
    root.classList.toggle('apivue-landing-light', theme === 'light');
    installStyles();

    const header = document.querySelector<HTMLElement>('body.apivue-landing header');
    const footer = document.querySelector<HTMLElement>('body.apivue-landing footer');
    enhanceHeader(header);
    enhanceFooter(footer);
    addLandingSurfaceClasses();
    header?.classList.add('apivue-enhanced-header');

    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('body.apivue-landing header a[href^="#"]'));
    const sections = links.map((link) => document.getElementById(link.getAttribute('href')?.slice(1) ?? '')).filter((section): section is HTMLElement => Boolean(section));

    let frame = 0;
    const updateScrollState = () => {
      frame = 0;
      const marker = window.scrollY + window.innerHeight * 0.34;
      let active = '';
      for (const section of sections) if (section.offsetTop <= marker) active = section.id;
      links.forEach((link) => link.classList.toggle('apivue-nav-active', link.getAttribute('href') === `#${active}`));
      header?.classList.toggle('apivue-header-scrolled', window.scrollY > 18);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateScrollState); };
    window.addEventListener('scroll', onScroll, { passive: true });
    updateScrollState();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      body.classList.remove('apivue-landing');
      root.classList.remove('apivue-landing-light');
      document.getElementById(LANDING_STYLE_ID)?.remove();
    };
  }, [location.pathname, theme]);

  return null;
}
