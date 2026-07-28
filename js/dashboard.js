// ============================================================
//  SAM LOANS · DASHBOARD CONTROLLER
//  Complete rewrite with better functions, profile pictures,
//  notifications, sidebar toggle, and real‑time data.
// ============================================================

// ─── GLOBALS ─────────────────────────────────────────────────
let currentUser = null;
let currentProfile = null;

// ─── INIT ────────────────────────────────────────────────────
(async () => {
    try {
        // 1. Auth guard
        const user = await requireLogin();
        if (!user) return;
        currentUser = user;

        // 2. Fetch profile
        const { data: profile, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error) throw new Error('Profile fetch failed: ' + error.message);
        currentProfile = profile;

        // 3. Render all UI
        renderUserInfo(profile);
        renderProfilePicture(profile);
        renderAdminLink(profile.role);
        await loadDashboardData(user.id);

        // 4. Init interactive components
        initNotificationSystem();
        initSidebarToggle();
        initChartSelector();

        console.log('✅ Dashboard ready');

    } catch (err) {
        console.error('❌ Dashboard init error:', err);
        showToast('Error loading dashboard', 'error');
    }
})();

// ─── RENDER USER INFO ──────────────────────────────────────
function renderUserInfo(profile) {
    const fullName = profile.full_name || 'User';
    const role = profile.role || 'customer';
    const initial = fullName.charAt(0).toUpperCase();

    // Welcome & role
    const welcomeEl = document.getElementById('welcome');
    if (welcomeEl) welcomeEl.innerHTML = `Welcome, <strong>${fullName}</strong>`;
    const roleEl = document.getElementById('role');
    if (roleEl) roleEl.textContent = role.toUpperCase();

    // Header
    const nameEl = document.getElementById('headerUserName');
    if (nameEl) nameEl.textContent = fullName;
    const roleHeader = document.getElementById('headerUserRole');
    if (roleHeader) roleHeader.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    // Dashboard subtitle
    const subEl = document.getElementById('dashboardSubtitle');
    if (subEl) subEl.textContent = `Welcome back, ${fullName}! Here's your loan overview`;

    // Store initials for fallback
    window.__userInitial = initial;
}

// ─── RENDER PROFILE PICTURE ────────────────────────────────
function renderProfilePicture(profile) {
    const avatarUrl = profile.avatar_url || profile.profile_picture || null;
    const initial = window.__userInitial || 'U';

    // Helper: update an avatar container
    function setAvatar(containerId, imgId, initialId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const img = container.querySelector('img') || document.getElementById(imgId);
        const initialEl = container.querySelector('span') || document.getElementById(initialId);

        if (avatarUrl) {
            if (img) {
                img.src = avatarUrl;
                img.style.display = 'block';
            }
            if (initialEl) initialEl.style.display = 'none';
        } else {
            if (img) img.style.display = 'none';
            if (initialEl) {
                initialEl.style.display = 'flex';
                initialEl.textContent = initial;
            }
        }
    }

    setAvatar('userAvatar', 'userAvatarImg', 'userInitial');
    setAvatar('sidebarAvatar', 'sidebarAvatarImg', 'sidebarInitial');
}

// ─── ADMIN LINK ─────────────────────────────────────────────
function renderAdminLink(role) {
    const adminMenu = document.getElementById('adminMenu');
    if (adminMenu) {
        adminMenu.style.display = (role === 'admin') ? 'block' : 'none';
    }
}

// ─── LOAD DASHBOARD DATA ────────────────────────────────────
async function loadDashboardData(userId) {
    try {
        // ── Active loan ──
        const { data: loans, error: loansErr } = await client
            .from('loans')
            .select('*')
            .eq('customer_id', userId)
            .eq('status', 'active');

        if (loansErr) throw new Error('Loans fetch: ' + loansErr.message);

        const activeLoan = loans?.[0] || null;
        updateStatCards(activeLoan);

        // ── Recent applications (activity) ──
        const { data: apps, error: appsErr } = await client
            .from('applications')
            .select('*')
            .eq('customer_id', userId)
            .order('created_at', { ascending: false })
            .limit(4);

        if (appsErr) throw new Error('Applications fetch: ' + appsErr.message);
        renderActivity(apps);

        // ── Loan history for chart ──
        const { data: history, error: histErr } = await client
            .from('loans')
            .select('amount, created_at')
            .eq('customer_id', userId)
            .order('created_at', { ascending: true });

        if (histErr) throw new Error('History fetch: ' + histErr.message);
        if (history?.length) updateChart(history);

    } catch (err) {
        console.error('Data load error:', err);
        showToast('Could not load dashboard data', 'warning');
    }
}

