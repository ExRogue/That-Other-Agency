(() => {
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.menu-toggle');
  if (nav && toggle) {
    const setOpen = (open, returnFocus = false) => {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setOpen(false, true);
    });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', () => setOpen(false));
    // Enhance navigation only once its controls are ready. Without JS, links remain visible.
    document.documentElement.classList.add('js');
  }

  document.querySelectorAll('#year,[data-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  const search = document.querySelector('[data-blog-search]');
  if (search) {
    const cards = [...document.querySelectorAll('[data-blog-card]')];
    const empty = document.querySelector('[data-blog-empty]');
    const filter = () => {
      const words = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      let visible = 0;
      cards.forEach((card) => {
        const text = `${card.dataset.search || ''} ${card.textContent}`.toLowerCase();
        card.hidden = !words.every((word) => text.includes(word));
        if (!card.hidden) visible++;
      });
      if (empty) empty.hidden = visible > 0;
    };
    search.addEventListener('input', filter);
    filter();
  }

  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const status = form.querySelector('[data-form-status]');
    const button = form.querySelector('[type="submit"]');
    const idleLabel = button.textContent;
    let sending = false;
    // Note where an enquiry came from (ad tags and click ids), first visit wins within the session
    const tracked = typeof form.querySelectorAll === 'function' ? form.querySelectorAll('[data-track]') : [];
    if (tracked.length) {
      const read = (key) => { try { return window.sessionStorage.getItem('toa-' + key); } catch { return null; } };
      const keep = (key, value) => { try { window.sessionStorage.setItem('toa-' + key, value); } catch { /* storage blocked */ } };
      const params = new URLSearchParams(window.location.search);
      tracked.forEach((input) => {
        const key = input.name;
        let value = key === 'landing_page' ? window.location.pathname : key === 'referrer' ? document.referrer : params.get(key);
        if (value) { if (!read(key)) keep(key, value); } else value = read(key) || '';
        input.value = read(key) || value;
      });
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (sending || !form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get('_honey')) return;
      sending = true;
      button.disabled = true;
      button.textContent = 'Sending…';
      form.setAttribute('aria-busy', 'true');
      status.className = 'form-status';
      status.textContent = 'Sending your enquiry…';
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20000);
      try {
        const endpoint = new URL(form.action);
        // Keep a normal HTML form action as a no-JavaScript fallback.
        endpoint.pathname = '/ajax' + endpoint.pathname;
        const response = await fetch(endpoint.href, {
          method: 'POST', body: data,
          headers: { Accept: 'application/json' }, signal: controller.signal,
        });
        const result = await response.json();
        // A 200 response alone does not mean FormSubmit accepted the enquiry.
        if (!response.ok || ![true, 'true'].includes(result.success)) throw new Error('Enquiry not accepted');
        form.reset();
        if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { form_name: form.dataset.formName || 'contact' });
        status.className = 'form-status ok';
        status.textContent = 'Thanks, your enquiry has been sent. We’ll get back to you within one business day.';
      } catch {
        status.className = 'form-status err';
        status.textContent = 'We couldn’t confirm your enquiry was sent. Your details are still here. Please try again or email hello@thatotheragency.co.uk.';
      } finally {
        window.clearTimeout(timeout);
        sending = false;
        button.disabled = false;
        button.textContent = idleLabel;
        form.removeAttribute('aria-busy');
      }
    });
  }

  const root = document.documentElement;
  const canMove = root && window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Homepage intro: the rules draw, then the headline steps in line by line.
  // The page adds the intro class in its head; this starts it once the font is ready.
  if (root && root.classList.contains('intro')) {
    const go = () => root.classList.add('go');
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => window.requestAnimationFrame(go));
    window.setTimeout(go, 1200);
  }

  // The dashboard film: settles into place as it scrolls in, with a chapter rail and a pause button.
  const film = document.querySelector('.film');
  if (film) {
    const frame = film.querySelector('.film-frame');
    const video = film.querySelector('video');
    const rail = film.querySelector('.film-rail');
    const note = film.querySelector('.film-note');
    const toggle = film.querySelector('.film-toggle');
    const chapters = [...film.querySelectorAll('.chapters li')];
    const small = window.matchMedia('(max-width: 640px)');
    if (small.matches) video.poster = 'assets/video/dashboard-promo-poster-9x16.jpg';
    let userPaused = !canMove, visible = true;
    const setToggle = () => {
      toggle.setAttribute('aria-pressed', String(video.paused));
      toggle.textContent = video.paused ? 'Play' : 'Pause';
    };
    const play = () => { const p = video.play(); if (p && p.catch) p.catch(() => setToggle()); };
    if (!canMove) { video.removeAttribute('autoplay'); video.pause(); }
    video.addEventListener('play', setToggle);
    video.addEventListener('pause', setToggle);
    toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });
    chapters.forEach((li) => li.querySelector('button').addEventListener('click', (event) => {
      video.currentTime = Number(event.currentTarget.dataset.t);
      userPaused = false;
      play();
    }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) video.pause();
        else if (!userPaused) play();
      }, { threshold: 0.15 }).observe(frame);
    }
    // Progress marker and current chapter
    const tick = () => {
      const d = video.duration || 37;
      film.style.setProperty('--p', String(Math.min(1, video.currentTime / d)));
      let on = 0;
      chapters.forEach((li, i) => { if (video.currentTime >= Number(li.querySelector('button').dataset.t)) on = i; });
      chapters.forEach((li, i) => li.classList.toggle('on', i === on));
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
    if (canMove) {
      // Wipe in, like the headlines
      frame.classList.add('wipe');
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => frame.classList.add('go')));
      // Grow from a smaller framed screen to the full column as its middle reaches the middle of the screen
      let queued = false;
      const grow = () => {
        queued = false;
        const h = frame.offsetHeight, w = frame.offsetWidth;
        const top = film.getBoundingClientRect().top;
        const vh = window.innerHeight;
        const p = Math.max(0, Math.min(1, 1 - (top + h / 2 - vh / 2) / (vh * 0.55)));
        const eased = 1 - Math.pow(1 - p, 3);
        // Settles at the width of the page column, so it never outgrows the layout on wide screens
        const start = 0.92;
        const s = start + (1 - start) * eased;
        frame.style.setProperty('--s', s.toFixed(4));
        frame.style.setProperty('--r', `${(18 - 12 * eased).toFixed(1)}px`);
        const shift = `${((s - 1) * h).toFixed(1)}px`;
        rail.style.setProperty('--grow', shift);
        note.style.setProperty('--grow', shift);
      };
      const ask = () => { if (!queued) { queued = true; window.requestAnimationFrame(grow); } };
      window.addEventListener('scroll', ask, { passive: true });
      window.addEventListener('resize', ask);
      grow();
    }
    setToggle();
  }

  // Landing page: a booking bar on phones once the hero has gone, hidden again at the form
  const sticky = document.querySelector('.sticky-cta');
  const hero = document.querySelector('.lp-hero');
  const book = document.querySelector('#book');
  if (sticky && hero && book && 'IntersectionObserver' in window) {
    let heroSeen = true, bookSeen = false;
    const update = () => sticky.classList.toggle('show', !heroSeen && !bookSeen);
    new IntersectionObserver(([entry]) => { heroSeen = entry.isIntersecting; update(); }).observe(hero);
    new IntersectionObserver(([entry]) => { bookSeen = entry.isIntersecting; update(); }, { threshold: 0.05 }).observe(book);
  }
  // Small signals for ads: someone heads for the booking form or opens the live demo
  if (document.addEventListener) {
    document.addEventListener('click', (event) => {
      const link = event.target.closest && event.target.closest('a[href="#book"], a[href="/demo"]');
      if (!link || typeof window.gtag !== 'function') return;
      window.gtag('event', link.getAttribute('href') === '/demo' ? 'demo_click' : 'book_click', { page_path: window.location.pathname });
    });
  }

  if (canMove && 'IntersectionObserver' in window) {
    // Reveal on scroll. Content stays visible if this never runs.
    const targets = document.querySelectorAll('.page-hero > *, .section-head, .section-heading-row > :not(.section-head), .card, .work-card, .system-card, .review, .split > *, .closing-cta > *, .service-row, .statement > *, .quote-big, .quote-small, .brand-list, .post-image, main > section > details, .feature, .tool-chips, .book-copy, .form-card');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        observer.unobserve(el);
        el.classList.add('in');
        // Hand the element back to its own hover transitions once it has settled.
        window.setTimeout(() => { el.classList.remove('rv', 'in'); el.style.removeProperty('--d'); }, 1600 + (Number(el.dataset.delay) || 0));
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    targets.forEach((el) => {
      const delay = Math.min([...el.parentElement.children].indexOf(el), 5) * 80;
      el.dataset.delay = String(delay);
      el.style.setProperty('--d', `${delay}ms`);
      el.classList.add('rv');
      observer.observe(el);
    });
    root.classList.add('motion');
  }
})();
