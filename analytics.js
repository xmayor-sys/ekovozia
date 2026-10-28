/* Ekovozia - analítica propia con consentimiento de cookies.
   Sin consentimiento no se crea ninguna cookie ni se envía nada. */
(function () {
  "use strict";
  var ENDPOINT = "https://eco.x-mayor.workers.dev";
  var CONSENT_KEY = "ekovozia-consent-v2"; // v2: texto ampliado (modelo del dispositivo), se vuelve a preguntar
  var VID = "ekv_vid";      // visitante: 13 meses
  var SID = "ekv_sid";      // sesión: caduca tras 30 min sin actividad
  var running = false, vid = "", sid = "", ret = 0, act = 0, timers = [], hints = { mdl: "", osv: "" };

  function getConsent() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setConsent(v) { try { if (v) localStorage.setItem(CONSENT_KEY, v); else localStorage.removeItem(CONSENT_KEY); } catch (e) {} }

  function readCookie(n) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + n + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  function writeCookie(n, v, ms) {
    var c = n + "=" + encodeURIComponent(v) + "; path=/; SameSite=Lax" + (location.protocol === "https:" ? "; Secure" : "");
    if (ms) c += "; expires=" + new Date(Date.now() + ms).toUTCString();
    document.cookie = c;
  }
  function killCookie(n) { document.cookie = n + "=; path=/; max-age=0; SameSite=Lax"; }

  function rid() {
    var a = new Uint8Array(12), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += ("0" + a[i].toString(16)).slice(-2);
    return s;
  }

  function touchSession() { writeCookie(SID, sid, 30 * 60 * 1000); }

  function base() {
    var ref = "";
    try {
      if (document.referrer) {
        var h = new URL(document.referrer).hostname;
        if (h && h !== location.hostname) ref = h.replace(/^www\./, "");
      }
    } catch (e) {}
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    return {
      sid: sid, vid: vid, ret: ret, act: act, mdl: hints.mdl, osv: hints.osv,
      path: location.pathname, ref: ref,
      scr: (screen.width || 0) + "x" + (screen.height || 0),
      lang: navigator.language || "", tz: tz
    };
  }

  function send(type, extra) {
    if (!running) return;
    var p = base();
    p.t = type;
    if (extra) for (var k in extra) p[k] = extra[k];
    touchSession();
    try {
      fetch(ENDPOINT + "/track", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify(p),
        keepalive: true,
        credentials: "omit"
      }).catch(function () {});
    } catch (e) {}
  }

  /* Modelo del móvil y versión del sistema (solo Chrome/Edge/Android los ofrecen) */
  function loadHints(cb) {
    var done = false;
    function fin() { if (!done) { done = true; cb(); } }
    setTimeout(fin, 800);
    try {
      var uad = navigator.userAgentData;
      if (uad && uad.getHighEntropyValues) {
        uad.getHighEntropyValues(["model", "platformVersion"]).then(function (v) {
          hints.mdl = v.model || "";
          hints.osv = v.platformVersion || "";
          fin();
        }, fin);
      } else fin();
    } catch (e) { fin(); }
  }

  function start() {
    if (running) return;
    vid = readCookie(VID);
    ret = vid ? 1 : 0;
    if (!vid) vid = rid();
    writeCookie(VID, vid, 395 * 86400000);
    sid = readCookie(SID) || rid();
    running = true;
    loadHints(function () { if (running) send("view"); });
    // tiempo activo: segundos con la pestaña visible
    timers.push(setInterval(function () { if (document.visibilityState === "visible") act++; }, 1000));
    timers.push(setInterval(function () { if (document.visibilityState === "visible") send("ping"); }, 15000));
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onHide);
  }
  function onVis() { if (document.visibilityState === "hidden") send("ping"); }
  function onHide() { send("ping"); }

  function stop() {
    running = false;
    timers.forEach(clearInterval);
    timers = [];
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("pagehide", onHide);
    killCookie(VID);
    killCookie(SID);
  }

  /* ---------- Banner ---------- */
  var banner = null;
  function closeBanner() { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }

  function showBanner() {
    if (banner) return;
    var css = document.createElement("style");
    css.textContent =
      "#ekv-cookies{position:fixed;left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:9999;max-width:560px;margin:0 auto;" +
      "background:var(--surface,#fff);color:var(--ink,#12202C);border:1px solid var(--line,#D3DAE1);border-radius:16px;padding:16px 18px;" +
      "box-shadow:0 12px 40px rgba(0,0,0,.18);font:400 .86rem/1.5 var(--font-body,system-ui,sans-serif)}" +
      "#ekv-cookies strong{display:block;font-size:.95rem;margin-bottom:4px}" +
      "#ekv-cookies p{margin:0 0 12px;color:var(--muted,#5B6B79)}" +
      "#ekv-cookies a{color:var(--accent,#2E4BDB)}" +
      "#ekv-cookies .row{display:flex;gap:8px}" +
      "#ekv-cookies button{flex:1;padding:10px 14px;border-radius:10px;border:1px solid var(--line,#D3DAE1);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}" +
      "#ekv-cookies button:focus-visible{outline:2px solid var(--accent,#2E4BDB);outline-offset:2px}" +
      "#ekv-cookies button.ok{background:var(--accent,#2E4BDB);border-color:var(--accent,#2E4BDB);color:var(--accent-ink,#fff)}";
    document.head.appendChild(css);

    banner = document.createElement("div");
    banner.id = "ekv-cookies";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Cookies");
    banner.innerHTML =
      "<strong>Cookies de estadísticas</strong>" +
      "<p>Usamos cookies propias, sin publicidad, para contar visitas: un identificador anónimo, el país, el dispositivo (tipo, modelo y versión del sistema) y cuánto tiempo usas Ekovozia. " +
      "Puedes aceptarlas o rechazarlas y cambiarlo cuando quieras. <a href=\"/acerca#privacidad\">Más información</a></p>" +
      "<div class=\"row\"><button type=\"button\" data-v=\"no\">Rechazar</button><button type=\"button\" class=\"ok\" data-v=\"yes\">Aceptar</button></div>";
    banner.addEventListener("click", function (e) {
      var v = e.target && e.target.getAttribute && e.target.getAttribute("data-v");
      if (!v) return;
      setConsent(v);
      closeBanner();
      if (v === "yes") start(); else stop();
    });
    document.body.appendChild(banner);
  }

  function init() {
    var c = getConsent();
    if (c === "yes") start();
    else if (c !== "no") showBanner();
    var link = document.getElementById("cookieLink");
    if (link) link.addEventListener("click", function (e) { e.preventDefault(); showBanner(); });
  }

  window.EkoTrack = {
    event: function (type, extra) { send(type, extra); },
    reset: function () { showBanner(); },
    consent: getConsent,
    sid: function () { return running ? sid : ""; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
