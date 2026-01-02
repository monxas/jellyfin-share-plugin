(function() {
    'use strict';

    const PLUGIN_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    let pluginConfig = null;

    // Load plugin configuration
    async function loadConfig() {
        try {
            const response = await ApiClient.fetch({
                url: ApiClient.getUrl('plugins/share/config'),
                type: 'GET'
            });
            pluginConfig = response;
            return pluginConfig.Configured;
        } catch (e) {
            console.error('Jellyfin Share: Failed to load config', e);
            return false;
        }
    }

    // Create share dialog
    function showShareDialog(itemId, itemName) {
        const html = `
            <div class="formDialogContent scrollY" style="padding: 2em;">
                <h2 style="margin-top: 0;">Share "${itemName}"</h2>

                <div class="inputContainer">
                    <label class="inputLabel" for="shareExpiry">Expires in</label>
                    <select id="shareExpiry" is="emby-select" class="emby-select-withcolor">
                        <option value="60">1 hour</option>
                        <option value="360">6 hours</option>
                        <option value="720">12 hours</option>
                        <option value="1440" selected>24 hours</option>
                        <option value="4320">3 days</option>
                        <option value="10080">7 days</option>
                    </select>
                </div>

                <div class="inputContainer">
                    <label class="inputLabel" for="sharePassword">Password (optional)</label>
                    <input type="password" id="sharePassword" is="emby-input" class="emby-input" />
                </div>

                <div class="inputContainer">
                    <label class="inputLabel" for="shareMaxPlays">Max plays (0 = unlimited)</label>
                    <input type="number" id="shareMaxPlays" is="emby-input" class="emby-input" value="0" min="0" />
                </div>

                <div class="inputContainer">
                    <label class="inputLabel" for="shareMaxViewers">Max concurrent viewers (0 = unlimited)</label>
                    <input type="number" id="shareMaxViewers" is="emby-input" class="emby-input" value="0" min="0" />
                </div>

                <div id="shareResult" style="display: none; margin-top: 1em; padding: 1em; background: rgba(0,200,100,0.1); border-radius: 8px;">
                    <p style="margin: 0 0 0.5em 0; font-weight: bold;">Share link created!</p>
                    <input type="text" id="shareUrl" readonly style="width: 100%; padding: 0.5em; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: inherit;" />
                    <button id="copyShareUrl" is="emby-button" class="raised" style="margin-top: 0.5em;">
                        Copy Link
                    </button>
                </div>

                <div id="shareError" style="display: none; margin-top: 1em; padding: 1em; background: rgba(200,50,50,0.1); border-radius: 8px; color: #ff6b6b;">
                </div>

                <div class="formDialogFooter" style="margin-top: 2em;">
                    <button id="btnCreateShare" is="emby-button" type="button" class="raised button-submit block">
                        Create Share Link
                    </button>
                </div>
            </div>
        `;

        const dlg = document.createElement('dialog');
        dlg.setAttribute('is', 'emby-dialog');
        dlg.classList.add('formDialog');
        dlg.innerHTML = html;
        dlg.style.maxWidth = '500px';

        document.body.appendChild(dlg);

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
