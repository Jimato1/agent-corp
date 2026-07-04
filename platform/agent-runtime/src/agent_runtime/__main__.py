"""Entrypoint: `python -m agent_runtime` boots the supervisor + serves the app.

The supervisor admits every configured model through the fail-closed provenance
gate at construction; the app's startup hook runs the M3 fail-closed boot reconcile
against auth before the pre-claim gate can open.
"""

from __future__ import annotations

import os


def main() -> None:  # pragma: no cover - process entrypoint
    import uvicorn

    from .api import create_app

    app = create_app()
    port = int(os.environ.get("AR_PORT", "8080"))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":  # pragma: no cover
    main()
