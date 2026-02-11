/* Centralized loader for the external ad tag. */
(function () {
  var TAG_URL = "https://3nbf4.com/act/files/tag.min.js?z=10599355";

  if (window.__seccExternalTagLoaded) {
    return;
  }
  window.__seccExternalTagLoaded = true;

  if (document.querySelector('script[src="' + TAG_URL + '"]')) {
    return;
  }

  var script = document.createElement("script");
  script.src = TAG_URL;
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  (document.head || document.documentElement).appendChild(script);
})();
