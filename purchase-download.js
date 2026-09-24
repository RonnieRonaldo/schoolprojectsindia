/* Secure download recovery. Payment and product validation remain on the Worker. */
(function () {
  'use strict';
  const c = JSON.parse(document.currentScript.dataset.purchase);
  const buy = document.getElementById(c.button);
  const status = document.getElementById('checkoutStatus');
  const area = document.getElementById('downloadArea');
  const link = document.getElementById('downloadLink');
  const valid = id => typeof id === 'string' && /^txn_[a-z0-9]+$/.test(id);
  let transaction = null, checking = false, paid = false, paddleReady = false;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const controls = document.createElement('div');
  controls.style.cssText = 'text-align:center;margin:12px 0';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Check my payment again';
  retry.style.cssText = 'padding:12px 18px;cursor:pointer;margin:8px';
  retry.hidden = true;
  const help = document.createElement('a');
  help.href = '/contact.html';
  help.textContent = 'Contact us about a paid order';
  help.style.cssText = 'display:inline-block;margin:8px;text-decoration:underline';
  controls.append(retry, help);
  status.insertAdjacentElement('afterend', controls);
  function remember(id) {
    if (!valid(id)) return;
    transaction = id;
    try { localStorage.setItem(c.storage, id); } catch (_) { /* Memory still works. */ }
  }
  const page = new URL(location.href);
  const returned = ['transaction_id', 'transactionId', '_ptxn'].map(k => page.searchParams.get(k)).find(valid);
  if (returned) remember(returned);
  else { try { const saved = localStorage.getItem(c.storage); if (valid(saved)) transaction = saved; } catch (_) {} }
  // Keep recovery parameters until verification succeeds, including when storage is blocked.
  function message(text) { status.textContent = text; }
  function fail(text) {
    message(text + ' If you have paid, please do not purchase again. Retry below or contact us with your Paddle receipt.');
    retry.hidden = !valid(transaction);
  }
  async function claim() {
    if (checking || !valid(transaction)) return;
    const id = transaction;
    checking = true; retry.hidden = true; buy.disabled = true;
    message('Checking your payment. Please do not purchase again.');
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let response, data;
        try {
          response = await fetch(c.worker + '/claim', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({transaction_id: id}), signal: controller.signal
          });
          data = await response.json();
        } catch (_) {
          if (attempt === 4) { fail('We could not connect to the download service.'); return; }
          message('Connection interrupted. Retrying your payment check (' + (attempt + 2) + '/5). Please do not purchase again.');
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        } finally { clearTimeout(timer); }
        if (response.ok && data.status === 'ready') {
          if (data.product !== c.product) { fail('This payment belongs to a different product.'); return; }
          let url;
          try { url = new URL(data.download_url); } catch (_) { fail('The download link could not be verified.'); return; }
          if (url.origin !== c.worker || !url.pathname.startsWith('/download/')) {
            fail('The download link could not be verified.'); return;
          }
          link.href = url.href; area.style.display = 'block'; area.hidden = false;
          paid = true;
          message('Payment verified. Your secure PDF is ready.');
          try {
            ['transaction_id', 'transactionId', '_ptxn'].forEach(k => page.searchParams.delete(k));
            history.replaceState({}, '', page.pathname + page.search + page.hash);
          } catch (_) {}
          area.scrollIntoView({behavior: 'smooth', block: 'center'});
          return;
        }
        if (response.status === 409 || data.status === 'pending' || response.status === 429 || response.status >= 500) {
          if (attempt < 4) {
            message('Payment confirmation is not ready yet. Checking again (' + (attempt + 2) + '/5). Please do not purchase again.');
            await new Promise(resolve => setTimeout(resolve, 3000)); continue;
          }
        }
        fail('We could not verify this purchase yet.'); return;
      }
    } catch (_) { fail('We could not retrieve your download.'); }
    finally { checking = false; buy.disabled = paid || !paddleReady; }
  }
  retry.addEventListener('click', claim);
  try {
    if (window.Paddle) {
      window.Paddle.Initialize({token: c.token, eventCallback(event) {
        const data = event.data || {};
        const id = data.transaction_id || data.transactionId || data.transaction?.id || data.id;
        if (valid(id)) remember(id);
        if (event.name === 'checkout.completed') {
          paid = true; buy.disabled = true;
          if (valid(transaction)) claim();
          else fail('Payment was completed, but the download reference is missing.');
        }
      }});
      paddleReady = true;
    }
  } catch (_) { paddleReady = false; }
  buy.disabled = !paddleReady;
  buy.addEventListener('click', () => {
    if (checking || paid) return;
    if (!paddleReady) { fail('Checkout could not load. Please refresh the page.'); return; }
    try {
      window.Paddle.Checkout.open({items: [{priceId: c.price, quantity: 1}], settings: {successUrl: c.success}});
    } catch (_) { fail('Checkout could not open. Please refresh the page.'); }
  });
  // Recovery must also work when Paddle.js or browser storage is unavailable.
  if (transaction) claim();
  else if (page.searchParams.get('payment') === 'success') {
    paid = true; buy.disabled = true;
    fail('The purchase reference is missing. We can help recover your download.');
  } else if (!paddleReady) message('Checkout could not load. Please refresh the page, or contact us if you have already paid.');
})();
