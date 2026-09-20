/* Motion for the mockups. The animations live in each mockup's stylesheet
   under `html.play`; nothing moves unless the page is opened with ?play or a
   parent window posts "play". A "replay" message restarts the sequence.
   shoot.mjs never sets the flag, so the static tile images stay unchanged. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function play() {
    if (reduce) return;
    root.classList.remove('play');
    void root.offsetWidth; /* restart every animation from its first frame */
    root.classList.add('play');
  }

  if (/[?&]play\b/.test(location.search)) play();

  window.addEventListener('message', function (e) {
    if (e.data === 'play' || e.data === 'replay') play();
  });
})();
