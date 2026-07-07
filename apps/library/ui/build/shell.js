/* ============================================================================
   library — Reference Shelf · SHARED SHELL PARTIAL (dependency-free, no build)
   Injects the §6.1 AppShell into <div id="global-shell">: the global header
   (brand · read-only SYSTEM STATE mirror · operator identity), the READ-ONLY
   §4.6 HaltBand (shown when suite kill level > G0), and the left nav rail for
   the six Library screens. Also wires the §5.3/§5.6 Shift+Esc halt-FOCUS
   shortcut + documented fallback chord.

   LIBRARY IS NOT IN THE KILL CHAIN (UI_SPEC §3, PLAN §13). There is NO kill /
   freeze / engage actuator here and NO ⛔ STOP glyph anywhere. Shift+Esc does
   NOT fire a stop — it focuses the rail's "where a stop is visible" note, which
   deep-links OUT to Mission Control, the console that actually holds the halt.

   CANNOT-VERIFY-HERE: this JS drives a STATIC MOCK per screen (the Core API at
   /api/* is live + tested per PLAN §6; these pages map to it, two views over one
   state). No live /api/search, no SSE LiveStream, no real decision POST here.
   Every mutating control is inert; its real op_id-carrying write is wired at
   integration time. See MANIFEST.md.

   A page configures the shell by setting window.LIB_SHELL before this loads:
     window.LIB_SHELL = {
       level:'G0'|'G1'|'G2',          // suite kill level (read-only mirror)
       freshness:{ms:0.4, src:'MC'},  // suite-posture read age
       operator:{sub:'operator:ada', scope:'library:admin'},
       activeNav:'search'|'inspector'|'ingestion'|'spotaudit'|'collections'|'index'
     };
   ========================================================================== */
