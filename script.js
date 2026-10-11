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

  // The red thread (homepage): a line down the left margin that draws as you scroll, ticks off
  // each section label as it passes and lands as the full stop of the footer logo.
  const homeHero = document.querySelector('.home-hero');
  const stop = document.querySelector('.footer-giant i');
  const main = document.querySelector('main');
  if (canMove && homeHero && stop && main && window.CSS && CSS.supports('clip-path', 'inset(0 0 1px 0)')) {
    const wide = window.matchMedia('(min-width: 720px)');
    const thread = document.createElement('div');
    thread.className = 'thread';
    thread.setAttribute('aria-hidden', 'true');
    const part = (name) => thread.appendChild(Object.assign(document.createElement('span'), { className: name }));
    const origin = part('thread-o');
    const line = part('thread-v');
    const base = part('thread-h');
    const head = part('thread-head');
    // A zero size mark on the baseline, just before the full stop, to measure where it sits.
    const probe = Object.assign(document.createElement('span'), { style: 'display:inline-block;width:0;height:0' });
    stop.prepend(probe);
    const pen = document.createElement('canvas').getContext('2d');
    const weight = 1.5;
    const half = weight / 2;
    // Layout positions ignore transforms, so the scroll reveals don't throw the measurements off.
    const at = (el) => { let x = 0; let y = 0; for (let n = el; n; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; } return { x, y }; };
    let geo = null;
    let shown = 0;
    let wanted = 0;
    let frame = 0;
    let last = 0;

    const measure = () => {
      const x = Math.round(at(main).x + (parseFloat(getComputedStyle(main).paddingLeft) || 0) / 2);
      const rule = homeHero.querySelector('.rule');
      const top = at(rule);
      const y0 = Math.round(top.y);
      const mark = at(probe);
      const font = getComputedStyle(stop);
      pen.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
      const m = pen.measureText('.');
      const dot = { x: mark.x - m.actualBoundingBoxLeft, y: mark.y - m.actualBoundingBoxAscent, w: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, h: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent };
      const y1 = Math.round(mark.y) - half;
      const reds = [...main.querySelectorAll(':scope > .marquee, :scope > .closing-cta, :scope > .band-red')].map((el) => { const p = at(el); return [p.y, p.y + el.offsetHeight]; });
      const stations = [...main.querySelectorAll('.eyebrow')].map((el) => { const p = at(el); return { x: p.x, y: Math.round(p.y + el.offsetHeight / 2) }; }).filter((s) => s.y > y0 + 40 && s.y < y1);
      const vh = window.innerHeight;
      const maxS = Math.max(0, document.documentElement.scrollHeight - vh);
      const when = (y) => Math.min(Math.max(y - vh * .45, 0), maxS);
      // Scroll position to length of thread: it meets each label as the label nears the middle of the
      // screen and rests there briefly, then turns along the logo's baseline once the logo is in view.
      const pts = [[0, 0]];
      stations.forEach((s) => { const w = when(s.y); pts.push([w - 50, s.y - y0], [w + 50, s.y - y0]); });
      const land = Math.min(Math.max(mark.y - vh * .96, 0), maxS - 1);
      pts.push([land, y1 - y0]);
      return { x, y0, y1, dot, reds, stations, pts, land, v: y1 - y0, h: Math.max(0, Math.round(dot.x) - x), g: Math.max(dot.w, 1), ruleX: Math.round(top.x) };
    };

    const red = (y) => geo.reds.some(([a, b]) => y >= a && y <= b);

    const place = () => {
      const { x, y0, y1, h, ruleX } = geo;
      origin.style.cssText = `left:${x - half}px;top:${y0 - half}px;width:${Math.max(0, ruleX - x + half)}px;height:${weight}px`;
      const stops = geo.reds.flatMap(([a, b]) => (b < y0 || a > y1) ? [] : [`var(--red) ${Math.max(a - y0, 0)}px`, `var(--ink) ${Math.max(a - y0, 0)}px`, `var(--ink) ${b - y0}px`, `var(--red) ${b - y0}px`]);
      line.style.cssText = `left:${x - half}px;top:${y0 - half}px;width:${weight}px;height:${y1 - y0 + weight}px;background:${stops.length ? `linear-gradient(var(--red) 0, ${stops.join(', ')}, var(--red) 100%)` : 'var(--red)'}`;
      base.style.cssText = `left:${x - half}px;top:${y1 - half}px;width:${h + half}px;height:${weight}px`;
      thread.querySelectorAll('.thread-b').forEach((b) => b.remove());
      geo.ticks = geo.stations.map((s) => {
        const tick = document.createElement('span');
        tick.className = `thread-b${red(s.y) ? ' on-red' : ''}`;
        tick.style.cssText = `left:${x - half}px;top:${s.y - half}px;width:${Math.max(0, s.x - x + half)}px;height:${weight}px`;
        thread.insertBefore(tick, head);
        return { el: tick, d: s.y - y0 };
      });
    };

    const target = (s) => {
      if (s >= geo.land) return geo.v + geo.h + geo.g;
      const p = geo.pts;
      for (let i = 1; i < p.length; i += 1) {
        if (s <= p[i][0]) {
          const [s0, d0] = p[i - 1];
          const [s1, d1] = p[i];
          return s1 > s0 ? d0 + (d1 - d0) * (s - s0) / (s1 - s0) : d1;
        }
      }
      return geo.v;
    };

    const draw = () => {
      const { x, y0, y1, v, h, g, dot } = geo;
      const d = shown;
      line.style.clipPath = `inset(0 0 ${Math.max(0, v + half - Math.min(d, v))}px 0)`;
      base.style.clipPath = `inset(0 ${h - Math.min(Math.max(d - v, 0), h)}px 0 0)`;
      let cx = x;
      let cy = y0 + d;
      let w = 10;
      let ht = 10;
      if (d > v + h) {
        // The last stretch: the square grows into the full stop.
        const t = Math.min((d - v - h) / g, 1);
        cx = dot.x + (dot.w / 2) * t;
        cy = y1 + (dot.y + dot.h / 2 - y1) * t;
        w = 10 + (dot.w - 10) * t;
        ht = 10 + (dot.h - 10) * t;
      } else if (d > v) {
        cx = x + (d - v);
        cy = y1;
      }
      head.classList.toggle('on-red', d <= v && red(cy));
      head.style.transform = `translate(${cx - w / 2}px, ${cy - ht / 2}px) scale(${w / 10}, ${ht / 10})`;
      geo.ticks.forEach((t) => t.el.classList.toggle('lit', d >= t.d - 1));
    };

    const tick = (now) => {
      frame = 0;
      const dt = last ? Math.min(now - last, 64) : 16.7;
      last = now;
      shown += (wanted - shown) * (1 - Math.pow(.84, dt / 16.7));
      if (Math.abs(wanted - shown) < .4) shown = wanted;
      draw();
      if (shown !== wanted) frame = window.requestAnimationFrame(tick);
      else last = 0;
    };
    const follow = () => {
      if (!geo) return;
      wanted = target(window.scrollY);
      if (!frame) frame = window.requestAnimationFrame(tick);
    };

    let queued = false;
    const build = () => {
      queued = false;
      if (!wide.matches) {
        thread.remove();
        root.classList.remove('has-thread');
        geo = null;
        return;
      }
      if (!thread.isConnected) {
        root.classList.add('has-thread');
        document.body.append(thread);
        window.requestAnimationFrame(() => thread.classList.add('on'));
      }
      geo = measure();
      place();
      draw();
      follow();
    };
    const rebuild = () => { if (!queued) { queued = true; window.requestAnimationFrame(build); } };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
    window.addEventListener('scroll', follow, { passive: true });
    window.addEventListener('resize', rebuild);
    window.addEventListener('load', rebuild);
    wide.addEventListener('change', rebuild);
    if ('ResizeObserver' in window) new ResizeObserver(rebuild).observe(document.body);
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
    // Choose the cut here as well: some phone browsers ignore the media query on <source> and play the wide film,
    // which a tall frame would crop. The frame then takes the shape of whichever film actually loads.
    const sources = [...video.querySelectorAll('source')];
    const tallSource = sources.find((el) => el.media);
    const wideSource = sources.find((el) => !el.media);
    if (tallSource && wideSource) {
      const want = (small.matches ? tallSource : wideSource).getAttribute('src');
      if (!video.currentSrc.endsWith(want)) video.src = want;
    }
    const fit = () => {
      if (!video.videoWidth) return;
      const tall = video.videoHeight > video.videoWidth;
      frame.classList.toggle('is-tall', tall);
      frame.classList.toggle('is-wide', !tall);
    };
    video.addEventListener('loadedmetadata', fit);
    fit();
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
