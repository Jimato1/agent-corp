/* ============================================================================
   auth — Operator Console · SHARED SHELL PARTIAL  (dependency-free, no build)
   Injects the always-visible Global System-State Header (UI_SPEC §3.1), the
   ENGAGED/degraded band (§2.5.2), and the break-glass hazard banner (§6.7) into
   <div id="global-shell">. Also provides the reusable press-and-hold actuator
   (§2.5.8) and the Shift+Esc halt-focus shortcut + documented fallback chord
   (§2.7 / Stage-3 open-question #2).

   CANNOT-VERIFY-HERE: this JS drives a STATIC MOCK. No real /api/verify, no
   Redis, no live SSE. Actuator "completion" simulates the write-before-ack UX
   locally so the interaction (dwell, abort, reduced-motion countdown, relabel)
   is exercisable in a browser. Real actuation is wired at integration time.

   A page configures the shell by setting window.AUTH_SHELL before this loads:
     window.AUTH_SHELL = {
       level:'G0'|'G1'|'G2', deps:{redis,pdp,writer,idp}, freshness:{epoch,ms,rs},
       fleet:{flagged, detail}, operator:{sub, fresh}, breakglass:{active,...},
       activeNav:'halt', degraded:false|'redis'|'pdp'|'writer'|'idp'
     };
   ========================================================================== */
