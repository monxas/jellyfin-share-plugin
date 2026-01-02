using System.ComponentModel.DataAnnotations;
using System.Linq;
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
            DefaultMaxConcurrentViewers = config.DefaultMaxConcurrentViewers,
            BackendUrl = config.BackendUrl
        });
    }

    /// <summary>
    /// Gets all shares for the current user.
    /// </summary>
    /// <returns>List of shares.</returns>
    [HttpGet("list")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ListSharesResponse>> ListShares()
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            return BadRequest(new { Error = "Plugin not configured" });
        }

        var userId = User.FindFirst("Jellyfin-UserId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "unknown";

        var result = await _shareService.GetSharesAsync(userId);
        if (result == null)
        {
            return StatusCode(500, new { Error = "Failed to get shares" });
        }

        // Add public URL to each share for convenience
        var sharesWithUrls = result.Shares.Select(s => new
        {
            s.Id,
            s.PublicToken,
            s.Title,
            s.ItemType,
            s.TotalPlays,
            s.CurrentConcurrentViewers,
            s.MaxTotalPlays,
            s.MaxConcurrentViewers,
            s.ExpiresAt,
            s.CreatedAt,
            s.RevokedAt,
            s.HasPassword,
            PublicUrl = $"{config.BackendUrl?.TrimEnd('/')}/s/{s.PublicToken}",
            IsExpired = s.ExpiresAt < DateTime.UtcNow,
            IsRevoked = s.RevokedAt != null
        }).ToList();

        return Ok(new { Shares = sharesWithUrls, result.Total });
    }

    /// <summary>
    /// Revokes a share.
    /// </summary>
    /// <param name="shareId">The share ID to revoke.</param>
    /// <returns>Status.</returns>
    [HttpPost("revoke/{shareId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult> RevokeShare(string shareId)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            return BadRequest(new { Error = "Plugin not configured" });
        }

        var result = await _shareService.RevokeShareAsync(shareId);
        if (!result)
        {
            return StatusCode(500, new { Error = "Failed to revoke share" });
        }

        _logger.LogInformation("Revoked share {ShareId}", shareId);
        return Ok(new { Status = "revoked" });
    }

    /// <summary>
    /// Gets analytics for a share.
    /// </summary>
    /// <param name="shareId">The share ID.</param>
    /// <returns>Analytics data.</returns>
    [HttpGet("analytics/{shareId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<ShareAnalytics>> GetShareAnalytics(string shareId)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            return BadRequest(new { Error = "Plugin not configured" });
        }

        var result = await _shareService.GetShareAnalyticsAsync(shareId);
        if (result == null)
        {
            return StatusCode(500, new { Error = "Failed to get analytics" });
        }

        return Ok(result);
    }

    /// <summary>
    /// Creates share links for all children of an item (e.g., all episodes in a season).
    /// </summary>
    /// <param name="request">Batch share request.</param>
    /// <returns>List of share responses.</returns>
    [HttpPost("batch")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<BatchShareResponse>> CreateBatchShares([FromBody] CreateBatchShareRequest request)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            return BadRequest(new { Error = "Plugin not configured" });
        }

        // Get the parent item
        var parentItem = _libraryManager.GetItemById(Guid.Parse(request.ParentItemId));
        if (parentItem == null)
        {
            return BadRequest(new { Error = "Parent item not found" });
        }

        // Get user ID from auth
        var userId = User.FindFirst("Jellyfin-UserId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
            ?? "unknown";

        // Get children based on item type
        var query = new MediaBrowser.Controller.Entities.InternalItemsQuery
        {
            Parent = parentItem,
            IsVirtualItem = false,
            Recursive = false
        };

        var itemType = parentItem.GetType().Name;
        var children = _libraryManager.GetItemList(query);

        if (children == null || children.Count == 0)
        {
            return BadRequest(new { Error = "No child items found" });
        }

        _logger.LogInformation("Creating batch shares for {Count} items under {ParentName}", children.Count, parentItem.Name);

        var results = new List<BatchShareResult>();
        var successCount = 0;
        var failCount = 0;

        foreach (var child in children.OrderBy(c => c.IndexNumber ?? 0))
        {
            var shareRequest = new CreateShareRequest
            {
                JellyfinItemId = child.Id.ToString("N"),
                JellyfinUserId = userId,
                ExpiresInMinutes = request.ExpiresInMinutes ?? config.DefaultExpiryMinutes,
                Password = request.Password,
                MaxTotalPlays = request.MaxTotalPlays ?? (config.DefaultMaxPlays > 0 ? config.DefaultMaxPlays : null),
                MaxConcurrentViewers = request.MaxConcurrentViewers ?? (config.DefaultMaxConcurrentViewers > 0 ? config.DefaultMaxConcurrentViewers : null)
            };

            try
            {
                var result = await _shareService.CreateShareAsync(shareRequest);
                if (result != null)
                {
                    results.Add(new BatchShareResult
                    {
                        ItemId = child.Id.ToString("N"),
                        ItemName = child.Name,
                        IndexNumber = child.IndexNumber,
                        Success = true,
                        PublicUrl = result.PublicUrl,
                        Token = result.Token
                    });
                    successCount++;
                }
                else
                {
                    results.Add(new BatchShareResult
                    {
                        ItemId = child.Id.ToString("N"),
                        ItemName = child.Name,
                        IndexNumber = child.IndexNumber,
                        Success = false,
                        Error = "Failed to create share"
                    });
                    failCount++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create share for {ItemName}", child.Name);
                results.Add(new BatchShareResult
                {
                    ItemId = child.Id.ToString("N"),
                    ItemName = child.Name,
                    IndexNumber = child.IndexNumber,
                    Success = false,
                    Error = ex.Message
                });
                failCount++;
            }
        }

        _logger.LogInformation("Batch share creation complete: {Success} succeeded, {Failed} failed", successCount, failCount);

        return Ok(new BatchShareResponse
        {
            Results = results,
            SuccessCount = successCount,
            FailCount = failCount
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

/// <summary>
/// API request to create batch shares for children of an item.
/// </summary>
public class CreateBatchShareRequest
{
    /// <summary>
    /// Gets or sets the parent item ID (Season or Series).
    /// </summary>
    [Required]
    public string ParentItemId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expiry in minutes.
    /// </summary>
    public int? ExpiresInMinutes { get; set; }

    /// <summary>
    /// Gets or sets the optional password (same for all shares).
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// Gets or sets the max plays per share.
    /// </summary>
    public int? MaxTotalPlays { get; set; }

    /// <summary>
    /// Gets or sets the max concurrent viewers per share.
    /// </summary>
    public int? MaxConcurrentViewers { get; set; }
}

/// <summary>
/// Response from batch share creation.
/// </summary>
public class BatchShareResponse
{
    /// <summary>
    /// Gets or sets the results for each child item.
    /// </summary>
    public List<BatchShareResult> Results { get; set; } = new();

    /// <summary>
    /// Gets or sets the success count.
    /// </summary>
    public int SuccessCount { get; set; }

    /// <summary>
    /// Gets or sets the fail count.
    /// </summary>
    public int FailCount { get; set; }
}

/// <summary>
/// Result for a single item in batch share creation.
/// </summary>
public class BatchShareResult
{
    /// <summary>
    /// Gets or sets the item ID.
    /// </summary>
    public string ItemId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the item name.
    /// </summary>
    public string ItemName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the index number (episode number, etc.).
    /// </summary>
    public int? IndexNumber { get; set; }

    /// <summary>
    /// Gets or sets whether the share was created successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Gets or sets the public URL if successful.
    /// </summary>
    public string? PublicUrl { get; set; }

    /// <summary>
    /// Gets or sets the share token if successful.
    /// </summary>
    public string? Token { get; set; }

    /// <summary>
    /// Gets or sets the error message if failed.
    /// </summary>
    public string? Error { get; set; }
}
