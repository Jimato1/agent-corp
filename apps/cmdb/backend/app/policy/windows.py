"""Maintenance-window algebra (PLAN §3.2, §4.3, §3.3 step 6).

Everything here is deny-biased and computed LIVE — no materialized-occurrence cache.
RRULE is expanded in the host's IANA zone; PEP-495 fold/gap is applied to the window
START and END anchors (an ambiguous or nonexistent anchor => fail-closed
``dst_unresolvable``); the window is half-open ``[start, end)``; deny-overrides means any
active freeze beats any allow; ``effective_close`` is ``min(allow close, next freeze
start)`` so a freeze starting mid-window is never invisible inside a verdict's validity.

Overnight windows (``end_local <= start_local``) resolve the END anchor on the
occurrence's NEXT calendar day (RFC 5545 DTEND-after-DTSTART), and fold/gap is applied to
that resolved next-day instant — the fall-back-shrink / spring-forward-never-opens bugs
closed structurally.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from dateutil import rrule as durrule

from .models import Window

_UTC = timezone.utc
# Deterministic INTERVAL anchor (the schema carries no explicit DTSTART date): a Monday.
_EPOCH_ANCHOR = datetime(1970, 1, 5)
_HORIZON_DAYS_FORWARD = 90  # only for "when does the next window open" — never for the gate decision itself
_BYDAY = {"MO": 0, "TU": 1, "WE": 2, "TH": 3, "FR": 4, "SA": 5, "SU": 6}


@dataclass
class WindowResult:
    in_window: bool
    window_id: str | None = None
    window_opens_at: str | None = None
    window_closes_at: str | None = None   # = effective_close
    seconds_remaining: int | None = None
    grace: int = 0                          # minutes
    active_freeze: str | None = None
    tzid: str | None = None
    reason: list[str] = field(default_factory=list)
    dst_error: bool = False
    ambiguity: bool = False
    break_glass: bool = False
    raw_window_close: str | None = None     # raw allow end retained on a grace-zone denial


def _iso(dt: datetime) -> str:
    dt = dt.astimezone(_UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def _parse_hhmm(s: str) -> tuple[int, int]:
    hh, mm = s.split(":")
    return int(hh), int(mm)


def _classify_local(naive: datetime, tz: ZoneInfo) -> str:
    """Return 'ok' | 'ambiguous' (fold) | 'gap' (nonexistent) for a naive wall time in tz."""
    a0 = naive.replace(tzinfo=tz, fold=0)
    a1 = naive.replace(tzinfo=tz, fold=1)
    if a0.utcoffset() != a1.utcoffset():
        return "ambiguous"
    # Round-trip: a nonexistent (gap) local time does not survive UTC→local normalization.
    rt = a0.astimezone(_UTC).astimezone(tz).replace(tzinfo=None)
    if rt != naive:
        return "gap"
    return "ok"


def _to_utc(naive: datetime, tz: ZoneInfo) -> datetime:
    return naive.replace(tzinfo=tz, fold=0).astimezone(_UTC)


def _rrule_freq(freq: str) -> int:
    return {"DAILY": durrule.DAILY, "WEEKLY": durrule.WEEKLY, "MONTHLY": durrule.MONTHLY}[freq]


def _parse_rrule_parts(rrule_str: str) -> dict[str, str]:
    parts: dict[str, str] = {}
    for kv in rrule_str.split(";"):
        if not kv.strip():
            continue
        k, _, v = kv.partition("=")
        parts[k.strip().upper()] = v.strip()
    return parts


@dataclass
class _Occ:
    start_utc: datetime
    end_utc: datetime
    dst_error: bool


def _recurring_occurrences(w: Window, tz: ZoneInfo, t: datetime) -> list[_Occ]:
    """Occurrences of a recurring window whose [start,end) could contain T (± a day for
    overnight windows), plus a small forward reach for 'next opens'."""
    parts = _parse_rrule_parts(w.rrule or "")
    freq = parts.get("FREQ")
    if freq not in ("DAILY", "WEEKLY", "MONTHLY"):
        return []  # schema forbids others; defensive
    interval = int(parts.get("INTERVAL", "1") or "1")
    sh, sm = _parse_hhmm(w.start_local or "00:00")
    byweekday = None
    if "BYDAY" in parts:
        try:
            byweekday = [_BYDAY[d.strip().upper()[-2:]] for d in parts["BYDAY"].split(",") if d.strip()]
        except KeyError:
            return []
    byhour = [int(x) for x in parts["BYHOUR"].split(",")] if "BYHOUR" in parts else None
    byminute = [int(x) for x in parts["BYMINUTE"].split(",")] if "BYMINUTE" in parts else None
    until_utc = None
    if "UNTIL" in parts:
        u = parts["UNTIL"].rstrip("Z")
        try:
            until_utc = datetime.strptime(u, "%Y%m%dT%H%M%S").replace(tzinfo=_UTC)
        except ValueError:
            try:
                until_utc = datetime.strptime(u, "%Y%m%d").replace(tzinfo=_UTC)
            except ValueError:
                until_utc = None

    dtstart = _EPOCH_ANCHOR.replace(hour=sh, minute=sm)
    rule = durrule.rrule(
        _rrule_freq(freq), dtstart=dtstart, interval=interval,
        byweekday=byweekday, byhour=byhour, byminute=byminute,
    )
    t_local = t.astimezone(tz).replace(tzinfo=None)
    lo = t_local - timedelta(days=2)
    hi = t_local + timedelta(days=_HORIZON_DAYS_FORWARD)
    occs: list[_Occ] = []
    for start_naive in rule.between(lo, hi, inc=True):
        cls_start = _classify_local(start_naive, tz)
        sh2, sm2 = start_naive.hour, start_naive.minute
        eh, em = _parse_hhmm(w.end_local or "00:00")
        end_date = start_naive.date()
        # end_local <= start_local => overnight; end resolves on the NEXT calendar day.
        if (eh, em) <= (sh2, sm2):
            end_date = end_date + timedelta(days=1)
        end_naive = datetime(end_date.year, end_date.month, end_date.day, eh, em)
        cls_end = _classify_local(end_naive, tz)
        dst_error = cls_start != "ok" or cls_end != "ok"
        start_utc = _to_utc(start_naive, tz)
        end_utc = _to_utc(end_naive, tz)
        if until_utc is not None and start_utc > until_utc:
            continue
        occs.append(_Occ(start_utc, end_utc, dst_error))
    return occs


def _oneshot_occurrence(w: Window, tz: ZoneInfo) -> _Occ | None:
    if not (w.start_at and w.end_at):
        return None
    try:
        sn = datetime.fromisoformat(w.start_at)
        en = datetime.fromisoformat(w.end_at)
    except ValueError:
        return _Occ(datetime.now(_UTC), datetime.now(_UTC), True)  # unparseable => dst_error/deny
    sn = sn.replace(tzinfo=None)
    en = en.replace(tzinfo=None)
    dst_error = _classify_local(sn, tz) != "ok" or _classify_local(en, tz) != "ok"
    return _Occ(_to_utc(sn, tz), _to_utc(en, tz), dst_error)


def _all_occurrences(w: Window, tz: ZoneInfo, t: datetime) -> list[_Occ]:
    if w.one_shot or w.start_at:
        occ = _oneshot_occurrence(w, tz)
        return [occ] if occ else []
    return _recurring_occurrences(w, tz, t)


def evaluate_windows(windows: tuple[Window, ...], t: datetime) -> WindowResult:
    """Resolve the window posture at instant ``t`` (UTC) over the host's windows.

    Uses each window's own ``tzid`` (a host may carry windows in one zone in practice; the
    algebra tolerates mixed zones by computing each occurrence in its own zone)."""
    if not windows:
        # No window on file => never in-window for window-gated classes (research Q9).
        return WindowResult(in_window=False, reason=["not_in_window"])

    allow_cov: list[tuple[Window, _Occ]] = []
    freeze_cov: list[tuple[Window, _Occ]] = []
    bg_cov: list[tuple[Window, _Occ]] = []
    next_allow_start: datetime | None = None
    next_freeze_starts: list[datetime] = []
    dst_error = False

    for w in windows:
        try:
            tz = ZoneInfo(w.tzid)
        except Exception:  # noqa: BLE001 — an unknown zone is fail-closed
            dst_error = True
            continue
        for occ in _all_occurrences(w, tz, t):
            covers = occ.start_utc <= t < occ.end_utc
            if covers and occ.dst_error:
                dst_error = True
            if w.kind == "allow":
                if occ.start_utc > t and (next_allow_start is None or occ.start_utc < next_allow_start):
                    next_allow_start = occ.start_utc
                if covers:
                    (bg_cov if w.break_glass else allow_cov).append((w, occ))
            elif w.kind == "freeze":
                if occ.start_utc > t:
                    next_freeze_starts.append(occ.start_utc)
                if covers:
                    freeze_cov.append((w, occ))

    if dst_error:
        return WindowResult(in_window=False, reason=["dst_unresolvable"], dst_error=True)

    # Break-glass: an unexpired break-glass window covering T overrides an active freeze
    # only when it was confirmed to (allow < freeze < break-glass lattice, §4.3).
    bg_active = bool(bg_cov)
    bg_overrides_freeze = any(w.overrides_freeze for w, _ in bg_cov)

    # Deny-overrides: any active freeze beats any allow, unless a confirmed break-glass wins.
    if freeze_cov and not (bg_active and bg_overrides_freeze):
        fw, focc = min(freeze_cov, key=lambda p: p[1].end_utc)
        return WindowResult(
            in_window=False, active_freeze=fw.id, tzid=fw.tzid,
            window_closes_at=None, reason=["freeze_active"],
        )

    covering = list(allow_cov) + list(bg_cov)
    distinct_allow_ids = {w.id for w, _ in allow_cov}
    if len(distinct_allow_ids) >= 2:
        # Overlapping/ambiguous allow windows => deny, most-restrictive-wins + escalation
        # (contract §2 frozen). Pick the earliest close for the reported evidence.
        w, occ = min(allow_cov, key=lambda p: p[1].end_utc)
        return WindowResult(
            in_window=False, window_id=w.id, tzid=w.tzid,
            window_closes_at=_iso(occ.end_utc), reason=["window_ambiguity"], ambiguity=True,
        )

    if not covering:
        return WindowResult(
            in_window=False, reason=["not_in_window"],
            window_opens_at=_iso(next_allow_start) if next_allow_start else None,
        )

    # Exactly one covering allow (or a break-glass window).
    w, occ = covering[0]
    allow_close = occ.end_utc
    # effective_close = min(allow close, start of the next freeze that begins before it).
    freeze_before_close = [s for s in next_freeze_starts if t < s <= allow_close]
    effective_close = min([allow_close] + freeze_before_close)
    grace_min = w.grace_minutes
    grace_delta = timedelta(minutes=grace_min)
    clean_deadline = effective_close - grace_delta
    seconds_remaining = max(0, int((effective_close - t).total_seconds()))

    if t >= clean_deadline:
        # Grace zone: deny, retain the raw window evidence so the Gateway can distinguish
        # a grace-denial from a genuinely-closed window (§3.2).
        return WindowResult(
            in_window=False, window_id=w.id, tzid=w.tzid,
            window_opens_at=_iso(occ.start_utc),
            window_closes_at=_iso(effective_close), seconds_remaining=seconds_remaining,
            grace=grace_min, reason=["grace_zone"], break_glass=w.break_glass,
            raw_window_close=_iso(allow_close),
        )

    return WindowResult(
        in_window=True, window_id=w.id, tzid=w.tzid,
        window_opens_at=_iso(occ.start_utc),
        window_closes_at=_iso(effective_close), seconds_remaining=seconds_remaining,
        grace=grace_min, reason=["in_window"], break_glass=w.break_glass,
    )
