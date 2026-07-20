# Jellyfin Share Plugin

A Jellyfin plugin that adds a "Share" button to movie and episode detail pages, allowing you to create temporary, shareable links for your media content.

## Requirements

- Jellyfin 10.11 or later (built against the 10.11 ABI / .NET 9)
- [Jellyfin Share Backend](https://github.com/monxas/jellyfin-share-backend) running and configured

## Installation

### From Repository (Recommended)

1. Go to **Dashboard → Plugins → Repositories**
2. Add repository: `https://raw.githubusercontent.com/monxas/jellyfin-share-plugin/main/manifest.json`
3. Go to **Catalog** and install "Jellyfin Share"
4. Restart Jellyfin

### Manual Installation

1. Download the latest release from [Releases](https://github.com/monxas/jellyfin-share-plugin/releases)
2. Extract `Jellyfin.Plugin.Share.dll` to your Jellyfin plugins directory:
   - Linux: `/var/lib/jellyfin/plugins/JellyfinShare/`
   - Docker (linuxserver.io): `/config/data/plugins/Jellyfin Share_<version>/`
   - Windows: `C:\ProgramData\Jellyfin\Server\plugins\JellyfinShare\`
3. Restart Jellyfin

## Configuration

1. Go to **Dashboard → Plugins → Jellyfin Share**
2. Enter your backend URL (e.g., `http://localhost:8097` or `https://share.yourdomain.com`)
3. Enter your backend API key
4. Configure default share settings
5. Click **Save**
6. Click **Test Connection** to verify

## Enabling the Share Button

The plugin needs to inject JavaScript into the Jellyfin web interface. Since v1.2.0 it does
this itself: on every startup `IndexPatcher` appends `<script src="/plugins/share/loader.js">`
to `web/index.html` if it isn't there already. Because it re-runs on each boot, the button
survives Jellyfin upgrades — which wipe `web/` and undo the patch — **as long as the web
directory is writable by the user Jellyfin runs as.**

If the button disappears after an upgrade, that write permission is what to check first:

```
[WRN] Jellyfin Share: No write permission for "/usr/share/jellyfin/web/index.html"
```

`web/` ships as root-owned, while most container images run Jellyfin as a non-root user, so a
fresh image resets the ownership. On linuxserver.io images, restore it on every boot with a
`/custom-cont-init.d` hook (runs as root, before Jellyfin starts):

```yaml
volumes:
  - /path/to/jellyfin-init:/custom-cont-init.d:ro
```

```bash
# jellyfin-init/10-share-plugin-webperms.sh  (must be chmod +x)
#!/bin/bash
chown "${PUID:-911}:${PGID:-911}" /usr/share/jellyfin/web /usr/share/jellyfin/web/index.html
```

Confirm it worked — this line should appear on startup:

```
[INF] Jellyfin Share: Successfully patched index.html at "/usr/share/jellyfin/web/index.html"
```

Do **not** also inject `client.js` via the JavaScript Injector plugin or the Custom CSS
`</style><script>` trick — those are legacy workarounds, they break on Jellyfin 10.11, and if
one starts working again the script loads twice.

## Usage

1. Navigate to any movie or episode detail page
2. Click the **Share** button in the action buttons row
3. Configure share options:
   - **Expiry time**: How long the link remains valid
   - **Password**: Optional password protection
   - **Max plays**: Limit total number of plays (0 = unlimited)
   - **Max concurrent viewers**: Limit simultaneous viewers (0 = unlimited)
4. Click **Create Share Link**
5. Copy and share the generated URL

## API Endpoints

The plugin exposes these endpoints (authenticated):

- `GET /plugins/share/config` - Get plugin configuration
- `POST /plugins/share/create` - Create a new share

## Building from Source

```bash
# Clone the repository
git clone https://github.com/monxas/jellyfin-share-plugin.git
cd jellyfin-share-plugin

# Build
dotnet build -c Release

# The DLL will be in bin/Release/net8.0/
```

## Troubleshooting

### Share button doesn't appear

1. Verify the plugin is installed and enabled in Dashboard → Plugins
2. Check that the client script is loaded (Browser DevTools → Network → search for "client.js")
3. Make sure you've added the script tag to branding settings

### "Plugin not configured" error

1. Go to Dashboard → Plugins → Jellyfin Share
2. Verify the backend URL and API key are set
3. Click "Test Connection" to verify connectivity

### Connection test fails

1. Verify the backend server is running
2. Check if the URL is accessible from Jellyfin server
3. Verify the API key matches what's configured in the backend

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related

- [Jellyfin Share Backend](https://github.com/monxas/jellyfin-share-backend) - The backend server that handles share links
