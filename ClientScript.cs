using System.Reflection;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.Share;

/// <summary>
/// Controller to serve the client-side script.
/// </summary>
[ApiController]
[Route("plugins/share")]
public class ClientScriptController : ControllerBase
{
    /// <summary>
    /// Gets the client-side JavaScript.
    /// </summary>
    /// <returns>JavaScript content.</returns>
    [HttpGet("client.js")]
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

        // Prevent caching - especially important for Cloudflare
        Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Expires"] = "0";

        // Add version as ETag for cache busting
        var version = assembly.GetName().Version?.ToString() ?? "1.0.0";
        Response.Headers["ETag"] = $"\"{version}\"";

        return Content(script, "application/javascript");
    }
}
