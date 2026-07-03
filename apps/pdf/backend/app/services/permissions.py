"""Set / clear advisory permissions (pikepdf.Permissions).

Permission bits are only meaningful under encryption, so we apply them via an
Encryption spec (owner password protects the settings; the user password is left
blank so the PDF still opens for anyone — the UI labels this as advisory).
"""
from __future__ import annotations

from app.engines import pikepdf_engine as pk
from .base import OpContext, OpResult, artifact
from .finalize import finalize_file


def _permissions(opts):  # noqa: ANN001
    import pikepdf

    print_mode = getattr(opts, "print", "high")
    return pikepdf.Permissions(
        accessibility=True,
        extract=bool(getattr(opts, "extract", True)),
        modify_annotation=bool(getattr(opts, "annotate", True)),
        modify_assembly=bool(getattr(opts, "modify", True)),
        modify_form=bool(getattr(opts, "modify", True)),
        modify_other=bool(getattr(opts, "modify", True)),
        print_lowres=print_mode in ("low", "high"),
        print_highres=print_mode == "high",
    )


def run_permissions(ctx: OpContext) -> OpResult:
    opts = ctx.options
    out = ctx.out("output.pdf")
    # Blank user password (opens for anyone) + owner password protecting the bits;
    # built via the canonical encryption helper (advisory — labeled in the UI).
    owner = getattr(opts, "owner_password", None) or ""
    enc = pk.make_encryption(user_password="", owner_password=owner, allow=_permissions(opts))
    finalize_file(ctx.primary_input, out, encryption=enc)
    return OpResult(
        artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}-permissions.pdf")],
        meta={"op": "permissions", "advisory": True},
    )


def register_ops(register) -> None:  # noqa: ANN001
    register("permissions", run_permissions)
