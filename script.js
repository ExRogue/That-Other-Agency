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
        status.textContent = form.dataset.ok || 'Thanks, your enquiry has been sent. We’ll get back to you within one business day.';
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
        // Stop a frame already queued, or it would draw with no measurements
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
        last = 0;
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

  // Ads landing page hero: the tool names cycle, since the dashboard reads far more than three tools.
  // Each word leaves upwards through its mask and the next rises in. Still under reduced motion.
  const cyclers = document.querySelectorAll('[data-cycle]');
  if (canMove && cyclers.length) {
    let turn = 0, onScreen = true;
    const heroCycle = cyclers[0].closest('section');
    if (heroCycle && 'IntersectionObserver' in window) new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; }).observe(heroCycle);
    const swap = () => {
      if (!onScreen || document.hidden) return;
      turn++;
      cyclers.forEach((el, k) => {
        const words = el.dataset.cycle.split('|');
        window.setTimeout(() => {
          el.style.transition = 'transform .42s cubic-bezier(.7, 0, .84, 0)';
          el.style.transform = 'translateY(-112%)';
          window.setTimeout(() => {
            el.textContent = words[turn % words.length];
            el.style.transition = 'none';
            el.style.transform = 'translateY(112%)';
            void el.offsetWidth;
            el.style.transition = 'transform .7s var(--ease)';
            el.style.transform = '';
          }, 430);
        }, k * 150);
      });
    };
    window.setTimeout(() => window.setInterval(swap, 2600), 3400);
  }

  // Live dashboard panels (landing page features and the dashboard page): working miniatures of the demo
  // dashboard, built over the screenshots they replace, with the demo brand's made up numbers. They play while
  // on screen; without motion they rest on their final state, and without JavaScript the screenshots stay.
  const liveFigures = document.querySelectorAll('[data-live]');
  if (liveFigures.length) {
    const make = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
    const rand = (seed) => { let s = (seed * 16807) % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
    const tween = (ms, paint) => {
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min(1, (now - start) / ms);
        paint(1 - Math.pow(1 - t, 3));
        if (t < 1) window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
    };
    const gbp = (v, dp = 0) => `£${v.toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
    const legend = (items) => items.map(([name, colour, line]) => `<span><i class="${line ? 'ln' : ''}" style="--c:${colour}"></i>${name}</span>`).join('');
    const dates = (n, every) => Array.from({ length: n }, (_, i) => `<span>${i % every === 0 ? `${i + 1} Oct` : ''}</span>`).join('');
    // Keeps a floating label inside its chart, centred on x where it can be.
    const place = (box, chart, x) => {
      const w = box.offsetWidth, cw = chart.clientWidth;
      box.style.setProperty('--cx', `${Math.max(0, Math.min(cw - w, x * cw - w / 2))}px`);
    };

    // 01: the headline numbers, cycling month to date, 7 days and today
    const KPIS = [
      ['Net sales', (v) => (v >= 10000 ? `£${(v / 1000).toFixed(1)}K` : gbp(Math.round(v)))],
      ['Orders', (v) => Math.round(v).toLocaleString('en-GB')],
      ['Average order value', (v) => gbp(v, 2)],
      ['Conversion rate', (v) => `${v.toFixed(2)}%`],
      ['Sessions', (v) => Math.round(v).toLocaleString('en-GB')],
      ['MER', (v) => `${v.toFixed(2)}x`],
      ['Returning customers', (v) => `${v.toFixed(1)}%`],
      ['Subscription share', (v) => `${v.toFixed(1)}%`],
    ];
    const PERIODS = [
      { pill: 2, range: '1 to 10 Oct 2026, against 1 to 10 Sep', v: [15900, 259, 61.45, 2.94, 8796, 2.21, 28.6, 8.1], d: [26.4, 18.3, 6.9, 3.0, 14.8, 20.0, 7.9, -1.4] },
      { pill: 1, range: '4 to 10 Oct, against the 7 days before', v: [11240, 183, 61.42, 2.98, 6140, 2.26, 29.4, 8.3], d: [12.1, 9.6, 2.3, 4.2, 5.2, 8.7, 3.1, 0.6] },
      { pill: 0, range: 'Today to 2pm, against yesterday to 2pm', v: [1742, 28, 62.21, 3.12, 897, 2.34, 31.0, 7.9], d: [18.0, 12.0, 5.4, 6.8, 4.9, 11.4, 2.0, -2.5] },
    ];
    const spark = (seed, trend) => {
      const r = rand(seed);
      let y = 11;
      const pts = Array.from({ length: 12 }, (_, i) => {
        y = Math.max(3, Math.min(19, y + (r() - 0.5) * 6 - Math.sign(trend) * 0.6));
        return `${((i * 64) / 11).toFixed(1)},${y.toFixed(1)}`;
      });
      return `M${pts.join(' L')}`;
    };
    const kpis = () => {
      const node = make(`<div class="lv lv-kpis"><div class="lv-bar"><span class="lv-title">Cross Street Coffee</span><span class="lv-pills"><i></i><span>Today</span><span>7 days</span><span>Month to date</span></span></div><p class="lv-note lv-range"></p><div class="lv-tiles">${KPIS.map(([label], i) => `<div class="lv-tile" style="--i:${i}"><div class="lv-tile-top"><span class="lv-label">${label}</span><svg class="lv-spark" viewBox="0 0 64 22" aria-hidden="true"><path/></svg></div><b class="lv-value"></b><span class="lv-delta"></span></div>`).join('')}</div></div>`);
      const pills = [...node.querySelectorAll('.lv-pills span')];
      const mark = node.querySelector('.lv-pills i');
      const tiles = [...node.querySelectorAll('.lv-tile')];
      let shown = KPIS.map(() => 0), at = 0, timer = 0, started = false;
      const show = (p, animate) => {
        const period = PERIODS[p];
        pills.forEach((pill, i) => pill.classList.toggle('on', i === period.pill));
        mark.style.setProperty('--x', `${pills[period.pill].offsetLeft}px`);
        mark.style.setProperty('--w', `${pills[period.pill].offsetWidth}px`);
        node.querySelector('.lv-range').textContent = period.range;
        tiles.forEach((tile, i) => {
          const d = period.d[i], delta = tile.querySelector('.lv-delta'), svg = tile.querySelector('svg');
          delta.className = `lv-delta${d < 0 ? ' down' : ''}`;
          delta.innerHTML = `${d < 0 ? '▼' : '▲'} ${Math.abs(d).toFixed(1)}%<small>vs last period</small>`;
          svg.querySelector('path').setAttribute('d', spark(p * 10 + i + 1, d));
          svg.classList.remove('lv-draw');
          if (animate) { void svg.getBoundingClientRect(); svg.classList.add('lv-draw'); }
        });
        const from = shown, to = period.v;
        const paint = (k) => tiles.forEach((tile, i) => { tile.querySelector('.lv-value').textContent = KPIS[i][1](from[i] + (to[i] - from[i]) * k); });
        if (animate) tween(800, paint); else paint(1);
        shown = to.slice();
      };
      const next = () => { at = (at + 1) % PERIODS.length; show(at, true); timer = window.setTimeout(next, 3600); };
      return {
        node,
        rest: () => show(0, false),
        play: () => {
          if (!started) { started = true; node.classList.add('lv-play'); show(0, true); }
          window.clearTimeout(timer);
          timer = window.setTimeout(next, 3600);
        },
        pause: () => window.clearTimeout(timer),
      };
    };

    // 02: sessions by channel, with each change marked and its result shown in turn
    const DAYS = 14;
    const SESSIONS = Array.from({ length: DAYS }, (_, i) => {
      const r = rand(i + 101), quiz = i >= 4 && i <= 8;
      return {
        parts: [420 * (quiz ? 1.45 : 1) * (0.92 + r() * 0.16), 180 * (0.9 + r() * 0.2), 210 * (0.9 + r() * 0.2), (i === 2 || i === 11 ? 210 : 70) * (0.85 + r() * 0.3)],
        conv: quiz ? 1.55 + r() * 0.25 : i === 9 ? 2.35 : 2.8 + r() * 0.3,
      };
    });
    const CHANGES = [
      { at: 2, until: 4, icon: '▲', date: '3 Oct', title: 'Checkout upsell: Cold Brew on bag orders', text: 'Average order value up about 6%, checkout completion steady. Kept.' },
      { at: 4, until: 9, icon: '■', date: '5 Oct', title: 'Roast finder quiz as the Meta landing page', text: 'Sessions up 45%, but paid social conversion nearly halved.' },
      { at: 9, until: 14, icon: '★', date: '10 Oct', title: 'Quiz pulled, ads back to Midnight Oil', text: 'Conversion recovered within two days.' },
    ];
    const bars = (rows, colours) => {
      const max = Math.max(...rows.map((d) => d.parts.reduce((s, v) => s + v, 0)));
      return rows.map((d, i) => `<div class="lv-col" style="--h:${((d.parts.reduce((s, v) => s + v, 0) / max) * 100).toFixed(1)}%;--i:${i}">${d.parts.map((v, k) => `<b style="--v:${Math.round(v)};background:${colours[k]}"></b>`).join('')}</div>`).join('');
    };
    const line = (values, lo, hi, cls = '') => `<polyline class="${cls}" points="${values.map((v, i) => `${(((i + 0.5) / values.length) * 100).toFixed(2)},${(96 - ((v - lo) / (hi - lo)) * 76).toFixed(2)}`).join(' ')}"/>`;
    const changes = () => {
      const node = make(`<div class="lv lv-changes"><div class="lv-bar"><span class="lv-title">Sessions by channel and conversion rate</span><span class="lv-legend">${legend([['Paid social', 'var(--lv-1)'], ['Paid search', 'var(--lv-2)'], ['Organic', 'var(--lv-3)'], ['Email', 'var(--lv-4)']])}</span></div><div class="lv-chart"><div class="lv-shade"></div><div class="lv-bars" style="--n:${DAYS}">${bars(SESSIONS, ['var(--lv-1)', 'var(--lv-2)', 'var(--lv-3)', 'var(--lv-4)'])}</div>${CHANGES.map((c, k) => `<span class="lv-mark" style="--x:${(((c.at + 0.5) / DAYS) * 100).toFixed(2)}%;--k:${k}"><i>${c.icon}</i></span>`).join('')}<div class="lv-callout"><b></b><span></span></div></div><div class="lv-line"><span class="lv-note">Conversion rate</span><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${line(SESSIONS.map((d) => d.conv), 1, 3.5)}</svg></div><div class="lv-dates" style="--n:${DAYS}">${dates(DAYS, 3)}</div></div>`);
      const chart = node.querySelector('.lv-chart'), callout = node.querySelector('.lv-callout'), shade = node.querySelector('.lv-shade');
      const marks = [...node.querySelectorAll('.lv-mark')];
      let at = 1, timer = 0, started = false;
      const focus = (k) => {
        const c = CHANGES[k];
        marks.forEach((m, j) => m.classList.toggle('on', j === k));
        shade.style.left = `${(c.at / DAYS) * 100}%`;
        shade.style.width = `${((c.until - c.at) / DAYS) * 100}%`;
        callout.querySelector('b').textContent = `${c.icon} ${c.date} · ${c.title}`;
        callout.querySelector('span').textContent = c.text;
        place(callout, chart, (c.at + 0.5) / DAYS);
        node.classList.add('lv-focus');
      };
      const next = () => { at = (at + 1) % CHANGES.length; focus(at); timer = window.setTimeout(next, 4200); };
      return {
        node,
        rest: () => focus(1),
        play: () => {
          window.clearTimeout(timer);
          if (!started) { started = true; node.classList.add('lv-play'); timer = window.setTimeout(() => { focus(at); timer = window.setTimeout(next, 4200); }, 1700); return; }
          timer = window.setTimeout(next, 2400);
        },
        pause: () => window.clearTimeout(timer),
      };
    };

    // 03: ad spend by platform, with a cursor sweeping the days
    const SPEND = Array.from({ length: 10 }, (_, i) => {
      const r = rand(i + 301);
      return { parts: [430 * (0.88 + r() * 0.24), 150 * (0.85 + r() * 0.3), 140 * (0.9 + r() * 0.2)], mer: 2.05 + r() * 0.35, roas: 1.48 + r() * 0.25 };
    });
    const STATS_ALL = [
      ['Ad spend', 7204, (v) => gbp(Math.round(v)), 'prev £6,838'],
      ['MER, blended', 2.21, (v) => `${v.toFixed(2)}x`, 'prev 1.84x'],
      ['Cost per new customer', 38.94, (v) => gbp(v, 2), 'prev £42.47'],
      ['Platform ROAS', 1.64, (v) => `${v.toFixed(2)}x`, 'prev 1.32x'],
    ];
    const ads = (figure) => {
      // The app's page says cost per order, which is what the app shows
      const STATS = figure && figure.dataset.metric === 'cpo' ? STATS_ALL.map((st, i) => (i === 2 ? ['Cost per order', 14.78, (v) => gbp(v, 2), 'prev £16.20'] : st)) : STATS_ALL;
      const node = make(`<div class="lv lv-ads"><div class="lv-bar"><span class="lv-title">Spend, MER, ${STATS[2][0].toLowerCase()} and ROAS</span><span class="lv-legend">${legend([['Meta', 'var(--lv-1)'], ['TikTok', 'var(--lv-2)'], ['Google', 'var(--lv-3)'], ['MER', '#1d1a1b', true], ['ROAS', 'var(--lv-4)', true]])}</span></div><div class="lv-stats">${STATS.map(([label, , , prev], i) => `<div style="--i:${i}"><span class="lv-label">${label}</span><b class="lv-value"></b><span class="lv-note">${prev}</span></div>`).join('')}</div><div class="lv-chart"><div class="lv-bars" style="--n:10">${bars(SPEND, ['var(--lv-1)', 'var(--lv-2)', 'var(--lv-3)'])}</div>${['▲', '■', '★'].map((icon, k) => `<span class="lv-mark" style="--x:${(((k * 3 + 0.5) / 10) * 100).toFixed(2)}%;--k:${k}"><i>${icon}</i></span>`).join('')}<span class="lv-cross"></span><div class="lv-tip"></div></div><div class="lv-line"><span class="lv-note">Efficiency, 7 day trailing</span><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${line(SPEND.map((d) => d.mer), 0, 3)}${line(SPEND.map((d) => d.roas), 0, 3, 'alt')}</svg></div><div class="lv-dates" style="--n:10">${dates(10, 3)}</div></div>`);
      const values = [...node.querySelectorAll('.lv-stats .lv-value')];
      const chart = node.querySelector('.lv-chart'), cross = node.querySelector('.lv-cross'), tip = node.querySelector('.lv-tip');
      let day = 0, timer = 0, started = false;
      const count = (animate) => {
        const paint = (k) => values.forEach((el, i) => { el.textContent = STATS[i][2](STATS[i][1] * k); });
        if (animate) tween(1100, paint); else paint(1);
      };
      const sweep = () => {
        const d = SPEND[day], x = (day + 0.5) / 10;
        cross.style.setProperty('--x', `${(x * 100).toFixed(2)}%`);
        tip.innerHTML = `<b>${day + 1} Oct</b>${['Meta', 'TikTok', 'Google'].map((name, k) => `<div><span>${name}</span>${gbp(Math.round(d.parts[k]))}</div>`).join('')}<div><span>MER</span>${d.mer.toFixed(2)}x</div>`;
        place(tip, chart, x);
        node.classList.add('lv-sweep');
        day = (day + 1) % SPEND.length;
        timer = window.setTimeout(sweep, 1300);
      };
      return {
        node,
        rest: () => count(false),
        play: () => {
          window.clearTimeout(timer);
          if (!started) { started = true; node.classList.add('lv-play'); count(true); timer = window.setTimeout(sweep, 2000); return; }
          sweep();
        },
        pause: () => { window.clearTimeout(timer); node.classList.remove('lv-sweep'); },
      };
    };

    // 04: the board, where a change moves to closed and its result is written up
    const card = ([title, icon, date, outcome], extra = '', i = 0) => `<div class="lv-card${extra}" style="--i:${i}"><p>${title}</p><span class="lv-tag">${icon} ${date}</span>${outcome ? `<div class="lv-out-wrap"><div class="lv-out"><span>${outcome}</span></div></div>` : ''}</div>`;
    const LANES = [
      ['Open', '#a39b9c', [['SMS welcome flow with the roast finder link', '▲', '18 Oct'], ['Split AI referral traffic out in GA4', '■', '16 Oct']]],
      ['In progress', 'var(--lv-1)', [['Hook test: roastery film, two opening lines', '★', '11 Oct'], ['Single serve trial packs live', '▲', '12 Oct']]],
      ['Blocked', 'var(--lv-down)', [['Build your own duo on product pages', '■', '14 Oct']]],
      ['Closed', 'var(--lv-up)', [['Roast finder quiz as the Meta landing page', '■', '5 Oct', 'Sessions up 45%, conversion nearly halved. Pulled after 5 days.'], ['Checkout upsell: Cold Brew on bag orders', '▲', '3 Oct', 'Average order value up about 6%. Kept.']]],
    ];
    const MOVER = ['Pull the quiz, ads back to the Midnight Oil page', '★', '10 Oct', 'Conversion recovered within two days.'];
    const board = () => {
      const node = make(`<div class="lv lv-boardp"><div class="lv-bar"><span class="lv-title">Changes board</span><span class="lv-note">Every card is a marker on the charts</span></div><div class="lv-board">${LANES.map(([name, dot, cards], k) => `<div class="lv-lane"><p class="lv-lane-h" style="--dot:${dot}">${name} <em></em></p><div class="lv-stack">${cards.map((c, i) => card(c, k === 3 ? ' done' : '', k * 2 + i)).join('')}${k === 1 ? card(MOVER, ' lv-mover') : ''}</div></div>`).join('')}</div></div>`);
      const stacks = [...node.querySelectorAll('.lv-stack')], mover = node.querySelector('.lv-mover');
      let closed = false, timer = 0, started = false;
      const counts = () => node.querySelectorAll('.lv-lane').forEach((lane) => { lane.querySelector('em').textContent = lane.querySelectorAll('.lv-card').length; });
      // Moves the card and lets every card glide from where it was (first, last, invert, play).
      const move = (toClosed, glide) => {
        const cards = [...node.querySelectorAll('.lv-card')];
        const first = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
        if (toClosed) stacks[3].prepend(mover); else stacks[1].append(mover);
        counts();
        if (!glide) return;
        cards.forEach((c) => {
          const a = first.get(c), b = c.getBoundingClientRect();
          if (a.left === b.left && a.top === b.top) return;
          c.style.transition = 'none';
          c.style.transform = `translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        });
        void node.getBoundingClientRect();
        cards.forEach((c) => { c.style.transition = ''; c.style.transform = ''; });
      };
      const step = () => {
        if (!closed) {
          closed = true;
          mover.classList.add('moving');
          move(true, true);
          timer = window.setTimeout(() => { mover.classList.remove('moving'); mover.classList.add('done'); timer = window.setTimeout(step, 4200); }, 800);
        } else {
          closed = false;
          mover.style.opacity = '0';
          timer = window.setTimeout(() => {
            mover.classList.remove('done');
            move(false, false);
            mover.style.opacity = '';
            timer = window.setTimeout(step, 1600);
          }, 350);
        }
      };
      counts();
      return {
        node,
        rest: () => { closed = true; move(true, false); mover.classList.add('done'); },
        play: () => {
          window.clearTimeout(timer);
          if (!started) { started = true; node.classList.add('lv-play'); }
          timer = window.setTimeout(step, closed ? 3000 : 1400);
        },
        pause: () => window.clearTimeout(timer),
      };
    };


    // 05: every ad, with the platform filter stepping through All, Meta, TikTok and Google
    const ADS = [
      ['S04 H01 | Founder story | 9:16', 'Prospecting', 'Meta', ['S04', 'H01'], 2579, 190, 2.23, '19.0%'],
      ['S06 H02 | Morning routine POV', 'Prospecting', 'TikTok', ['S06', 'H02'], 2227, 140, 1.91, '31.0%'],
      ['S03 H04 | Unboxing UGC', 'Creators', 'Meta', ['S03', 'H04'], 1758, 95, 1.63, '21.0%'],
      ['Performance Max | All products', 'Shopping', 'Google', [], 1641, 115, 2.13, 'n/a'],
      ['Static | Bestseller bundle', 'Retargeting', 'Meta', [], 1407, 44, 0.94, '33.0%'],
      ['S08 H01 | 30 day review', 'Retargeting', 'TikTok', ['S08', 'H01'], 1172, 34, 0.88, '27.0%'],
      ['S05 H03 | Five star reviews', 'Reviews', 'Meta', ['S05', 'H03'], 938, 69, 2.23, '33.0%'],
    ];
    const PLATFORM = { Meta: 'var(--lv-1)', TikTok: 'var(--lv-2)', Google: 'var(--lv-3)' };
    const FILTERS = ['All', 'Meta', 'TikTok', 'Google'];
    const creatives = () => {
      const top = ADS[0][4];
      const node = make(`<div class="lv lv-creatives"><div class="lv-bar"><span class="lv-title">Creative performance</span><span class="lv-pills"><i></i>${FILTERS.map((f) => `<span>${f}</span>`).join('')}</span></div><div class="lv-table"><div class="lv-row lv-head"><span>Ad</span><span>Script</span><span>Spend</span><span>Purchases</span><span>ROAS</span><span>Thumbstop</span></div>${ADS.map(([name, set, platform, tags, spend, buys, roas, thumb], i) => `<div class="lv-row" data-p="${platform}" style="--i:${i}"><span class="lv-ad"><b><i style="background:${PLATFORM[platform]}"></i>${name}</b><small>${platform} · ${set}</small></span><span>${tags.length ? tags.map((t) => `<em class="lv-pill">${t}</em>`).join('') : '<em class="lv-none">untagged</em>'}</span><span class="lv-spend"><s style="--w:${((spend / top) * 100).toFixed(1)}%;--c:${PLATFORM[platform]}"></s>${gbp(spend)}</span><span>${buys}</span><span class="${roas < 1 ? 'lv-low' : ''}">${roas.toFixed(2)}x</span><span>${thumb}</span></div>`).join('')}</div></div>`);
      const pills = [...node.querySelectorAll('.lv-pills span')], mark = node.querySelector('.lv-pills i');
      const rows = [...node.querySelectorAll('.lv-row[data-p]')];
      let at = 0, timer = 0, started = false;
      const show = (k, animate) => {
        pills.forEach((pill, i) => pill.classList.toggle('on', i === k));
        mark.style.setProperty('--x', `${pills[k].offsetLeft}px`);
        mark.style.setProperty('--w', `${pills[k].offsetWidth}px`);
        let n = 0;
        rows.forEach((row) => {
          const on = k === 0 || row.dataset.p === FILTERS[k];
          row.classList.toggle('off', !on);
          row.classList.remove('in');
          if (on && animate) { row.style.setProperty('--i', n++); void row.offsetWidth; row.classList.add('in'); }
        });
      };
      const next = () => { at = (at + 1) % FILTERS.length; show(at, true); timer = window.setTimeout(next, 3200); };
      return {
        node,
        rest: () => show(0, false),
        play: () => {
          window.clearTimeout(timer);
          if (!started) { started = true; node.classList.add('lv-play'); show(0, true); }
          timer = window.setTimeout(next, 3400);
        },
        pause: () => window.clearTimeout(timer),
      };
    };

    // 06: email and SMS revenue, with each send marked and its result shown in turn
    const MAIL_DAYS = 14;
    const MAIL = Array.from({ length: MAIL_DAYS }, (_, i) => {
      const r = rand(i + 501);
      return { parts: [i === 0 ? 645 : i === 6 ? 128.76 : 0, 54 * (0.75 + r() * 0.5)] };
    });
    const SENDS = [
      { at: 0, icon: '■', date: '1 Oct', title: 'SMS · Back in stock: the bestsellers', text: '4,300 recipients, 21 orders, £645.' },
      { at: 6, icon: '■', date: '7 Oct', title: 'Email · Brewing guide newsletter', text: '6,120 recipients, 5 orders, £128.76.' },
      { at: 9, icon: '●', date: 'Flow', title: 'Abandoned checkout', text: 'The top flow this month: 29 orders, £867.' },
    ];
    const MAIL_STATS = [
      ['Attributed revenue', 1530, (v) => gbp(Math.round(v)), '18.2% of net sales'],
      ['From campaigns', 773.76, (v) => gbp(v, 2), '2 sends in this range'],
      ['From flows', 755.9, (v) => gbp(v, 2), 'top: Abandoned checkout'],
      ['Attributed orders', 19, (v) => Math.round(v).toString(), '6.8% of orders'],
    ];
    const email = () => {
      const node = make(`<div class="lv lv-email"><div class="lv-bar"><span class="lv-title">Email and SMS</span><span class="lv-legend">${legend([['Campaigns', 'var(--lv-1)'], ['Flows', 'var(--lv-3)']])}</span></div><div class="lv-stats">${MAIL_STATS.map(([label, , , note], i) => `<div style="--i:${i}"><span class="lv-label">${label}</span><b class="lv-value"></b><span class="lv-note">${note}</span></div>`).join('')}</div><div class="lv-chart"><div class="lv-shade"></div><div class="lv-bars" style="--n:${MAIL_DAYS}">${bars(MAIL, ['var(--lv-1)', 'var(--lv-3)'])}</div>${SENDS.map((c, k) => `<span class="lv-mark" style="--x:${(((c.at + 0.5) / MAIL_DAYS) * 100).toFixed(2)}%;--k:${k}"><i>${c.icon}</i></span>`).join('')}<div class="lv-callout"><b></b><span></span></div></div><div class="lv-dates" style="--n:${MAIL_DAYS}">${dates(MAIL_DAYS, 3)}</div></div>`);
      const values = [...node.querySelectorAll('.lv-stats .lv-value')];
      const chart = node.querySelector('.lv-chart'), callout = node.querySelector('.lv-callout'), shade = node.querySelector('.lv-shade');
      const marks = [...node.querySelectorAll('.lv-mark')];
      let at = 0, timer = 0, started = false;
      const count = (animate) => {
        const paint = (k) => values.forEach((el, i) => { el.textContent = MAIL_STATS[i][2](MAIL_STATS[i][1] * k); });
        if (animate) tween(1100, paint); else paint(1);
      };
      const focus = (k) => {
        const c = SENDS[k];
        marks.forEach((m, j) => m.classList.toggle('on', j === k));
        shade.style.left = `${(c.at / MAIL_DAYS) * 100}%`;
        shade.style.width = `${(1 / MAIL_DAYS) * 100}%`;
        callout.querySelector('b').textContent = `${c.icon} ${c.date} · ${c.title}`;
        callout.querySelector('span').textContent = c.text;
        place(callout, chart, (c.at + 0.5) / MAIL_DAYS);
        node.classList.add('lv-focus');
      };
      const next = () => { at = (at + 1) % SENDS.length; focus(at); timer = window.setTimeout(next, 3800); };
      return {
        node,
        rest: () => { count(false); focus(0); },
        play: () => {
          window.clearTimeout(timer);
          if (!started) { started = true; node.classList.add('lv-play'); count(true); timer = window.setTimeout(() => { focus(at); timer = window.setTimeout(next, 3800); }, 1700); return; }
          timer = window.setTimeout(next, 2400);
        },
        pause: () => window.clearTimeout(timer),
      };
    };

    const builders = { kpis, changes, ads, board, creatives, email };
    liveFigures.forEach((figure) => {
      const build = builders[figure.dataset.live];
      if (!build) return;
      const img = figure.querySelector('img');
      const panel = build(figure);
      panel.node.setAttribute('role', 'img');
      if (img && img.alt) panel.node.setAttribute('aria-label', img.alt);
      if (img) img.replaceWith(panel.node); else figure.prepend(panel.node);
      figure.classList.add('has-live');
      if (!canMove || !('IntersectionObserver' in window)) { panel.rest(); return; }
      panel.node.classList.add('lv-anim');
      new IntersectionObserver(([entry]) => { if (entry.isIntersecting) panel.play(); else panel.pause(); }, { threshold: 0.35 }).observe(panel.node);
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
