// src/lib/tax/taxYear.js
//
// THE engine tax year — single source of truth (taxYear-defect rider on the
// §417(e) repair PR, 2026-06-10).
//
// Pinned to IRS Revenue Procedure 2025-32 (2026 brackets / standard
// deductions / inflation adjustments) — the same Rev. Proc. that pins the
// FilingStatusOptimizer bracket tables, which import this constant. When the
// annual Rev. Proc. update lands (each October), bump this constant together
// with the FSO bracket tables in one change.
//
// blueprintStore's §4 writer persists this value (it previously hardcoded a
// stale 2024 literal — the store/engine year-mismatch defect surfaced by the
// V2 gap scan and trapped by fixture F1).

export const ENGINE_TAX_YEAR = 2026;
