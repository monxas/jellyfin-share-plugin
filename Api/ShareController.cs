using System.ComponentModel.DataAnnotations;
using System.Net.Mime;
using Jellyfin.Plugin.Share.Configuration;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Share.Api;

/// <summary>
/// Controller for share operations.
/// </summary>
[ApiController]
[Route("plugins/share")]
[Produces(MediaTypeNames.Application.Json)]
[Authorize]
public class ShareController : ControllerBase
{
    private readonly ILogger<ShareController> _logger;
    private readonly ShareService _shareService;
    private readonly ILibraryManager _libraryManager;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShareController"/> class.
    /// </summary>
    /// <param name="logger">Logger instance.</param>
    /// <param name="shareService">Share service.</param>
    /// <param name="libraryManager">Library manager.</param>
    public ShareController(
        ILogger<ShareController> logger,
        ShareService shareService,
        ILibraryManager libraryManager)
    {
        _logger = logger;
        _shareService = shareService;
        _libraryManager = libraryManager;
    }

    /// <summary>
    /// Creates a share link for a media item.
    /// </summary>
    /// <param name="request">Share request.</param>
    /// <returns>Share response.</returns>
    [HttpPost("create")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ShareResponse>> CreateShare([FromBody] CreateShareApiRequest request)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            return BadRequest(new { Error = "Plugin not configured. Please configure the backend URL and API key." });
        }

        // Verify item exists
        var item = _libraryManager.GetItemById(Guid.Parse(request.ItemId));
        if (item == null)
        {
            return BadRequest(new { Error = "Item not found" });
        }

        // Get user ID from auth
        var userId = User.FindFirst("Jellyfin-UserId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "unknown";

        var shareRequest = new CreateShareRequest
        {
            JellyfinItemId = request.ItemId,
            JellyfinUserId = userId,
            ExpiresInMinutes = request.ExpiresInMinutes ?? config.DefaultExpiryMinutes,
            Password = request.Password,
            MaxTotalPlays = request.MaxTotalPlays ?? (config.DefaultMaxPlays > 0 ? config.DefaultMaxPlays : null),
            MaxConcurrentViewers = request.MaxConcurrentViewers ?? (config.DefaultMaxConcurrentViewers > 0 ? config.DefaultMaxConcurrentViewers : null)
        };

        var result = await _shareService.CreateShareAsync(shareRequest);
        if (result == null)
        {
            return StatusCode(500, new { Error = "Failed to create share. Check plugin logs." });
        }

        _logger.LogInformation("Created share for item {ItemId}: {Url}", request.ItemId, result.PublicUrl);

        return Ok(result);
    }

    /// <summary>
    /// Gets the plugin configuration for the frontend.
    /// </summary>
    /// <returns>Configuration subset for frontend.</returns>
    [HttpGet("config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<object> GetConfig()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null)
        {
            return Ok(new { Configured = false });
        }

        return Ok(new
        {
            Configured = !string.IsNullOrEmpty(config.BackendUrl) && !string.IsNullOrEmpty(config.BackendApiKey),
            DefaultExpiryMinutes = config.DefaultExpiryMinutes,
            DefaultMaxPlays = config.DefaultMaxPlays,
            DefaultMaxConcurrentViewers = config.DefaultMaxConcurrentViewers
        });
    }
}

/// <summary>
/// API request to create a share.
/// </summary>
public class CreateShareApiRequest
{
    /// <summary>
    /// Gets or sets the item ID to share.
    /// </summary>
    [Required]
    public string ItemId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expiry in minutes.
    /// </summary>
    public int? ExpiresInMinutes { get; set; }

    /// <summary>
    /// Gets or sets the optional password.
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// Gets or sets the max plays.
    /// </summary>
    public int? MaxTotalPlays { get; set; }

    /// <summary>
    /// Gets or sets the max concurrent viewers.
    /// </summary>
    public int? MaxConcurrentViewers { get; set; }
}
