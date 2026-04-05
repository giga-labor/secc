(function () {
  var w = Math.max(200, Math.floor(document.documentElement.clientWidth || window.innerWidth || 320));
  var h = Math.max(50, Math.floor(document.documentElement.clientHeight || window.innerHeight || 50));
  window.atOptions = {
    key: '49e69f729b9a38eace8bec52c40a4ccb',
    format: 'iframe',
    height: h,
    width: w,
    params: {}
  };
  var s = document.createElement('script');
  s.src = 'https://www.highperformanceformat.com/49e69f729b9a38eace8bec52c40a4ccb/invoke.js';
  s.async = false;
  s.setAttribute('data-cfasync', 'false');
  document.body.appendChild(s);
})();