// ─── UPDATE STAT CARDS ──────────────────────────────────────
function updateStatCards(activeLoan) {
    const el = (id) => document.getElementById(id);

    if (activeLoan) {
        el('activeLoan').textContent = `KES ${activeLoan.amount?.toLocaleString() || '0.00'}`;
        el('loanStatus').textContent = 'Active Loan';
        el('loanStatus').style.color = '#059669';

        const balance = activeLoan.amount - (activeLoan.paid_amount || 0);
        el('balance').textContent = `KES ${balance.toLocaleString()}`;

        if (activeLoan.due_date) {
            const due = new Date(activeLoan.due_date);
            el('nextPayment').textContent = due.toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    } else {
        el('activeLoan').textContent = 'KES 0.00';
        el('loanStatus').textContent = 'No Active Loan';
        el('loanStatus').style.color = '#6b7280';
        el('balance').textContent = 'KES 0.00';
        el('nextPayment').textContent = '--';
    }
}

// ─── RENDER ACTIVITY FEED ──────────────────────────────────
function renderActivity(applications) {
    const container = document.querySelector('.activity-list');
    if (!container) return;

    if (!applications?.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:20px;color:var(--text-secondary);">
                <i class="fa-solid fa-inbox" style="font-size:24px;margin-bottom:8px;display:block;"></i>
                No activity yet
            </div>
        `;
        return;
    }

    container.innerHTML = applications.map(app => {
        const statusMap = {
            approved: { icon: 'fa-circle-check', cls: 'status', title: 'Application Approved', desc: 'Your loan was approved' },
            pending:  { icon: 'fa-hand-holding-dollar', cls: 'loan', title: 'Application Submitted', desc: 'You applied for a loan' },
            rejected: { icon: 'fa-times-circle', cls: 'alert', title: 'Application Rejected', desc: 'Application was rejected' }
        };
        const st = statusMap[app.status] || statusMap.pending;
        return `
            <div class="activity-item">
                <div class="activity-icon ${st.cls}">
                    <i class="fa-solid ${st.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${st.title}</div>
                    <div class="activity-desc">${st.desc}</div>
                </div>
                <div class="activity-time">${app.created_at ? timeAgo(app.created_at) : 'Recently'}</div>
            </div>
        `;
    }).join('');
}

// ─── CHART ──────────────────────────────────────────────────
function updateChart(loanData) {
    const bars = document.querySelectorAll('.chart-bar');
    if (!bars.length) return;

    // Group by month
    const monthly = {};
    loanData.forEach(loan => {
        const m = new Date(loan.created_at).toLocaleString('default', { month: 'short' });
        monthly[m] = (monthly[m] || 0) + (loan.amount || 0);
    });

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const currentMonth = new Date().getMonth();
    const maxVal = Math.max(...Object.values(monthly), 1);

    bars.forEach((bar, idx) => {
        const monthName = months[(currentMonth - 11 + idx + 12) % 12];
        const val = monthly[monthName] || 0;
        const height = maxVal > 0 ? (val / maxVal) * 90 : 5;

        bar.style.height = `${Math.max(height, 5)}%`;
        const label = bar.querySelector('.bar-label');
        if (label) label.textContent = monthName;
        const valueEl = bar.querySelector('.bar-value');
        if (valueEl) valueEl.textContent = val > 0 ? `KES ${val.toLocaleString()}` : 'KES 0';
    });
}

// ─── NOTIFICATION SYSTEM ──────────────────────────────────
function initNotificationSystem() {
    const btn = document.getElementById('notificationBtn');
    const dropdown = document.getElementById('notificationDropdown');
    const badge = document.getElementById('notificationBadge');
    const markAll = document.getElementById('markAllRead');

    // Toggle dropdown
    btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown?.contains(e.target) && !btn?.contains(e.target)) {
            dropdown?.classList.remove('open');
        }
    });

    // Mark all read
    markAll?.addEventListener('click', () => {
        document.querySelectorAll('.notification-item.unread').forEach(el => el.classList.remove('unread'));
        updateBadge();
    });

    // Click on an item marks it read
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', function() {
            this.classList.remove('unread');
            updateBadge();
        });
    });

    // Update badge
    function updateBadge() {
        const unread = document.querySelectorAll('.notification-item.unread').length;
        if (unread > 0) {
            badge.textContent = unread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Expose a function to add new notifications dynamically
    window.addNotification = function(title, desc, time, type = 'info') {
        const list = document.getElementById('notificationList');
        if (!list) return;

        const icons = {
            loan: 'fa-hand-holding-dollar',
            payment: 'fa-money-bill-transfer',
            status: 'fa-circle-check',
            alert: 'fa-bell',
            info: 'fa-info-circle'
        };

        const item = document.createElement('div');
        item.className = 'notification-item unread';
        item.innerHTML = `
            <div class="notif-icon ${type}">
                <i class="fa-solid ${icons[type] || icons.info}"></i>
            </div>
            <div class="notif-content">
                <p class="notif-text"><strong>${title}</strong> ${desc}</p>
                <span class="notif-time">${time || 'Just now'}</span>
            </div>
            <span class="notif-dot"></span>
        `;
        item.addEventListener('click', function() {
            this.classList.remove('unread');
            updateBadge();
        });
        list.prepend(item);
        updateBadge();
    };

    // Initial badge update
    updateBadge();
}

// ─── SIDEBAR TOGGLE (Mobile) ──────────────────────────────
function initSidebarToggle() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (!toggle || !sidebar || !overlay) return;

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    }

    toggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) toggleSidebar();
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ─── CHART SELECTOR (demo) ──────────────────────────────────
function initChartSelector() {
    const select = document.querySelector('.chart-select');
    if (!select) return;

    select.addEventListener('change', function() {
        // Simulate new data (demo)
        const bars = document.querySelectorAll('.chart-bar');
        bars.forEach(bar => {
            const h = 20 + Math.random() * 70;
            bar.style.height = `${h}%`;
            const valEl = bar.querySelector('.bar-value');
            if (valEl) {
                const val = Math.round(h * 100);
                valEl.textContent = `KES ${val.toLocaleString()}`;
            }
        });
        showToast('Chart updated (demo)', 'info');
    });
}

// ─── TOAST NOTIFICATION (helper) ──────────────────────────
function showToast(msg, type = 'info') {
    const existing = document.querySelector('.toast-container');
    if (!existing) {
        const container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; z-index: 9999;
            display: flex; flex-direction: column; gap: 8px;
        `;
        document.body.appendChild(container);
    }
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const colors = {
        info: '#3b82f6',
        success: '#059669',
        warning: '#d97706',
        error: '#dc2626'
    };
    toast.style.cssText = `
        padding: 12px 20px; border-radius: 10px; background: rgba(20,22,36,0.95);
        backdrop-filter: blur(12px); border: 1px solid ${colors[type] || colors.info}44;
        color: #fff; font-size: 14px; font-weight: 500;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        animation: slideUp 0.3s ease;
        border-left: 4px solid ${colors[type] || colors.info};
    `;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── TIME AGO ───────────────────────────────────────────────
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const intervals = {
        year: 31536000, month: 2592000, week: 604800,
        day: 86400, hour: 3600, minute: 60
    };
    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

// ─── INJECT TOAST ANIMATION ──────────────────────────────
(function injectToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
    `;
    document.head.appendChild(style);
})();

// ─── EXPOSE FOR OTHER SCRIPTS ──────────────────────────────
window.showToast = showToast;
window.timeAgo = timeAgo;
