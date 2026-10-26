/* ==========================================================================
   Vigore – Corpo e Mente | main.js
   Preloader · animações de scroll · header · menu mobile · cursor · extras
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const easeInOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ------------------------------------------------------------------------
     1. PRELOADER
     O logo é "desenhado" (stroke-dashoffset 1 → 0) em sincronia com a
     porcentagem. A contagem só passa de 90% depois do evento `load`.
     ------------------------------------------------------------------------ */
  function initPreloader() {
    return new Promise((resolve) => {
      const el = $('#preloader');
      if (!el) { root.classList.remove('is-loading'); resolve(); return; }

      const countEl = $('#preloaderCount');
      const barEl = $('#preloaderBar');
      const strokes = $$('.draw', el);
      const total = strokes.length;
      const MIN_DURATION = reducedMotion ? 300 : 2600;
      const MAX_WAIT = 8000; // nunca prende o usuário por mais que isso

      let loaded = document.readyState === 'complete';
      let shown = 0;
      const start = performance.now();

      if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
      setTimeout(() => { loaded = true; }, MAX_WAIT);

      const render = (p) => {
        const progress = p / 100;
        countEl.textContent = `${Math.round(p)}%`;
        barEl.style.transform = `scaleX(${progress})`;
        // cada traço tem sua janela de desenho, criando o efeito progressivo
        strokes.forEach((stroke, i) => {
          const from = (i / total) * .6;
          const local = clamp((progress - from) / .4, 0, 1);
          stroke.style.strokeDashoffset = 1 - local;
        });
      };

      const finish = () => {
        el.classList.add('is-filled');
        setTimeout(() => {
          el.classList.add('is-done');
          el.setAttribute('aria-hidden', 'true');
          root.classList.remove('is-loading');
          resolve();
          setTimeout(() => el.remove(), 1000);
        }, reducedMotion ? 0 : 750);
      };

      const tick = (now) => {
        const t = clamp((now - start) / MIN_DURATION, 0, 1);
        let target = easeInOut(t) * 100;
        if (!loaded) target = Math.min(target, 90 + (t >= 1 ? Math.min(9, (now - start - MIN_DURATION) / 400) : 0));

        shown += (target - shown) * .14;
        if (Math.abs(target - shown) < .25) shown = target;
        render(shown);

        if (shown >= 100) finish();
        else requestAnimationFrame(tick);
      };

      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------------
     2. ANIMAÇÕES DE ENTRADA (Intersection Observer: fade + translate)
     ------------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: .15, rootMargin: '0px 0px -8% 0px' });

    items.forEach((item) => observer.observe(item));
  }

  /* ------------------------------------------------------------------------
     3. HEADER (sticky com blur ao rolar) + link ativo
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = $('.site-header');
    if (!header) return;

    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();

    // destaca o link da seção visível
    const links = $$('.nav__link');
    const sections = links.map((link) => $(link.getAttribute('href'))).filter(Boolean);
    if (!('IntersectionObserver' in window)) return;

    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => spy.observe(section));
  }

  /* ------------------------------------------------------------------------
     4. MENU MOBILE (hambúrguer com revelação circular)
     ------------------------------------------------------------------------ */
  function initMenu() {
    const button = $('.hamburger');
    const nav = $('#menu');
    if (!button || !nav) return;

    const desktop = window.matchMedia('(min-width: 1200px)');
    const isOpen = () => nav.classList.contains('is-open');

    const setMenu = (open, { restoreFocus = true } = {}) => {
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      if (open) {
        setTimeout(() => { const first = $('.nav__link', nav); if (first) first.focus({ preventScroll: true }); }, 350);
      } else if (restoreFocus) {
        button.focus({ preventScroll: true });
      }
    };

    button.addEventListener('click', () => setMenu(!isOpen()));

    nav.addEventListener('click', (e) => {
      if (e.target.closest('a') && isOpen()) setMenu(false, { restoreFocus: false });
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { setMenu(false); return; }
      if (e.key !== 'Tab') return;

      // mantém o foco dentro do menu aberto
      const focusables = [button, ...$$('a', nav)];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    desktop.addEventListener('change', (e) => { if (e.matches && isOpen()) setMenu(false, { restoreFocus: false }); });
  }

  /* ------------------------------------------------------------------------
     5. CURSOR CUSTOMIZADO (apenas mouse/trackpad, sem movimento reduzido)
     ------------------------------------------------------------------------ */
  function initCursor() {
    const cursor = $('.cursor');
    if (!cursor || reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot = $('.cursor__dot', cursor);
    const ring = $('.cursor__ring', cursor);
    const interactive = 'a, button, summary, [role="button"]';
    let mx = -100, my = -100, rx = -100, ry = -100;

    root.classList.add('has-cursor');

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.add('is-active');
    }, { passive: true });

    document.addEventListener('mouseover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest(interactive));
    });
    document.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    document.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));

    const follow = () => {
      rx += (mx - rx) * .18;
      ry += (my - ry) * .18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  /* ------------------------------------------------------------------------
     6. EXTRAS: rótulo do WhatsApp flutuante + ano no rodapé
     ------------------------------------------------------------------------ */
  function initWhatsAppHint() {
    const fab = $('.wa-float');
    if (!fab || !window.matchMedia('(min-width: 768px)').matches) return;
    setTimeout(() => {
      fab.classList.add('show-label');
      setTimeout(() => fab.classList.remove('show-label'), 4500);
    }, 3500);
  }

  function initYear() {
    const year = $('#year');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ------------------------------------------------------------------------
     INIT
     ------------------------------------------------------------------------ */
  initHeader();
  initMenu();
  initCursor();
  initYear();

  initPreloader().then(() => {
    initReveal();
    initWhatsAppHint();
  });
})();
