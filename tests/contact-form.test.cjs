const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync(require('node:path').join(__dirname, '../script.js'), 'utf8');

function setup(fetchImpl, { valid = true, honey = '' } = {}) {
  let submit, timeout, calls = 0, resets = 0;
  const status = { className: '', textContent: '' };
  const button = { disabled: false, textContent: 'Send enquiry' };
  const form = {
    action: 'https://formsubmit.co/hello@thatotheragency.co.uk',
    querySelector: (selector) => selector === '[type="submit"]' ? button : status,
    reportValidity: () => valid,
    addEventListener: (_, handler) => { submit = handler; },
    setAttribute() {}, removeAttribute() {}, reset: () => resets++,
  };
  vm.runInNewContext(source, {
    document: { querySelector: (s) => s === '[data-contact-form]' ? form : null, querySelectorAll: () => [] },
    window: { setTimeout: (fn) => { timeout = fn; return 1; }, clearTimeout() {} },
    URL, AbortController,
    FormData: class { get() { return honey; } },
    fetch: (...args) => { calls++; return fetchImpl(...args); },
  });
  return { status, button, submit: () => submit({ preventDefault() {} }), expire: () => timeout(), get calls() { return calls; }, get resets() { return resets; } };
}

test('accepted enquiries reset the form and report success', async () => {
  for (const success of [true, 'true']) {
    const s = setup(async (url, options) => {
      assert.equal(url, 'https://formsubmit.co/ajax/hello@thatotheragency.co.uk');
      assert.equal(options.method, 'POST');
      return { ok: true, json: async () => ({ success }) };
    });
    await s.submit();
    assert.equal(s.resets, 1); assert.equal(s.status.className, 'form-status ok'); assert.equal(s.button.disabled, false);
  }
});
test('HTTP 200 rejection must not claim success or erase the enquiry', async () => {
  const s = setup(async () => ({ ok: true, json: async () => ({ success: 'false', message: 'Not activated' }) }));
  await s.submit();
  assert.equal(s.resets, 0); assert.equal(s.status.className, 'form-status err'); assert.equal(s.button.disabled, false);
});
test('HTTP errors, malformed responses and network failures keep entered details', async () => {
  for (const response of [
    async () => ({ ok: false, json: async () => ({ success: true }) }),
    async () => ({ ok: true, json: async () => { throw Error('Invalid JSON'); } }),
    async () => { throw Error('Offline'); },
  ]) {
    const s = setup(response); await s.submit();
    assert.equal(s.resets, 0); assert.equal(s.status.className, 'form-status err'); assert.equal(s.button.disabled, false);
  }
});
test('prevent duplicate enquiries while a request is in flight', async () => {
  let finish;
  const s = setup(() => new Promise(resolve => { finish = resolve; }));
  const pending = s.submit(); await s.submit();
  assert.equal(s.calls, 1); assert.equal(s.button.disabled, true);
  finish({ ok: true, json: async () => ({ success: true }) }); await pending;
  assert.equal(s.button.disabled, false);
});
test('timeout aborts the request and lets the visitor retry', async () => {
  const s = setup((_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(Error('Aborted')))));
  const pending = s.submit(); s.expire(); await pending;
  assert.equal(s.status.className, 'form-status err'); assert.equal(s.button.disabled, false); assert.equal(s.resets, 0);
});
test('invalid and honeypot forms do not send', async () => {
  for (const options of [{ valid: false }, { honey: 'spam' }]) {
    const s = setup(async () => { throw Error('Must not call'); }, options);
    await s.submit(); assert.equal(s.calls, 0);
  }
});
