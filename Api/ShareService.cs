using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Jellyfin.Plugin.Share.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.Share.Api;

/// <summary>
/// Service for communicating with the Jellyfin Share backend.
/// </summary>
public class ShareService
{
    private readonly ILogger<ShareService> _logger;
    private readonly HttpClient _httpClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShareService"/> class.
    /// </summary>
    /// <param name="logger">Logger instance.</param>
    /// <param name="httpClientFactory">HTTP client factory.</param>
    public ShareService(ILogger<ShareService> logger, IHttpClientFactory httpClientFactory)
    {
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    /// <summary>
    /// Creates a share link for a media item.
    /// </summary>
    /// <param name="request">Share creation request.</param>
    /// <returns>Share response with URL.</returns>
    public async Task<ShareResponse?> CreateShareAsync(CreateShareRequest request)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            _logger.LogError("Plugin not configured");
            return null;
        }

        try
        {
            var url = $"{config.BackendUrl.TrimEnd('/')}/api/admin/shares";

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            httpRequest.Headers.Add("X-Backend-Key", config.BackendApiKey);
            httpRequest.Content = new StringContent(
                JsonSerializer.Serialize(request),
                Encoding.UTF8,
                "application/json");

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to create share: {StatusCode} - {Error}", response.StatusCode, error);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ShareResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating share");
            return null;
        }
    }

    /// <summary>
    /// Gets shares for a specific user.
    /// </summary>
    /// <param name="jellyfinUserId">The Jellyfin user ID.</param>
    /// <returns>List of shares.</returns>
    public async Task<ListSharesResponse?> GetSharesAsync(string jellyfinUserId)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            _logger.LogError("Plugin not configured");
            return null;
        }

        try
        {
            var url = $"{config.BackendUrl.TrimEnd('/')}/api/admin/shares?jellyfinUserId={Uri.EscapeDataString(jellyfinUserId)}";

            var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            httpRequest.Headers.Add("X-Backend-Key", config.BackendApiKey);

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to get shares: {StatusCode} - {Error}", response.StatusCode, error);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ListSharesResponse>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shares");
            return null;
        }
    }

    /// <summary>
    /// Revokes a share.
    /// </summary>
    /// <param name="shareId">The share ID to revoke.</param>
    /// <returns>True if successful.</returns>
    public async Task<bool> RevokeShareAsync(string shareId)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            _logger.LogError("Plugin not configured");
            return false;
        }

        try
        {
            var url = $"{config.BackendUrl.TrimEnd('/')}/api/admin/shares/{shareId}/revoke";

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, url);
            httpRequest.Headers.Add("X-Backend-Key", config.BackendApiKey);

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to revoke share: {StatusCode} - {Error}", response.StatusCode, error);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking share");
            return false;
        }
    }

    /// <summary>
    /// Gets analytics for a share.
    /// </summary>
    /// <param name="shareId">The share ID.</param>
    /// <returns>Analytics data.</returns>
    public async Task<ShareAnalytics?> GetShareAnalyticsAsync(string shareId)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || string.IsNullOrEmpty(config.BackendUrl) || string.IsNullOrEmpty(config.BackendApiKey))
        {
            _logger.LogError("Plugin not configured");
            return null;
        }

        try
        {
            var url = $"{config.BackendUrl.TrimEnd('/')}/api/admin/shares/{shareId}/analytics";

            var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
            httpRequest.Headers.Add("X-Backend-Key", config.BackendApiKey);

            var response = await _httpClient.SendAsync(httpRequest);

            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError("Failed to get analytics: {StatusCode} - {Error}", response.StatusCode, error);
                return null;
            }

            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ShareAnalytics>(content, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics");
            return null;
        }
    }
}

/// <summary>
/// Request to create a share.
/// </summary>
public class CreateShareRequest
{
    /// <summary>
    /// Gets or sets the Jellyfin item ID.
    /// </summary>
    public string JellyfinItemId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Jellyfin user ID.
    /// </summary>
    public string JellyfinUserId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expiry time in minutes.
    /// </summary>
    public int ExpiresInMinutes { get; set; }

    /// <summary>
    /// Gets or sets the optional password.
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// Gets or sets the max total plays.
    /// </summary>
    public int? MaxTotalPlays { get; set; }

    /// <summary>
    /// Gets or sets the max concurrent viewers.
    /// </summary>
    public int? MaxConcurrentViewers { get; set; }
}

/// <summary>
/// Response from creating a share.
/// </summary>
public class ShareResponse
{
    /// <summary>
    /// Gets or sets the share ID.
    /// </summary>
    public string ShareId { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the public URL.
    /// </summary>
    public string PublicUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the token.
    /// </summary>
    public string Token { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the expiry time.
    /// </summary>
    public DateTime ExpiresAt { get; set; }
}

/// <summary>
/// Share list item from backend.
/// </summary>
public class ShareListItem
{
    /// <summary>
    /// Gets or sets the share ID.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the public token.
    /// </summary>
    public string PublicToken { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the item type.
    /// </summary>
    public string ItemType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the total plays.
    /// </summary>
    public int TotalPlays { get; set; }

    /// <summary>
    /// Gets or sets the current concurrent viewers.
    /// </summary>
    public int CurrentConcurrentViewers { get; set; }

    /// <summary>
    /// Gets or sets the max total plays.
    /// </summary>
    public long? MaxTotalPlays { get; set; }

    /// <summary>
    /// Gets or sets the max concurrent viewers.
    /// </summary>
    public long? MaxConcurrentViewers { get; set; }

    /// <summary>
    /// Gets or sets the expiry time.
    /// </summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// Gets or sets the creation time.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Gets or sets the revocation time.
    /// </summary>
    public DateTime? RevokedAt { get; set; }

    /// <summary>
    /// Gets or sets whether the share has a password.
    /// </summary>
    public bool HasPassword { get; set; }
}

/// <summary>
/// Response from listing shares.
/// </summary>
public class ListSharesResponse
{
    /// <summary>
    /// Gets or sets the shares.
    /// </summary>
    public List<ShareListItem> Shares { get; set; } = new();

    /// <summary>
    /// Gets or sets the total count.
    /// </summary>
    public int Total { get; set; }
}

/// <summary>
/// Share analytics data.
/// </summary>
public class ShareAnalytics
{
    /// <summary>
    /// Gets or sets total views.
    /// </summary>
    public int TotalViews { get; set; }

    /// <summary>
    /// Gets or sets unique viewers.
    /// </summary>
    public int UniqueViewers { get; set; }

    /// <summary>
    /// Gets or sets average watch time in seconds.
    /// </summary>
    public int AvgWatchTimeSeconds { get; set; }

    /// <summary>
    /// Gets or sets views by day.
    /// </summary>
    public List<DailyViews> ViewsByDay { get; set; } = new();
}

/// <summary>
/// Daily views data.
/// </summary>
public class DailyViews
{
    /// <summary>
    /// Gets or sets the date.
    /// </summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the view count.
    /// </summary>
    public int Views { get; set; }
}