(function () {
  "use strict";
  var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  var NAV = [
    ["overview.html", "⌂", "Overview", ""],
    ["halt_control.html", "⦿", "Kill switch & revocation", "kill"],
    ["breakglass.html", "⛨", "Break-glass", "bg"],
    ["audit_timeline.html", "▤", "Audit · who did this", ""],
    ["identities.html", "⋔", "Identities", ""],
    ["roles_scopes.html", "⚿", "Roles & scopes", ""],
    ["budgets.html", "◷", "Budgets", ""]
  ];

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  var S = window.AUTH_SHELL || {};
  S.level = S.level || "G0";
  S.deps = S.deps || { redis: true, pdp: true, writer: true, idp: true };
  S.freshness = S.freshness || { epoch: 4471, ms: 312, rs: "24/24" };
  S.fleet = S.fleet || { flagged: 0, detail: "" };
  S.operator = S.operator || { sub: "op:eide", fresh: true };
  S.breakglass = S.breakglass || { active: false };

  var engaged = S.level !== "G0";
  var degraded = !!S.degraded;

  /* ---- LEVEL word ------------------------------------------------------- */
  function levelWord(l) {
    return l === "G2" ? "G2 QUIESCE-ALL — ENGAGED"
         : l === "G1" ? "G1 FREEZE-DESTRUCTIVE — ENGAGED"
         : "G0 ARMED";
  }
  function levelCls(l){ return l === "G2" ? "gs-level--g2" : l === "G1" ? "gs-level--g1" : ""; }
  function levelGlyph(l){ return l === "G0" ? '<span class="dot"></span>' : (l === "G2" ? "▮▮▮▮ " : "▮▮ "); }

  /* ---- DEPS / FLEET center readouts ------------------------------------- */
  var depDown = degraded; // name of down dep, or false
  function depsHtml() {
    if (depDown) {
      return '<span class="gs-tag halt">⛊ SAFE-STOPPED — ' + esc(depDown) + '</span>';
    }
    return '<span class="gs-tag ok">⛊ HEALTHY</span>'
      + ' <span class="freshness"><span class="ok">⟳ ep ' + esc(S.freshness.epoch) + '</span> · fresh ' + esc(S.freshness.ms) + 'ms · ' + esc(S.freshness.rs) + ' RS current</span>';
  }
  function depDots() {
    var d = S.deps, out = [];
    out.push('Redis ' + (d.redis ? '<span class="ok">✔</span>' : '<span class="down">✕</span>'));
    out.push('PDP ' + (d.pdp ? '<span class="ok">✔</span>' : '<span class="down">⚠</span>'));
    out.push('writer ' + (d.writer ? '<span class="ok">✔</span>' : '<span class="down">✕</span>'));
    out.push('IdP ' + (d.idp ? '<span class="ok">✔</span>' : '<span class="down">✕</span>'));
    return out.join(" · ");
  }
  function fleetHtml() {
    if (S.fleet.flagged > 0) {
      return '<a class="gs-tag flagged" href="audit_timeline.html" title="Fires at >=5 denies/60s or >=4x baseline/30s (§7.1); persists until dispositioned">'
        + '▲ ' + esc(S.fleet.flagged) + ' AGENTS FLAGGED ▸</a>'
        + (S.fleet.detail ? ' <span class="freshness">(' + esc(S.fleet.detail) + ')</span>' : "");
    }
    return '<span class="gs-tag nominal">● FLEET nominal (0 flagged)</span>';
  }

  /* ---- Kill gauge + FREEZE actuator ------------------------------------- */
  function gauge(l) {
    function seg(name, on, halt) {
      return '<span class="' + (on ? (halt ? "lit-halt" : "lit") : "") + '">' + name + (on ? " ●" : " ○") + "</span>";
    }
    return '<span class="gs-gauge" aria-label="kill level ' + l + '">'
      + seg("G0", l === "G0", false) + seg("G1", l === "G1", true) + seg("G2", l === "G2", true) + "</span>";
  }
  function freezeControl(l) {
    // Post-engage the primary RELABELS to reflect posture (never lies "not yet done", §2.5.7/A5)
    if (l === "G2") {
      return '<div class="gs-freeze halt-exempt"><span class="actuator actuator--danger" aria-disabled="true" tabindex="-1">'
        + '<span class="actuator__label">▮▮▮▮ G2 ENGAGED · <a href="halt_status_board.html">Review halt ▸</a></span></span>'
        + '<small>Full stop. No further escalation.</small></div>';
    }
    if (l === "G1") {
      var help = depDown === "redis"
        ? "Escalate via signed kill epoch — Redis-independent"
        : "Distinct 1.0s hold — larger blast radius";
      return '<div class="gs-freeze halt-exempt">'
        + '<span class="actuator actuator--danger" aria-disabled="true" tabindex="-1"><span class="actuator__label">▮▮ G1 ENGAGED · <a href="halt_status_board.html">Review halt ▸</a></span></span>'
        + '<button class="actuator actuator--danger" id="escG2" data-dwell="1000" data-level="G2" data-prefocus="0">'
        + '<span class="actuator__fill"></span><span class="actuator__label">Escalate to G2 ▸</span><span class="actuator__count" hidden></span></button>'
        + '<small>' + esc(help) + '</small></div>';
    }
    // G0 armed — the one-motion press-and-hold engage (IS the actuator, not a panel opener, §2.5.7/A2)
    var helper = depDown === "redis"
      ? "STOP via signed kill epoch — Redis-independent (no typed intent, no HW key)"
      : "Hold to freeze the suite · destructive & approve/execute refused; reads continue";
    return '<div class="gs-freeze halt-exempt">'
      + '<button class="actuator actuator--danger" id="engageG1" data-dwell="600" data-level="G1" data-prefocus="1" aria-keyshortcuts="Shift+Escape">'
      + '<span class="actuator__fill"></span><span class="actuator__label">◉ ENGAGE FREEZE (G1)</span><span class="actuator__count" hidden></span></button>'
      + '<small>' + esc(helper) + '</small></div>';
  }

  /* ---- ENGAGED / degraded band (§2.5.2) --------------------------------- */
  function bandHtml() {
    if (degraded) {
      return '<div class="halt-band" role="status" aria-live="assertive"><span class="halt-band__edge"></span>'
        + '<div><span class="halt-band__word"><span class="halt-band__ico">⛊</span>SYSTEM SAFE-STOPPED · ' + esc(depDown) + ' unreachable</span></div>'
        + '<div>This is the safety system working, not an outage of the console.</div>'
        + '<div class="freshness">STILL TRUE: destructive paths fail closed · existing kill epochs still enforced (JWKS-kid, Redis-independent) · reads bounded. '
        + 'DO: identity edits are paused; STOP still works; <a href="safe_stopped.html">see runbook ▸</a></div></div>';
    }
    if (!engaged) return "";
    var g2 = S.level === "G2";
    return '<div class="halt-band ' + (g2 ? "halt-band--g2" : "") + '" role="status" aria-live="assertive"><span class="halt-band__edge"></span>'
      + '<div><span class="halt-band__word"><span class="halt-band__ico">' + (g2 ? "▮▮▮▮" : "▮▮") + '</span>'
      + (g2 ? "KILL-SWITCH ENGAGED · G2 QUIESCE-ALL" : "KILL-SWITCH ENGAGED · G1 FREEZE-DESTRUCTIVE")
      + '</span> <span class="freshness">epoch ' + esc(S.freshness.epoch) + '</span></div>'
      + '<div>' + (g2 ? "ALL agent tokens are refused suite-wide. Only humans + break-glass remain."
                      : "Destructive & approve/execute paths are refused suite-wide. Benign reads + planning continue by design.") + '</div>'
      + '<div class="triad" style="margin-top:8px">'
      + triadChip("confirmed", 21, "RS-ack’d this epoch") + triadChip("pending", 3, "within TTL window") + triadChip("draining", 1, "in-flight past reversible")
      + '</div><div style="margin-top:8px"><a class="btn btn--ghost" href="halt_status_board.html">Review halt ▸</a></div></div>';
  }
  function triadChip(kind, n, sub) {
    var g = { confirmed: "✔", pending: "◐", draining: "⇉" }[kind];
    var spin = (kind === "pending" && !RM) ? " ring-spin" : "";
    return '<div class="triad__chip triad__chip--' + kind + '"><span class="triad__n">' + n + '</span> '
      + '<span class="triad__lab"><span class="' + spin.trim() + '">' + g + '</span> ' + kind.toUpperCase() + '</span>'
      + '<div class="triad__sub">' + esc(sub) + '</div></div>';
  }

  /* ---- Break-glass hazard banner (§6.7) --------------------------------- */
  function bgBanner() {
    if (!S.breakglass.active) return "";
    var b = S.breakglass;
    return '<div class="bg-banner" role="status" aria-live="assertive">'
      + '<span class="lead">⛔ BREAK-GLASS ACTIVE</span>'
      + '<span class="mono">' + esc(b.operator || "op:eide") + ' · session ' + esc(b.session || "bg-2026-0701-01") + ' · auto-revokes in ' + esc(b.ttl || "12:47") + '</span>'
      + '<button class="actuator actuator--danger" id="bgStop" data-dwell="600" data-level="G1" data-prefocus="0">'
      + '<span class="actuator__fill"></span><span class="actuator__label">⛔ STOP AGENTS</span><span class="actuator__count" hidden></span></button>'
      + '<a class="btn btn--ghost" href="breakglass.html">Review session</a></div>';
  }

  /* ---- Assemble header -------------------------------------------------- */
  function render() {
    var mount = document.getElementById("global-shell");
    if (!mount) return;
    var rail = NAV.map(function (n) {
      var active = S.activeNav && n[0].indexOf(S.activeNav) === 0 ? " active" : "";
      var kill = n[3] === "kill" ? (" kill" + (engaged ? " engaged" : "")) : (n[3] === "bg" ? " bg" : "");
      return '<a class="' + (active + kill).trim() + '" href="' + n[0] + '"><span aria-hidden="true">' + n[1] + '</span><span class="lab">' + esc(n[2]) + "</span></a>";
    }).join("");

    var header =
      '<header class="gs-header" role="banner">'
      + '<div class="gs-zone"><div class="gs-brand"><b>auth</b> ▸ identity gateway</div>'
      + '<div class="gs-level ' + levelCls(S.level) + '">' + levelGlyph(S.level) + esc(levelWord(S.level)) + '</div>'
      + '<span class="gs-op">operator: <span class="mono">' + esc(S.operator.sub) + '</span> ' + (S.operator.fresh ? "🔑 fresh" : "🔑 re-auth needed") + '</span></div>'
      + '<div class="gs-zone"><div class="eyebrow">System state</div>'
      + '<div class="gs-deps">' + depsHtml() + '</div>'
      + '<div class="gs-depdots">' + depDots() + '</div>'
      + '<div class="gs-fleet">' + fleetHtml() + '</div></div>'
      + '<div class="gs-zone gs-kill"><div class="eyebrow">Kill-switch</div>' + gauge(S.level) + freezeControl(S.level) + '</div>'
      + '</header>';

    mount.innerHTML = bgBanner() + header + bandHtml();

    // rail lives in the page body mount (#nav-rail) if present
    var railMount = document.getElementById("nav-rail");
    if (railMount) {
      railMount.innerHTML =
        '<div class="grp">Safety first</div>' + rail
        + '<div class="sep"></div><a href="#"><span aria-hidden="true">⚙</span><span class="lab">session · sign out</span></a>';
    }
    wireActuators();
  }

  /* ============================================================================
     Press-and-hold actuator (§2.5.8). Fills a ring over the dwell; release
     before completion = abort. Reduced-motion => segmented numeric countdown
     that still enforces the dwell. Space/Enter keydown also actuates.
     ========================================================================== */
  function bindActuator(btn) {
    if (!btn || btn.__bound) return; btn.__bound = true;
    var dwell = parseInt(btn.getAttribute("data-dwell") || "600", 10);
    var level = btn.getAttribute("data-level") || "G1";
    var fill = btn.querySelector(".actuator__fill");
    var count = btn.querySelector(".actuator__count");
    var label = btn.querySelector(".actuator__label");
    var raf = null, start = 0, active = false, tick = null;

    function reset() {
      active = false;
      if (raf) cancelAnimationFrame(raf); raf = null;
      if (tick) clearInterval(tick); tick = null;
      if (fill) fill.style.width = "0%";
      if (count) { count.hidden = true; count.textContent = ""; }
    }
    function complete() {
      reset();
      if (fill) fill.style.width = "100%";
      if (label) label.innerHTML = '<span class="actuator__committing">◴ committing…</span>';
      // Simulated write-before-ack: commit ledger + Redis (or signed kill epoch), then land on the Status Board.
      setTimeout(function () {
        if (typeof window.AUTH_onEngage === "function") window.AUTH_onEngage(level);
        else window.location.href = "halt_status_board.html?level=" + level;
      }, RM ? 250 : 500);
    }
    function begin() {
      if (btn.getAttribute("aria-disabled") === "true") return;
      if (active) return; active = true; start = Date.now();
      if (RM) {
        // numeric countdown, no animation, dwell still enforced
        count.hidden = false;
        var remain = Math.ceil(dwell / 100);
        count.textContent = "hold — " + (dwell / 1000).toFixed(1) + "s";
        tick = setInterval(function () {
          var e = Date.now() - start;
          var left = Math.max(0, dwell - e);
          count.textContent = "hold — " + (left / 1000).toFixed(1) + "s";
          if (e >= dwell) complete();
        }, 100);
      } else {
        (function loop() {
          var e = Date.now() - start;
          var pct = Math.min(100, (e / dwell) * 100);
          if (fill) fill.style.width = pct + "%";
          if (e >= dwell) { complete(); return; }
          raf = requestAnimationFrame(loop);
        })();
      }
    }
    btn.addEventListener("mousedown", begin);
    btn.addEventListener("touchstart", function (ev) { ev.preventDefault(); begin(); }, { passive: false });
    btn.addEventListener("keydown", function (ev) { if (ev.key === " " || ev.key === "Enter") { ev.preventDefault(); begin(); } });
    ["mouseup", "mouseleave", "touchend", "touchcancel", "blur"].forEach(function (t) { btn.addEventListener(t, reset); });
    btn.addEventListener("keyup", function (ev) { if (ev.key === " " || ev.key === "Enter") reset(); });
  }
  function wireActuators() {
    document.querySelectorAll(".actuator[data-dwell]").forEach(bindActuator);
    if (window.AUTH_wireExtraActuators) window.AUTH_wireExtraActuators(bindActuator);
  }
  window.AUTH_bindActuator = bindActuator; // exported for in-page actuators (halt_control, breakglass, safe_stopped)

  /* ============================================================================
     Shift+Esc — global halt-FOCUS shortcut + escape hatch (§2.7).
     • FOCUSES the header ENGAGE-FREEZE from anywhere; NEVER fires a stop
       (focusing, not actuating, keeps it panic-safe).
     • If a non-STOP modal is open, force-dismiss it to a safe cancel AND land
       focus on the freeze control, overriding the alertdialog focus-trap.
     DOCUMENTED FALLBACK CHORD: some OS/browser combos capture Shift+Esc
     (e.g. Chrome's task manager on some platforms). A non-browser-captured
     fallback chord Ctrl+Alt+H (H = Halt) is wired identically; both are shown in
     the freeze control's aria-keyshortcuts + a visible legend on halt screens.
     ========================================================================== */
  function focusFreeze() {
    var f = document.getElementById("engageG1") || document.getElementById("escG2") || document.querySelector(".gs-freeze .actuator");
    // dismiss any open non-STOP modal to safe cancel (the Halt Control panel is exempt)
    document.querySelectorAll(".modal-scrim[data-halt-exempt='false']").forEach(function (m) {
      var cancel = m.querySelector("[data-cancel]"); if (cancel) cancel.click(); else m.remove();
    });
    document.body.classList.remove("modal-open");
    if (f) { f.focus(); f.setAttribute("data-halt-focused", "1"); }
  }
  function keyHandler(ev) {
    var shiftEsc = ev.shiftKey && (ev.key === "Escape" || ev.key === "Esc");
    var fallback = ev.ctrlKey && ev.altKey && (ev.key === "h" || ev.key === "H");
    if (shiftEsc || fallback) { ev.preventDefault(); focusFreeze(); }
  }
  document.addEventListener("keydown", keyHandler, true);
  window.AUTH_focusFreeze = focusFreeze;

  /* ---- go ---- */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
