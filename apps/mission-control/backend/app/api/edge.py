"""Edge & observability panel — /api/edge (PLAN §6.5; OBSERVABILITY.md §5/§6, R10).

Consumes the frozen proxy contract VERBATIM. **R10 honored**: per-app status distribution
comes from the ``{code}``-labelled ``caddy_http_request_duration_seconds_count`` series —
NEVER the doc's ``caddy_http_responses_total`` erratum. Rate from
``caddy_http_requests_total``; p50/p95 via ``histogram_quantile`` over the ``_bucket``
series; upstream health from ``caddy_reverse_proxy_upstreams_healthy``; cert expiry from
``mc_blackbox``'s ``probe_ssl_earliest_cert_expiry``. A scrape gap => STALE-UNKNOWN gold,
never a frozen green "all healthy" (the false-green rule is the whole point here).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_read
from . import get_edge

router = APIRouter(tags=["edge"])

# R10-correct PromQL. The status series is the {code}-labelled *_count histogram counter,
# NOT caddy_http_responses_total (the documented erratum).
_QUERIES = {
    "status": 'sum by (handler, code) (rate(caddy_http_request_duration_seconds_count[5m]))',
    "rate": 'sum by (handler) (rate(caddy_http_requests_total[1m]))',
    "p95": 'histogram_quantile(0.95, sum by (handler, le) (rate(caddy_http_request_duration_seconds_bucket[5m])))',
    "p50": 'histogram_quantile(0.50, sum by (handler, le) (rate(caddy_http_request_duration_seconds_bucket[5m])))',
    "upstream_healthy": 'caddy_reverse_proxy_upstreams_healthy',
    "cert_expiry": 'probe_ssl_earliest_cert_expiry',   # mc_blackbox
    "scrub_stripped": 'sum by (handler) (rate(caddy_http_requests_total{scrub_stripped="true"}[5m]))',
}


@router.get("/edge")
async def edge(request: Request, _: Principal = Depends(require_read)):
    edge_client = get_edge(request)
    tiles: dict[str, dict] = {}
    for name, promql in _QUERIES.items():
        s = await edge_client.query(promql)
        tiles[name] = {
            "promql": promql, "source": "mc_prometheus" if name != "cert_expiry" else "mc_blackbox",
            "stale": s.stale, "as_of_seconds": round(s.as_of, 3), "error": s.error,
            "result": (s.data or {}).get("data", {}).get("result") if isinstance(s.data, dict) else None,
        }
    any_stale = any(t["stale"] for t in tiles.values())
    return {
        "tiles": tiles,
        "degraded": any_stale,
        "note": "A scrape gap renders STALE-UNKNOWN (gold), never a green 'all healthy' (false-green rule).",
        "r10": "status distribution uses caddy_http_request_duration_seconds_count{code}, not caddy_http_responses_total.",
    }
