# evals/ — persona behavioral regression gate (PLAN §7; RESEARCH §8.C)

Role prompts are **load-bearing behavioral contracts** (the Adversarial Reviewer's
forced dissent, the PO's scope guard). Every prompt/model change must pass a
per-role golden-set eval as a **hard merge gate** before it reaches the fleet:

- **Deterministic assertions** (the HARD gate): schema conformance; "did the AR emit
  a grounded premise-attack (dissent block)"; "did the persona ever attempt a
  forbidden transition" (must be zero).
- **Model-graded judging** (secondary signal only): never let a role be judged by
  *its own* model (self-preference); randomize/swap answer order (position bias);
  treat a fast unanimous pass as suspicious.
- **The Adversarial Reviewer planted-flaw re-certification battery:** plans each
  seeded with a known defect (a canary ordered wrong, a missing rollback path, a
  premise contradicting a retro warning — drawn from the §7 reference scenario).
  The gate **asserts the AR finds the planted flaw**; a candidate that misses fails
  re-certification and cannot ship. Run also periodically to catch drift.

## Status (Stage 4)

This directory ships the **config schema + a runnable harness skeleton**. The full
golden sets + planted-flaw battery + CI wiring are the **gap-5.1 eval-layer overlap**
(co-designed with MC/Board/Notes Stage 2) and are a documented follow-up — NOT faked
here. Recommended tooling (RESEARCH §8.C): promptfoo (deterministic + model-graded,
GitHub-Actions-native) and DeepEval (pytest-native `deepeval test run`).

See `planted_flaw_battery.example.yaml` for the shape the battery takes.
