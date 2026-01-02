# Jellyfin Share Plugin

A Jellyfin plugin that adds a "Share" button to movie and episode detail pages, allowing you to create temporary, shareable links for your media content.

## Requirements

- Jellyfin 10.10 or later
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
   - Docker: `/config/plugins/JellyfinShare/`
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

The plugin needs to inject JavaScript into the Jellyfin web interface. Add this to your Jellyfin branding settings:

1. Go to **Dashboard → General → Branding**
2. In "Custom CSS", add nothing (leave as is)
3. In "Custom HTML" or via custom scripts, add:
   ```html
   <script src="/plugins/share/client.js"></script>
   ```

Alternatively, if using a reverse proxy, you can inject this script there.

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
