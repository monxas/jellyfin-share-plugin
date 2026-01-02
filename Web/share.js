(function() {
    'use strict';

    const PLUGIN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    let pluginConfig = null;

    // Load plugin configuration
    async function loadConfig() {
        try {
            const url = ApiClient.getUrl('plugins/share/config');
            console.log('Jellyfin Share: Fetching config from', url);
            console.log('Jellyfin Share: Access token exists:', !!ApiClient.accessToken());

            // Use Jellyfin's built-in fetch which handles auth
            const response = await ApiClient.getJSON(url);
            console.log('Jellyfin Share: Config response', response);

            pluginConfig = response;
            return pluginConfig.Configured === true;
        } catch (e) {
            console.error('Jellyfin Share: Failed to load config', e);
            return false;
        }
    }

    // Create share dialog
    function showShareDialog(itemId, itemName) {
        const html = `
            <div class="formDialogHeader">
                <button is="paper-icon-button-light" class="btnCancel autoSize" tabindex="-1" type="button">
                    <span class="material-icons arrow_back" aria-hidden="true"></span>
                </button>
                <h3 class="formDialogHeaderTitle">Share</h3>
            </div>

            <div class="formDialogContent scrollY" style="padding-top: 1em;">
                <div class="dialogContentInner" style="max-width: 400px; margin: 0 auto;">

                    <p style="margin: 0 0 1.5em 0; opacity: 0.8;">Create a shareable link for <strong>${itemName}</strong></p>

                    <div class="selectContainer">
                        <select id="shareExpiry" is="emby-select" label="Expires in">
                            <option value="60">1 hour</option>
                            <option value="360">6 hours</option>
                            <option value="720">12 hours</option>
                            <option value="1440" selected>24 hours</option>
                            <option value="4320">3 days</option>
                            <option value="10080">7 days</option>
                            <option value="43200">30 days</option>
                        </select>
                    </div>

                    <div class="inputContainer">
                        <input type="password" id="sharePassword" is="emby-input" label="Password (optional)" />
                        <div class="fieldDescription">Leave empty for no password protection</div>
                    </div>

                    <div class="inputContainer">
                        <input type="number" id="shareMaxPlays" is="emby-input" label="Max plays" value="0" min="0" />
                        <div class="fieldDescription">0 = unlimited</div>
                    </div>

                    <div class="inputContainer">
                        <input type="number" id="shareMaxViewers" is="emby-input" label="Max concurrent viewers" value="0" min="0" />
                        <div class="fieldDescription">0 = unlimited</div>
                    </div>

                    <div id="shareResult" style="display: none; margin: 1.5em 0; padding: 1em; background: rgba(82, 196, 26, 0.15); border: 1px solid rgba(82, 196, 26, 0.3); border-radius: 4px;">
                        <div style="display: flex; align-items: center; gap: 0.5em; margin-bottom: 0.75em;">
                            <span class="material-icons" style="color: #52c41a;">check_circle</span>
                            <strong>Share link created!</strong>
                        </div>
                        <div style="display: flex; gap: 0.5em;">
                            <input type="text" id="shareUrl" readonly style="flex: 1; padding: 0.6em; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: inherit; font-size: 0.9em;" />
                            <button id="copyShareUrl" is="emby-button" class="raised" style="white-space: nowrap;">
                                <span class="material-icons" style="font-size: 1.2em;">content_copy</span>
                            </button>
                        </div>
                    </div>

                    <div id="shareError" style="display: none; margin: 1.5em 0; padding: 1em; background: rgba(255, 77, 79, 0.15); border: 1px solid rgba(255, 77, 79, 0.3); border-radius: 4px; color: #ff6b6b;">
                    </div>

                    <div class="formDialogFooter" style="margin-top: 1.5em; padding-top: 1em;">
                        <button id="btnCreateShare" is="emby-button" type="button" class="raised button-submit block">
                            <span class="material-icons" style="margin-right: 0.3em;">share</span>
                            Create Share Link
                        </button>
                    </div>
                </div>
            </div>
        `;

        const dlg = document.createElement('dialog');
        dlg.classList.add('formDialog', 'focuscontainer');
        dlg.style.cssText = 'max-width: 500px; width: 90%; border: none; border-radius: 8px; padding: 0; background: #1a1a1a;';
        dlg.innerHTML = html;

        document.body.appendChild(dlg);

        // Handle close button
        dlg.querySelector('.btnCancel').addEventListener('click', () => {
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

            const expiry = parseInt(dlg.querySelector('#shareExpiry').value);
            const password = dlg.querySelector('#sharePassword').value || null;
            const maxPlays = parseInt(dlg.querySelector('#shareMaxPlays').value) || null;
            const maxViewers = parseInt(dlg.querySelector('#shareMaxViewers').value) || null;

            try {
                const response = await ApiClient.fetch({
                    url: ApiClient.getUrl('plugins/share/create'),
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        itemId: itemId,
                        expiresInMinutes: expiry,
                        password: password,
                        maxTotalPlays: maxPlays,
                        maxConcurrentViewers: maxViewers
                    })
                });

                if (response.publicUrl) {
                    dlg.querySelector('#shareUrl').value = response.publicUrl;
                    resultDiv.style.display = 'block';
                    btn.textContent = 'Create Another';
                    btn.disabled = false;
                } else {
                    throw new Error(response.error || 'Unknown error');
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
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy Link'; }, 2000);
            });
        });

        dlg.showModal();
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
            console.log('Jellyfin Share: Button container not found');
            return;
        }

        // Get item info from page
        const itemId = getItemIdFromPage();
        if (!itemId) {
            console.log('Jellyfin Share: Item ID not found');
            return;
        }

        // Get item name
        const itemName = document.querySelector('.itemName')?.textContent ||
                        document.querySelector('h1')?.textContent ||
                        'this item';

        console.log('Jellyfin Share: Adding button for', itemName, itemId);

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
            showShareDialog(itemId, itemName);
        });

        // Insert before the "More" button if it exists, otherwise append
        const moreBtn = btnContainer.querySelector('.btnMoreCommands');
        if (moreBtn) {
            btnContainer.insertBefore(shareBtn, moreBtn);
        } else {
            btnContainer.appendChild(shareBtn);
        }

        console.log('Jellyfin Share: Button added successfully');
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
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        if (isDetailPage()) {
            setTimeout(addShareButton, 300);
        }

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
