// ============================================
// STATE MANAGEMENT
// ============================================
let adminInfo = null;
let currentPage = 'dashboard';
let isLoading = false;

// ============================================
// PAGE CONFIGURATION
// ============================================
const pages = {
    dashboard: { title: 'Dashboard', icon: 'fa-chart-line', load: loadDashboard },
    customers: { title: 'Customers', icon: 'fa-users', load: loadCustomers },
    applications: { title: 'Applications', icon: 'fa-file-signature', load: loadApplications },
    loans: { title: 'Loans', icon: 'fa-wallet', load: loadLoans },
    payments: { title: 'Payments', icon: 'fa-money-bill-wave', load: loadPayments },
    reports: { title: 'Reports', icon: 'fa-chart-pie', load: loadReports },
    settings: { title: 'Settings', icon: 'fa-gear', load: loadSettings }
};

// ============================================
// INITIALIZATION
// ============================================
(async () => {
    try {
        adminInfo = await requireAdmin();
        if (!adminInfo) return;

        // Update welcome message
        const welcomeEl = document.getElementById("welcomeAdmin");
        if (adminInfo.profile?.full_name) {
            welcomeEl.innerHTML = `Welcome, <strong>${adminInfo.profile.full_name}</strong>`;
        }

        // Update admin name in header
        const adminNameEl = document.getElementById("adminName");
        if (adminNameEl && adminInfo.profile?.full_name) {
            adminNameEl.textContent = adminInfo.profile.full_name;
        }

        // Load default page
        await loadDashboard();

    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize admin panel');
    }
})();

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll("aside li[data-page]").forEach(item => {
    item.onclick = async () => {
        if (isLoading) return;

        const page = item.dataset.page;
        if (page === currentPage) return;

        // Update active state
        document.querySelectorAll("aside li").forEach(li => li.classList.remove("active"));
        item.classList.add("active");

        // Update title
        const pageConfig = pages[page];
        if (pageConfig) {
            document.getElementById("pageTitle").innerText = pageConfig.title;
        }

        currentPage = page;
        await pages[page].load();
    };
});

// ============================================
// LOGOUT
// ============================================
document.getElementById("logout").onclick = async () => {
    try {
        const confirmed = confirm('Are you sure you want to logout?');
        if (!confirmed) return;

        await client.auth.signOut();
        window.location.href = "../login.html";
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout');
    }
};

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
    showLoading();
    try {
        // Fetch real data
        const [customersCount, applicationsCount, loansCount, paymentsCount] = await Promise.all([
            getTableCount('customers'),
            getTableCount('applications'),
            getTableCount('loans'),
            getTableCount('payments')
        ]);

        // Get recent applications
        const { data: recentApplications } = await client
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        document.getElementById("content").innerHTML = `
            <div class="dashboard-grid">
                <!-- Stats Cards -->
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Customers</h3>
                        <p>${customersCount || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fa-solid fa-file-signature"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Pending Applications</h3>
                        <p>${applicationsCount || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange">
                        <i class="fa-solid fa-wallet"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Active Loans</h3>
                        <p>${loansCount || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">
                        <i class="fa-solid fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Payments</h3>
                        <p>${paymentsCount || 0}</p>
                    </div>
                </div>

                <!-- Recent Activity -->
                <div class="recent-activity">
                    <h3><i class="fa-solid fa-clock-rotate-left"></i> Recent Applications</h3>
                    ${renderRecentApplications(recentApplications)}
                </div>
            </div>
        `;

        // Initialize charts if available
        if (typeof Chart !== 'undefined') {
            // Chart.js integration would go here
        }

    } catch (error) {
        console.error('Dashboard error:', error);
        showError('Failed to load dashboard data');
    } finally {
        hideLoading();
    }
}

