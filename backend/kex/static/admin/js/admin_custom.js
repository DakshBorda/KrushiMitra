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
})();
