#!/bin/bash
set -e

# Usage: ./scripts/release.sh 1.0.6
# Or: ./scripts/release.sh 1.0.6 "Commit message here"

VERSION=$1
MESSAGE=${2:-"Release v$VERSION"}

if [ -z "$VERSION" ]; then
    echo "Usage: ./scripts/release.sh <version> [commit message]"
    echo "Example: ./scripts/release.sh 1.0.10"
    echo "Example: ./scripts/release.sh 1.0.10 'Fix UI bug'"
    exit 1
fi

# Validate version format (basic check)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in format X.Y.Z (e.g., 1.0.6)"
    exit 1
fi

echo "Releasing version $VERSION..."

# Commit any uncommitted changes first
if [ -n "$(git status --porcelain)" ]; then
    echo "Committing pending changes: $MESSAGE"
    git add -A
    git commit -m "$MESSAGE"
fi

# Ensure we're up to date (rebase on top of remote changes)
echo "Syncing with remote..."
git pull --rebase || true

# Push changes
echo "Pushing changes..."
git push

# Create and push tag
echo "Creating tag v$VERSION..."
git tag "v$VERSION"
git push origin "v$VERSION"

echo ""
echo "✅ Release v$VERSION triggered!"
echo ""
echo "Monitor build: https://github.com/monxas/jellyfin-share-plugin/actions"
echo ""
echo "Update command (run on server after build completes):"
echo "sudo curl -L -o /tmp/Jellyfin.Plugin.Share.dll https://github.com/monxas/jellyfin-share-plugin/releases/download/v$VERSION/Jellyfin.Plugin.Share.dll && sudo docker cp /tmp/Jellyfin.Plugin.Share.dll jellyfin:/config/plugins/JellyfinShare/ && sudo docker restart jellyfin"
