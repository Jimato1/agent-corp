"""chat — the suite's doorbell.

A thin bespoke notification service (ratified D-14): agent→operator notifications
and escalations + a soft operator→fleet broadcast, over one canonical SQLite feed.
ntfy is an outbound push SINK only (never the core, never a second source of truth).

Two views, one state: the write-only MCP tool (`post_notification`) and the operator
UI are siblings over the one HTTP API in ``app.api`` — neither is downstream of the
other. Chat is the doorbell, not the door: it surfaces review/escalation state and
deep-links to MC's canonical queue; it never hosts a queue, clears a gate, or
actuates a stop.
"""

__version__ = "0.1.0"
