"""Window algebra: overnight windows, DST fold/gap, freeze deny-overrides, effective_close,
grace zone, ambiguity (§3.2, §4.3, §3.6)."""
from __future__ import annotations

from datetime import datetime, timezone

from app.policy.models import Window
from app.policy.windows import evaluate_windows

UTC = timezone.utc


def W(**kw):
    base = dict(tzid="Europe/Oslo", grace_minutes=0, kind="allow")
    base.update(kw)
    return Window(**base)


def test_overnight_window_covers_after_midnight():
    # 22:00 -> 02:00 (next day) Sunday night, Oslo. T = Monday 00:30 local.
    w = W(id="w", rrule="FREQ=WEEKLY;BYDAY=SU", start_local="22:00", end_local="02:00")
    t = datetime(2026, 7, 6, 22, 30, tzinfo=UTC)  # Mon 00:30 Oslo (UTC+2) = Sun 22:30 UTC... check both
    # Use a T clearly inside: Sunday 2026-07-05 23:00 Oslo == 21:00 UTC
    t = datetime(2026, 7, 5, 21, 0, tzinfo=UTC)
    r = evaluate_windows((w,), t)
    assert r.in_window is True
    # And after the overnight end (Mon 03:00 Oslo == 01:00 UTC) it is closed.
    t2 = datetime(2026, 7, 6, 1, 0, tzinfo=UTC)
    assert evaluate_windows((w,), t2).in_window is False


def test_freeze_deny_overrides_allow():
    allow = W(id="a", rrule="FREQ=DAILY", start_local="00:00", end_local="23:59")
    freeze = W(id="f", kind="freeze", rrule="FREQ=DAILY", start_local="00:00", end_local="23:59")
    t = datetime(2026, 7, 6, 12, 0, tzinfo=UTC)
    r = evaluate_windows((allow, freeze), t)
    assert r.in_window is False and r.active_freeze == "f" and r.reason == ["freeze_active"]


def test_effective_close_honors_next_freeze():
    # allow all day; a freeze starts at 14:00 Oslo. effective_close must be the freeze start.
    allow = W(id="a", rrule="FREQ=DAILY", start_local="00:00", end_local="23:59")
    freeze = W(id="f", kind="freeze", rrule="FREQ=DAILY", start_local="14:00", end_local="16:00")
    t = datetime(2026, 7, 6, 10, 0, tzinfo=UTC)  # noon-ish Oslo, before the freeze
    r = evaluate_windows((allow, freeze), t)
    assert r.in_window is True
    # window_closes_at should be the freeze start (14:00 Oslo == 12:00 UTC), earlier than 23:59.
    assert r.window_closes_at is not None
    close = datetime.fromisoformat(r.window_closes_at.replace("Z", "+00:00"))
    assert close.hour == 12  # 14:00 Oslo in July (UTC+2)


def test_grace_zone_denies_with_evidence():
    allow = W(id="a", rrule="FREQ=DAILY", start_local="00:00", end_local="23:59", grace_minutes=30)
    # 23:40 Oslo == 21:40 UTC; within 30m of 23:59 close => grace zone.
    t = datetime(2026, 7, 6, 21, 40, tzinfo=UTC)
    r = evaluate_windows((allow,), t)
    assert r.in_window is False and r.reason == ["grace_zone"]
    assert r.raw_window_close is not None and r.window_closes_at is not None


def test_overlapping_allow_windows_deny_ambiguity():
    a1 = W(id="a1", rrule="FREQ=DAILY", start_local="00:00", end_local="23:59")
    a2 = W(id="a2", rrule="FREQ=DAILY", start_local="00:00", end_local="23:59")
    t = datetime(2026, 7, 6, 12, 0, tzinfo=UTC)
    r = evaluate_windows((a1, a2), t)
    assert r.in_window is False and r.ambiguity is True and r.reason == ["window_ambiguity"]


def test_dst_gap_window_unresolvable():
    # Europe/Oslo spring-forward 2026-03-29: 02:00->03:00 doesn't exist. A window anchored
    # at 02:30 on that day is imaginary => dst_unresolvable.
    w = W(id="w", tzid="Europe/Oslo", rrule="FREQ=DAILY", start_local="02:30", end_local="04:00")
    # T = 01:45 UTC on transition day: inside the (imaginary) 02:30 occurrence's mapped span.
    t = datetime(2026, 3, 29, 1, 45, tzinfo=UTC)
    r = evaluate_windows((w,), t)
    assert r.dst_error is True and r.reason == ["dst_unresolvable"]


def test_no_windows_never_in_window():
    r = evaluate_windows((), datetime(2026, 7, 6, 12, 0, tzinfo=UTC))
    assert r.in_window is False and r.reason == ["not_in_window"]
