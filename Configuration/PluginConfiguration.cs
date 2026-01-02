using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.Share.Configuration;

/// <summary>
/// Plugin configuration.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PluginConfiguration"/> class.
    /// </summary>
    public PluginConfiguration()
    {
        BackendUrl = "http://localhost:8097";
        BackendApiKey = string.Empty;
        DefaultExpiryMinutes = 1440; // 24 hours
        DefaultMaxPlays = 0; // unlimited
        DefaultMaxConcurrentViewers = 0; // unlimited
    }

    /// <summary>
    /// Gets or sets the Jellyfin Share backend URL.
    /// </summary>
    public string BackendUrl { get; set; }

    /// <summary>
    /// Gets or sets the backend API key.
    /// </summary>
    public string BackendApiKey { get; set; }

    /// <summary>
    /// Gets or sets the default expiry time in minutes.
    /// </summary>
    public int DefaultExpiryMinutes { get; set; }

    /// <summary>
    /// Gets or sets the default max total plays (0 = unlimited).
    /// </summary>
    public int DefaultMaxPlays { get; set; }

    /// <summary>
    /// Gets or sets the default max concurrent viewers (0 = unlimited).
    /// </summary>
    public int DefaultMaxConcurrentViewers { get; set; }
}
