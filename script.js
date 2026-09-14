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
    window.matchMedia('(min-width: 761px)').addEventListener('change', () => setOpen(false));
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
        status.textContent = 'Thanks — your enquiry has been submitted. We’ll get back to you within one business day.';
      } catch {
        status.className = 'form-status err';
        status.textContent = 'We couldn’t confirm your enquiry was sent. Your details are still here. Please try again or email hello.that.other.agency@gmail.com.';
      } finally {
        window.clearTimeout(timeout);
        sending = false;
        button.disabled = false;
        button.textContent = 'Send enquiry';
        form.removeAttribute('aria-busy');
      }
    });
  }
})();
