document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allUpdates = [];
    let currentFilteredUpdates = [];
    let currentFilterType = 'all';
    let searchQuery = '';
    
    // Relative Timestamp Variables
    let lastFetchedTimestamp = 0;
    let relativeTimeInterval = null;
    
    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = themeToggleBtn.querySelector('.theme-icon-sun');
    const moonIcon = themeToggleBtn.querySelector('.theme-icon-moon');
    
    // Check local storage for preference
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (sunIcon && moonIcon) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        }
    }
    
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const isLight = document.body.classList.contains('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            
            if (isLight) {
                sunIcon.style.display = 'none';
                moonIcon.style.display = 'block';
            } else {
                sunIcon.style.display = 'block';
                moonIcon.style.display = 'none';
            }
        });
    }
    
    // Character Limit for X (Twitter)
    const TWEET_LIMIT = 280;
    const progressCircle = document.getElementById('char-progress-circle');
    const ringCircumference = 2 * Math.PI * 12; // Radius is 12, Circ ~ 75.4
    
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
        progressCircle.style.strokeDashoffset = ringCircumference;
    }

    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = refreshBtn.querySelector('.icon-spin-target');
    const cacheStatusText = document.getElementById('cache-status-text');
    const statusDot = document.querySelector('.status-dot');
    
    const searchInput = document.getElementById('search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const typeFiltersContainer = document.getElementById('type-filters');
    
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');
    const retryBtn = document.getElementById('retry-btn');
    const emptyState = document.getElementById('empty-state');
    const updatesGrid = document.getElementById('updates-grid');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    
    // Stats elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');
    const statChanges = document.getElementById('stat-changes');
    const statFixes = document.getElementById('stat-fixes');

    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const shareTweetBtn = document.getElementById('share-tweet-btn');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const modalNoteType = document.getElementById('modal-note-type');
    const modalNoteDate = document.getElementById('modal-note-date');
    const modalNoteSnippet = document.getElementById('modal-note-snippet');
    const suggestionTagButtons = document.querySelectorAll('.sug-tag-btn');

    // Initialize Lucide Icons
    lucide.createIcons();

    // Relative Time Sync Updater
    function updateRelativeTime() {
        if (!lastFetchedTimestamp) return;
        const now = Math.floor(Date.now() / 1000);
        const diff = now - lastFetchedTimestamp;
        
        let text = '';
        if (diff < 5) {
            text = 'just now';
        } else if (diff < 60) {
            text = `${diff}s ago`;
        } else {
            const mins = Math.floor(diff / 60);
            text = `${mins}m ago`;
        }
        
        const isCache = cacheStatusText.getAttribute('data-is-cache') === 'true';
        if (isCache) {
            cacheStatusText.textContent = `Cached (Synced ${text})`;
        } else {
            cacheStatusText.textContent = `Live Feed (Synced ${text})`;
        }
    }

    // Fetch Release Notes
    async function fetchReleaseNotes(force = false) {
        // Show loading state
        showSection('loading');
        refreshBtn.disabled = true;
        refreshIcon.classList.add('icon-spin');
        
        try {
            const url = `/api/releases?refresh=${force}`;
            const response = await fetch(url);
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Server returned an error');
            }
            
            allUpdates = result.updates;
            updateStats();
            applyFiltersAndRender();
            
            // Update cache/connection status indicator
            lastFetchedTimestamp = result.timestamp;
            if (result.source === 'cache') {
                cacheStatusText.setAttribute('data-is-cache', 'true');
                statusDot.className = 'status-dot orange';
                if (force) {
                    showToast('Loaded cached release notes (no internet changes).', 'info');
                }
            } else {
                cacheStatusText.setAttribute('data-is-cache', 'false');
                statusDot.className = 'status-dot green';
                if (force) {
                    showToast('Fetched fresh release notes from Google Cloud!', 'success');
                }
            }
            
            updateRelativeTime();
            if (!relativeTimeInterval) {
                relativeTimeInterval = setInterval(updateRelativeTime, 10000); // update relative text every 10s
            }
            
        } catch (error) {
            console.error('Error fetching release notes:', error);
            errorMessage.textContent = `Could not fetch release notes. Details: ${error.message}`;
            showSection('error');
            showToast('Failed to fetch release notes.', 'error');
        } finally {
            refreshBtn.disabled = false;
            refreshIcon.classList.remove('icon-spin');
        }
    }

    // Toggle Visible Sections (Loading, Error, Empty, Grid)
    function showSection(section) {
        loadingState.style.display = section === 'loading' ? 'flex' : 'none';
        errorState.style.display = section === 'error' ? 'flex' : 'none';
        emptyState.style.display = section === 'empty' ? 'flex' : 'none';
        updatesGrid.style.display = section === 'grid' ? 'grid' : 'none';
    }

    // Calculate and render global stats
    function updateStats() {
        const total = allUpdates.length;
        const features = allUpdates.filter(u => u.type.toLowerCase() === 'feature').length;
        const changes = allUpdates.filter(u => u.type.toLowerCase() === 'change').length;
        const fixes = allUpdates.filter(u => {
            const t = u.type.toLowerCase();
            return t === 'fix' || t === 'deprecation';
        }).length;
        
        statTotal.textContent = total;
        statFeatures.textContent = features;
        statChanges.textContent = changes;
        statFixes.textContent = fixes;
    }

    // Apply Filter and Search Queries to Data, then Render Grid
    function applyFiltersAndRender() {
        let filtered = [...allUpdates];
        
        // Filter by Tag Type
        if (currentFilterType !== 'all') {
            filtered = filtered.filter(update => update.type.toLowerCase() === currentFilterType);
        }
        
        // Search queries
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(update => 
                update.date.toLowerCase().includes(q) ||
                update.type.toLowerCase().includes(q) ||
                update.raw_text.toLowerCase().includes(q)
            );
        }
        
        // Save current filtered list for CSV export
        currentFilteredUpdates = filtered;
        
        // Render
        if (filtered.length === 0) {
            showSection('empty');
        } else {
            renderGrid(filtered);
            showSection('grid');
        }
    }

    // Highlight matched text inside HTML content (ignoring HTML tags themselves)
    function highlightText(htmlContent, query) {
        if (!query || !query.trim()) return htmlContent;
        const escapedQuery = query.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(<[^>]+>)|(${escapedQuery})`, 'gi');
        
        return htmlContent.replace(regex, (match, tag, text) => {
            if (tag) return tag; // Ignore HTML tags
            if (text) return `<mark class="search-highlight">${text}</mark>`;
            return match;
        });
    }

    // Render Cards in Grid
    function renderGrid(updates) {
        updatesGrid.innerHTML = '';
        
        updates.forEach(update => {
            const card = document.createElement('article');
            card.className = 'update-card';
            
            // Extract colors based on update type for custom border glows
            const typeLower = update.type.toLowerCase();
            let accentColor = 'var(--color-fallback)';
            let accentRgb = '139, 92, 246';
            let badgeClass = 'badge-update';
            
            if (typeLower === 'feature') {
                accentColor = 'var(--color-feature)';
                accentRgb = '16, 185, 129';
                badgeClass = 'badge-feature';
            } else if (typeLower === 'change') {
                accentColor = 'var(--color-change)';
                accentRgb = '59, 130, 246';
                badgeClass = 'badge-change';
            } else if (typeLower === 'fix') {
                accentColor = 'var(--color-fix)';
                accentRgb = '245, 158, 11';
                badgeClass = 'badge-fix';
            } else if (typeLower === 'deprecation') {
                accentColor = 'var(--color-deprecation)';
                accentRgb = '239, 68, 68';
                badgeClass = 'badge-deprecation';
            }
            
            card.style.setProperty('--card-accent-color', accentColor);
            card.style.setProperty('--card-accent-rgb', accentRgb);
            card.style.setProperty('--card-border-glow', `rgba(${accentRgb}, 0.25)`);
            
            // Apply highlighting to card content if search query exists
            const contentHtml = highlightText(update.content, searchQuery);
            
            // Build card structure
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="update-badge ${badgeClass}">${update.type}</span>
                        <span class="card-date">
                            <i data-lucide="calendar" style="width: 14px; height: 14px;"></i>
                            ${update.date}
                        </span>
                    </div>
                    <div class="card-actions">
                        ${update.link ? `
                        <a class="card-action-btn" href="${update.link}" target="_blank" rel="noopener noreferrer" title="View Source Release Note">
                            <i data-lucide="external-link" style="width: 16px; height: 16px;"></i>
                        </a>` : ''}
                        <button class="card-action-btn btn-copy-card" title="Copy to clipboard">
                            <i data-lucide="copy" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="card-action-btn btn-tweet-card" title="Tweet this update">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="card-content">
                    ${contentHtml}
                </div>
            `;
            
            // Attach event listener for Copy button
            const copyBtn = card.querySelector('.btn-copy-card');
            copyBtn.addEventListener('click', async () => {
                const textToCopy = `BigQuery ${update.type} (${update.date}): ${update.raw_text}${update.link ? `\n\nRead more: ${update.link}` : ''}`;
                try {
                    await navigator.clipboard.writeText(textToCopy);
                    showToast('Copied release note to clipboard!', 'success');
                    // Micro-interaction: temporarily change copy icon to checkmark
                    const icon = copyBtn.querySelector('i');
                    icon.setAttribute('data-lucide', 'check');
                    copyBtn.style.color = 'var(--color-feature)';
                    copyBtn.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    lucide.createIcons();
                    
                    setTimeout(() => {
                        icon.setAttribute('data-lucide', 'copy');
                        copyBtn.style.color = '';
                        copyBtn.style.borderColor = '';
                        lucide.createIcons();
                    }, 2000);
                } catch (err) {
                    console.error('Failed to copy text: ', err);
                    showToast('Failed to copy to clipboard.', 'error');
                }
            });

            // Attach event listener for Tweet button
            const tweetBtn = card.querySelector('.btn-tweet-card');
            tweetBtn.addEventListener('click', () => {
                openTweetComposer(update);
            });
            
            updatesGrid.appendChild(card);
        });
        
        // Re-run Lucide to inject SVG icons
        lucide.createIcons();
    }

    // Modal Interaction (Tweet Composer)
    function openTweetComposer(update) {
        // Set update info in modal background details
        modalNoteType.textContent = update.type;
        modalNoteType.className = `update-badge badge-${update.type.toLowerCase()}`;
        modalNoteDate.textContent = update.date;
        modalNoteSnippet.textContent = update.raw_text;
        
        // Compose default tweet text
        // Format: "BigQuery [Type] ([Date]): [Snippet]... #BigQuery [Link]"
        const prefix = `BigQuery ${update.type} (${update.date}): `;
        const hashtags = "\n\n#BigQuery #GoogleCloud";
        const link = update.link ? `\n🔗 ${update.link}` : '';
        
        // Total budget for description text
        const extraCharLength = prefix.length + hashtags.length + link.length;
        const maxSnippetLength = TWEET_LIMIT - extraCharLength - 5; // offset for ellipses/spacing
        
        let snippet = update.raw_text;
        if (snippet.length > maxSnippetLength) {
            snippet = snippet.substring(0, maxSnippetLength) + '...';
        }
        
        const defaultTweet = `${prefix}${snippet}${link}${hashtags}`;
        tweetTextarea.value = defaultTweet;
        
        // Open modal
        tweetModal.style.display = 'flex';
        setTimeout(() => {
            tweetModal.classList.add('active');
            tweetTextarea.focus();
            updateTweetCharCount();
        }, 10);
    }

    function closeTweetComposer() {
        tweetModal.classList.remove('active');
        setTimeout(() => {
            tweetModal.style.display = 'none';
        }, 300);
    }

    function updateTweetCharCount() {
        const length = tweetTextarea.value.length;
        charCounter.textContent = `${length} / ${TWEET_LIMIT}`;
        
        // Update circular indicator
        if (progressCircle) {
            const percentage = Math.min(length / TWEET_LIMIT, 1);
            const offset = ringCircumference - (percentage * ringCircumference);
            progressCircle.style.strokeDashoffset = offset;
            
            // Adjust indicator color
            if (length > TWEET_LIMIT) {
                progressCircle.style.stroke = 'var(--color-deprecation)';
                charCounter.className = 'char-counter limit-exceeded';
                shareTweetBtn.disabled = true;
            } else if (length > 250) {
                progressCircle.style.stroke = 'var(--color-fix)';
                charCounter.className = 'char-counter limit-warning';
                shareTweetBtn.disabled = false;
            } else {
                progressCircle.style.stroke = 'var(--x-blue)';
                charCounter.className = 'char-counter';
                shareTweetBtn.disabled = false;
            }
        }
    }

    // EVENT LISTENERS

    // Refresh Buttons
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search Box
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        if (searchQuery.trim().length > 0) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        applyFiltersAndRender();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFiltersAndRender();
        searchInput.focus();
    });

    // Filtering Tabs
    typeFiltersContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.tag-btn');
        if (!button) return;
        
        // Update active class
        typeFiltersContainer.querySelectorAll('.tag-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update state and re-render
        currentFilterType = button.getAttribute('data-type');
        applyFiltersAndRender();
    });

    // Clear filters helper
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        typeFiltersContainer.querySelectorAll('.tag-btn').forEach(btn => {
            if (btn.getAttribute('data-type') === 'all') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        currentFilterType = 'all';
        applyFiltersAndRender();
    });

    // Export CSV Button
    const exportCsvBtn = document.getElementById('export-csv-btn');
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', () => {
            if (currentFilteredUpdates.length === 0) {
                showToast('No updates to export.', 'error');
                return;
            }
            
            const headers = ['Date', 'Type', 'Content', 'Link'];
            const rows = currentFilteredUpdates.map(u => [
                u.date,
                u.type,
                u.raw_text,
                u.link
            ]);
            
            // Escape quotes and format CSV values
            const csvContent = [
                headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
                ...rows.map(row => row.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(','))
            ].join('\n');
            
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showToast(`Exported ${currentFilteredUpdates.length} updates to CSV!`, 'success');
        });
    }

    // Modal Close
    closeModalBtn.addEventListener('click', closeTweetComposer);
    cancelModalBtn.addEventListener('click', closeTweetComposer);
    
    // Close on clicking backdrop
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetComposer();
        }
    });

    // Keydown listeners on modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && tweetModal.classList.contains('active')) {
            closeTweetComposer();
        }
    });

    // Live characters counter
    tweetTextarea.addEventListener('input', updateTweetCharCount);

    // Hashtag insertion suggestions
    suggestionTagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-tag');
            const currentValue = tweetTextarea.value;
            
            // Check if tag is already in text
            if (!currentValue.includes(tag)) {
                // If it ends with whitespace, just append; else prepend space
                const space = (currentValue.endsWith(' ') || currentValue.endsWith('\n') || currentValue === '') ? '' : ' ';
                tweetTextarea.value = currentValue + space + tag;
                updateTweetCharCount();
                tweetTextarea.focus();
            }
        });
    });

    // Tweet Execution
    shareTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > TWEET_LIMIT) return; // Prevent sharing if limit exceeded
        
        // Construct the X/Twitter Share Intent URL
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        
        // Open in a new tab/window
        window.open(intentUrl, '_blank', 'width=550,height=420,toolbar=no,menubar=no,scrollbars=yes');
        
        // Close modal
        closeTweetComposer();
    });

    // Toast Notification System Helper
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let iconHtml = '<i data-lucide="check-circle" class="toast-success-icon" style="width: 18px; height: 18px;"></i>';
        if (type === 'error') {
            iconHtml = '<i data-lucide="alert-triangle" style="width: 18px; height: 18px; color: var(--color-deprecation)"></i>';
        } else if (type === 'info') {
            iconHtml = '<i data-lucide="info" style="width: 18px; height: 18px; color: var(--color-change)"></i>';
        }
        
        toast.innerHTML = `
            ${iconHtml}
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        lucide.createIcons();
        
        // Animate in
        setTimeout(() => toast.classList.add('active'), 50);
        
        // Auto remove
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Initial Load (default fetches cache or fetches fresh if cache empty)
    fetchReleaseNotes(false);
});
