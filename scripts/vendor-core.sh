#!/usr/bin/env bash
# external-connectors/scripts/vendor-core.sh
# Usage: ./scripts/vendor-core.sh /path/to/governance-connector-framework
set -euo pipefail
GCF_DIR="$1"
SHORTSHA=$(git -C "$GCF_DIR" rev-parse --short HEAD)

# Install + build from the repo root, since core is an npm workspace member —
# installing only inside packages/core won't resolve shared/hoisted deps.
( cd "$GCF_DIR" && npm ci && npm run build --workspace=@governance-connector-framework/core )

VERSION=$(node -p "require('$GCF_DIR/packages/core/package.json').version")
( cd "$GCF_DIR/packages/core" && npm pack --pack-destination /tmp )

TARBALL="governance-connector-framework-core-${VERSION}.tgz"
DEST="vendor/governance-connector-framework-core-${VERSION}-${SHORTSHA}.tgz"
mv "/tmp/${TARBALL}" "$DEST"
echo "Vendored $DEST (from $GCF_DIR @ $SHORTSHA)"