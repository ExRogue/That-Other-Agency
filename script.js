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
    let sending = false;
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
        status.className = 'form-status ok';
        status.textContent = 'Thanks, your enquiry has been sent. We’ll get back to you within one business day.';
      } catch {
        status.className = 'form-status err';
        status.textContent = 'We couldn’t confirm your enquiry was sent. Your details are still here. Please try again or email hello@thatotheragency.co.uk.';
      } finally {
        window.clearTimeout(timeout);
        sending = false;
        button.disabled = false;
        button.textContent = 'Send enquiry';
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

  if (canMove && 'IntersectionObserver' in window) {
    // Reveal on scroll. Content stays visible if this never runs.
    const targets = document.querySelectorAll('.page-hero > *, .section-head, .section-heading-row > :not(.section-head), .card, .work-card, .system-card, .review, .split > *, .closing-cta > *, .service-row, .statement > *, .quote-big, .quote-small, .brand-list, .post-image, main > section > details');
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
