import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '@/lib/theme-context';

const REPO_URL = 'https://github.com/Chethan-ULTIMAX/APIVue';

export function LandingExperienceEnhancer() {
  const location = useLocation();
  const { theme } = useTheme();

  useEffect(() => {
    if (location.pathname !== '/') return;

    const body = document.body;
    const root = document.documentElement;
    body.classList.add('apivue-landing');
    root.classList.toggle('apivue-landing-light', theme === 'light');

    const header = document.querySelector('body.apivue-landing header');
    const footer = document.querySelector('body.apivue-landing footer');
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('body.apivue-landing header a[href^="#"]'));
    const sections = links.map((link) => document.getElementById(link.getAttribute('href')?.slice(1) ?? '')).filter((section): section is HTMLElement => Boolean(section));

    header?.classList.add('apivue-enhanced-header');
    footer?.classList.add('apivue-enhanced-footer');

    if (footer && !footer.querySelector('[data-apivue-star]')) {
      const cta = document.createElement('a');
      cta.href = REPO_URL;
      cta.target = '_blank';
      cta.rel = 'noreferrer';
      cta.dataset.apivueStar = 'true';
      cta.className = 'apivue-star-cta';
      cta.innerHTML = '<span class="apivue-star-icon" aria-hidden="true">★</span><span><strong>Star APIVue on GitHub</strong><small>Support the project and follow the build</small></span><span class="apivue-star-arrow" aria-hidden="true">↗</span>';
      footer.querySelector('.mx-auto')?.appendChild(cta);
    }

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
    };
  }, [location.pathname, theme]);

  return null;
}
