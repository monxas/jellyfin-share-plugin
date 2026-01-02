(function() {
    'use strict';

    const PLUGIN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    let pluginConfig = null;

    // QR Code generator (minimal implementation)
    const QRCode = {
        generate: function(text, size) {
            // Use a simple QR code API for now - could be replaced with pure JS library
            const encoded = encodeURIComponent(text);
            return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=202020&color=ffffff`;
        }
    };

    // Load plugin configuration
    async function loadConfig() {
        try {
            const url = ApiClient.getUrl('plugins/share/config');
            const response = await ApiClient.getJSON(url);
            pluginConfig = response;
            return pluginConfig.Configured === true;
        } catch (e) {
            console.error('Jellyfin Share: Failed to load config', e);
            return false;
        }
    }

    // Format time ago
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    // Format expiry
    function formatExpiry(date) {
        const now = new Date();
        const exp = new Date(date);
        if (exp < now) return 'Expired';
        const diff = exp - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 24) return `${hours}h left`;
        const days = Math.floor(hours / 24);
        return `${days}d left`;
    }

    // Common dialog styles
    const commonStyles = `
        .jfshare-dialog { max-width: 600px; width: 95%; border: none; border-radius: 8px; padding: 0; background: #202020; color: #fff; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column; }
        .jfshare-dialog::backdrop { background: rgba(0,0,0,0.7); }
        .jfshare-header { display: flex; align-items: center; padding: 0.75em 1em; border-bottom: 1px solid #333; flex-shrink: 0; }
        .jfshare-close { background: none; border: none; color: #fff; cursor: pointer; padding: 0.5em; margin-right: 0.5em; border-radius: 50%; display: flex; }
        .jfshare-close:hover { background: rgba(255,255,255,0.1); }
        .jfshare-title { margin: 0; font-size: 1.2em; font-weight: 500; flex: 1; }
        .jfshare-content { padding: 1.5em; overflow-y: auto; flex: 1; }
        .jfshare-subtitle { margin: 0 0 1.5em 0; opacity: 0.7; font-size: 0.95em; }
        .jfshare-field { margin-bottom: 1.25em; }
        .jfshare-label { display: block; margin-bottom: 0.4em; font-size: 0.9em; color: #aaa; }
        .jfshare-input, .jfshare-select { width: 100%; padding: 0.7em 0.8em; background: #2a2a2a; border: 1px solid #444; border-radius: 4px; color: #fff; font-size: 1em; box-sizing: border-box; }
        .jfshare-input:focus, .jfshare-select:focus { outline: none; border-color: #00a4dc; }
        .jfshare-hint { font-size: 0.8em; color: #888; margin-top: 0.3em; }
        .jfshare-success { margin: 1.5em 0; padding: 1em; background: rgba(82,196,26,0.15); border: 1px solid rgba(82,196,26,0.4); border-radius: 4px; }
        .jfshare-success-header { display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.75em; color: #52c41a; }
        .jfshare-url-row { display: flex; gap: 0.5em; margin-bottom: 1em; }
        .jfshare-url { flex: 1; padding: 0.6em; background: #1a1a1a; border: 1px solid #333; border-radius: 4px; color: #fff; font-size: 0.9em; }
        .jfshare-copy { background: #00a4dc; border: none; color: #fff; padding: 0.6em 1em; border-radius: 4px; cursor: pointer; display: flex; align-items: center; }
        .jfshare-copy:hover { background: #0095c8; }
        .jfshare-error { margin: 1.5em 0; padding: 1em; background: rgba(255,77,79,0.15); border: 1px solid rgba(255,77,79,0.4); border-radius: 4px; color: #ff6b6b; }
        .jfshare-submit { width: 100%; padding: 0.9em; background: #00a4dc; border: none; color: #fff; font-size: 1em; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.4em; margin-top: 1em; }
        .jfshare-submit:hover { background: #0095c8; }
        .jfshare-submit:disabled { background: #444; cursor: not-allowed; }
        .jfshare-qr { text-align: center; margin-top: 1em; padding: 1em; background: #fff; border-radius: 8px; display: inline-block; }
        .jfshare-qr img { width: 150px; height: 150px; }
        .jfshare-qr-container { text-align: center; }
        .jfshare-tabs { display: flex; border-bottom: 1px solid #333; margin-bottom: 1em; }
        .jfshare-tab { padding: 0.75em 1.5em; background: none; border: none; color: #888; cursor: pointer; border-bottom: 2px solid transparent; }
        .jfshare-tab:hover { color: #fff; }
        .jfshare-tab.active { color: #00a4dc; border-bottom-color: #00a4dc; }
        .jfshare-list { list-style: none; padding: 0; margin: 0; }
        .jfshare-list-item { padding: 1em; background: #2a2a2a; border-radius: 8px; margin-bottom: 0.75em; }
        .jfshare-list-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5em; }
        .jfshare-list-title { font-weight: 500; color: #fff; margin: 0; font-size: 1em; }
        .jfshare-list-meta { display: flex; gap: 1em; font-size: 0.85em; color: #888; flex-wrap: wrap; }
        .jfshare-list-actions { display: flex; gap: 0.5em; margin-top: 0.75em; }
        .jfshare-btn { padding: 0.4em 0.8em; border-radius: 4px; border: none; cursor: pointer; font-size: 0.85em; display: flex; align-items: center; gap: 0.3em; }
        .jfshare-btn-copy { background: #00a4dc; color: #fff; }
        .jfshare-btn-copy:hover { background: #0095c8; }
        .jfshare-btn-qr { background: #444; color: #fff; }
        .jfshare-btn-qr:hover { background: #555; }
        .jfshare-btn-revoke { background: #ff4d4f; color: #fff; }
        .jfshare-btn-revoke:hover { background: #d9363e; }
        .jfshare-btn-analytics { background: #722ed1; color: #fff; }
        .jfshare-btn-analytics:hover { background: #531dab; }
        .jfshare-badge { display: inline-block; padding: 0.2em 0.5em; border-radius: 4px; font-size: 0.75em; font-weight: 500; }
        .jfshare-badge-expired { background: rgba(255,77,79,0.2); color: #ff6b6b; }
        .jfshare-badge-revoked { background: rgba(255,77,79,0.2); color: #ff6b6b; }
        .jfshare-badge-active { background: rgba(82,196,26,0.2); color: #52c41a; }
        .jfshare-badge-password { background: rgba(250,173,20,0.2); color: #faad14; }
        .jfshare-empty { text-align: center; padding: 3em; color: #888; }
        .jfshare-analytics { margin-top: 1em; }
        .jfshare-stat { display: inline-block; text-align: center; padding: 1em; background: #2a2a2a; border-radius: 8px; margin-right: 1em; margin-bottom: 1em; min-width: 100px; }
        .jfshare-stat-value { font-size: 1.5em; font-weight: 600; color: #00a4dc; }
        .jfshare-stat-label { font-size: 0.8em; color: #888; margin-top: 0.3em; }
        .jfshare-chart { height: 150px; background: #2a2a2a; border-radius: 8px; padding: 1em; margin-top: 1em; }
        .jfshare-loading { text-align: center; padding: 2em; color: #888; }
        .jfshare-header-btn { background: none; border: 1px solid #444; color: #fff; padding: 0.4em 0.8em; border-radius: 4px; cursor: pointer; margin-left: 0.5em; font-size: 0.85em; }
        .jfshare-header-btn:hover { background: rgba(255,255,255,0.1); }
    `;

    // Create share dialog
    function showShareDialog(itemId, itemName, itemType) {
        const isSeries = itemType === 'Series';
        const isSeason = itemType === 'Season';

        const html = `
            <style>${commonStyles}</style>
            <div class="jfshare-header">
                <button class="jfshare-close" type="button" title="Close">
                    <span class="material-icons">close</span>
                </button>
                <h3 class="jfshare-title">Share</h3>
            </div>
            <div class="jfshare-content">
                <p class="jfshare-subtitle">Create a shareable link for <strong>${itemName}</strong></p>

                ${(isSeries || isSeason) ? `
                <div class="jfshare-field">
                    <label class="jfshare-label">Share Type</label>
                    <select id="shareType" class="jfshare-select">
                        <option value="single">Share this ${itemType.toLowerCase()} only</option>
                        ${isSeason ? '<option value="episodes">Create links for each episode</option>' : ''}
                        ${isSeries ? '<option value="seasons">Create links for each season</option>' : ''}
                    </select>
                    <div class="jfshare-hint">${isSeason ? 'Episodes will each get their own share link' : 'Each season will get its own share link'}</div>
                </div>
                ` : ''}

                <div class="jfshare-field">
                    <label class="jfshare-label" for="shareExpiry">Expires in</label>
                    <select id="shareExpiry" class="jfshare-select">
                        <option value="60">1 hour</option>
                        <option value="360">6 hours</option>
                        <option value="720">12 hours</option>
                        <option value="1440" selected>24 hours</option>
                        <option value="4320">3 days</option>
                        <option value="10080">7 days</option>
                        <option value="43200">30 days</option>
                    </select>
                </div>

                <div class="jfshare-field">
                    <label class="jfshare-label" for="sharePassword">Password (optional)</label>
                    <input type="password" id="sharePassword" class="jfshare-input" placeholder="Leave empty for no password" />
                </div>

                <div class="jfshare-field">
                    <label class="jfshare-label" for="shareMaxPlays">Max plays</label>
                    <input type="number" id="shareMaxPlays" class="jfshare-input" value="0" min="0" />
                    <div class="jfshare-hint">0 = unlimited</div>
                </div>

                <div class="jfshare-field">
                    <label class="jfshare-label" for="shareMaxViewers">Max concurrent viewers</label>
                    <input type="number" id="shareMaxViewers" class="jfshare-input" value="0" min="0" />
                    <div class="jfshare-hint">0 = unlimited</div>
                </div>

                <div id="shareResult" class="jfshare-success" style="display: none;">
                    <div class="jfshare-success-header">
                        <span class="material-icons">check_circle</span>
                        <strong>Share link created!</strong>
                    </div>
                    <div class="jfshare-url-row">
                        <input type="text" id="shareUrl" class="jfshare-url" readonly />
                        <button id="copyShareUrl" class="jfshare-copy" title="Copy">
                            <span class="material-icons">content_copy</span>
                        </button>
                    </div>
                    <div class="jfshare-qr-container">
                        <div class="jfshare-qr">
                            <img id="shareQrCode" src="" alt="QR Code" />
                        </div>
                    </div>
                </div>

                <div id="shareError" class="jfshare-error" style="display: none;"></div>

                <button id="btnCreateShare" class="jfshare-submit" type="button">
                    <span class="material-icons">share</span>
                    Create Share Link
                </button>
            </div>
        `;

        const dlg = document.createElement('dialog');
        dlg.classList.add('jfshare-dialog');
        dlg.innerHTML = html;

        document.body.appendChild(dlg);

        // Handle close button
        dlg.querySelector('.jfshare-close').addEventListener('click', () => {
            dlg.close();
        });

        // Handle backdrop click to close
        dlg.addEventListener('click', (e) => {
            if (e.target === dlg) {
                dlg.close();
            }
        });

        // Handle escape key
        dlg.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                dlg.close();
            }
        });

        // Handle close
        dlg.addEventListener('close', () => {
            dlg.remove();
        });

        // Handle create
        dlg.querySelector('#btnCreateShare').addEventListener('click', async () => {
            const btn = dlg.querySelector('#btnCreateShare');
            const resultDiv = dlg.querySelector('#shareResult');
            const errorDiv = dlg.querySelector('#shareError');

            btn.disabled = true;
            btn.textContent = 'Creating...';
            resultDiv.style.display = 'none';
            errorDiv.style.display = 'none';

            const shareType = dlg.querySelector('#shareType')?.value || 'single';
            const expiry = parseInt(dlg.querySelector('#shareExpiry').value);
            const password = dlg.querySelector('#sharePassword').value || null;
            const maxPlays = parseInt(dlg.querySelector('#shareMaxPlays').value) || null;
            const maxViewers = parseInt(dlg.querySelector('#shareMaxViewers').value) || null;

            try {
                if (shareType !== 'single') {
                    // Batch creation for episodes or seasons
                    const response = await ApiClient.ajax({
                        url: ApiClient.getUrl('plugins/share/batch'),
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            parentItemId: itemId,
                            expiresInMinutes: expiry,
                            password: password,
                            maxTotalPlays: maxPlays,
                            maxConcurrentViewers: maxViewers
                        }),
                        dataType: 'json'
                    });

                    const successCount = response.SuccessCount || response.successCount || 0;
                    const failCount = response.FailCount || response.failCount || 0;
                    const results = response.Results || response.results || [];

                    if (successCount > 0) {
                        // Show batch results
                        resultDiv.innerHTML = `
                            <div class="jfshare-success-header">
                                <span class="material-icons">check_circle</span>
                                <strong>Created ${successCount} share links!</strong>
                                ${failCount > 0 ? `<span style="color: #ff6b6b; margin-left: 0.5em;">(${failCount} failed)</span>` : ''}
                            </div>
                            <div style="max-height: 250px; overflow-y: auto; margin-top: 1em;">
                                ${results.filter(r => r.Success || r.success).map(r => `
                                    <div style="display: flex; align-items: center; gap: 0.5em; padding: 0.5em; background: #2a2a2a; border-radius: 4px; margin-bottom: 0.5em;">
                                        <span style="flex: 1; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                            ${r.IndexNumber || r.indexNumber ? `E${r.IndexNumber || r.indexNumber}: ` : ''}${escapeHtml(r.ItemName || r.itemName)}
                                        </span>
                                        <button class="jfshare-btn jfshare-btn-copy" data-url="${r.PublicUrl || r.publicUrl}" style="padding: 0.3em 0.5em;">
                                            <span class="material-icons" style="font-size: 0.9em;">content_copy</span>
                                        </button>
                                        <button class="jfshare-btn jfshare-btn-qr" data-url="${r.PublicUrl || r.publicUrl}" style="padding: 0.3em 0.5em;">
                                            <span class="material-icons" style="font-size: 0.9em;">qr_code</span>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                        `;
                        resultDiv.style.display = 'block';

                        // Add event listeners for batch result buttons
                        resultDiv.querySelectorAll('.jfshare-btn-copy').forEach(btn => {
                            btn.addEventListener('click', () => {
                                navigator.clipboard.writeText(btn.dataset.url).then(() => {
                                    btn.innerHTML = '<span class="material-icons" style="font-size: 0.9em;">check</span>';
                                    setTimeout(() => { btn.innerHTML = '<span class="material-icons" style="font-size: 0.9em;">content_copy</span>'; }, 1500);
                                });
                            });
                        });
                        resultDiv.querySelectorAll('.jfshare-btn-qr').forEach(btn => {
                            btn.addEventListener('click', () => {
                                showQRDialog(btn.dataset.url);
                            });
                        });

                        btn.textContent = 'Create More';
                        btn.disabled = false;
                    } else {
                        throw new Error('Failed to create any shares');
                    }
                } else {
                    // Single share creation
                    const response = await ApiClient.ajax({
                        url: ApiClient.getUrl('plugins/share/create'),
                        type: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({
                            itemId: itemId,
                            expiresInMinutes: expiry,
                            password: password,
                            maxTotalPlays: maxPlays,
                            maxConcurrentViewers: maxViewers
                        }),
                        dataType: 'json'
                    });

                    const publicUrl = response.PublicUrl || response.publicUrl;

                    if (publicUrl) {
                        dlg.querySelector('#shareUrl').value = publicUrl;
                        dlg.querySelector('#shareQrCode').src = QRCode.generate(publicUrl, 150);
                        resultDiv.style.display = 'block';
                        btn.textContent = 'Create Another';
                        btn.disabled = false;
                    } else {
                        throw new Error(response.Error || response.error || 'Unknown error');
                    }
                }
            } catch (e) {
                errorDiv.textContent = e.message || 'Failed to create share';
                errorDiv.style.display = 'block';
                btn.textContent = 'Create Share Link';
                btn.disabled = false;
            }
        });

        // Handle copy
        dlg.querySelector('#copyShareUrl').addEventListener('click', () => {
            const urlInput = dlg.querySelector('#shareUrl');
            urlInput.select();
            navigator.clipboard.writeText(urlInput.value).then(() => {
                const btn = dlg.querySelector('#copyShareUrl');
                btn.innerHTML = '<span class="material-icons">check</span>';
                setTimeout(() => { btn.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000);
            });
        });

        dlg.showModal();
    }

    // Show My Shares dialog
    async function showMySharesDialog() {
        const html = `
            <style>${commonStyles}</style>
            <div class="jfshare-header">
                <button class="jfshare-close" type="button" title="Close">
                    <span class="material-icons">close</span>
                </button>
                <h3 class="jfshare-title">My Shares</h3>
                <button class="jfshare-header-btn" id="btnRefreshShares" title="Refresh">
                    <span class="material-icons" style="font-size: 1.1em;">refresh</span>
                </button>
            </div>
            <div class="jfshare-content">
                <div class="jfshare-tabs">
                    <button class="jfshare-tab active" data-filter="active">Active</button>
                    <button class="jfshare-tab" data-filter="expired">Expired</button>
                    <button class="jfshare-tab" data-filter="all">All</button>
                </div>
                <div id="sharesContainer" class="jfshare-loading">Loading shares...</div>
            </div>
        `;

        const dlg = document.createElement('dialog');
        dlg.classList.add('jfshare-dialog');
        dlg.style.maxWidth = '700px';
        dlg.innerHTML = html;

        document.body.appendChild(dlg);

        let currentFilter = 'active';
        let allShares = [];

        // Load shares
        async function loadShares() {
            const container = dlg.querySelector('#sharesContainer');
            container.innerHTML = '<div class="jfshare-loading">Loading shares...</div>';

            try {
                const response = await ApiClient.ajax({
                    url: ApiClient.getUrl('plugins/share/list'),
                    type: 'GET',
                    dataType: 'json'
                });

                allShares = response.Shares || response.shares || [];
                renderShares();
            } catch (e) {
                container.innerHTML = '<div class="jfshare-error">Failed to load shares</div>';
            }
        }

        function renderShares() {
            const container = dlg.querySelector('#sharesContainer');
            let filtered = allShares;

            if (currentFilter === 'active') {
                filtered = allShares.filter(s => !s.IsExpired && !s.IsRevoked);
            } else if (currentFilter === 'expired') {
                filtered = allShares.filter(s => s.IsExpired || s.IsRevoked);
            }

            if (filtered.length === 0) {
                container.innerHTML = `<div class="jfshare-empty">
                    <span class="material-icons" style="font-size: 3em; opacity: 0.5;">folder_shared</span>
                    <p>No ${currentFilter === 'all' ? '' : currentFilter} shares found</p>
                </div>`;
                return;
            }

            container.innerHTML = `<ul class="jfshare-list">
                ${filtered.map(share => `
                    <li class="jfshare-list-item" data-id="${share.Id}">
                        <div class="jfshare-list-header">
                            <h4 class="jfshare-list-title">${escapeHtml(share.Title)}</h4>
                            <div>
                                ${share.IsRevoked ? '<span class="jfshare-badge jfshare-badge-revoked">Revoked</span>' :
                                  share.IsExpired ? '<span class="jfshare-badge jfshare-badge-expired">Expired</span>' :
                                  '<span class="jfshare-badge jfshare-badge-active">Active</span>'}
                                ${share.HasPassword ? '<span class="jfshare-badge jfshare-badge-password">Password</span>' : ''}
                            </div>
                        </div>
                        <div class="jfshare-list-meta">
                            <span title="Item type">${share.ItemType}</span>
                            <span title="Total plays">${share.TotalPlays} plays</span>
                            <span title="Expiry">${formatExpiry(share.ExpiresAt)}</span>
                            <span title="Created">${timeAgo(share.CreatedAt)}</span>
                        </div>
                        <div class="jfshare-list-actions">
                            <button class="jfshare-btn jfshare-btn-copy" data-url="${share.PublicUrl}" title="Copy link">
                                <span class="material-icons" style="font-size: 1em;">content_copy</span> Copy
                            </button>
                            <button class="jfshare-btn jfshare-btn-qr" data-url="${share.PublicUrl}" title="Show QR code">
                                <span class="material-icons" style="font-size: 1em;">qr_code</span> QR
                            </button>
                            <button class="jfshare-btn jfshare-btn-analytics" data-id="${share.Id}" title="View analytics">
                                <span class="material-icons" style="font-size: 1em;">analytics</span> Stats
                            </button>
                            ${!share.IsRevoked && !share.IsExpired ? `
                            <button class="jfshare-btn jfshare-btn-revoke" data-id="${share.Id}" title="Revoke share">
                                <span class="material-icons" style="font-size: 1em;">block</span> Revoke
                            </button>
                            ` : ''}
                        </div>
                    </li>
                `).join('')}
            </ul>`;

            // Add event listeners
            container.querySelectorAll('.jfshare-btn-copy').forEach(btn => {
                btn.addEventListener('click', () => {
                    navigator.clipboard.writeText(btn.dataset.url).then(() => {
                        btn.innerHTML = '<span class="material-icons" style="font-size: 1em;">check</span> Copied!';
                        setTimeout(() => {
                            btn.innerHTML = '<span class="material-icons" style="font-size: 1em;">content_copy</span> Copy';
                        }, 2000);
                    });
                });
            });

            container.querySelectorAll('.jfshare-btn-qr').forEach(btn => {
                btn.addEventListener('click', () => {
                    showQRDialog(btn.dataset.url);
                });
            });

            container.querySelectorAll('.jfshare-btn-analytics').forEach(btn => {
                btn.addEventListener('click', () => {
                    showAnalyticsDialog(btn.dataset.id);
                });
            });

            container.querySelectorAll('.jfshare-btn-revoke').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Are you sure you want to revoke this share? This cannot be undone.')) return;

                    btn.disabled = true;
                    btn.textContent = 'Revoking...';

                    try {
                        await ApiClient.ajax({
                            url: ApiClient.getUrl(`plugins/share/revoke/${btn.dataset.id}`),
                            type: 'POST',
                            dataType: 'json'
                        });
                        loadShares();
                    } catch (e) {
                        alert('Failed to revoke share');
                        btn.disabled = false;
                        btn.innerHTML = '<span class="material-icons" style="font-size: 1em;">block</span> Revoke';
                    }
                });
            });
        }

        // Tab handlers
        dlg.querySelectorAll('.jfshare-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                dlg.querySelectorAll('.jfshare-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                currentFilter = tab.dataset.filter;
                renderShares();
            });
        });

        // Refresh button
        dlg.querySelector('#btnRefreshShares').addEventListener('click', loadShares);

        // Handle close button
        dlg.querySelector('.jfshare-close').addEventListener('click', () => {
            dlg.close();
        });

        // Handle backdrop click to close
        dlg.addEventListener('click', (e) => {
            if (e.target === dlg) {
                dlg.close();
            }
        });

        // Handle close
        dlg.addEventListener('close', () => {
            dlg.remove();
        });

        dlg.showModal();
        loadShares();
    }

    // Show QR code dialog
    function showQRDialog(url) {
        const html = `
            <style>${commonStyles}</style>
            <div class="jfshare-header">
                <button class="jfshare-close" type="button" title="Close">
                    <span class="material-icons">close</span>
                </button>
                <h3 class="jfshare-title">QR Code</h3>
            </div>
            <div class="jfshare-content" style="text-align: center;">
                <div class="jfshare-qr" style="display: inline-block; padding: 1.5em;">
                    <img src="${QRCode.generate(url, 200)}" alt="QR Code" style="width: 200px; height: 200px;" />
                </div>
                <p style="margin-top: 1em; font-size: 0.9em; color: #888;">Scan to open share link</p>
                <div class="jfshare-url-row" style="margin-top: 1em;">
                    <input type="text" class="jfshare-url" value="${url}" readonly />
                    <button class="jfshare-copy" id="copyQrUrl">
                        <span class="material-icons">content_copy</span>
                    </button>
                </div>
            </div>
        `;

        const dlg = document.createElement('dialog');
        dlg.classList.add('jfshare-dialog');
        dlg.style.maxWidth = '400px';
        dlg.innerHTML = html;

        document.body.appendChild(dlg);

        dlg.querySelector('.jfshare-close').addEventListener('click', () => dlg.close());
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('close', () => dlg.remove());

        dlg.querySelector('#copyQrUrl').addEventListener('click', () => {
            navigator.clipboard.writeText(url).then(() => {
                const btn = dlg.querySelector('#copyQrUrl');
                btn.innerHTML = '<span class="material-icons">check</span>';
                setTimeout(() => { btn.innerHTML = '<span class="material-icons">content_copy</span>'; }, 2000);
            });
        });

        dlg.showModal();
    }

    // Show analytics dialog
    async function showAnalyticsDialog(shareId) {
        const html = `
            <style>${commonStyles}</style>
            <div class="jfshare-header">
                <button class="jfshare-close" type="button" title="Close">
                    <span class="material-icons">close</span>
                </button>
                <h3 class="jfshare-title">Share Analytics</h3>
            </div>
            <div class="jfshare-content">
                <div id="analyticsContainer" class="jfshare-loading">Loading analytics...</div>
            </div>
        `;

        const dlg = document.createElement('dialog');
        dlg.classList.add('jfshare-dialog');
        dlg.style.maxWidth = '500px';
        dlg.innerHTML = html;

        document.body.appendChild(dlg);

        dlg.querySelector('.jfshare-close').addEventListener('click', () => dlg.close());
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        dlg.addEventListener('close', () => dlg.remove());

        dlg.showModal();

        // Load analytics
        const container = dlg.querySelector('#analyticsContainer');

        try {
            const analytics = await ApiClient.ajax({
                url: ApiClient.getUrl(`plugins/share/analytics/${shareId}`),
                type: 'GET',
                dataType: 'json'
            });

            const avgWatchMins = Math.round((analytics.AvgWatchTimeSeconds || analytics.avgWatchTimeSeconds || 0) / 60);
            const viewsByDay = analytics.ViewsByDay || analytics.viewsByDay || [];

            container.innerHTML = `
                <div class="jfshare-analytics">
                    <div class="jfshare-stat">
                        <div class="jfshare-stat-value">${analytics.TotalViews || analytics.totalViews || 0}</div>
                        <div class="jfshare-stat-label">Total Views</div>
                    </div>
                    <div class="jfshare-stat">
                        <div class="jfshare-stat-value">${analytics.UniqueViewers || analytics.uniqueViewers || 0}</div>
                        <div class="jfshare-stat-label">Unique Viewers</div>
                    </div>
                    <div class="jfshare-stat">
                        <div class="jfshare-stat-value">${avgWatchMins}m</div>
                        <div class="jfshare-stat-label">Avg Watch Time</div>
                    </div>
                </div>
                ${viewsByDay.length > 0 ? `
                <div style="margin-top: 1.5em;">
                    <h4 style="margin: 0 0 0.75em 0; color: #aaa; font-size: 0.9em;">Views by Day (Last 30 Days)</h4>
                    <div style="display: flex; align-items: flex-end; gap: 4px; height: 100px; padding: 0.5em; background: #2a2a2a; border-radius: 8px;">
                        ${viewsByDay.slice(0, 14).reverse().map((day, i) => {
                            const maxViews = Math.max(...viewsByDay.map(d => d.Views || d.views || 0), 1);
                            const height = ((day.Views || day.views || 0) / maxViews) * 100;
                            return `<div style="flex: 1; background: #00a4dc; height: ${Math.max(height, 4)}%; border-radius: 2px;" title="${day.Date || day.date}: ${day.Views || day.views} views"></div>`;
                        }).join('')}
                    </div>
                </div>
                ` : '<p style="color: #888; text-align: center; margin-top: 1em;">No view data yet</p>'}
            `;
        } catch (e) {
            container.innerHTML = '<div class="jfshare-error">Failed to load analytics</div>';
        }
    }

    // Helper function to escape HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Add share button to item details
    function addShareButton() {
        // Check if button already exists
        if (document.querySelector('.btnShare')) return;

        // Find the buttons container - try multiple selectors for different Jellyfin versions
        const btnContainer = document.querySelector('.mainDetailButtons') ||
                            document.querySelector('.detailButtons') ||
                            document.querySelector('.itemDetailButtons');
        if (!btnContainer) {
            return;
        }

        // Get item info from page
        const itemId = getItemIdFromPage();
        if (!itemId) {
            return;
        }

        // Get item name and type
        const itemName = document.querySelector('.itemName')?.textContent ||
                        document.querySelector('h1')?.textContent ||
                        'this item';

        // Try to determine item type from the page
        let itemType = 'Movie';
        const itemTypeEl = document.querySelector('.itemMiscInfo-primary');
        if (itemTypeEl) {
            const text = itemTypeEl.textContent.toLowerCase();
            if (text.includes('series') || document.querySelector('.seasons')) {
                itemType = 'Series';
            } else if (text.includes('season')) {
                itemType = 'Season';
            } else if (text.includes('episode')) {
                itemType = 'Episode';
            }
        }

        // Create share button matching Jellyfin's style
        const shareBtn = document.createElement('button');
        shareBtn.setAttribute('is', 'emby-button');
        shareBtn.setAttribute('type', 'button');
        shareBtn.classList.add('button-flat', 'btnShare', 'detailButton', 'emby-button');
        shareBtn.setAttribute('title', 'Share');
        shareBtn.innerHTML = `
            <div class="detailButton-content">
                <span class="material-icons detailButton-icon share" aria-hidden="true"></span>
            </div>
        `;

        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showShareDialog(itemId, itemName, itemType);
        });

        // Insert before the "More" button if it exists, otherwise append
        const moreBtn = btnContainer.querySelector('.btnMoreCommands');
        if (moreBtn) {
            btnContainer.insertBefore(shareBtn, moreBtn);
        } else {
            btnContainer.appendChild(shareBtn);
        }
    }

    // Add My Shares button to user menu
    function addMySharesButton() {
        // Try to add to the header/dashboard area
        // This button should be accessible from anywhere
        if (document.querySelector('.btnMyShares')) return;

        // Try to find the user menu or header buttons
        const headerRight = document.querySelector('.headerRight') ||
                           document.querySelector('.headerButtons');

        if (headerRight && !headerRight.querySelector('.btnMyShares')) {
            const mySharesBtn = document.createElement('button');
            mySharesBtn.setAttribute('is', 'paper-icon-button-light');
            mySharesBtn.classList.add('btnMyShares', 'paper-icon-button-light');
            mySharesBtn.setAttribute('title', 'My Shares');
            mySharesBtn.innerHTML = '<span class="material-icons">folder_shared</span>';
            mySharesBtn.style.cssText = 'color: #fff; opacity: 0.8;';

            mySharesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                showMySharesDialog();
            });

            // Insert before the user button
            const userBtn = headerRight.querySelector('.headerUserButton') ||
                           headerRight.querySelector('.headerButton');
            if (userBtn) {
                headerRight.insertBefore(mySharesBtn, userBtn);
            } else {
                headerRight.appendChild(mySharesBtn);
            }
        }
    }

    // Extract item ID from current page
    function getItemIdFromPage() {
        // Try URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        if (id) return id;

        // Try hash
        const hash = window.location.hash;
        const match = hash.match(/id=([^&]+)/);
        if (match) return match[1];

        return null;
    }

    // Check if we're on an item detail page
    function isDetailPage() {
        const hash = window.location.hash || '';
        const path = window.location.pathname || '';
        return hash.includes('item?') ||
               hash.includes('details?') ||
               hash.includes('id=') ||
               path.includes('/details') ||
               path.includes('/item') ||
               document.querySelector('.mainDetailButtons') !== null;
    }

    // Initialize
    async function init() {
        console.log('Jellyfin Share: Initializing...');

        const isConfigured = await loadConfig();
        if (!isConfigured) {
            console.warn('Jellyfin Share: Plugin not configured - check Dashboard > Plugins > Jellyfin Share');
            return;
        }

        console.log('Jellyfin Share: Config loaded, setting up observer');

        // Watch for page changes
        const observer = new MutationObserver((mutations) => {
            if (isDetailPage()) {
                setTimeout(addShareButton, 300);
            }
            // Always try to add My Shares button
            setTimeout(addMySharesButton, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        if (isDetailPage()) {
            setTimeout(addShareButton, 300);
        }
        setTimeout(addMySharesButton, 500);

        console.log('Jellyfin Share: Plugin initialized successfully');
    }

    // Wait for Jellyfin to be ready
    function waitForApiClient(callback, attempts = 0) {
        if (window.ApiClient) {
            callback();
        } else if (attempts < 50) {
            setTimeout(() => waitForApiClient(callback, attempts + 1), 200);
        } else {
            console.error('Jellyfin Share: ApiClient not available after 10 seconds');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => waitForApiClient(init));
    } else {
        waitForApiClient(init);
    }
})();