(function () {
  "use strict";

  var NAV = [
    ["corpus_search.html",         "⌕", "Corpus search",           "search"],
    ["doc_inspector.html",         "▤", "Doc · provenance",        "inspector"],
    ["ingestion_review.html",      "⧉", "Ingestion review",        "ingestion"],
    ["spot_audit.html",            "◉", "Tier-1 spot-audit",       "spotaudit"],
    ["collections_lifecycle.html", "▦", "Collections · lifecycle", "collections"],
    ["index_status.html",          "◍", "Index status",            "index"]
  ];

  function esc(s){ return String(s==null?"":s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }

  var S = window.LIB_SHELL || {};
  S.level = S.level || "G0";
  S.freshness = S.freshness || { ms: 0.4, src: "MC" };
  S.operator = S.operator || { sub: "operator:ada", scope: "library:admin" };

  var engaged = S.level !== "G0";

  function levelWord(l){
    return l === "G2" ? "G2 QUIESCE-ALL — ENGAGED (suite-wide)"
         : l === "G1" ? "G1 FREEZE-DESTRUCTIVE — ENGAGED (suite-wide)"
         : "G0 ARMED";
  }

  /* ---- read-only SYSTEM STATE line (Library shows posture, never enforces) */
  function stateLine(){
    if (engaged){
      return '<div class="line"><span class="lvl">▮▮ ' + esc(levelWord(S.level)) + '</span>'
        + ' <span class="freshness">⟳ mirror ' + esc(S.freshness.ms) + 's · src ' + esc(S.freshness.src) + '</span></div>';
    }
    return '<div class="line"><span class="g0">⟳ G0 ARMED</span>'
      + ' <span class="freshness"><span class="ok">fresh ' + esc(S.freshness.ms) + 's</span> · read-only mirror · src ' + esc(S.freshness.src) + '</span></div>';
  }

  /* ---- §4.6 READ-ONLY HaltBand — only when level > G0. No actuator here;
     Library keeps serving benign reads by design and deep-links to MC. -------- */
  function haltBand(){
    if (!engaged) return "";
    var g2 = S.level === "G2";
    return '<div class="halt-band" role="status" aria-live="polite"><span class="halt-band__edge"></span>'
      + '<span class="halt-band__word"><span class="ico">▮▮</span>'
      + (g2 ? "SUITE KILL-SWITCH · G2 QUIESCE-ALL" : "SUITE KILL-SWITCH · G1 FREEZE-DESTRUCTIVE") + '</span>'
      + '<span class="ro">READ-ONLY MIRROR</span>'
      + '<span>The Library is not in the kill chain — it keeps serving benign reads by design. '
      + 'Admission/lifecycle writes are internal Standard-class state. '
      + 'Where a stop is actually engaged &amp; liftable: <a href="/mc/halt">Mission Control ▸</a></span></div>';
  }

  /* ---- assemble header + rail ------------------------------------------- */
  function render(){
    var mount = document.getElementById("global-shell");
    if (!mount) return;

    var header =
      '<header class="gs-header" role="banner">'
      + '<div class="gs-zone"><div class="gs-brand"><span class="hex" aria-hidden="true">⬢</span> <b>library</b> ▸ reference shelf'
      + '<span class="gs-sub">the corporate reference shelf · curated RAG corpus</span></div></div>'
      + '<div class="gs-zone gs-state"><div class="eyebrow">System state <span class="muted">(read-only)</span></div>' + stateLine() + '</div>'
      + '<div class="gs-zone gs-op"><span class="who">' + esc(S.operator.sub) + '</span> 🔑'
      + '<span class="scope">' + esc(S.operator.scope || "library:read") + '</span></div>'
      + '</header>';

    mount.innerHTML = header + haltBand();

    var railMount = document.getElementById("nav-rail");
    if (railMount){
      var links = NAV.map(function(n){
        var active = (S.activeNav === n[3]) ? " active" : "";
        return '<a class="' + active.trim() + '" href="' + n[0] + '">'
          + '<span class="glyph" aria-hidden="true">' + n[1] + '</span><span class="lab">' + esc(n[2]) + '</span></a>';
      }).join("");
      railMount.innerHTML =
        '<div class="grp">Reference shelf</div>' + links
        + '<div class="sep"></div>'
        + '<div class="grp">Where a stop is visible</div>'
        + '<a id="stopnote" class="stopnote" href="/mc/halt" tabindex="0">'
        + '🔒 The Library holds no kill / freeze / approval authority. '
        + 'The suite stop lives in <b>Mission Control</b> &amp; auth — <a href="/mc/halt">open MC halt ▸</a>. '
        + '<span class="freshness">Shift+Esc / Ctrl+Alt+H focuses this note.</span></a>'
        + '<div class="sep"></div><a href="#"><span class="glyph" aria-hidden="true">⚙</span><span class="lab">session · sign out</span></a>';
    }
  }

  /* ============================================================================
     §5.3/§5.6 Shift+Esc — global halt-FOCUS. Because the Library has NO stop
     actuator, this NEVER fires anything: it focuses the rail note that says
     where a stop actually is and deep-links to MC. Documented fallback chord
     Ctrl+Alt+H (H = Halt) for OS/browser combos that capture Shift+Esc.
     ========================================================================== */
  function focusStopNote(){
    var n = document.getElementById("stopnote");
    // dismiss any open non-critical modal to a safe cancel first
    document.querySelectorAll(".modal-scrim").forEach(function(m){
      var cancel = m.querySelector("[data-cancel]"); if (cancel) cancel.click(); else m.remove();
    });
    document.body.classList.remove("modal-open");
    if (n){ n.focus(); n.setAttribute("data-halt-focused","1"); }
  }
  function keyHandler(ev){
    var shiftEsc = ev.shiftKey && (ev.key === "Escape" || ev.key === "Esc");
    var fallback = ev.ctrlKey && ev.altKey && (ev.key === "h" || ev.key === "H");
    if (shiftEsc || fallback){ ev.preventDefault(); focusStopNote(); }
  }
  document.addEventListener("keydown", keyHandler, true);
  window.LIB_focusStopNote = focusStopNote;

  /* ============================================================================
     Minimal, inert ConfirmFriction wiring for the SCAFFOLD DangerActions.
     A [data-danger] control opens its sibling <template data-confirm> as a
     modal; the typed-intent gate (full friction) enables the confirm only on an
     exact case-sensitive match (paste is not specially blocked in the mock).
     No network write happens — completion just closes and shows a stub toast.
     ========================================================================== */
  function openConfirm(btn){
    var tplSel = btn.getAttribute("data-confirm");
    var tpl = tplSel && document.querySelector(tplSel);
    if (!tpl){ return; }
    var scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML = tpl.innerHTML;
    document.body.appendChild(scrim);
    document.body.classList.add("modal-open");

    var phrase = btn.getAttribute("data-intent");           // required typed phrase, or null
    var input = scrim.querySelector("[data-intent-input]");
    var go = scrim.querySelector("[data-confirm-go]");
    var cancel = scrim.querySelector("[data-cancel]");

    function close(){ scrim.remove(); document.body.classList.remove("modal-open"); btn.focus(); }
    if (cancel) cancel.addEventListener("click", close);
    scrim.addEventListener("click", function(e){ if (e.target === scrim) close(); });
    document.addEventListener("keydown", function esca(e){ if (e.key === "Escape" && !e.shiftKey){ close(); document.removeEventListener("keydown", esca); } });

    if (phrase && input && go){
      go.disabled = true;
      input.addEventListener("input", function(){ go.disabled = (input.value !== phrase); });
    }
    if (go) go.addEventListener("click", function(){
      close();
      toast(btn.getAttribute("data-toast") || "Recorded (SCAFFOLD — no backend write).");
    });
    if (input) input.focus(); else if (go) go.focus();
  }
  function toast(msg){
    var t = document.createElement("div");
    t.setAttribute("role","status");
    t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:1200;"
      + "background:var(--bg-raised);border:1px solid var(--border-strong);border-radius:6px;"
      + "padding:10px 16px;color:var(--text-primary);font-size:13px;box-shadow:var(--elev-modal)";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2600);
  }
  function wireDanger(){
    document.querySelectorAll("[data-danger]").forEach(function(b){
      if (b.__bound) return; b.__bound = true;
      b.addEventListener("click", function(){ openConfirm(b); });
    });
  }
  window.LIB_wireDanger = wireDanger;

  /* ---- go ---- */
  function boot(){ render(); wireDanger(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
