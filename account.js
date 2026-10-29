/* Ekovozia - cuentas de usuario (solo usuario y contraseña, sin correo).
   Se ofrece al entrar; es opcional. La ubicación solo se guarda si la persona la autoriza. */
(function () {
  "use strict";
  var ENDPOINT = "https://eco.x-mayor.workers.dev";
  var KEY = "ekv-account";       // {user, token, loc} en este navegador
  var SKIP = "ekv-acc-skip";     // "Ahora no": no volver a preguntar en esta visita
  var acc = null, modal = null, btn = null;

  function read() { try { var v = JSON.parse(localStorage.getItem(KEY) || "null"); return v && v.token ? v : null; } catch (e) { return null; } }
  function write() { try { if (acc) localStorage.setItem(KEY, JSON.stringify(acc)); else localStorage.removeItem(KEY); } catch (e) {} }

  function api(path, body) {
    return fetch(ENDPOINT + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, status: r.status, d: d }; });
    }).catch(function () { return { ok: false, status: 0, d: { error: "No se pudo conectar. Inténtalo de nuevo." } }; });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------- estilos ---------- */
  function css() {
    var s = document.createElement("style");
    s.textContent =
      "#ekv-acc-bg{position:fixed;inset:0;z-index:10000;background:rgba(10,16,22,.55);display:grid;place-items:center;padding:16px;overflow-y:auto}" +
      "#ekv-acc{width:100%;max-width:400px;background:var(--surface,#fff);color:var(--ink,#12202C);border:1px solid var(--line,#D3DAE1);border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.3);font:400 .92rem/1.5 var(--font-body,system-ui,sans-serif)}" +
      "#ekv-acc h2{margin:0 0 6px;font-size:1.25rem}" +
      "#ekv-acc p{margin:0 0 14px;color:var(--muted,#5B6B79)}" +
      "#ekv-acc input[type=text],#ekv-acc input[type=password]{width:100%;box-sizing:border-box;padding:12px 14px;margin-bottom:10px;border-radius:12px;border:1px solid var(--line,#D3DAE1);background:var(--bg,transparent);color:inherit;font:inherit}" +
      "#ekv-acc label.chk{display:flex;gap:10px;align-items:flex-start;margin:4px 0 12px;font-size:.84rem;color:var(--muted,#5B6B79);cursor:pointer}" +
      "#ekv-acc label.chk input{margin-top:3px;flex:none}" +
      "#ekv-acc .err{color:#C0392B;min-height:1.2em;margin:0 0 8px;font-size:.85rem}" +
      "#ekv-acc .row{display:flex;gap:8px;flex-wrap:wrap}" +
      "#ekv-acc button{flex:1;padding:11px 14px;border-radius:12px;border:1px solid var(--line,#D3DAE1);background:transparent;color:inherit;font:inherit;font-weight:700;cursor:pointer}" +
      "#ekv-acc button.ok{background:var(--accent,#2E4BDB);border-color:var(--accent,#2E4BDB);color:var(--accent-ink,#fff)}" +
      "#ekv-acc button.danger{color:#C0392B;border-color:#C0392B}" +
      "#ekv-acc button:disabled{opacity:.6;cursor:default}" +
      "#ekv-acc button:focus-visible,#ekv-acc input:focus-visible{outline:2px solid var(--accent,#2E4BDB);outline-offset:2px}" +
      "#ekv-acc .link{display:block;margin-top:12px;text-align:center;background:none;border:none;font-weight:500;color:var(--accent,#2E4BDB);text-decoration:underline;padding:4px}" +
      "#ekv-acc .small{font-size:.78rem;margin:10px 0 0}" +
      "#ekv-acc a{color:var(--accent,#2E4BDB)}" +
      "#ekv-acc-btn.on{color:var(--accent-ink,#fff);background:var(--accent,#2E4BDB)}";
    document.head.appendChild(s);
  }

  /* ---------- botón de la cabecera ---------- */
  function mkBtn() {
    var box = document.querySelector("header .actions");
    if (!box) return;
    btn = document.createElement("button");
    btn.type = "button";
    btn.id = "ekv-acc-btn";
    btn.className = "ibtn";
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    btn.addEventListener("click", function () { open(acc ? "account" : "register"); });
    box.insertBefore(btn, box.firstChild);
    paintBtn();
  }
  function paintBtn() {
    if (!btn) return;
    var t = acc ? "Mi cuenta: " + acc.user : "Crear cuenta o entrar";
    btn.setAttribute("aria-label", t);
    btn.title = t;
    btn.classList.toggle("on", !!acc);
  }

  /* ---------- ventana ---------- */
  function close() {
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    modal = null;
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") { try { sessionStorage.setItem(SKIP, "1"); } catch (x) {} close(); } }

  function open(mode) {
    close();
    modal = el("div");
    modal.id = "ekv-acc-bg";
    var box = el("div");
    box.id = "ekv-acc";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Cuenta de Ekovozia");
    modal.appendChild(box);
    modal.addEventListener("mousedown", function (e) { if (e.target === modal) { try { sessionStorage.setItem(SKIP, "1"); } catch (x) {} close(); } });
    if (mode === "account") viewAccount(box); else viewForm(box, mode);
    document.body.appendChild(modal);
    document.addEventListener("keydown", onKey);
    var f = box.querySelector("input[type=text]") || box.querySelector("button");
    if (f) f.focus();
  }

  function askLocation(done) {
    if (!navigator.geolocation) { done(false); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      api("/account/location", { token: acc.token, lat: p.coords.latitude, lon: p.coords.longitude }).then(function (r) {
        if (r.ok) { acc.loc = true; write(); }
        done(!!r.ok);
      });
    }, function () { done(false); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 });
  }

  function viewForm(box, mode) {
    var reg = mode === "register";
    box.textContent = "";
    box.appendChild(el("h2", "", reg ? "¿Creamos una cuenta?" : "Entrar en tu cuenta"));
    box.appendChild(el("p", "", reg
      ? "Así no te pierdo y tus mensajes se asocian a tu usuario. Solo usuario y contraseña, sin correo."
      : "Escribe tu usuario y tu contraseña."));
    var u = el("input"); u.type = "text"; u.placeholder = "Usuario"; u.maxLength = 20; u.autocomplete = "username"; u.setAttribute("autocapitalize", "none"); u.setAttribute("spellcheck", "false"); u.setAttribute("aria-label", "Usuario");
    var p = el("input"); p.type = "password"; p.placeholder = "Contraseña"; p.maxLength = 100; p.autocomplete = reg ? "new-password" : "current-password"; p.setAttribute("aria-label", "Contraseña");
    box.appendChild(u); box.appendChild(p);

    var chk = null;
    if (reg) {
      var lab = el("label", "chk");
      chk = el("input"); chk.type = "checkbox";
      lab.appendChild(chk);
      lab.appendChild(el("span", "", "Compartir mi ubicación (opcional). Tu navegador te pedirá permiso. Guardo solo la zona (unos 1 km), no tu dirección, y puedes quitarla cuando quieras."));
      box.appendChild(lab);
    }
    var err = el("p", "err"); err.setAttribute("role", "alert"); box.appendChild(err);

    var row = el("div", "row");
    var go = el("button", "ok", reg ? "Crear cuenta" : "Entrar"); go.type = "button";
    row.appendChild(go);
    if (reg) {
      var no = el("button", "", "Ahora no"); no.type = "button";
      no.addEventListener("click", function () { try { sessionStorage.setItem(SKIP, "1"); } catch (x) {} close(); });
      row.appendChild(no);
    }
    box.appendChild(row);

    var sw = el("button", "link", reg ? "Ya tengo cuenta" : "Crear una cuenta nueva"); sw.type = "button";
    sw.addEventListener("click", function () { viewForm(box, reg ? "login" : "register"); });
    box.appendChild(sw);

    var sm = el("p", "small");
    sm.appendChild(document.createTextNode(reg ? "Si olvidas la contraseña no se puede recuperar. " : ""));
    var a = el("a", "", "Privacidad"); a.href = "/acerca#privacidad";
    sm.appendChild(a);
    box.appendChild(sm);

    function submit() {
      err.textContent = "";
      if (!u.value.trim() || !p.value) { err.textContent = "Escribe usuario y contraseña."; return; }
      go.disabled = true; go.textContent = "Un momento…";
      api(reg ? "/account/register" : "/account/login", { user: u.value.trim(), pass: p.value }).then(function (r) {
        if (!r.ok) { go.disabled = false; go.textContent = reg ? "Crear cuenta" : "Entrar"; err.textContent = r.d.error || "No se pudo completar."; return; }
        acc = { user: r.d.user, token: r.d.token, loc: !!r.d.loc };
        write(); paintBtn();
        if (reg && chk && chk.checked) askLocation(function () { close(); });
        else close();
      });
    }
    go.addEventListener("click", submit);
    box.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox") { e.preventDefault(); submit(); } });
  }

  function viewAccount(box) {
    box.textContent = "";
    box.appendChild(el("h2", "", "Hola, " + acc.user));
    box.appendChild(el("p", "", acc.loc
      ? "Estás compartiendo tu ubicación aproximada (zona de unos 1 km)."
      : "No estás compartiendo tu ubicación."));
    var err = el("p", "err"); err.setAttribute("role", "alert");

    var row1 = el("div", "row");
    var loc = el("button", "", acc.loc ? "Dejar de compartir ubicación" : "Compartir mi ubicación"); loc.type = "button";
    loc.addEventListener("click", function () {
      err.textContent = ""; loc.disabled = true;
      if (acc.loc) {
        api("/account/location", { token: acc.token, clear: true }).then(function () { acc.loc = false; write(); viewAccount(box); });
      } else {
        askLocation(function (ok) { if (!ok) { loc.disabled = false; err.textContent = "No pude obtener tu ubicación (¿has dado permiso al navegador?)."; } else viewAccount(box); });
      }
    });
    row1.appendChild(loc);
    box.appendChild(row1);
    box.appendChild(err);

    var row2 = el("div", "row");
    var out = el("button", "ok", "Cerrar sesión"); out.type = "button";
    out.addEventListener("click", function () {
      api("/account/logout", { token: acc.token });
      acc = null; write(); paintBtn(); close();
    });
    var del = el("button", "danger", "Eliminar mi cuenta"); del.type = "button";
    del.addEventListener("click", function () {
      if (!window.confirm("Se borrarán tu cuenta, tu ubicación y los mensajes asociados a ella. ¿Seguro?")) return;
      api("/account/delete", { token: acc.token }).then(function (r) {
        if (!r.ok) { err.textContent = r.d.error || "No se pudo eliminar."; return; }
        acc = null; write(); paintBtn(); close();
      });
    });
    row2.appendChild(out); row2.appendChild(del);
    box.appendChild(row2);

    var cl = el("button", "link", "Cerrar"); cl.type = "button";
    cl.addEventListener("click", close);
    box.appendChild(cl);
  }

  /* ---------- arranque ---------- */
  function init() {
    css();
    mkBtn();
    acc = read();
    if (acc) {
      paintBtn();
      api("/account/me", { token: acc.token }).then(function (r) {
        if (r.status === 401) { acc = null; write(); paintBtn(); }
        else if (r.ok) { acc.user = r.d.user; acc.loc = !!r.d.loc; write(); paintBtn(); }
      });
    } else {
      var skipped = false;
      try { skipped = sessionStorage.getItem(SKIP) === "1"; } catch (e) {}
      if (!skipped) setTimeout(function () { if (!acc && !modal) open("register"); }, 1500);
    }
  }

  window.EkoAccount = {
    token: function () { return acc ? acc.token : ""; },
    user: function () { return acc ? acc.user : ""; }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
