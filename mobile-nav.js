// Shared bottom tab bar + floating "Add" button + "More" sheet, injected at
// runtime on every authenticated page - replaces the old hamburger/sidebar.
//
// Follows the same pattern as biometric.js's lock overlay and script.js's
// connectivity banner: build the DOM once via document.createElement and
// append it to <body>, rather than hand-duplicating markup per page.
//
// Per-page contract, declared as data-* attributes on <body>:
//   data-active-tab="home|balance|more"   which bottom-nav tab is highlighted
//   data-fab-modal="addExpenseModalContent"  modalContentId the FAB opens (omit for no FAB)
//   data-fab-label="Add expense"          accessible label for the FAB (optional)

const TABS = [
    { key: 'home', label: 'Home', icon: 'fa-home', href: 'dashboard.html' },
    { key: 'balance', label: 'Balance', icon: 'fa-wallet', href: 'balance.html' },
    { key: 'more', label: 'More', icon: 'fa-ellipsis-h' },
];

const MORE_LINKS = [
    { label: 'Sources', icon: 'fa-university', href: 'sources.html' },
    { label: 'Commodities', icon: 'fa-tags', href: 'commodities.html' },
    { label: 'Internal Transactions', icon: 'fa-exchange-alt', href: 'internal_transactions.html' },
    { label: 'Profile', icon: 'fa-user', href: 'profile.html' },
    { label: 'Logout', icon: 'fa-sign-out-alt', action: 'logout' },
];

let fabEl = null;

function buildBottomNav(activeTab) {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.id = 'bottom-nav';

    TABS.forEach((tab) => {
        const isActive = tab.key === activeTab;
        const el = document.createElement(tab.href ? 'a' : 'button');
        el.className = 'bottom-nav-tab' + (isActive ? ' active' : '');
        if (tab.href) {
            el.href = tab.href;
        } else {
            el.type = 'button';
        }
        el.innerHTML = `<i class="fas ${tab.icon}"></i><span>${tab.label}</span>`;
        if (tab.key === 'more') {
            el.addEventListener('click', openMoreSheet);
        }
        nav.appendChild(el);
    });

    document.body.appendChild(nav);
}

function buildFab(modalId, label) {
    if (!modalId) return;

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'fab fab-loading';
    fab.id = 'fab-btn';
    fab.disabled = true;
    fab.setAttribute('aria-label', label || 'Add');
    fab.innerHTML = '<i class="fas fa-plus"></i>';
    fab.addEventListener('click', () => openModal(modalId));

    document.body.appendChild(fab);
    fabEl = fab;
}

function buildMoreSheet() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal';
    backdrop.id = 'more-sheet-modal';

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog more-sheet-dialog';

    const list = document.createElement('div');
    list.className = 'more-sheet-list';

    MORE_LINKS.forEach((item) => {
        const el = document.createElement(item.href ? 'a' : 'button');
        el.className = 'more-sheet-item';
        if (item.href) {
            el.href = item.href;
        } else {
            el.type = 'button';
        }
        el.innerHTML = `<i class="fas ${item.icon}"></i><span>${item.label}</span>`;
        if (item.action === 'logout') {
            el.addEventListener('click', (event) => {
                event.preventDefault();
                closeMoreSheet();
                logout();
            });
        }
        list.appendChild(el);
    });

    dialog.appendChild(list);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
}

function openMoreSheet() {
    const sheet = document.getElementById('more-sheet-modal');
    if (sheet) sheet.classList.add('open');
}

function closeMoreSheet() {
    const sheet = document.getElementById('more-sheet-modal');
    if (sheet) sheet.classList.remove('open');
}

// Called by each page's check_perm() once its initial data fetch resolves,
// so the FAB can't be tapped before sourcesList/commoditiesList are populated
// (tapping it earlier would throw inside openModal's add-form builders).
function enableFab() {
    if (fabEl) {
        fabEl.disabled = false;
        fabEl.classList.remove('fab-loading');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    buildBottomNav(body.dataset.activeTab);
    buildFab(body.dataset.fabModal, body.dataset.fabLabel);
    buildMoreSheet();
});
