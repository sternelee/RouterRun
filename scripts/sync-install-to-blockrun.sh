#!/bin/bash
set -euo pipefail

# ============================================================================
# Sync ClawRouter install scripts → blockrun public dir
# ============================================================================
# blockrun serves the installer at https://blockrun.ai/ClawRouter-update, which
# is a Next.js rewrite to the STATIC file public/clawrouter-install.sh baked
# into the Cloud Run image at build time. That file is a mirror of THIS repo's
# scripts/update.sh — the source of truth. They drift whenever update.sh changes
# and nobody copies it across (this caused a stale installer in 06/2026).
#
# Run this after any change to scripts/update.sh / scripts/update.ps1, then
# commit + deploy blockrun. The blockrun CI guard (clawrouter-install-sync)
# fails the build if the mirror is stale.
#
# Usage:
#   scripts/sync-install-to-blockrun.sh           # copy + verify
#   scripts/sync-install-to-blockrun.sh --check    # verify only (non-zero on drift)
#   BLOCKRUN_DIR=/path/to/blockrun scripts/sync-install-to-blockrun.sh
# ============================================================================

CLAWROUTER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BLOCKRUN_DIR="${BLOCKRUN_DIR:-$(cd "$CLAWROUTER_DIR/../blockrun" 2>/dev/null && pwd || true)}"

CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

if [ -z "$BLOCKRUN_DIR" ] || [ ! -d "$BLOCKRUN_DIR/public" ]; then
  echo "✗ blockrun public dir not found (looked for \$BLOCKRUN_DIR/public)."
  echo "  Set BLOCKRUN_DIR=/path/to/blockrun and re-run."
  exit 1
fi

# source-of-truth → served mirror
declare -a PAIRS=(
  "scripts/update.sh:public/clawrouter-install.sh"
  "scripts/update.ps1:public/clawrouter-install.ps1"
)

drift=0
for pair in "${PAIRS[@]}"; do
  src="$CLAWROUTER_DIR/${pair%%:*}"
  dst="$BLOCKRUN_DIR/${pair##*:}"
  name="$(basename "$dst")"

  if [ ! -f "$src" ]; then
    echo "✗ missing source: $src"
    exit 1
  fi

  if cmp -s "$src" "$dst"; then
    echo "✓ $name already in sync"
    continue
  fi

  drift=1
  if [ "$CHECK_ONLY" = true ]; then
    echo "✗ $name is STALE (differs from $(basename "$src"))"
  else
    cp "$src" "$dst"
    echo "✓ $name synced ($(wc -l <"$dst" | tr -d ' ') lines)"
  fi
done

if [ "$CHECK_ONLY" = true ] && [ "$drift" -ne 0 ]; then
  echo ""
  echo "Run: scripts/sync-install-to-blockrun.sh   (then commit + deploy blockrun)"
  exit 1
fi

if [ "$CHECK_ONLY" = false ] && [ "$drift" -ne 0 ]; then
  echo ""
  echo "→ Now commit the change in blockrun and deploy (./deploy-safe.sh) so"
  echo "  https://blockrun.ai/ClawRouter-update serves the updated script."
fi
