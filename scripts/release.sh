#!/bin/bash
set -e

# Usage: ./scripts/release.sh 1.0.6

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/release.sh <version>"
    echo "Example: ./scripts/release.sh 1.0.6"
    exit 1
fi

# Validate version format (basic check)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in format X.Y.Z (e.g., 1.0.6)"
    exit 1
fi

echo "Releasing version $VERSION..."

# Ensure we're up to date
git pull --rebase

# Commit any uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "Committing pending changes..."
    git add -A
    git commit -m "Release v$VERSION"
fi

# Push changes
git push

# Create and push tag
echo "Creating tag v$VERSION..."
git tag "v$VERSION"
git push origin "v$VERSION"

echo ""
echo "Release v$VERSION triggered!"
echo "Monitor build at: https://github.com/monxas/jellyfin-share-plugin/actions"
echo ""
echo "Once complete, update your Jellyfin:"
echo "curl -L -o /tmp/Jellyfin.Plugin.Share.dll https://github.com/monxas/jellyfin-share-plugin/releases/download/v$VERSION/Jellyfin.Plugin.Share.dll && docker cp /tmp/Jellyfin.Plugin.Share.dll jellyfin:/config/plugins/JellyfinShare/ && docker restart jellyfin"
