/* ==========================================================================
   Vigore – Corpo e Mente · main.js (estilo Vitória)
   01. Preloader (logo da árvore crescendo + porcentagem + barra)
   02. Header com sombra ao rolar
   03. Menu mobile
   04. Link ativo na navegação
   05. Animações de entrada (Intersection Observer)
   06. Cursor customizado
   07. Rastreamento de cliques (WhatsApp / Instagram)
   08. Ano no rodapé
   09. FAQ: acordeão com abertura e fechamento animados
   ========================================================================== */

(() => {
  'use strict';

  window.__vgReady = true;

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, min = 0, max = 1) => Math.min(Math.max(v, min), max);

  /* 01. Preloader ======================================================== */
  function initPreloader(onDone) {
    const preloader = document.getElementById('preloader');
    if (!preloader) { root.classList.remove('is-loading'); onDone(); return; }

    // Cada traço tem sua janela de desenho (data-draw="início,fim", de 0 a 1)
    const paths = [...preloader.querySelectorAll('[data-draw]')].map((el) => {
      const [start, end] = el.dataset.draw.split(',').map(Number);
      return { el, start, end };
    });
    const percentEl = preloader.querySelector('[data-percent]');
    const bar = preloader.querySelector('[data-bar]');

    // Na segunda visita da sessão, o preloader é mais rápido
    let visited = false;
    try { visited = sessionStorage.getItem('vg-visited') === '1'; sessionStorage.setItem('vg-visited', '1'); } catch (e) { /* storage bloqueado */ }

    const minDuration = reduceMotion ? 300 : visited ? 900 : 2200;
    const maxWait = 8000; // nunca prende o usuário se algum recurso travar
    const start = performance.now();
    let pageLoaded = document.readyState === 'complete';
    let shown = 0;
    let lastPercent = -1;

    window.addEventListener('load', () => { pageLoaded = true; }, { once: true });

    const cssReady = () => getComputedStyle(root).getPropertyValue('--css-ready').trim() === '1';

    function render(p) {
      const percent = Math.round(p * 100);
      if (percent !== lastPercent) {
        percentEl.textContent = percent + '%';
        lastPercent = percent;
      }
      bar.style.transform = `scaleX(${p})`;
      preloader.style.setProperty('--p', p.toFixed(3));
      paths.forEach(({ el, start: s, end: e }) => {
        el.style.strokeDashoffset = 1 - clamp((p - s) / (e - s));
      });
    }

    function finish() {
      render(1);
      preloader.classList.add('is-done');
      preloader.setAttribute('aria-busy', 'false');
      root.classList.remove('is-loading');
      root.classList.add('is-loaded');
      preloader.addEventListener('transitionend', () => preloader.remove(), { once: true });
      setTimeout(() => preloader.remove(), 1200);
      onDone();
    }

    function frame(now) {
      const elapsed = now - start;
      const timeProgress = clamp(elapsed / minDuration);
      const ready = (pageLoaded && cssReady()) || elapsed > maxWait;
      // Enquanto a página não termina de carregar, segura em 90%
      const target = ready ? timeProgress : Math.min(timeProgress, 0.9);

      shown += (target - shown) * (reduceMotion ? 1 : 0.14);
      if (ready && timeProgress >= 1 && 1 - shown < 0.005) shown = 1;

      render(shown);
      if (shown < 1) requestAnimationFrame(frame);
      else setTimeout(finish, reduceMotion ? 0 : 250);
    }

    preloader.setAttribute('aria-busy', 'true');
    requestAnimationFrame(frame);
  }

  /* 02. Header: sombra mais marcada ao rolar (o blur é permanente) ======= */
  function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* 03. Menu mobile ====================================================== */
  function initMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.getElementById('menu');
    if (!toggle || !menu) return;

    // Mesmo breakpoint do CSS em que o menu vira horizontal
    const desktop = window.matchMedia('(min-width: 1024px)');
    const focusables = () => [toggle, ...menu.querySelectorAll('a[href]')];

    function setOpen(open) {
      root.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        const firstLink = menu.querySelector('a[href]');
        setTimeout(() => firstLink && firstLink.focus({ preventScroll: true }), 350);
      }
    }
    const isOpen = () => root.classList.contains('menu-open');

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    menu.addEventListener('click', (e) => {
      if (e.target.closest('a') && isOpen()) setOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') {
        setOpen(false);
        toggle.focus();
        return;
      }
      // Mantém o foco dentro do menu aberto
      if (e.key === 'Tab') {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    desktop.addEventListener('change', (e) => { if (e.matches && isOpen()) setOpen(false); });
  }

  /* 04. Link ativo na navegação ========================================== */
  function initActiveLink() {
    const links = [...document.querySelectorAll('.menu__link[href^="#"]')];
    // O hero entra na lista para limpar o destaque quando o usuário volta ao topo
    const sections = [document.getElementById('inicio'), ...links
      .map((link) => document.querySelector(link.getAttribute('href')))]
      .filter(Boolean);
    if (!sections.length || !('IntersectionObserver' in window)) return;

    // "Dúvidas" fica dentro de "Como funciona": vence a última seção visível na ordem do documento
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      const current = sections.filter((s) => visible.has(s)).pop();
      if (!current) return;
      links.forEach((link) => {
        const active = link.getAttribute('href') === '#' + current.id;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => observer.observe(section));
  }

  /* 05. Animações de entrada ============================================= */
  function initReveal() {
    const items = document.querySelectorAll('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el) => observer.observe(el));
  }

  /* 06. Cursor customizado =============================================== */
  function initCursor() {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cursor = document.querySelector('.cursor');
    if (!cursor || !finePointer || reduceMotion) return;

    const dot = cursor.querySelector('.cursor__dot');
    const ring = cursor.querySelector('.cursor__ring');
    const interactive = 'a, button, summary, [role="button"], label';
    const mouse = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };

    root.classList.add('has-cursor');
    cursor.classList.add('is-hidden');

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      dot.style.translate = `${mouse.x}px ${mouse.y}px`;
      cursor.classList.remove('is-hidden');

      const target = e.target instanceof Element ? e.target : null;
      cursor.classList.toggle('is-hover', !!(target && target.closest(interactive)));
      cursor.classList.toggle('is-dark', !!(target && target.closest('[data-dark], .menu-open .menu')));
    }, { passive: true });

    // O mapa (iframe) não repassa o mousemove: esconde o cursor enquanto está sobre ele
    document.querySelectorAll('iframe').forEach((frame) => {
      frame.addEventListener('mouseenter', () => cursor.classList.add('is-hidden'));
    });

    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    window.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    window.addEventListener('mouseup', () => cursor.classList.remove('is-down'));

    (function follow() {
      ringPos.x += (mouse.x - ringPos.x) * 0.18;
      ringPos.y += (mouse.y - ringPos.y) * 0.18;
      ring.style.translate = `${ringPos.x}px ${ringPos.y}px`;
      requestAnimationFrame(follow);
    })();
  }

  /* 07. Rastreamento de cliques ========================================== */
  function initTracking() {
    // Eventos para Google Tag Manager / GA4 / Meta Pixel, se instalados
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-cta]');
      if (!link) return;
      const channel = /wa\.me|whatsapp/.test(link.href) ? 'whatsapp' : /instagram/.test(link.href) ? 'instagram' : 'outro';
      const detail = { event: `${channel}_click`, cta_location: link.dataset.cta };

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(detail);
      if (typeof window.gtag === 'function') window.gtag('event', detail.event, { cta_location: detail.cta_location });
      if (typeof window.fbq === 'function' && channel === 'whatsapp') window.fbq('track', 'Contact', { cta_location: detail.cta_location });
    });
  }

  /* 08. Ano no rodapé ==================================================== */
  function initYear() {
    const year = document.querySelector('[data-year]');
    if (year) year.textContent = new Date().getFullYear();
  }

  /* 09. FAQ: acordeão animado ============================================ */
  function initFaq() {
    const items = [...document.querySelectorAll('.faq__item')];
    // índice para a entrada em cascata (transition-delay no CSS)
    items.forEach((item, i) => item.style.setProperty('--i', i));
    if (reduceMotion || !items.length || !('animate' in Element.prototype)) return;

    const timing = { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)' };

    function open(item) {
      const answer = item.querySelector('.faq__answer');
      item.open = true;
      const height = answer.scrollHeight;
      answer.animate(
        [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }],
        timing
      );
    }

    function close(item) {
      const answer = item.querySelector('.faq__answer');
      item.classList.add('is-closing');
      const anim = answer.animate(
        [{ height: `${answer.offsetHeight}px`, opacity: 1 }, { height: '0px', opacity: 0 }],
        { ...timing, duration: 380 }
      );
      anim.onfinish = () => {
        item.open = false;
        item.classList.remove('is-closing');
      };
    }

    items.forEach((item) => {
      // O atributo name (acordeão nativo) fecharia os outros sem animação;
      // com JS, quem controla a exclusividade é o código abaixo
      item.removeAttribute('name');
      item.querySelector('summary').addEventListener('click', (e) => {
        e.preventDefault();
        if (item.classList.contains('is-closing')) return;
        if (item.open) {
          close(item);
        } else {
          items.filter((other) => other !== item && other.open).forEach(close);
          open(item);
        }
      });
    });
  }

  /* Início =============================================================== */
  initHeader();
  initMenu();
  initActiveLink();
  initCursor();
  initTracking();
  initYear();
  initFaq();
  // As animações de entrada começam quando o preloader sai de cena
  initPreloader(initReveal);
})();
