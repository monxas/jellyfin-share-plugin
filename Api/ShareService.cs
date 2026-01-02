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
