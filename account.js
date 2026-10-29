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
      "#ekv-acc input[type=text],#ekv-acc input[type=password],#ekv-acc input[type=email]{width:100%;box-sizing:border-box;padding:12px 14px;margin-bottom:10px;border-radius:12px;border:1px solid var(--line,#D3DAE1);background:var(--bg,transparent);color:inherit;font:inherit}" +
      "#ekv-acc label.chk{display:flex;gap:10px;align-items:flex-start;margin:4px 0 12px;font-size:.84rem;color:var(--muted,#5B6B79);cursor:pointer}" +
      "#ekv-acc label.chk input{margin-top:3px;flex:none}" +
      "#ekv-acc .err{color:#C0392B;min-height:1.2em;margin:0 0 8px;font-size:.85rem}" +
      "#ekv-acc .okt{color:#1E8E3E;min-height:1.2em;margin:0 0 8px;font-size:.85rem}" +
      "#ekv-acc h3{margin:0 0 8px;font-size:.95rem}" +
      "#ekv-acc .sec{border-top:1px solid var(--line,#D3DAE1);padding-top:14px;margin-top:14px}" +
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

  /* Pide la ubicación al dispositivo. Como se guarda redondeada a ~1 km, no hace falta GPS: vale la de Wi-Fi.
     done(ok, codigoDeError)  (1 = permiso denegado, 2 = no disponible, 3 = tiempo agotado, 0 = no compatible) */
  function askLocation(done) {
    if (!navigator.geolocation) { done(false, 0); return; }
    navigator.geolocation.getCurrentPosition(function (p) {
      api("/account/location", { token: acc.token, lat: p.coords.latitude, lon: p.coords.longitude }).then(function (r) {
        if (r.ok) { acc.loc = true; write(); }
        done(!!r.ok, r.ok ? 0 : 2);
      });
    }, function (e) { done(false, e && e.code ? e.code : 2); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }
  function locError(code) {
    if (code === 1) return "El navegador tiene bloqueada la ubicación para esta web (mira el candado de la barra de direcciones).";
    if (code === 3) return "Se agotó el tiempo esperando la ubicación del dispositivo.";
    if (code === 0) return "Tu navegador no permite obtener la ubicación.";
    return "Este dispositivo no puede calcular su ubicación (puede que no tenga GPS ni servicio de ubicación activo).";
  }

  function viewForm(box, mode) {
    var reg = mode === "register";
    box.textContent = "";
    box.appendChild(el("h2", "", reg ? "¿Creamos una cuenta?" : "Entrar en tu cuenta"));
    box.appendChild(el("p", "", reg
      ? "Así no te pierdo y tus mensajes se asocian a tu usuario. Solo necesitas usuario y contraseña; el correo es opcional."
      : "Escribe tu usuario y tu contraseña."));
    var u = el("input"); u.type = "text"; u.placeholder = "Usuario"; u.maxLength = 20; u.autocomplete = "username"; u.setAttribute("autocapitalize", "none"); u.setAttribute("spellcheck", "false"); u.setAttribute("aria-label", "Usuario");
    var p = el("input"); p.type = "password"; p.placeholder = "Contraseña"; p.maxLength = 100; p.autocomplete = reg ? "new-password" : "current-password"; p.setAttribute("aria-label", "Contraseña");
    box.appendChild(u); box.appendChild(p);

    var em = null;
    if (reg) {
      em = el("input"); em.type = "email"; em.placeholder = "Correo (opcional)"; em.maxLength = 100; em.autocomplete = "email"; em.setAttribute("aria-label", "Correo (opcional)");
      box.appendChild(em);
    }

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
    sm.appendChild(document.createTextNode(reg ? "Si olvidas la contraseña, solo el administrador puede restablecerla. " : ""));
    var a = el("a", "", "Privacidad"); a.href = "/acerca#privacidad";
    sm.appendChild(a);
    box.appendChild(sm);

    function submit() {
      err.textContent = "";
      if (!u.value.trim() || !p.value) { err.textContent = "Escribe usuario y contraseña."; return; }
      go.disabled = true; go.textContent = "Un momento…";
      api(reg ? "/account/register" : "/account/login", { user: u.value.trim(), pass: p.value, email: em ? em.value.trim() : "" }).then(function (r) {
        if (!r.ok) { go.disabled = false; go.textContent = reg ? "Crear cuenta" : "Entrar"; err.textContent = r.d.error || "No se pudo completar."; return; }
        acc = { user: r.d.user, token: r.d.token, loc: !!r.d.loc, email: r.d.email || "" };
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
    box.appendChild(el("h2", "", "Tu cuenta"));
    var who = el("p", "", "Usuario: ");
    who.appendChild(el("b", "", acc.user));
    box.appendChild(who);

    function sec(title) { var s = el("div", "sec"); s.appendChild(el("h3", "", title)); box.appendChild(s); return s; }
    function note(p, text, good) { p.className = good ? "okt" : "err"; p.textContent = text || ""; }
    function msgP() { var p = el("p", "err"); p.setAttribute("role", "alert"); return p; }
    function expired(r) {
      if (r.status === 401 && (r.d.error || "") === "Sesión caducada") { acc = null; write(); paintBtn(); open("login"); return true; }
      return false;
    }

    /* correo */
    var s1 = sec("Correo (opcional)");
    var em = el("input"); em.type = "email"; em.placeholder = "tucorreo@ejemplo.com"; em.maxLength = 100; em.autocomplete = "email"; em.value = acc.email || ""; em.setAttribute("aria-label", "Correo");
    var m1 = msgP();
    var r1 = el("div", "row");
    var sv = el("button", "", "Guardar correo"); sv.type = "button";
    sv.addEventListener("click", function () {
      note(m1, ""); sv.disabled = true;
      api("/account/email", { token: acc.token, email: em.value.trim() }).then(function (r) {
        sv.disabled = false;
        if (expired(r)) return;
        if (!r.ok) { note(m1, r.d.error || "No se pudo guardar."); return; }
        acc.email = r.d.email || ""; write();
        note(m1, acc.email ? "Correo guardado." : "Correo quitado.", true);
      });
    });
    r1.appendChild(sv);
    s1.appendChild(em); s1.appendChild(m1); s1.appendChild(r1);

    /* ubicación */
    var s2 = sec("Ubicación");
    s2.appendChild(el("p", "", acc.loc
      ? "Estás compartiendo tu ubicación aproximada (zona de unos 1 km)."
      : "No estás compartiendo tu ubicación."));
    var m2 = msgP();
    var r2 = el("div", "row");
    var loc = el("button", "", acc.loc ? "Dejar de compartir ubicación" : "Compartir mi ubicación"); loc.type = "button";
    loc.addEventListener("click", function () {
      note(m2, ""); loc.disabled = true;
      if (acc.loc) {
        api("/account/location", { token: acc.token, clear: true }).then(function (r) { if (expired(r)) return; acc.loc = false; write(); viewAccount(box); });
      } else {
        askLocation(function (ok, code) {
          if (ok) { viewAccount(box); return; }
          loc.disabled = false;
          note(m2, locError(code));
          if (!r2.querySelector(".ipbtn")) {
            var ib = el("button", "ipbtn", "Usar la ciudad aproximada de mi conexión"); ib.type = "button";
            ib.addEventListener("click", function () {
              ib.disabled = true;
              api("/account/location", { token: acc.token, ip: true }).then(function (r) {
                if (expired(r)) return;
                if (!r.ok) { ib.disabled = false; note(m2, r.d.error || "No se pudo guardar."); return; }
                acc.loc = true; write(); viewAccount(box);
              });
            });
            r2.appendChild(ib);
          }
        });
      }
    });
    r2.appendChild(loc);
    s2.appendChild(m2); s2.appendChild(r2);

    /* contraseña */
    var s3 = sec("Cambiar contraseña");
    var op = el("input"); op.type = "password"; op.placeholder = "Contraseña actual"; op.maxLength = 100; op.autocomplete = "current-password"; op.setAttribute("aria-label", "Contraseña actual");
    var np = el("input"); np.type = "password"; np.placeholder = "Contraseña nueva (mín. 6)"; np.maxLength = 100; np.autocomplete = "new-password"; np.setAttribute("aria-label", "Contraseña nueva");
    var m3 = msgP();
    var r3 = el("div", "row");
    var cp = el("button", "", "Cambiar contraseña"); cp.type = "button";
    cp.addEventListener("click", function () {
      note(m3, "");
      if (!op.value || !np.value) { note(m3, "Escribe la contraseña actual y la nueva."); return; }
      cp.disabled = true;
      api("/account/password", { token: acc.token, oldpass: op.value, newpass: np.value }).then(function (r) {
        cp.disabled = false;
        if (expired(r)) return;
        if (!r.ok) { note(m3, r.d.error || "No se pudo cambiar."); return; }
        op.value = ""; np.value = "";
        note(m3, "Contraseña cambiada. Se ha cerrado tu sesión en otros dispositivos.", true);
      });
    });
    r3.appendChild(cp);
    s3.appendChild(op); s3.appendChild(np); s3.appendChild(m3); s3.appendChild(r3);

    /* sesión y borrado */
    var s4 = sec("Sesión");
    var m4 = msgP();
    var r4 = el("div", "row");
    var out = el("button", "ok", "Cerrar sesión"); out.type = "button";
    out.addEventListener("click", function () {
      api("/account/logout", { token: acc.token });
      acc = null; write(); paintBtn(); close();
    });
    var del = el("button", "danger", "Eliminar mi cuenta"); del.type = "button";
    del.addEventListener("click", function () {
      if (!window.confirm("Se borrarán tu cuenta, tu correo, tu ubicación y los mensajes asociados a ella. ¿Seguro?")) return;
      api("/account/delete", { token: acc.token }).then(function (r) {
        if (expired(r)) return;
        if (!r.ok) { note(m4, r.d.error || "No se pudo eliminar."); return; }
        acc = null; write(); paintBtn(); close();
      });
    });
    r4.appendChild(out); r4.appendChild(del);
    s4.appendChild(m4); s4.appendChild(r4);

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
        else if (r.ok) { acc.user = r.d.user; acc.loc = !!r.d.loc; acc.email = r.d.email || ""; write(); paintBtn(); }
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
