/**
 * KrushiMitra Admin — Custom JavaScript
 * Fixes the "----------" placeholder in Django action dropdowns
 * and adds other UX improvements.
 */
(function () {
    'use strict';

    function fixActionDropdowns() {
        // Fix all action select dropdowns — replace "----------" with a useful label
        var actionSelects = document.querySelectorAll('select[name="action"]');
        actionSelects.forEach(function (select) {
            var options = select.querySelectorAll('option');
            options.forEach(function (option) {
                // Django renders the empty option as "---------"
                if (option.value === '' || option.textContent.trim().match(/^-+$/)) {
                    option.textContent = 'Choose action...';
                    option.style.color = '#6b7280';
                }
            });
        });

        // Also fix any other select fields that have the "---------" pattern
        var allSelects = document.querySelectorAll('select');
        allSelects.forEach(function (select) {
            // Skip action selects (already handled)
            if (select.name === 'action') return;

            var firstOption = select.querySelector('option:first-child');
            if (firstOption && firstOption.textContent.trim().match(/^-+$/)) {
                // For filter dropdowns, use "All" or "Any"
                if (select.closest('.changelist-filter') || select.closest('.actions')) {
                    firstOption.textContent = 'All';
                } else {
                    // For form selects, use "Select..."
                    firstOption.textContent = 'Select...';
                }
                firstOption.style.color = '#6b7280';
            }
        });
    }

    function hidePasswordHashDisplay() {
        // Hide the raw password hash display on user change pages
        // Django shows: "algorithm: argon2 variety: argon2id version: 19 ..."
        var passwordFields = document.querySelectorAll('.form-group, .field-password, [class*="password"]');
        passwordFields.forEach(function (field) {
            var readonlyContent = field.querySelector('.readonly, .help');
            if (readonlyContent) {
                var text = readonlyContent.textContent || '';
                if (text.indexOf('algorithm:') !== -1 && text.indexOf('hash:') !== -1) {
                    readonlyContent.innerHTML = '<span style="color: #68AC5D; font-weight: 600;">' +
                        '🔒 Password is securely encrypted</span><br>' +
                        '<small style="color: #6b7280;">Use the link below to change this user\'s password.</small>';
                }
            }
        });
    }

    function init() {
        fixActionDropdowns();
        hidePasswordHashDisplay();
    }

    // Run when DOM is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also run after any dynamic content load (jazzmin may load content dynamically)
    var fixing = false;
    var debounceTimer = null;
    var observer = new MutationObserver(function (mutations) {
        // Skip if we are currently making our own DOM changes
        if (fixing) return;

        var shouldFix = false;
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length > 0) {
                shouldFix = true;
            }
        });
        if (shouldFix) {
            // Debounce to avoid rapid re-triggers
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                fixing = true;
                fixActionDropdowns();
                fixing = false;
            }, 100);
        }
    });

    observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
    });

    // ══════════════════════════════════════════════════════════════════
    //  AUTO-REFRESH — Silently reload change list pages every 30s
    //  This ensures new bookings, messages, etc. appear without
    //  manually hitting F5. Only runs on list pages (not edit forms).
    // ══════════════════════════════════════════════════════════════════
    (function setupAutoRefresh() {
        // Only auto-refresh on changelist pages (URL contains /change/ is an edit form)
        var path = window.location.pathname;
        var isChangeList = path.match(/\/admin\/[^/]+\/[^/]+\/$/);
        var isEditForm = path.match(/\/admin\/[^/]+\/[^/]+\/\d+\//);
        var isAddForm = path.match(/\/admin\/[^/]+\/[^/]+\/add\//);

        if (!isChangeList || isEditForm || isAddForm) return;

        var REFRESH_INTERVAL = 30000; // 30 seconds
        var refreshTimer = null;
        var isTabVisible = true;

        // Visibility API — pause refresh when tab is hidden
        document.addEventListener('visibilitychange', function () {
            isTabVisible = !document.hidden;
            if (isTabVisible) {
                // Immediately refresh when tab becomes visible
                silentRefresh();
                startTimer();
            } else {
                clearInterval(refreshTimer);
                refreshTimer = null;
            }
        });

        function silentRefresh() {
            // Use fetch to get the same page, then replace the result table
            fetch(window.location.href, {
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(function (res) { return res.text(); })
            .then(function (html) {
                var parser = new DOMParser();
                var newDoc = parser.parseFromString(html, 'text/html');

                // Replace the results table
                var newTable = newDoc.querySelector('#result_list');
                var oldTable = document.querySelector('#result_list');
                if (newTable && oldTable) {
                    oldTable.innerHTML = newTable.innerHTML;
                    // Re-run dropdown fixes on new content
                    fixing = true;
                    fixActionDropdowns();
                    fixing = false;
                }

                // Update the result count text
                var newCount = newDoc.querySelector('.paginator, p.paginator');
                var oldCount = document.querySelector('.paginator, p.paginator');
                if (newCount && oldCount) {
                    oldCount.innerHTML = newCount.innerHTML;
                }
            })
            .catch(function () {
                // Silent fail — will retry next interval
            });
        }

        function startTimer() {
            if (refreshTimer) clearInterval(refreshTimer);
            refreshTimer = setInterval(function () {
                if (isTabVisible) silentRefresh();
            }, REFRESH_INTERVAL);
        }

        startTimer();
    })();
})();
