# MAESTRO UI P0.6B.2 — Governed Diff Viewer

P0.6B.2 surfaces the Gateway P0.6B.1 proposal ledger in the MAESTRO UI.

- proposals are listed per active workspace;
- unified diffs are rendered without modifying workspace files;
- before/after SHA-256 fingerprints are visible;
- AWAITING_APPROVAL proposals can be approved or rejected from the UI;
- STALE, APPROVED and REJECTED states remain visible;
- approval remains separate from execution;
- `workspace_write_performed` remains false in P0.6B.2;
- no filesystem apply endpoint is introduced by this UI milestone.
