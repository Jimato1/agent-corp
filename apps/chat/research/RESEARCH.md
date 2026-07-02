# Stage 1 Research — `chat`

Chat is a **Standard** risk-class app, and it is deliberately the narrowest surface in the suite: a **one-way** agent→operator notification stream (escalation / needs-review / done) plus a one-way operator→fleet broadcast. It is explicitly **not** agent-to-agent chat — coordination lives on the Board (atomic claims) and deliberation lives in Notes (ARCHITECTURE.md §4 chat row + §6; root CLAUDE.md invariants). As with the `auth` app, **"adopt" is the default that "build" must beat.** The research below resolves that default with a scoped answer that the adversarial review forced into the open: the *only* genuinely hard, adopt-worthy problem in Chat is **push to an idle mobile device** (the APNs/foreground-socket problem). Everything else — an HTTP ingest, a SQLite store, an SSE feed, priority/tags/click fields — is trivial to build and, under the suite invariants, **must** be built anyway. So the recommendation is a split: **BUILD a thin Chat service (own API, own canonical SQLite, own SSE feed UI, one write-only MCP tool, OIDC auth behind the proxy), and ADOPT [ntfy](https://ntfy.sh/) purely as the outbound push-to-device leg** — a single downstream fan-out sink, not the backbone.

**Recommendation on the deferred decision (adopt vs build): BUILD the thin Chat core; ADOPT ntfy only as an outbound push sink.** This satisfies "adopt beats build" where it counts (the mobile-push transport is adopted, not reinvented) without importing ntfy's message store, its bearer-token/ACL auth system, or its web UI — each of which would violate a hard suite invariant ("two views, one state," suite-wide OIDC identity, "never a second source of truth"). ntfy is assigned the exact role the raw research correctly gave Apprise: an optional downstream fan-out, never the system of record.

---

## Executive summary

- **Chat's locked scope maps onto an HTTP pub-sub notification server**, and of the candidates ntfy is the strongest single fit — a single Go binary with an HTTP PUT/POST publish path, topics, 5-level priority, tags/emoji, a per-notification click URL and action buttons, per-topic ACLs, an SSE feed, and a permissive Apache-2.0/GPLv2 license ([ntfy.sh](https://ntfy.sh/); [docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/); [github.com/binwiederhier/ntfy](https://github.com/binwiederhier/ntfy)). **But adopting it *as the core* imports a second store, a second auth system, and a downstream UI** — so it is adopted only as the outbound push sink (see §1).
- **There is no APNs-free way to wake an idle iPhone.** iOS forbids long-lived background sockets, so every self-hosted iOS push path transits Apple's APNs, usually via an operator-run bridge; Android can be fully de-Googled via UnifiedPush but iOS cannot ([docs.ntfy.sh/known-issues](https://docs.ntfy.sh/known-issues/); [ntfy issue #1680](https://github.com/binwiederhier/ntfy/issues/1680); [gotify/server#87](https://github.com/gotify/server/issues/87)). This one hard problem is what justifies adopting ntfy at all.
- **W3C Web Push works on desktop browsers and on iOS 16.4+ but only for a PWA installed to the Home Screen**, riding Apple's own APNs ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/); [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API); [RFC 8030](https://datatracker.ietf.org/doc/html/rfc8030)). This is the zero-extra-dependency desktop fallback.
- **The notification message model should be inherited from ntfy's shape** — `{id, created_at, class, title, body, priority(1–5), tags[], ticket_id, agent_id, click(deep-link), actions[], ack_state, dedup_key}` — with the three classes as priority+routing profiles over one schema: ESCALATION=max/ack-required, NEEDS-REVIEW=high, DONE=low ([docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/); [docs.ntfy.sh/subscribe/api](https://docs.ntfy.sh/subscribe/api/)).
- **The live human feed should be SSE, server→client only**, matching Mission Control's SSE choice, with `since`/`Last-Event-ID` replay for reconnect; WebSocket is unnecessary for a one-way v1 ([docs.ntfy.sh/subscribe/api](https://docs.ntfy.sh/subscribe/api/)).
- **Chat is a POINTER, not a copy of state.** A notification stores its own envelope plus a `source_ref` `{system, kind, id}`; the canonical review/approval/kill-switch state lives in MC/Board/Notes. Chat derives the deep link server-side (`https://mc.<SUITE_DOMAIN>/review/<id>`), never accepting a free-form agent URL ([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)).
- **Resolution flows one-way MC→Chat**: an optional MC-emitted event flips a local `resolved` flag; Chat never writes into MC's queue, so it never becomes a second source of truth (Chat CLAUDE.md; ARCHITECTURE.md §3–§5).
- **The agent MCP surface is one write-only tool** — `post_notification` (+ optional `post_escalation` sugar) — scoped by the suite `auth` OIDC gateway (`chat:notify:write` for agents; `chat:broadcast:write`/`chat:feed:read` operator-only), served over MCP Streamable HTTP as an OAuth 2.0 Resource Server with RFC 8707 resource binding ([MCP 2025-11-25 changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog); [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707)).
- **Agent-to-agent messaging is scoped OUT of v1** — it would reintroduce coordinate-by-negotiation, which the architecture routes to the Board and Notes; two-way is noted only as a clearly-deferred, always-human-in-the-loop later addition (root CLAUDE.md; ARCHITECTURE.md §4).
- **The operator broadcast is a soft, UI-only advisory**, explicitly distinct from and weaker than the hard global kill switch (which bites at the Gateway/auth chokepoint); agents do **not** get an in-band Chat read channel that could become a coordination side-channel ([gotify/docs/pushmsg](https://gotify.net/docs/pushmsg); MC↔auth kill-switch memory).

---

## 1. Adopt vs Build — the crux

### Findings

**The scope of the adopt-worthy problem.** ntfy is a near-perfect *feature* match for Chat's ingest and push affordances: publishing is "just an HTTP request" (`curl -d "Backup successful" ntfy.sh/mytopic`) via PUT/POST to a topic, subscribe is GET/WebSocket/SSE with a JSON poll endpoint, and publish headers cover `X-Title`, `X-Priority` (1–5), `X-Tags` (emoji shortcodes), `X-Click` (deep-link target), and `X-Actions` (up to 3 view/http/broadcast/copy buttons) ([ntfy.sh](https://ntfy.sh/); [docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/); [docs.ntfy.sh/subscribe/api](https://docs.ntfy.sh/subscribe/api/)). It self-hosts as a single Go binary with a SQLite-backed message cache, ships bearer-token + per-topic read/write/deny ACLs (`ntfy access USER TOPIC PERMISSION`), a built-in web feed at `ntfy.sh/app`, and a dual Apache-2.0/GPLv2 license ([github.com/binwiederhier/ntfy](https://github.com/binwiederhier/ntfy); [docs.ntfy.sh/config](https://ntfy.sh/docs/config/)).

**But feature-match is not architecture-match.** ntfy is a *self-contained product* with (a) its own SQLite message store, (b) its own user/token/ACL auth system, and (c) its own web feed UI. Chat's Standard-rigor obligations under the suite invariants are: "two views, one state… the MCP surface and the UI are siblings over one API. Neither is downstream of the other"; suite identity via the `auth` OIDC gateway with scoped MCP authz; and "never a second source of truth." Adopting ntfy *as the core* collides with all three at once:

1. **Second source of truth.** If ntfy's DB is canonical, Chat's API is downstream of ntfy (invariant broken). If Chat's SQLite is canonical, ntfy's store is a redundant copy that must be reconciled — the very "second source of truth" the architecture forbids. There is no configuration of "ntfy as core" that avoids one horn of this.
2. **Second auth system.** ntfy authenticates with its own bearer tokens/ACLs, not OIDC. "Mint ntfy tokens from the auth gateway" is a half-bridge between two identity systems — precisely the anti-pattern the `auth`-app lesson warns against. The MCP surface's authz must be enforced by suite `auth` scopes, not ntfy ACLs.
3. **UI downstream of ntfy.** If the operator feed *is* ntfy's web app, the human view reads ntfy topics directly and is downstream of ntfy, not a sibling over Chat's API — a hard violation of "neither is downstream of the other."

**The trivial-to-build remainder.** Strip away the mobile-push transport and what ntfy contributes is an HTTP POST ingest, a SQLite row, an SSE stream, and a few typed fields — all of which Chat must build regardless to satisfy the invariants above and to own its audit trail (Standard risk class requires audit logging of state changes; the notification feed *is* that append-only, git/backup-covered audit log). The bespoke core is genuinely thin: an API, a canonical SQLite store, an SSE feed UI, one MCP tool, and OIDC wiring behind the existing proxy.

**Rejected alternatives (unchanged from the raw research).** **Matrix** (Synapse/Dendrite + Sygnal push gateway) is a full bidirectional federated chat protocol — operationally heavy and, worse, it hands you the two-way room surface the architecture explicitly rejects for Chat ([github.com/matrix-org/sygnal](https://github.com/matrix-org/sygnal); [Matrix push-gateway spec](https://spec.matrix.org/unstable/push-gateway-api/); [Synapse workers](https://matrix-org.github.io/synapse/v1.85/workers.html)). **Novu** is open-core (core MIT but `/enterprise` + `/apps/*/src/ee` under a separate Enterprise License) and self-hosts as a multi-service stack (API/worker/dashboard + MongoDB + Redis) — disproportionate to a one-way homelab stream ([github.com/novuhq/novu](https://github.com/novuhq/novu); [novu.co](https://novu.co/)). **Apprise** is a stateless fan-out sender library with no store and no feed — complementary, not a backbone ([github.com/caronc/apprise](https://github.com/caronc/apprise); [appriseit.com](https://appriseit.com/)). **Gotify** is a simpler MIT alternative but coarser (priority-only metadata, `extras`-based click actions) and has no official iOS app ([github.com/gotify/server](https://github.com/gotify/server); [gotify.net/docs/pushmsg](https://gotify.net/docs/pushmsg)).

> **Adversarial correction (the crux the raw research fudged).** The leading raw recommendation — "ADOPT ntfy as Chat's transport + store + baseline feed" — over-fits by conflating "adopt the push transport" with "adopt the whole product." The four research passes *contradicted each other* on the canonical store: the adopt-vs-build pass said "keep ntfy's DB as the single source of state," while the stream-semantics pass said "persist all notifications in **Chat's own SQLite store** as the canonical feed." Both cannot be true, and PROCESS.md Stage-1 exit requires a single non-contradictory recommendation for *the* central decision. **This synthesis resolves it: Chat's own SQLite is the single system of record and the audit log; ntfy holds no canonical state.** The forced answer to the deferred open question "is ntfy's web app an acceptable operator feed?" is likewise **No** under "neither is downstream of the other" — the operator feed is Chat's own SSE UI. ntfy is reassigned to the outbound-push-sink role the research correctly gave Apprise.

### Recommendation

**BUILD a thin bespoke Chat service — own API, own canonical SQLite (the single source of truth and the append-only audit log), own SSE feed UI (sibling of the MCP surface), one write-only MCP tool, all behind the suite proxy + OIDC auth. ADOPT ntfy purely as an outbound push sink:** Chat POSTs to a single ntfy topic as one downstream fan-out to the operator's phone, using one service token held by Chat. This dissolves the auth problem entirely — agents authenticate to Chat's MCP surface via OIDC; ntfy sees only Chat's one service token, so there is no second identity system for agents. Reject Matrix and Novu for v1; keep Apprise available as an alternative/additional fan-out; treat Gotify as the fallback only if a strict-MIT or Android-only constraint ever emerges. Keep agent-to-agent and two-way strictly out of v1.

---

## 2. Push to the operator's devices (mobile-first)

### Findings

**iOS is the hard constraint; there is no APNs-free wake.** iOS kills long-lived background sockets, so a self-hosted server cannot reach an idle iPhone directly. ntfy's iOS app works around this by relaying a tiny poll-request (a message *reference*) to an upstream ntfy server that holds an Apple push cert and pushes via **APNs**; the device then fetches the actual content from your server ([docs.ntfy.sh/known-issues](https://docs.ntfy.sh/known-issues/); [ntfy issue #1680](https://github.com/binwiederhier/ntfy/issues/1680)). Gotify has **no** official iOS app for the same structural reason ([gotify/server#87](https://github.com/gotify/server/issues/87); [gotify/android#159](https://github.com/gotify/android/issues/159)). This single problem — waking an idle iPhone — is the one thing genuinely worth adopting rather than building.

**W3C Web Push (the desktop fallback).** Push API + Notifications API + Service Workers with VAPID ([RFC 8030](https://datatracker.ietf.org/doc/html/rfc8030); [RFC 8292](https://datatracker.ietf.org/doc/html/rfc8292); [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)) works across modern desktop browsers with zero external dependency. On iOS/iPadOS it works only from **iOS 16.4+** and only when the site is **installed to the Home Screen**, riding Apple's own APNs, with permission requested from a direct user gesture ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/); [webventures: iOS web push requires install](https://webventures.rejh.nl/blog/2023/ios-web-push-requires-install/)). A plain browser tab on iPhone cannot receive Web Push.

**UnifiedPush (Android, FCM-free).** UnifiedPush decouples the app from the transport: a distributor app (ntfy) holds one persistent connection and hands each app a push URL, replacing FCM ([unifiedpush.org distributors/ntfy](https://unifiedpush.org/users/distributors/ntfy/); [unifiedpush.org announcement](https://unifiedpush.org/news/20221218_unifiedpush/)). The ntfy Android app is a UnifiedPush distributor; instant delivery uses a foreground service, so battery-optimization exemptions matter ([ntfy phone docs](https://github.com/binwiederhier/ntfy/blob/main/docs/subscribe/phone.md)). This solves Android, not iOS.

**Priority maps to phone behavior.** ntfy priority ≥3 triggers sound/vibration and ≥4 shows a heads-up pop-over, cleanly mapping ESCALATION→high/urgent and DONE→low ([docs.ntfy.sh/subscribe/phone](https://docs.ntfy.sh/subscribe/phone/); [docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/)).

> **Adversarial correction (privacy / recency).** Two raw claims need care and are moved to *Verify at build time*: (1) "all iOS browsers use WebKit, so Chrome/Firefox inherit the install constraint" is **stale** — since iOS 17.4 (March 2024, EU DMA) Apple permits non-WebKit engines in the EU, so the blanket claim is no longer globally true. (2) The raw text said ntfy's iOS path "pushes through Firebase→APNs" — that is **inaccurate**: Firebase/FCM is the Android leg; the iOS instant-delivery path is poll-request → upstream ntfy server → **APNs directly** (the upstream holds the Apple cert), no Firebase. The **privacy linchpin**: in the recommended mode only a message *reference* transits the upstream and the device fetches content from your server — but if instead you POST notification *content* to a public `ntfy.sh` topic, agent-authored bodies (hostnames, CVEs, ticket detail) transit a third party. **Chat must assume the reference-only mode and treat notification bodies as potentially sensitive** — either run a self-hosted APNs bridge (own Apple cert + self-built iOS app) or, at minimum, keep sensitive detail behind the deep link rather than in the pushed body.

### Recommendation

**Adopt ntfy as the outbound mobile-push sink; ship Chat's own PWA Web Push as the desktop fallback.** Concretely: (1) self-host an ntfy server behind the existing proxy (TLS); Chat POSTs each notification event to a single per-operator ntfy topic with priority mapped to class (ESCALATION=high/urgent, NEEDS-REVIEW/DONE=default/low) and a `click` deep-link into Mission Control. (2) The operator subscribes the official ntfy Android and/or iOS app; Android is FCM-free via UnifiedPush, iOS uses `upstream-base-url` so instant delivery reaches APNs. (3) Ship Chat as an installable PWA with standard VAPID Web Push so desktop browsers (and Home-Screen-installed iPhones) get notifications with zero external dependency. (4) **Push carries a reference + short summary; sensitive detail stays behind the auth-gated deep link** — never POST full agent-authored bodies to a public ntfy topic. Do not build a bespoke mobile-push stack; the APNs/foreground-socket problem is exactly what the adopted client solves. Settle the "own APNs bridge vs public ntfy.sh upstream" purity/friction tradeoff and the Web-Push-vs-ntfy double-notify dedup question in Planning (both flagged below).

---

## 3. The notification stream + operator broadcast

### Findings

**Inherit ntfy's message shape (build the schema, don't adopt the server).** ntfy notifications carry title (`X-Title`), body, priority (`X-Priority`), tags (`X-Tags`), a click URL (`X-Click`), up to three action buttons (`X-Actions` of type view/http/broadcast/copy), attachments, and on delivery a JSON object with a server-assigned id + Unix time + event type ([docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/); [docs.ntfy.sh/subscribe/api](https://docs.ntfy.sh/subscribe/api/)). Chat mirrors this shape in its *own* store: `{id, created_at, class, title, body(markdown, sanitized), priority(1–5), tags[], ticket_id, agent_id, click(MC deep-link), actions[], ack_state, dedup_key}`.

**Priority scale.** Adopt ntfy's 5-level named scale (1=min … 5=max) over Gotify's semantically-anchorless 0–10, and note Gotify's own caveat that priority "currently only has an effect in the Android app" ([docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/); [gotify.net/docs/pushmsg](https://gotify.net/docs/pushmsg)). Map: ESCALATION=5/max (blocked agent, needs human now), NEEDS-REVIEW=4/high (artifact waiting, not an emergency), DONE=2/low (informational, must stay quiet) — directly serving "escalation is the default failure mode."

**One schema, three routing profiles — not three pipelines.** A required `class` tag (escalation|needs-review|done) plus free-form tags (host, cve, ticket); the class sets priority, ack behavior, and *which MC surface the click deep-links into*. The click always points **into** Mission Control, so Chat stores a notification + a pointer, never a second copy of review/approval state ([docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/)).

**Transport = SSE, server→client only.** ntfy exposes `/json`, `/sse` (EventSource), `/raw`, and `/ws`; Gotify uses a WebSocket `/stream` ([docs.ntfy.sh/subscribe/api](https://docs.ntfy.sh/subscribe/api/); [github.com/gotify/server](https://github.com/gotify/server)). Chat's human feed is strictly one-way, so SSE fits exactly, auto-reconnects, works over plain HTTP + proxy forward-auth, and stays consistent with Mission Control's documented SSE choice. Pair it with a `since`/`Last-Event-ID` replay parameter so a reconnecting UI catches up from persisted history. Reserve WebSocket only for a future (out-of-v1) two-way scope.

**Persistence and dedup.** Chat's SQLite is the canonical, durable feed (not ntfy's cache, which is explicitly a push cache, not a system of record). Expose an SSE live stream plus a paginated history API filterable by priority/class/agent/ticket/ack. Because ntfy does **not** dedupe regular publishes (its sequence-id mechanism only updates/cancels *scheduled* messages), and because the architecture's stated failure mode is never-terminating local agents, Chat must accept a client-supplied **idempotency/dedup key** (e.g. `ticket_id + class + state-hash`) and collapse duplicates server-side ([docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/)).

**Markdown bodies, sanitized.** Both reference servers support markdown bodies + click deep-links (ntfy via `X-Markdown`/`Content-Type: text/markdown`; Gotify via `extras` `client::display.contentType` and `client::notification.click.url`) ([docs.ntfy.sh/publish](https://docs.ntfy.sh/publish/); [gotify.net/docs/msgextras](https://gotify.net/docs/msgextras)). Gotify's own security note flags that markdown can pull remote images (tracking/exfil risk).

> **Adversarial correction — bodies are untrusted; audit/retention/rate-limit are requirements, not open questions.** Notification bodies come from agents, which in the "runaway/compromised agent" threat model are untrusted. **Sanitize-and-proxy (or strip) remote references is a hard build requirement**, not a deferred choice — commit to it now. Standard risk class also requires state-change audit: **Chat's canonical SQLite append-only feed *is* the audit log** (git/backup-covered), superseding any reliance on ntfy's store or access log. Set concrete **retention/durability** (Chat keeps durable operator-visible history; ntfy's cache window is irrelevant since ntfy holds no canonical state). And beyond dedup, add **per-agent rate limiting** on the MCP post surface to bound a spinning agent — dedup collapses identical posts, rate-limiting bounds distinct-but-runaway ones; specify both. Finally, commit to **delivery semantics: at-least-once with the in-app SSE feed as the durable fallback** — if push fails, the notification is still in Chat's feed.

> **Adversarial correction — the broadcast is UI-only; agents get no in-band read channel.** The raw research baked "agents poll a shared fleet topic" into its recommendation while also raising it as a risk. Resolve it, don't default it: a fleet topic that agents read and "factor into their loop" is a **second inbound directive channel competing with the Board** — exactly the coordination side-channel the design forbids (agents receive directives via the Board; deliberation is in Notes). **The operator broadcast is a soft, UI-only advisory artifact** ("stop working on X", "operator note to fleet"), surfaced to the operator and, where an advisory must reach agents, delivered **through the Board/MC**, not an in-band Chat read channel. This also further shrinks Chat's build — no agent-facing read surface at all. Keep the broadcast explicitly distinct from the **hard global kill switch**, which physically bites at the Gateway chokepoint and is enforced at `auth` (MC relays); the broadcast has no enforcement teeth and cannot halt a runaway agent ([gotify.net/docs/pushmsg](https://gotify.net/docs/pushmsg); MC↔auth kill-switch boundary memory).

### Recommendation

**Build Chat's own message model on ntfy's schema template** (do not adopt the server as store): per-notification `{id, created_at, class(escalation|needs-review|done), title, body(markdown, sanitized, remote-refs stripped/proxied), priority(1–5 min..max), tags[], ticket_id, agent_id, click(MC deep-link), actions[], ack_state, dedup_key}`. Map classes to priority + routing: ESCALATION=max + ack-required + deep-link to MC escalation/approval; NEEDS-REVIEW=high + deep-link to MC review queue (clears in MC); DONE=low + informational. Persist all notifications in Chat's canonical SQLite (this is the durable feed **and** the audit log) with a `since`/replay history API. Deliver the live feed over **SSE** (server→client only, matches MC) with `Last-Event-ID`/`since` reconnection; no WebSocket in v1. Enforce **both** a server-side idempotency/dedup key **and** per-agent rate limits; commit to **at-least-once delivery with the SSE feed as durable fallback**. Implement the operator broadcast as a **soft, UI-only advisory** (priority + expiry) surfaced to the operator and routed to agents (if at all) via the Board/MC — never an in-band Chat read channel — and keep it explicitly weaker than and separate from the hard kill switch.

---

## 4. Relationship to Mission Control — the seam

### Findings

**A Chat notification is an append-only POINTER, not a state copy.** Grounded in "two views, one state" and Chat CLAUDE.md ("notifications should POINT INTO MC's review queue, not duplicate MC's state"), the stored envelope is `{id, created_at, agent_id (from auth subject), type ∈ escalation|needs_review|done, title, summary, priority, source_ref {system: board|mc|notes, kind: ticket|review|note, id}, resolved (default false), resolved_at}`. Chat stores **no** approval decision, review verdict, WIP/budget figure, or kill-switch state — those are read and acted on at the target. The summary is a deliberately-stale, denormalized snapshot for glanceability (like an email notification body); if summary and target disagree, the target wins.

**Deep links are plain HTTPS on the canonical app's subdomain, reconstructed server-side.** The proxy Caddyfile already routes each app on `<app>.<SUITE_DOMAIN>` behind forward-auth — MC on `mc.<SUITE_DOMAIN>`, Board `board.`, Notes `notes.`, Chat `chat.` — so an HTTPS deep link lands the operator on the canonical, already-auth-gated item with no bespoke URL handler ([RFC 3986](https://www.rfc-editor.org/rfc/rfc3986)). Prefer HTTPS over a custom `mission-control://` scheme (the operator surface is a browser behind the proxy). Chat builds the URL from the `{system, kind, id}` triple against templates **it owns**, and allowlists host+path — it never accepts a free-form or `javascript:` URL from an agent.

**Resolution flows one-way MC→Chat.** Two options: (1) fully dumb — notifications are immutable/append-only, operator dismisses locally, re-checks target for truth; (2) auto-resolve — MC (owner of the review/approval lifecycle) emits an event on clear/approve/close, Chat subscribes and marks matching notifications `resolved` by `source_ref`. Recommend (2) as a thin enhancement, but the event flows **MC→Chat only** and mutates only Chat's local `resolved` mirror — never the reverse. MC's own research standardizes on SSE for live views, so a Chat-side subscriber to an MC event/SSE feed is the natural shape ([MCP 2025-11-25 changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog)).

**Do not duplicate the approval gate.** ARCHITECTURE.md §3–§4 place both human gates (pre-execution `awaiting_approval`, post-work `needs_review`) in MC's unified queue. If Chat rendered an approve button that wrote approval state, it would create a second place approvals live — violating segregation-of-duties bookkeeping and "two views, one state." **Chat is the doorbell; MC is the door.**

> **Adversarial note — verify MC's actual URL scheme.** Per build order, MC is built before Chat, so the deep-link contract is *checkable, not hypothetical*. The raw research asserts MC exposes `/review/<id>`; confirm MC's actual stable URL scheme for a single review/approval item before Planning — a deep link into a URL MC doesn't expose is a broken core feature. **Free-form agent-supplied deep-link URLs are prohibited** (reconstruct from the `{system,kind,id}` triple, allowlist host+path) — elevate from a finding to a hard build requirement.

> **Adversarial note — ack/read-state ownership split.** Promote to a stated recommendation: **Chat owns "operator saw it," MC owns "artifact reviewed."** Note the dependency — if MC's event/SSE feed isn't ready at Chat's build time, ship option (1) (append-only) and add the resolve-event later; the `source_ref` in the envelope makes it a **non-breaking** addition.

### Recommendation

**Treat every Chat notification as an immutable, append-only pointer.** Chat stores only its envelope (`id, created_at, agent_id, type, title, summary, priority, source_ref{system,kind,id}, resolved, resolved_at`) and derives the deep link server-side as an HTTPS URL on the canonical app's subdomain (`https://mc.<SUITE_DOMAIN>/review/<id>`, `https://board.<SUITE_DOMAIN>/ticket/<id>`, `https://notes.<SUITE_DOMAIN>/<id>`) from templates Chat owns — never a bespoke scheme, never a free-form agent URL (allowlist host+path). Canonical review/approval/kill-switch/WIP state stays in MC/Board/Notes; **Chat never writes into MC** and never renders an approve/deny control. Add one optional convenience: a **one-way MC→Chat resolve event** (over MC's SSE feed) that flips Chat's local `resolved` mirror when the underlying item closes. **Ownership split: Chat owns "operator saw it," MC owns "artifact reviewed."** If MC's event feed isn't ready at build, ship append-only and add resolve later (non-breaking via `source_ref`). Confirm MC's actual `/review/<id>`-style URL contract before Planning.

---

## 5. The thin agent MCP surface

### Findings

**One write-only tool.** Recommended signature: `post_notification(type: 'escalation'|'needs_review'|'done', title, body, priority, ticket_id, target_ref: {system, kind, id}) -> {notification_id}`, with optional `post_escalation(title, body, ticket_id, target_ref)` as thin sugar for `type='escalation', priority='urgent'` — included only if it measurably helps agents escalate rather than spin ("escalation is the default failure mode"). The **server**, not the agent, resolves `target_ref` into the validated HTTPS deep link and stamps `agent_id` from the authenticated auth subject (never trust an agent-supplied author). Keep the surface tiny to shrink the agent misuse surface and match Chat's deliberately-narrow identity.

**MCP authz via the suite auth platform.** Standard rigor (PROCESS.md Stage 5) requires authz on the MCP surface. The proxy terminates identity via forward-auth and hands the app a signed identity each resource server re-validates against its audience-bound token. Recommended scopes: `chat:notify:write` (post tools) for agent identities; `chat:broadcast:write` and `chat:feed:read` for the **operator identity only**. Agents get neither read nor broadcast; no delete/edit tool exists — the feed is append-only for audit. Enforce `agent_id = authenticated subject` server-side so an agent cannot post as another (`agent_id` spoofing is closed by construction) ([MCP security best practices](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices); [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707)).

**Transport.** Build one MCP server for Chat over **Streamable HTTP** (single endpoint; POST client→server, optional GET/SSE streaming) behind the proxy + auth gate, modeled as an OAuth 2.0 Resource Server with RFC 8707 resource binding; the 2025-11-25 revision added OpenID Connect Discovery, aligning with the suite's OIDC `auth` platform ([MCP 2025-11-25 changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog); [MCP 2025-03-26 transports](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports); [auth0: MCP Streamable HTTP](https://auth0.com/blog/mcp-streamable-http/)). Chat's tool set is a simple write with an immediate id result, so it needs none of the durable-"tasks" machinery (SEP-1686).

**Explicit scope-out of agent-to-agent.** Root CLAUDE.md: "Agents coordinate execution through the Board (atomic claims), never by negotiation… may deliberate about a plan; may not negotiate who does the work." ARCHITECTURE.md §4: "Do NOT build agent-to-agent chat here." A messaging path between agents in Chat would create exactly that negotiation surface and split coordination state out of the Board. v1 Chat is strictly agent→operator (notifications) + operator→fleet (broadcast, UI-only per §3).

> **Adversarial note — MCP revisions are unpinnable today; do not design against the RC.** The whole MCP authz story (Streamable HTTP, RFC 8707 resource binding, OIDC discovery, the deprecation of HTTP+SSE, the 2026-07-28 RC, SEP-1686 tasks) rests on revisions that cannot be firmly pinned as of 2026-07-01. **Pin the exact SDK + spec revision at build time; design against the shipped revision your SDK implements, not the in-flight RC.** (All such items are consolidated in *Verify at build time*.)

### Recommendation

**Ship one thin, write-only MCP tool:** `post_notification(type, title, body, priority, ticket_id, target_ref{system,kind,id}) -> {notification_id}`, plus optional `post_escalation(...)` sugar. No agent read/list/delete/broadcast tools. The server stamps `agent_id` from the authenticated subject and builds/validates the deep link (allowlist host+path). Authz scopes: `chat:notify:write` for agents; `chat:broadcast:write` + `chat:feed:read` for the operator identity only; feed append-only for audit. Serve over **MCP Streamable HTTP** behind the proxy + OIDC auth as an OAuth 2.0 Resource Server with RFC 8707 resource binding. **Scope OUT agent-to-agent messaging for v1** (it would reintroduce coordinate-by-negotiation; coordination = Board, deliberation = Notes). Note operator↔specific-agent two-way as a clearly-deferred later addition that always keeps the operator as one endpoint — never an agent↔agent path.

---

## Verify at build time

- **iOS WebKit-engine monopoly (recency-sensitive).** Since iOS 17.4 (March 2024, EU DMA) Apple permits non-WebKit browser engines in the EU; the blanket "all iOS browsers are WebKit" claim is no longer globally true. Re-verify current status and whether non-WebKit iOS browsers change the PWA/Web-Push constraint ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/); Apple DMA developer docs).
- **ntfy iOS delivery path & privacy mode.** Confirm the iOS instant-delivery path is poll-request → upstream ntfy → **APNs directly** (no Firebase on the iOS leg), and confirm precisely that only a message *reference* (not content) transits the upstream in reference-mode; state which mode Chat assumes and whether a self-hosted APNs bridge (own Apple cert + self-built iOS app) is warranted ([docs.ntfy.sh/known-issues](https://docs.ntfy.sh/known-issues/); [ntfy issue #1680](https://github.com/binwiederhier/ntfy/issues/1680)).
- **ntfy license terms.** Verify exact Apache-2.0 / GPLv2 terms and whether server vs mobile apps differ (apps may be GPL-only) ([github.com/binwiederhier/ntfy](https://github.com/binwiederhier/ntfy) LICENSE).
- **ntfy auth/ACL + `upstream-base-url` behavior.** Confirm current Bearer-token/ACL CLI/config flags and that `upstream-base-url` must exactly match the iOS app's Default Server ([docs.ntfy.sh/config](https://ntfy.sh/docs/config/); [docs.ntfy.sh/subscribe/phone](https://docs.ntfy.sh/subscribe/phone/)).
- **ntfy Android build FCM behavior.** Re-verify that the Play build uses Firebase only for the `ntfy.sh` host and the F-Droid build has no Firebase ([ntfy phone docs](https://github.com/binwiederhier/ntfy/blob/main/docs/subscribe/phone.md); [unifiedpush.org/distributors/ntfy](https://unifiedpush.org/users/distributors/ntfy/)).
- **Gotify priority behavior.** Verify whether priority still "only has an effect in the Android app" ([gotify.net/docs/pushmsg](https://gotify.net/docs/pushmsg)).
- **Novu license split & self-host stack.** Re-verify the current MIT vs Enterprise-License boundary and MongoDB+Redis requirements before citing as a rejection reason ([github.com/novuhq/novu](https://github.com/novuhq/novu)).
- **MCP SDK + spec revision.** Pin the exact SDK and shipped spec revision at build. As of 2026-07-01 the current revision is 2025-11-25 (Streamable HTTP; HTTP+SSE deprecated; OIDC discovery + RFC 8707 resource binding), with a **2026-07-28 Release Candidate in flight** and draft routing headers (`Mcp-Method`/`Mcp-Name`) and cache hints (`ttlMs`/`cacheScope`) — do **not** design against the RC ([MCP changelog](https://modelcontextprotocol.io/specification/2025-11-25/changelog); [MCP RC post](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)).
- **Web Push specifics.** VAPID key handling and exact iOS-version / desktop-browser Web Push coverage ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/); [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API); [RFC 8030](https://datatracker.ietf.org/doc/html/rfc8030)).
- **MC deep-link contract.** Confirm MC's actual stable URL scheme for a single review/approval item (e.g. `/review/<id>`) and the proxy Caddyfile audiences for `mc`/`board`/`notes`/`chat` — MC is built before Chat, so this is checkable, not hypothetical.
- **Markdown sanitizer choice.** Pick and pin the markdown sanitizer/renderer for agent-authored bodies (remote-image strip/proxy) ([gotify.net/docs/msgextras](https://gotify.net/docs/msgextras)).

---

## Open design questions to settle before Planning

1. **Own APNs bridge vs public `ntfy.sh` upstream.** Privacy/self-hosting-purity vs friction: does this security-conscious system run its own Apple push cert + self-built ntfy iOS app, or accept the public upstream in reference-only mode? (Tied to the §2 privacy correction and the PII policy below.)
2. **Web-Push-vs-ntfy dedup for the single operator on 1–2 devices.** Do we run both transports for redundancy and dedup at the device, or pick one to avoid double-notifying? Planning-blocking if left open.
3. **PII/secret policy in notification bodies vs third-party push transit.** Concrete policy required: what may appear in a pushed body vs only behind the auth-gated deep link. (Recommended default: reference + short summary in push, sensitive detail behind the link.)
4. **`source_ref` → URL contract.** Confirm the strict `{system, kind, id}` triple mapped to URL templates Chat owns (recommended, decoupled) is compatible with MC/Board/Notes' actual routes.
5. **Resolve-event dependency & timing.** Is MC's event/SSE resolve feed ready at Chat's build time? If not, ship append-only and add resolution later (non-breaking via `source_ref`).
6. **Broadcast delivery to agents (if any).** Confirm the operator broadcast is UI-only and, where an advisory must reach agents, is routed via the Board/MC — cross-check with the Board's claim/poll design so it never becomes a coordination side-channel.
7. **Retention window.** Set a concrete durable-history retention policy for Chat's canonical SQLite feed and a short expiry for operator broadcasts.
8. **`post_escalation` sugar.** Include only if it measurably reduces spin; decide during Planning/Build.
9. **Two-way trigger (deferred).** Capture the constraint now — the most valuable later two-way use case (operator direct-reply to one agent) must be addable without ever creating an agent↔agent path (operator always one endpoint).

---

## Sources

**ntfy (adopted push sink / schema reference)**
- https://ntfy.sh/
- https://docs.ntfy.sh/publish/
- https://docs.ntfy.sh/subscribe/api/
- https://docs.ntfy.sh/subscribe/phone/
- https://docs.ntfy.sh/known-issues/
- https://ntfy.sh/docs/config/
- https://github.com/binwiederhier/ntfy
- https://github.com/binwiederhier/ntfy/blob/main/docs/subscribe/phone.md
- https://github.com/binwiederhier/ntfy/issues/1680

**Gotify (fallback / comparison)**
- https://github.com/gotify/server
- https://gotify.net/api-docs
- https://gotify.net/docs/pushmsg
- https://gotify.net/docs/msgextras
- https://github.com/gotify/android/issues/159
- https://github.com/gotify/server/issues/87
- https://github.com/androidseb25/iGotify-Notification-Assistent

**Rejected alternatives (Matrix / Novu / Apprise)**
- https://github.com/matrix-org/sygnal
- https://spec.matrix.org/unstable/push-gateway-api/
- https://matrix-org.github.io/synapse/v1.85/workers.html
- https://github.com/novuhq/novu
- https://novu.co/
- https://github.com/caronc/apprise
- https://appriseit.com/

**Mobile push / Web Push / UnifiedPush**
- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://webventures.rejh.nl/blog/2023/ios-web-push-requires-install/
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- https://datatracker.ietf.org/doc/html/rfc8030
- https://datatracker.ietf.org/doc/html/rfc8292
- https://unifiedpush.org/users/distributors/ntfy/
- https://unifiedpush.org/users/distributors/
- https://unifiedpush.org/news/20221218_unifiedpush/

**MCP / transport / authz**
- https://modelcontextprotocol.io/specification/2025-11-25/changelog
- https://modelcontextprotocol.io/specification/2025-11-25/basic/transports
- https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices
- https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
- https://auth0.com/blog/mcp-streamable-http/
- https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
- https://blog.modelcontextprotocol.io/posts/2025-12-19-mcp-transport-future/
- https://www.rfc-editor.org/rfc/rfc8707
- https://www.rfc-editor.org/rfc/rfc3986
