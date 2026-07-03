"""Server-side merge / split (pikepdf). Large or encrypted inputs land here;
small in-browser merge/split still routes through finalize as edited bytes (D7).
Encrypted inputs are decrypted first, then the result exits via the finalize pass.
"""
from __future__ import annotations

from app.engines import pikepdf_engine as pk
from .base import OpContext, OpResult, artifact, enforce_max_pages, safe_stem
from .pageranges import parse_range_groups


def run_merge(ctx: OpContext) -> OpResult:
    import pikepdf

    opts = ctx.options
    passwords = list(getattr(opts, "passwords", None) or [])
    out = ctx.out("output.pdf")
    combined = pikepdf.new()
    for i, src_path in enumerate(ctx.inputs):
        pw = passwords[i] if i < len(passwords) else None
        with pk.open_or_raise(src_path, pw) as src:
            combined.pages.extend(src.pages)
    enforce_max_pages(len(combined.pages), ctx.max_pages)
    with combined:
        pk.scrub_active_content(combined)
        pk.save_linearized(combined, out)
    requested = getattr(opts, "output_filename", None)
    # Route the user-supplied name through the same safe_stem sanitizer as every
    # other artifact so it can't inject into Content-Disposition / zip arcnames.
    name = f"{safe_stem(requested)}.pdf" if requested else f"{ctx.primary_stem}-merged.pdf"
    return OpResult(artifacts=[artifact(out, "application/pdf", name)],
                    meta={"op": "merge", "inputs": len(ctx.inputs)})


def run_split(ctx: OpContext) -> OpResult:
    import pikepdf

    opts = ctx.options
    with pk.open_or_raise(ctx.primary_input, getattr(opts, "password", None)) as src:
        total = len(src.pages)
        enforce_max_pages(total, ctx.max_pages)
        mode = getattr(opts, "mode", "ranges")
        if mode == "single":
            groups = [[i] for i in range(total)]
        elif mode == "every_n":
            n = max(1, getattr(opts, "every_n", 1))
            groups = [list(range(i, min(i + n, total))) for i in range(0, total, n)]
        else:
            groups = parse_range_groups(getattr(opts, "ranges", []) or [], total)

        arts = []
        for idx, indices in enumerate(groups, start=1):
            part = pikepdf.new()
            for i in indices:
                part.pages.append(src.pages[i])
            out = ctx.out(f"part-{idx}.pdf")
            with part:
                pk.scrub_active_content(part)
                pk.save_linearized(part, out)
            arts.append(artifact(out, "application/pdf", f"{ctx.primary_stem}-{idx}.pdf"))
    return OpResult(artifacts=arts, meta={"op": "split", "parts": len(arts)},
                    zip_name=f"{ctx.primary_stem}-split.zip")


def register_ops(register) -> None:  # noqa: ANN001
    register("merge", run_merge)
    register("split", run_split)
