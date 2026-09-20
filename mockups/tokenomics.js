/* Synthetic population for the Tokenomics mockups. Seeded, so every render
   produces the same 12,000 fictional users, the same split, and the same
   counts. Complexity is a 0..1 composite; spend is monthly tokens, log-normal,
   correlated with complexity plus a deliberate "frontier prices on light
   work" tail. Nothing here comes from real telemetry. */
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260919);
  const gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  const N = 12000;
  const users = [];
  for (let i = 0; i < N; i++) {
    // complexity: mixture, most users light-to-medium, a heavy minority
    let c = rnd() < 0.18 ? 0.72 + 0.16 * gauss() : 0.30 + 0.17 * gauss();
    c = Math.min(1, Math.max(0, c));
    // spend: log-normal, rises with complexity, plus a leakage tail on light work
    let lg = 3.6 + 1.9 * c + 0.55 * gauss();
    if (c < 0.5 && rnd() < 0.42) lg += 1.1 + 0.5 * rnd();
    const tokens = Math.round(Math.pow(10, lg));
    users.push({ c, tokens });
  }
  const sorted = users.map(u => u.tokens).sort((a, b) => a - b);
  const median = sorted[Math.floor(N / 2)];
  const q = { cl: 0, ch: 0, sl: 0, sh: 0 };
  users.forEach(u => {
    const complex = u.c > 0.5, high = u.tokens > median;
    if (complex && !high) q.cl++; else if (complex && high) q.ch++; else if (!complex && !high) q.sl++; else q.sh++;
  });
  const fmt = n => n.toLocaleString('en-US');
  const pct = n => (100 * n / N).toFixed(1) + '%';
  window.TOKENOMICS = { users, N, median, q, fmt, pct };

  // fill any [data-q] / [data-median] slots on the page
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-q]').forEach(el => {
      const k = el.getAttribute('data-q');
      el.textContent = fmt(q[k]) + ' users, ' + pct(q[k]);
    });
    document.querySelectorAll('[data-median]').forEach(el => { el.textContent = fmt(median); });
    document.querySelectorAll('[data-n]').forEach(el => { el.textContent = fmt(N); });
  });

  /* Draw dots into an <svg class="scatter"> using its data-* frame:
     x0,x1 = pixel range, lgmin,lgmax = log10 token range; y0,y1 = pixel range
     for complexity 0..1 (y0 is the bottom). Subsample to keep it light. */
  window.drawScatter = function (svg, every, r) {
    const x0 = +svg.dataset.x0, x1 = +svg.dataset.x1, y0 = +svg.dataset.y0, y1 = +svg.dataset.y1;
    const lmin = +svg.dataset.lgmin, lmax = +svg.dataset.lgmax;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'dots');
    let i = 0;
    for (const u of users) {
      if (i++ % every) continue;
      const lg = Math.log10(u.tokens);
      const x = x0 + (x1 - x0) * (lg - lmin) / (lmax - lmin);
      const y = y0 + (y1 - y0) * u.c;
      if (x < x0 || x > x1) continue;
      const d = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      d.setAttribute('cx', x.toFixed(1)); d.setAttribute('cy', y.toFixed(1)); d.setAttribute('r', r);
      d.setAttribute('class', (u.c <= 0.5 && u.tokens > median) ? 'leak' : 'dot');
      g.appendChild(d);
    }
    svg.appendChild(g);
    const mx = x0 + (x1 - x0) * (Math.log10(median) - lmin) / (lmax - lmin);
    return mx;
  };
})();
