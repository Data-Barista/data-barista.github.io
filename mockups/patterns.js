/* Draws the box around the top row and the arrow from it down to the read
   line, measured from the rendered layout so the two pages can size the
   grid differently. Runs on load and on resize. */
(function () {
  function layout() {
    var heat = document.getElementById('heat');
    var box = document.getElementById('box');
    var read = document.getElementById('read');
    var svg = document.getElementById('arrow');
    var path = document.getElementById('arrowPath');
    if (!heat || !box || !read || !svg || !path) return;

    var cells = heat.querySelectorAll('.r1 .c');
    var first = cells[0].getBoundingClientRect();
    var last = cells[cells.length - 1].getBoundingClientRect();
    var hr = heat.getBoundingClientRect();
    var pad = 5;
    box.style.left = (first.left - hr.left - pad) + 'px';
    box.style.top = (first.top - hr.top - pad) + 'px';
    box.style.width = (last.right - first.left + 2 * pad) + 'px';
    box.style.height = (first.height + 2 * pad) + 'px';

    var host = svg.parentElement.getBoundingClientRect();
    svg.setAttribute('width', host.width);
    svg.setAttribute('height', host.height);
    var rb = read.querySelector('b').getBoundingClientRect();
    var sx = last.right + pad + 8 - host.left;
    var sy = first.top + first.height / 2 - host.top;
    var ex = hr.right + 72 - host.left;
    var ey = rb.top + rb.height / 2 - host.top;
    var tx = rb.right + 12 - host.left;
    /* One subpath, so the dash-offset draw runs line first, head last. The
       head retraces to the tip so it stays a single continuous stroke. */
    var d = 'M' + sx + ' ' + sy + ' H' + ex + ' V' + ey + ' H' + tx +
            ' L' + (tx + 9) + ' ' + (ey - 7) + ' L' + tx + ' ' + ey + ' L' + (tx + 9) + ' ' + (ey + 7);
    path.setAttribute('d', d);
    path.style.setProperty('--len', path.getTotalLength());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', layout); else layout();
  window.addEventListener('load', layout);
  window.addEventListener('resize', layout);
})();
