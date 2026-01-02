using Jellyfin.Plugin.Share.Api;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.Share;

/// <summary>
/// Registers plugin services with the DI container.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection services, IServerApplicationHost applicationHost)
    {
        services.AddHttpClient();
        services.AddSingleton<ShareService>();
    }
}