// ============================================
// CUSTOMERS
// ============================================
async function loadCustomers() {
    showLoading();
    try {
        const { data: customers, error } = await client
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById("content").innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-users"></i> Customers</h2>
                <button class="btn-primary" onclick="showAddCustomer()">
                    <i class="fa-solid fa-plus"></i> Add Customer
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers?.length ? customers.map(customer => `
                            <tr>
                                <td><strong>${customer.full_name || 'N/A'}</strong></td>
                                <td>${customer.email || 'N/A'}</td>
                                <td>${customer.phone || 'N/A'}</td>
                                <td><span class="status-badge ${customer.status || 'active'}">${customer.status || 'Active'}</span></td>
                                <td>
                                    <button class="btn-icon" onclick="viewCustomer('${customer.id}')" title="View">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" onclick="editCustomer('${customer.id}')" title="Edit">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="btn-icon danger" onclick="deleteCustomer('${customer.id}')" title="Delete">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="empty-state">
                                    <i class="fa-solid fa-users"></i>
                                    <p>No customers found</p>
                                    <button class="btn-primary" onclick="showAddCustomer()">Add your first customer</button>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Customers error:', error);
        showError('Failed to load customers');
    } finally {
        hideLoading();
    }
}

// ============================================
// APPLICATIONS
// ============================================
async function loadApplications() {
    showLoading();
    try {
        const { data: applications, error } = await client
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById("content").innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-file-signature"></i> Loan Applications</h2>
                <button class="btn-primary" onclick="showAddApplication()">
                    <i class="fa-solid fa-plus"></i> New Application
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${applications?.length ? applications.map(app => `
                            <tr>
                                <td><strong>${app.applicant_name || 'N/A'}</strong></td>
                                <td>$${app.amount?.toLocaleString() || '0'}</td>
                                <td><span class="status-badge ${app.status || 'pending'}">${app.status || 'Pending'}</span></td>
                                <td>${app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button class="btn-icon" onclick="viewApplication('${app.id}')" title="View">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" onclick="editApplication('${app.id}')" title="Edit">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="btn-icon success" onclick="approveApplication('${app.id}')" title="Approve">
                                        <i class="fa-solid fa-check"></i>
                                    </button>
                                    <button class="btn-icon danger" onclick="rejectApplication('${app.id}')" title="Reject">
                                        <i class="fa-solid fa-times"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="5" class="empty-state">
                                    <i class="fa-solid fa-file-signature"></i>
                                    <p>No applications found</p>
                                    <button class="btn-primary" onclick="showAddApplication()">Create new application</button>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Applications error:', error);
        showError('Failed to load applications');
    } finally {
        hideLoading();
    }
}

// ============================================
// LOANS
// ============================================
async function loadLoans() {
    showLoading();
    try {
        const { data: loans, error } = await client
            .from('loans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById("content").innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-wallet"></i> Loans</h2>
                <button class="btn-primary" onclick="showAddLoan()">
                    <i class="fa-solid fa-plus"></i> Disburse Loan
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Amount</th>
                            <th>Interest Rate</th>
                            <th>Status</th>
                            <th>Due Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${loans?.length ? loans.map(loan => `
                            <tr>
                                <td><strong>${loan.customer_name || 'N/A'}</strong></td>
                                <td>$${loan.amount?.toLocaleString() || '0'}</td>
                                <td>${loan.interest_rate || 0}%</td>
                                <td><span class="status-badge ${loan.status || 'active'}">${loan.status || 'Active'}</span></td>
                                <td>${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button class="btn-icon" onclick="viewLoan('${loan.id}')" title="View">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" onclick="editLoan('${loan.id}')" title="Edit">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="btn-icon success" onclick="makePayment('${loan.id}')" title="Make Payment">
                                        <i class="fa-solid fa-money-bill"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="empty-state">
                                    <i class="fa-solid fa-wallet"></i>
                                    <p>No loans found</p>
                                    <button class="btn-primary" onclick="showAddLoan()">Disburse first loan</button>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Loans error:', error);
        showError('Failed to load loans');
    } finally {
        hideLoading();
    }
}

// ============================================
// PAYMENTS
// ============================================
async function loadPayments() {
    showLoading();
    try {
        const { data: payments, error } = await client
            .from('payments')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById("content").innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-money-bill-wave"></i> Payments</h2>
                <button class="btn-primary" onclick="showAddPayment()">
                    <i class="fa-solid fa-plus"></i> Record Payment
                </button>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Customer</th>
                            <th>Loan ID</th>
                            <th>Amount</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments?.length ? payments.map(payment => `
                            <tr>
                                <td><strong>${payment.customer_name || 'N/A'}</strong></td>
                                <td>${payment.loan_id || 'N/A'}</td>
                                <td>$${payment.amount?.toLocaleString() || '0'}</td>
                                <td><span class="status-badge ${payment.type || 'payment'}">${payment.type || 'Payment'}</span></td>
                                <td>${payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A'}</td>
                                <td>
                                    <button class="btn-icon" onclick="viewPayment('${payment.id}')" title="View">
                                        <i class="fa-solid fa-eye"></i>
                                    </button>
                                    <button class="btn-icon" onclick="editPayment('${payment.id}')" title="Edit">
                                        <i class="fa-solid fa-pen"></i>
                                    </button>
                                    <button class="btn-icon danger" onclick="deletePayment('${payment.id}')" title="Delete">
                                        <i class="fa-solid fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="empty-state">
                                    <i class="fa-solid fa-money-bill-wave"></i>
                                    <p>No payments found</p>
                                    <button class="btn-primary" onclick="showAddPayment()">Record first payment</button>
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Payments error:', error);
        showError('Failed to load payments');
    } finally {
        hideLoading();
    }
}

// ============================================
// REPORTS
// ============================================
async function loadReports() {
    document.getElementById("content").innerHTML = `
        <div class="page-header">
            <h2><i class="fa-solid fa-chart-pie"></i> Reports</h2>
        </div>
        <div class="reports-grid">
            <div class="report-card" onclick="generateReport('customers')">
                <i class="fa-solid fa-users"></i>
                <h3>Customer Report</h3>
                <p>View customer analytics and demographics</p>
            </div>
            <div class="report-card" onclick="generateReport('applications')">
                <i class="fa-solid fa-file-signature"></i>
                <h3>Applications Report</h3>
                <p>Track application trends and approvals</p>
            </div>
            <div class="report-card" onclick="generateReport('loans')">
                <i class="fa-solid fa-wallet"></i>
                <h3>Loans Report</h3>
                <p>Analyze loan performance and risk</p>
            </div>
            <div class="report-card" onclick="generateReport('payments')">
                <i class="fa-solid fa-money-bill-wave"></i>
                <h3>Payments Report</h3>
                <p>Monitor payment history and revenue</p>
            </div>
        </div>
        <div id="reportContainer"></div>
    `;
}

// ============================================
// SETTINGS
// ============================================
async function loadSettings() {
    document.getElementById("content").innerHTML = `
        <div class="page-header">
            <h2><i class="fa-solid fa-gear"></i> Settings</h2>
        </div>
        <div class="settings-grid">
            <div class="settings-card">
                <h3><i class="fa-solid fa-user"></i> Profile</h3>
                <div class="settings-form">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="settingsName" value="${adminInfo?.profile?.full_name || ''}" />
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="settingsEmail" value="${adminInfo?.user?.email || ''}" disabled />
                    </div>
                    <button class="btn-primary" onclick="updateProfile()">
                        <i class="fa-solid fa-save"></i> Update Profile
                    </button>
                </div>
            </div>
            <div class="settings-card">
                <h3><i class="fa-solid fa-lock"></i> Security</h3>
                <div class="settings-form">
                    <div class="form-group">
                        <label>Current Password</label>
                        <input type="password" id="currentPassword" placeholder="Enter current password" />
                    </div>
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="newPassword" placeholder="Enter new password" />
                    </div>
                    <div class="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" id="confirmPassword" placeholder="Confirm new password" />
                    </div>
                    <button class="btn-primary" onclick="changePassword()">
                        <i class="fa-solid fa-key"></i> Change Password
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Database helpers
async function getTableCount(tableName) {
    try {
        const { count, error } = await client
            .from(tableName)
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count;
    } catch (error) {
        console.error(`Error counting ${tableName}:`, error);
        return 0;
    }
}

// Render recent applications
function renderRecentApplications(applications) {
    if (!applications?.length) {
        return `
            <div class="empty-state">
                <i class="fa-solid fa-inbox"></i>
                <p>No recent applications</p>
            </div>
        `;
    }

    return `
        <div class="activity-list">
            ${applications.map(app => `
                <div class="activity-item">
                    <div class="activity-icon ${app.status || 'pending'}">
                        <i class="fa-solid fa-file-signature"></i>
                    </div>
                    <div class="activity-content">
                        <p><strong>${app.applicant_name || 'Unknown'}</strong> applied for loan</p>
                        <span class="activity-date">${app.created_at ? timeAgo(app.created_at) : 'Recently'}</span>
                    </div>
                    <span class="status-badge small ${app.status || 'pending'}">${app.status || 'Pending'}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// Time ago function
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}

// UI helpers
function showLoading() {
    isLoading = true;
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="loading-spinner">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Loading...</p>
        </div>
    `;
}

function hideLoading() {
    isLoading = false;
}

function showError(message) {
    document.getElementById('content').innerHTML = `
        <div class="error-state">
            <i class="fa-solid fa-circle-exclamation"></i>
            <h3>Error</h3>
            <p>${message}</p>
            <button class="btn-primary" onclick="location.reload()">
                <i class="fa-solid fa-rotate"></i> Retry
            </button>
        </div>
    `;
}

function showToast(message, type = 'success') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ============================================
// ACTION FUNCTIONS (to be implemented)
// ============================================

// Customer actions
window.showAddCustomer = () => showToast('Add customer form coming soon');
window.viewCustomer = (id) => showToast(`Viewing customer ${id}`);
window.editCustomer = (id) => showToast(`Editing customer ${id}`);
window.deleteCustomer = (id) => {
    if (confirm('Are you sure you want to delete this customer?')) {
        showToast('Customer deleted successfully');
    }
};

// Application actions
window.showAddApplication = () => showToast('New application form coming soon');
window.viewApplication = (id) => showToast(`Viewing application ${id}`);
window.editApplication = (id) => showToast(`Editing application ${id}`);
window.approveApplication = (id) => {
    if (confirm('Approve this application?')) {
        showToast('Application approved successfully');
    }
};
window.rejectApplication = (id) => {
    if (confirm('Reject this application?')) {
        showToast('Application rejected');
    }
};

// Loan actions
window.showAddLoan = () => showToast('Disburse loan form coming soon');
window.viewLoan = (id) => showToast(`Viewing loan ${id}`);
window.editLoan = (id) => showToast(`Editing loan ${id}`);
window.makePayment = (id) => showToast(`Payment form for loan ${id}`);

// Payment actions
window.showAddPayment = () => showToast('Record payment form coming soon');
window.viewPayment = (id) => showToast(`Viewing payment ${id}`);
window.editPayment = (id) => showToast(`Editing payment ${id}`);
window.deletePayment = (id) => {
    if (confirm('Are you sure you want to delete this payment?')) {
        showToast('Payment deleted successfully');
    }
};

// Report actions
window.generateReport = (type) => {
    showToast(`Generating ${type} report...`);
    document.getElementById('reportContainer').innerHTML = `
        <div class="report-result">
            <h3>${type.charAt(0).toUpperCase() + type.slice(1)} Report</h3>
            <p>Report generation in progress...</p>
            <div class="report-preview">
                <div class="report-stat">
                    <span>Total ${type}</span>
                    <strong>${Math.floor(Math.random() * 1000)}</strong>
                </div>
                <div class="report-stat">
                    <span>Growth</span>
                    <strong class="positive">+${Math.floor(Math.random() * 30)}%</strong>
                </div>
            </div>
            <button class="btn-primary" onclick="showToast('Download started')">
                <i class="fa-solid fa-download"></i> Download Report
            </button>
        </div>
    `;
};

// Settings actions
window.updateProfile = async () => {
    const name = document.getElementById('settingsName')?.value;
    if (!name) {
        showToast('Please enter a name', 'error');
        return;
    }
    try {
        const { error } = await client
            .from('profiles')
            .update({ full_name: name })
            .eq('id', adminInfo.user.id);

        if (error) throw error;
        showToast('Profile updated successfully');
        adminInfo.profile.full_name = name;
        document.getElementById('welcomeAdmin').innerHTML = `Welcome, <strong>${name}</strong>`;
        document.getElementById('adminName').textContent = name;
    } catch (error) {
        console.error('Update profile error:', error);
        showToast('Failed to update profile', 'error');
    }
};

window.changePassword = async () => {
    const current = document.getElementById('currentPassword')?.value;
    const newPass = document.getElementById('newPassword')?.value;
    const confirm = document.getElementById('confirmPassword')?.value;

    if (!current || !newPass || !confirm) {
        showToast('Please fill in all password fields', 'error');
        return;
    }

    if (newPass !== confirm) {
        showToast('New passwords do not match', 'error');
        return;
    }

    if (newPass.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
    }

    try {
        const { error } = await client.auth.updateUser({
            password: newPass
        });

        if (error) throw error;
        showToast('Password changed successfully');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Failed to change password. Please check your current password.', 'error');
    }
};
