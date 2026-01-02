using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.Share;

/// <summary>
/// Controller to serve the client-side script.
/// </summary>
[ApiController]
[Route("plugins/share")]
public class ClientScriptController : ControllerBase
{
    private static string GetVersion() =>
        Assembly.GetExecutingAssembly().GetName().Version?.ToString() ?? "1.0.0";

    /// <summary>
    /// Gets the plugin version (public, no auth required).
    /// </summary>
    /// <returns>Version string.</returns>
    [HttpGet("version")]
    [AllowAnonymous]
    public ActionResult GetVersion()
    {
        return Ok(new { version = GetVersion() });
    }

    /// <summary>
    /// Gets a loader script that handles cache busting (public, no auth required).
    /// </summary>
    /// <returns>JavaScript loader.</returns>
    [HttpGet("loader.js")]
    [AllowAnonymous]
    [Produces("application/javascript")]
    public ActionResult GetLoader()
    {
        var version = GetVersion();
        var loader = $"import('/plugins/share/client.js?v={version}');";

        // Loader should not be cached so it always gets the current version
        Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        Response.Headers["Pragma"] = "no-cache";

        return Content(loader, "application/javascript");
    }

    /// <summary>
    /// Gets the client-side JavaScript.
    /// </summary>
    /// <returns>JavaScript content.</returns>
    [HttpGet("client.js")]
    [AllowAnonymous]
    [Produces("application/javascript")]
    public ActionResult GetClientScript()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var resourceName = "Jellyfin.Plugin.Share.Web.share.js";

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            return NotFound();
        }

        using var reader = new StreamReader(stream);
        var script = reader.ReadToEnd();

        var version = GetVersion();

        // Allow caching with version-based ETag
        // Browser will cache, but revalidate using ETag
        Response.Headers["Cache-Control"] = "public, max-age=86400"; // Cache for 1 day
        Response.Headers["ETag"] = $"\"{version}\"";

        return Content(script, "application/javascript");
    }
}
