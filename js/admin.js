// ============================================
// STATE MANAGEMENT
// ============================================
let adminInfo = null;
let currentPage = 'dashboard';
let isLoading = false;
let customersData = [];
let applicationsData = [];
let loansData = [];
let paymentsData = [];

// Supabase Storage base URL (adjust if different)
const STORAGE_BASE_URL = 'https://buyrcwepcwoipbgcydqg.supabase.co/storage/v1/object/public/profiles/';

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

        const welcomeEl = document.getElementById('welcomeAdmin');
        if (adminInfo.profile?.full_name) {
            welcomeEl.innerHTML = `Welcome, <strong>${adminInfo.profile.full_name}</strong>`;
        }

        const adminNameEl = document.getElementById('adminName');
        if (adminNameEl && adminInfo.profile?.full_name) {
            adminNameEl.textContent = adminInfo.profile.full_name;
        }

        await loadDashboard();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize admin panel');
    }
})();

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('aside li[data-page]').forEach(item => {
    item.onclick = async () => {
        if (isLoading) return;
        const page = item.dataset.page;
        if (page === currentPage) return;

        document.querySelectorAll('aside li').forEach(li => li.classList.remove('active'));
        item.classList.add('active');

        const pageConfig = pages[page];
        if (pageConfig) {
            document.getElementById('pageTitle').innerText = pageConfig.title;
        }

        currentPage = page;
        await pages[page].load();
    };
});

// ============================================
// LOGOUT
// ============================================
document.getElementById('logout').onclick = async () => {
    try {
        if (!confirm('Are you sure you want to logout?')) return;
        await client.auth.signOut();
        window.location.href = '../login.html';
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
        const [customersCount, applicationsCount, loansCount, paymentsCount] = await Promise.all([
            getTableCount('profiles'),
            getTableCount('applications'),
            getTableCount('loans'),
            getTableCount('payments')
        ]);

        let recentApplications = [];
        try {
            const { data } = await client
                .from('applications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            recentApplications = data || [];
        } catch (error) { /* ignore */ }

        let recentCustomers = [];
        try {
            const { data } = await client
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            recentCustomers = data || [];
        } catch (error) { /* ignore */ }

        let totalLoanAmount = 0;
        try {
            const { data } = await client
                .from('loans')
                .select('amount')
                .eq('status', 'active');
            if (data) {
                totalLoanAmount = data.reduce((sum, loan) => sum + (loan.amount || 0), 0);
            }
        } catch (error) { /* ignore */ }

        document.getElementById('content').innerHTML = `
            <div class="dashboard-grid">
                <div class="stat-card">
                    <div class="stat-icon blue">
                        <i class="fa-solid fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Users</h3>
                        <p>${customersCount || 0}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">
                        <i class="fa-solid fa-file-signature"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Applications</h3>
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
                        <h3>Payments</h3>
                        <p>${paymentsCount || 0}</p>
                    </div>
                </div>
            </div>
            <div class="dashboard-grid-two">
                <div class="recent-activity">
                    <h3><i class="fa-solid fa-clock-rotate-left"></i> Recent Applications</h3>
                    ${renderRecentApplications(recentApplications)}
                </div>
                <div class="recent-activity">
                    <h3><i class="fa-solid fa-user-plus"></i> Recent Users</h3>
                    ${renderRecentCustomers(recentCustomers)}
                </div>
            </div>
            ${loansCount > 0 ? `
                <div class="quick-stats">
                    <div class="quick-stat">
                        <span>Total Loan Amount</span>
                        <strong>KES ${totalLoanAmount.toLocaleString()}</strong>
                    </div>
                    <div class="quick-stat">
                        <span>Average Loan</span>
                        <strong>KES ${loansCount > 0 ? (totalLoanAmount / loansCount).toFixed(2) : '0.00'}</strong>
                    </div>
                </div>
            ` : ''}
        `;
    } catch (error) {
        console.error('Dashboard error:', error);
        showError('Failed to load dashboard data');
    } finally {
        hideLoading();
    }
}

// ============================================
// CUSTOMERS – with Document View
// ============================================
async function loadCustomers() {
    showLoading();
    try {
        const { data: customers, error } = await client
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        customersData = customers || [];

        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-users"></i> All Users</h2>
                <div class="page-actions">
                    <button class="btn-primary" onclick="showAddCustomer()">
                        <i class="fa-solid fa-plus"></i> Add User
                    </button>
                    <button class="btn-secondary" onclick="refreshCustomers()">
                        <i class="fa-solid fa-rotate"></i> Refresh
                    </button>
                </div>
            </div>
            <div class="table-container">
                <div class="table-toolbar">
                    <div class="search-box">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="customerSearch" placeholder="Search users..." onkeyup="searchCustomers()" />
                    </div>
                    <div class="table-stats">
                        <span>Total: <strong>${customersData.length}</strong> users</span>
                    </div>
                </div>
                ${customersData?.length ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Avatar</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>National ID</th>
                                <th>Role</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="customersTableBody">
                            ${customersData.map(customer => `
                                <tr>
                                    <td>
                                        <div class="customer-avatar" onclick="viewCustomerDocuments('${customer.id}')" title="View Documents">
                                            ${customer.avatar_url ? 
                                                `<img src="${customer.avatar_url}" alt="Avatar" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer;" />` :
                                                `<div class="avatar-placeholder" style="width:40px;height:40px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;">${customer.full_name?.charAt(0) || 'U'}</div>`
                                            }
                                        </div>
                                    </td>
                                    <td><strong>${customer.full_name || 'N/A'}</strong></td>
                                    <td>${customer.email || 'N/A'}</td>
                                    <td>${customer.phone || 'N/A'}</td>
                                    <td>${customer.national_id || 'N/A'}</td>
                                    <td><span class="status-badge ${customer.role || 'customer'}">${customer.role || 'customer'}</span></td>
                                    <td>${customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        <button class="btn-icon" onclick="viewCustomer('${customer.id}')" title="View">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                        <button class="btn-icon" onclick="editCustomer('${customer.id}')" title="Edit">
                                            <i class="fa-solid fa-pen"></i>
                                        </button>
                                        <button class="btn-icon" onclick="viewCustomerDocuments('${customer.id}')" title="Documents">
                                            <i class="fa-solid fa-file"></i>
                                        </button>
                                        ${customer.role !== 'admin' ? `
                                            <button class="btn-icon danger" onclick="deleteCustomer('${customer.id}')" title="Delete">
                                                <i class="fa-solid fa-trash"></i>
                                            </button>
                                        ` : `
                                            <button class="btn-icon disabled" title="Cannot delete admin">
                                                <i class="fa-solid fa-lock"></i>
                                            </button>
                                        `}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fa-solid fa-users"></i>
                        <p>No users found</p>
                        <button class="btn-primary" onclick="showAddCustomer()">Add your first user</button>
                    </div>
                `}
            </div>
        `;
    } catch (error) {
        console.error('Customers error:', error);
        showError('Failed to load customers: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============================================
// VIEW CUSTOMER DOCUMENTS
// ============================================
async function viewCustomerDocuments(customerId) {
    try {
        const { data: customer, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', customerId)
            .single();

        if (error) throw error;

        const userId = customerId;
        const documents = {
            avatar: customer.avatar_url || null,
            id: null,
            passport: null,
            signature: null
        };

        // Check for ID document
        try {
            const { data: idFiles } = await client.storage
                .from('profiles')
                .list(`ids/${userId}/`);
            if (idFiles && idFiles.length > 0) {
                documents.id = `${STORAGE_BASE_URL}ids/${userId}/${idFiles[0].name}`;
            }
        } catch (e) { /* ignore */ }

        // Check for Passport
        try {
            const { data: passportFiles } = await client.storage
                .from('profiles')
                .list(`passports/${userId}/`);
            if (passportFiles && passportFiles.length > 0) {
                documents.passport = `${STORAGE_BASE_URL}passports/${userId}/${passportFiles[0].name}`;
            }
        } catch (e) { /* ignore */ }

        // Check for Signature
        try {
            const { data: signatureFiles } = await client.storage
                .from('profiles')
                .list(`signatures/${userId}/`);
            if (signatureFiles && signatureFiles.length > 0) {
                documents.signature = `${STORAGE_BASE_URL}signatures/${userId}/${signatureFiles[0].name}`;
            }
        } catch (e) { /* ignore */ }

        let html = `
            <div style="padding:20px;">
                <h3 style="margin-bottom:16px;">${customer.full_name}'s Documents</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
        `;

        // Avatar
        html += `
            <div class="doc-card">
                <h4>Profile Photo</h4>
                ${documents.avatar ? 
                    `<img src="${documents.avatar}" alt="Avatar" style="width:120px;height:120px;border-radius:50%;object-fit:cover;margin:8px auto;display:block;" />` :
                    `<div style="width:120px;height:120px;border-radius:50%;background:var(--bg-card);margin:8px auto;display:flex;align-items:center;justify-content:center;color:var(--text-muted);">No photo</div>`
                }
                ${documents.avatar ? `<button class="btn-secondary" onclick="window.open('${documents.avatar}','_blank')">View</button>` : ''}
            </div>
        `;

        // ID
        html += `
            <div class="doc-card">
                <h4>National ID</h4>
                ${documents.id ? 
                    `<img src="${documents.id}" alt="ID" style="max-width:100%;max-height:150px;object-fit:contain;margin:8px auto;display:block;border-radius:8px;" />` :
                    `<div style="padding:20px;color:var(--text-muted);">Not uploaded</div>`
                }
                ${documents.id ? `<button class="btn-secondary" onclick="window.open('${documents.id}','_blank')">View</button>` : ''}
            </div>
        `;

        // Passport
        html += `
            <div class="doc-card">
                <h4>Passport Photo</h4>
                ${documents.passport ? 
                    `<img src="${documents.passport}" alt="Passport" style="max-width:100%;max-height:150px;object-fit:contain;margin:8px auto;display:block;border-radius:8px;" />` :
                    `<div style="padding:20px;color:var(--text-muted);">Not uploaded</div>`
                }
                ${documents.passport ? `<button class="btn-secondary" onclick="window.open('${documents.passport}','_blank')">View</button>` : ''}
            </div>
        `;

        // Signature
        html += `
            <div class="doc-card">
                <h4>Signature</h4>
                ${documents.signature ? 
                    `<img src="${documents.signature}" alt="Signature" style="max-width:100%;max-height:100px;object-fit:contain;margin:8px auto;display:block;border-radius:8px;" />` :
                    `<div style="padding:20px;color:var(--text-muted);">Not uploaded</div>`
                }
                ${documents.signature ? `<button class="btn-secondary" onclick="window.open('${documents.signature}','_blank')">View</button>` : ''}
            </div>
        `;

        html += `
                </div>
                <div style="margin-top:20px;text-align:center;">
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;

        showModal(html);
    } catch (error) {
        console.error('View documents error:', error);
        showToast('Failed to load documents', 'error');
    }
}

// ============================================
// MODAL HELPERS
// ============================================
function showModal(html) {
    const existing = document.querySelector('.admin-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.style.cssText = `
        position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);
        display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;
        animation:fadeIn 0.3s ease;
    `;
    overlay.innerHTML = `
        <div style="background:var(--bg-card);border-radius:16px;max-width:800px;width:100%;max-height:90vh;overflow-y:auto;padding:0;border:1px solid var(--border-color);">
            ${html}
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
    });
}

function closeModal() {
    const overlay = document.querySelector('.admin-modal-overlay');
    if (overlay) overlay.remove();
}

// ============================================
// CUSTOMER DETAILS (with Documents button)
// ============================================
window.viewCustomer = async (id) => {
    try {
        const { data: customer, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-user"></i> User Details</h2>
                <button class="btn-secondary" onclick="loadCustomers()">
                    <i class="fa-solid fa-arrow-left"></i> Back to Users
                </button>
            </div>
            <div class="customer-details">
                <div class="detail-card">
                    <div class="detail-header">
                        <div class="detail-avatar">
                            ${customer.avatar_url ? 
                                `<img src="${customer.avatar_url}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;" />` :
                                `<i class="fa-solid fa-user-circle"></i>`
                            }
                        </div>
                        <div>
                            <h3>${customer.full_name}</h3>
                            <p class="detail-role"><span class="status-badge ${customer.role}">${customer.role}</span></p>
                            <button class="btn-secondary" onclick="viewCustomerDocuments('${customer.id}')" style="margin-top:8px;">
                                <i class="fa-solid fa-file"></i> View Documents
                            </button>
                        </div>
                    </div>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Email</label>
                            <p>${customer.email || 'N/A'}</p>
                        </div>
                        <div class="detail-item">
                            <label>Phone</label>
                            <p>${customer.phone || 'N/A'}</p>
                        </div>
                        <div class="detail-item">
                            <label>National ID</label>
                            <p>${customer.national_id || 'N/A'}</p>
                        </div>
                        <div class="detail-item">
                            <label>Role</label>
                            <p><span class="status-badge ${customer.role}">${customer.role}</span></p>
                        </div>
                        <div class="detail-item">
                            <label>Joined</label>
                            <p>${customer.created_at ? new Date(customer.created_at).toLocaleString() : 'N/A'}</p>
                        </div>
                    </div>
                    <div class="detail-actions">
                        <button class="btn-primary" onclick="editCustomer('${customer.id}')">
                            <i class="fa-solid fa-pen"></i> Edit
                        </button>
                        ${customer.role !== 'admin' ? `
                            <button class="btn-danger" onclick="deleteCustomer('${customer.id}')">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('View customer error:', error);
        showToast('Failed to load user details', 'error');
    }
};

// ============================================
// APPLICATIONS – with Disburse
// ============================================
async function loadApplications() {
    showLoading();
    try {
        const { data: applications, error } = await client
            .from('applications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') {
                showError('The "applications" table does not exist. Please create it first.');
                return;
            }
            throw error;
        }

        applicationsData = applications || [];

        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-file-signature"></i> Loan Applications</h2>
                <div class="page-actions">
                    <button class="btn-primary" onclick="showAddApplication()">
                        <i class="fa-solid fa-plus"></i> New Application
                    </button>
                    <button class="btn-secondary" onclick="refreshApplications()">
                        <i class="fa-solid fa-rotate"></i> Refresh
                    </button>
                </div>
            </div>
            <div class="table-container">
                <div class="table-toolbar">
                    <div class="search-box">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="applicationSearch" placeholder="Search applications..." onkeyup="searchApplications()" />
                    </div>
                    <div class="table-stats">
                        <span>Total: <strong>${applicationsData.length}</strong> applications</span>
                    </div>
                </div>
                ${applicationsData?.length ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Amount</th>
                                <th>Term</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="applicationsTableBody">
                            ${applicationsData.map(app => `
                                <tr>
                                    <td><strong>${app.applicant_name || 'N/A'}</strong></td>
                                    <td>KES ${app.amount?.toLocaleString() || '0'}</td>
                                    <td>${app.term_months || 0} months</td>
                                    <td><span class="status-badge ${app.status || 'pending'}">${app.status || 'Pending'}</span></td>
                                    <td>${app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        <button class="btn-icon" onclick="viewApplication('${app.id}')" title="View">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                        <button class="btn-icon" onclick="editApplication('${app.id}')" title="Edit">
                                            <i class="fa-solid fa-pen"></i>
                                        </button>
                                        ${app.status === 'pending' ? `
                                            <button class="btn-icon success" onclick="approveApplication('${app.id}')" title="Approve">
                                                <i class="fa-solid fa-check"></i>
                                            </button>
                                            <button class="btn-icon danger" onclick="rejectApplication('${app.id}')" title="Reject">
                                                <i class="fa-solid fa-times"></i>
                                            </button>
                                        ` : ''}
                                        ${app.status === 'approved' ? `
                                            <button class="btn-icon primary" onclick="disburseLoan('${app.id}')" title="Disburse Loan">
                                                <i class="fa-solid fa-hand-holding-dollar"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fa-solid fa-file-signature"></i>
                        <p>No applications found</p>
                        <button class="btn-primary" onclick="showAddApplication()">Create new application</button>
                    </div>
                `}
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
// VIEW APPLICATION DETAILS
// ============================================
window.viewApplication = async (id) => {
    try {
        const { data: app, error } = await client
            .from('applications')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Get customer details
        const { data: customer } = await client
            .from('profiles')
            .select('full_name, email, phone, national_id, address')
            .eq('id', app.customer_id)
            .single();

        let html = `
            <div style="padding:20px;">
                <h3 style="margin-bottom:16px;">Application Details</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                    <div><strong>Applicant:</strong> ${app.applicant_name}</div>
                    <div><strong>Email:</strong> ${app.email || 'N/A'}</div>
                    <div><strong>Phone:</strong> ${app.phone || 'N/A'}</div>
                    <div><strong>National ID:</strong> ${app.national_id || 'N/A'}</div>
                    <div><strong>Address:</strong> ${app.address || 'N/A'}</div>
                    <div><strong>Amount:</strong> KES ${app.amount?.toLocaleString()}</div>
                    <div><strong>Purpose:</strong> ${app.purpose}</div>
                    <div><strong>Term:</strong> ${app.term_months || 0} months</div>
                    <div><strong>Status:</strong> <span class="status-badge ${app.status}">${app.status}</span></div>
                    <div><strong>Applied:</strong> ${app.created_at ? new Date(app.created_at).toLocaleString() : 'N/A'}</div>
                </div>
                ${app.notes ? `<div><strong>Notes:</strong> ${app.notes}</div>` : ''}
                <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid var(--border-color);padding-top:16px;">
                    ${app.status === 'pending' ? `
                        <button class="btn-success" onclick="approveApplication('${app.id}')">Approve</button>
                        <button class="btn-danger" onclick="rejectApplication('${app.id}')">Reject</button>
                    ` : ''}
                    ${app.status === 'approved' ? `
                        <button class="btn-primary" onclick="disburseLoan('${app.id}')">Disburse Loan</button>
                    ` : ''}
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;

        showModal(html);
    } catch (error) {
        console.error('View application error:', error);
        showToast('Failed to load application details', 'error');
    }
};

// ============================================
// DISBURSE LOAN
// ============================================
window.disburseLoan = async (applicationId) => {
    try {
        const { data: app, error } = await client
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (error) throw error;

        if (app.status !== 'approved') {
            showToast('Application must be approved first', 'error');
            return;
        }

        const html = `
            <div style="padding:20px;">
                <h3 style="margin-bottom:16px;">Disburse Loan for ${app.applicant_name}</h3>
                <p style="color:var(--text-secondary);margin-bottom:20px;">Create a loan from this approved application.</p>
                <form id="disburseForm" onsubmit="handleDisburse(event, '${applicationId}')">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label>Amount (KES)</label>
                            <input type="number" id="disburseAmount" value="${app.amount}" step="100" required />
                        </div>
                        <div class="form-group">
                            <label>Interest Rate (%)</label>
                            <input type="number" id="disburseRate" value="12.5" step="0.5" required />
                        </div>
                        <div class="form-group">
                            <label>Term (months)</label>
                            <input type="number" id="disburseTerm" value="${app.term_months || 12}" required />
                        </div>
                        <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" id="disburseDueDate" required />
                        </div>
                    </div>
                    <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid var(--border-color);padding-top:16px;">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Disburse Loan</button>
                    </div>
                </form>
            </div>
        `;
        showModal(html);

        // Set default due date (today + term months)
        const term = app.term_months || 12;
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + term);
        document.getElementById('disburseDueDate').value = dueDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Disburse error:', error);
        showToast('Failed to load disburse form', 'error');
    }
};

window.handleDisburse = async (event, applicationId) => {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('disburseAmount').value);
    const rate = parseFloat(document.getElementById('disburseRate').value);
    const term = parseInt(document.getElementById('disburseTerm').value);
    const dueDate = document.getElementById('disburseDueDate').value;

    if (!amount || !rate || !term || !dueDate) {
        showToast('Please fill all fields', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    try {
        const { data: app, error: appError } = await client
            .from('applications')
            .select('*')
            .eq('id', applicationId)
            .single();

        if (appError) throw appError;

        // Create loan
        const { data: loan, error: loanError } = await client
            .from('loans')
            .insert({
                customer_id: app.customer_id,
                customer_name: app.applicant_name,
                application_id: applicationId,
                amount: amount,
                interest_rate: rate,
                term_months: term,
                status: 'active',
                due_date: dueDate,
                disbursed_date: new Date().toISOString().split('T')[0],
                notes: `Disbursed from application #${applicationId.slice(0,8)}`
            })
            .select()
            .single();

        if (loanError) throw loanError;

        // Update application status to 'disbursed'
        await client
            .from('applications')
            .update({ status: 'disbursed' })
            .eq('id', applicationId);

        showToast('Loan disbursed successfully!', 'success');
        closeModal();
        loadApplications();
        loadLoans();
    } catch (error) {
        console.error('Disburse error:', error);
        showToast('Failed to disburse loan: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Disburse Loan';
    }
};

// ============================================
// LOANS – with Balance and Payment Recording
// ============================================
async function loadLoans() {
    showLoading();
    try {
        const { data: loans, error } = await client
            .from('loans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            if (error.code === '42P01') {
                showError('The "loans" table does not exist. Please create it first.');
                return;
            }
            throw error;
        }

        loansData = loans || [];

        // Calculate balances for each loan (parallel)
        const loansWithBalances = await Promise.all(loansData.map(async (loan) => {
            const balance = await calculateLoanBalance(loan.id);
            const paid = loan.amount - balance;
            return { ...loan, balance, paid };
        }));

        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-wallet"></i> Loans</h2>
                <div class="page-actions">
                    <button class="btn-primary" onclick="showAddLoan()">
                        <i class="fa-solid fa-plus"></i> Disburse Loan
                    </button>
                    <button class="btn-secondary" onclick="refreshLoans()">
                        <i class="fa-solid fa-rotate"></i> Refresh
                    </button>
                </div>
            </div>
            <div class="table-container">
                <div class="table-toolbar">
                    <div class="search-box">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="loanSearch" placeholder="Search loans..." onkeyup="searchLoans()" />
                    </div>
                    <div class="table-stats">
                        <span>Total: <strong>${loansWithBalances.length}</strong> loans</span>
                    </div>
                </div>
                ${loansWithBalances?.length ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Paid</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Due Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="loansTableBody">
                            ${loansWithBalances.map(loan => `
                                <tr>
                                    <td><strong>${loan.customer_name || 'N/A'}</strong></td>
                                    <td>KES ${loan.amount?.toLocaleString() || '0'}</td>
                                    <td>KES ${loan.paid.toLocaleString()}</td>
                                    <td><strong>KES ${loan.balance.toLocaleString()}</strong></td>
                                    <td><span class="status-badge ${loan.status || 'active'}">${loan.status || 'Active'}</span></td>
                                    <td>${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                        <button class="btn-icon" onclick="viewLoanDetails('${loan.id}')" title="View Details">
                                            <i class="fa-solid fa-eye"></i>
                                        </button>
                                        <button class="btn-icon" onclick="editLoan('${loan.id}')" title="Edit">
                                            <i class="fa-solid fa-pen"></i>
                                        </button>
                                        ${loan.status === 'active' ? `
                                            <button class="btn-icon success" onclick="recordPayment('${loan.id}')" title="Record Payment">
                                                <i class="fa-solid fa-money-bill-wave"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fa-solid fa-wallet"></i>
                        <p>No loans found</p>
                        <button class="btn-primary" onclick="showAddLoan()">Disburse first loan</button>
                    </div>
                `}
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
// CALCULATE LOAN BALANCE
// ============================================
async function calculateLoanBalance(loanId) {
    try {
        const { data: payments, error } = await client
            .from('payments')
            .select('amount')
            .eq('loan_id', loanId)
            .eq('status', 'completed');

        if (error) throw error;

        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

        const { data: loan, error: loanError } = await client
            .from('loans')
            .select('amount')
            .eq('id', loanId)
            .single();

        if (loanError) throw loanError;

        const balance = loan.amount - totalPaid;
        return Math.max(balance, 0);
    } catch (error) {
        console.error('Balance calculation error:', error);
        return 0;
    }
}

// ============================================
// VIEW LOAN DETAILS WITH PAYMENT HISTORY
// ============================================
window.viewLoanDetails = async (loanId) => {
    try {
        const { data: loan, error } = await client
            .from('loans')
            .select('*')
            .eq('id', loanId)
            .single();

        if (error) throw error;

        const { data: payments, error: payError } = await client
            .from('payments')
            .select('*')
            .eq('loan_id', loanId)
            .order('created_at', { ascending: false });

        if (payError) throw payError;

        const balance = await calculateLoanBalance(loanId);
        const paid = loan.amount - balance;

        let html = `
            <div style="padding:20px;">
                <h3 style="margin-bottom:16px;">Loan Details</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                    <div><strong>Customer:</strong> ${loan.customer_name}</div>
                    <div><strong>Amount:</strong> KES ${loan.amount?.toLocaleString()}</div>
                    <div><strong>Paid:</strong> KES ${paid.toLocaleString()}</div>
                    <div><strong>Balance:</strong> <strong style="color:${balance > 0 ? 'var(--warning-light)' : 'var(--success-light)'};">KES ${balance.toLocaleString()}</strong></div>
                    <div><strong>Interest Rate:</strong> ${loan.interest_rate || 0}%</div>
                    <div><strong>Term:</strong> ${loan.term_months || 0} months</div>
                    <div><strong>Status:</strong> <span class="status-badge ${loan.status}">${loan.status}</span></div>
                    <div><strong>Due Date:</strong> ${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</div>
                    <div><strong>Disbursed:</strong> ${loan.disbursed_date ? new Date(loan.disbursed_date).toLocaleDateString() : 'N/A'}</div>
                    ${loan.notes ? `<div><strong>Notes:</strong> ${loan.notes}</div>` : ''}
                </div>

                <h4 style="margin:20px 0 12px;">Payment History</h4>
                ${payments && payments.length > 0 ? `
                    <div style="overflow-x:auto;">
                        <table style="width:100%;border-collapse:collapse;">
                            <thead>
                                <tr style="background:var(--bg-primary);">
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;">Date</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;">Amount</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;">Method</th>
                                    <th style="padding:8px 12px;text-align:left;font-weight:600;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${payments.map(p => `
                                    <tr style="border-bottom:1px solid var(--border-color);">
                                        <td style="padding:8px 12px;">${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : 'N/A'}</td>
                                        <td style="padding:8px 12px;">KES ${p.amount?.toLocaleString()}</td>
                                        <td style="padding:8px 12px;">${p.payment_method || 'N/A'}</td>
                                        <td style="padding:8px 12px;"><span class="status-badge ${p.status}">${p.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div style="color:var(--text-muted);padding:20px;text-align:center;">No payments recorded yet.</div>
                `}

                <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid var(--border-color);padding-top:16px;">
                    ${loan.status === 'active' ? `
                        <button class="btn-success" onclick="recordPayment('${loan.id}')">Record Payment</button>
                    ` : ''}
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;

        showModal(html);
    } catch (error) {
        console.error('View loan details error:', error);
        showToast('Failed to load loan details', 'error');
    }
};

// ============================================
// RECORD PAYMENT (Admin)
// ============================================
window.recordPayment = async (loanId) => {
    try {
        const { data: loan, error } = await client
            .from('loans')
            .select('customer_id, customer_name, amount')
            .eq('id', loanId)
            .single();

        if (error) throw error;

        const balance = await calculateLoanBalance(loanId);

        const html = `
            <div style="padding:20px;">
                <h3 style="margin-bottom:16px;">Record Payment for ${loan.customer_name}</h3>
                <p style="color:var(--text-secondary);margin-bottom:20px;">Remaining Balance: <strong>KES ${balance.toLocaleString()}</strong></p>
                <form id="recordPaymentForm" onsubmit="handleRecordPayment(event, '${loanId}')">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label>Amount (KES)</label>
                            <input type="number" id="paymentAmount" required step="100" max="${balance}" placeholder="Enter amount" />
                        </div>
                        <div class="form-group">
                            <label>Payment Method</label>
                            <select id="paymentMethod" required>
                                <option value="cash">Cash</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="mobile_money">Mobile Money</option>
                                <option value="card">Card</option>
                                <option value="check">Check</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Payment Type</label>
                            <select id="paymentType" required>
                                <option value="payment">Regular Payment</option>
                                <option value="penalty">Penalty</option>
                                <option value="fee">Fee</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Reference (Optional)</label>
                            <input type="text" id="paymentReference" placeholder="Enter reference" />
                        </div>
                        <div class="form-group" style="grid-column:1/-1;">
                            <label>Notes (Optional)</label>
                            <textarea id="paymentNotes" rows="2" placeholder="Any additional notes"></textarea>
                        </div>
                    </div>
                    <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid var(--border-color);padding-top:16px;">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
                        <button type="submit" class="btn-primary">Record Payment</button>
                    </div>
                </form>
            </div>
        `;
        showModal(html);
    } catch (error) {
        console.error('Record payment error:', error);
        showToast('Failed to load payment form', 'error');
    }
};

window.handleRecordPayment = async (event, loanId) => {
    event.preventDefault();

    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const method = document.getElementById('paymentMethod').value;
    const type = document.getElementById('paymentType').value;
    const reference = document.getElementById('paymentReference').value.trim();
    const notes = document.getElementById('paymentNotes').value.trim();

    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    const submitBtn = event.target.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recording...';

    try {
        const { data: loan, error: loanError } = await client
            .from('loans')
            .select('customer_id, customer_name')
            .eq('id', loanId)
            .single();

        if (loanError) throw loanError;

        const { error: payError } = await client
            .from('payments')
            .insert({
                loan_id: loanId,
                customer_id: loan.customer_id,
                customer_name: loan.customer_name,
                amount: amount,
                type: type,
                payment_method: method,
                status: 'completed',
                reference: reference || null,
                notes: notes || null,
                payment_date: new Date().toISOString()
            });

        if (payError) throw payError;

        const balance = await calculateLoanBalance(loanId);
        if (balance <= 0) {
            await client
                .from('loans')
                .update({ status: 'paid' })
                .eq('id', loanId);
        }

        showToast('Payment recorded successfully!', 'success');
        closeModal();
        loadLoans();
        loadPayments();
    } catch (error) {
        console.error('Record payment error:', error);
        showToast('Failed to record payment: ' + error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Record Payment';
    }
};

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

        if (error) {
            if (error.code === '42P01') {
                showError('The "payments" table does not exist. Please create it first.');
                return;
            }
            throw error;
        }

        paymentsData = payments || [];

        document.getElementById('content').innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-money-bill-wave"></i> Payments</h2>
                <div class="page-actions">
                    <button class="btn-primary" onclick="showAddPayment()">
                        <i class="fa-solid fa-plus"></i> Record Payment
                    </button>
                    <button class="btn-secondary" onclick="refreshPayments()">
                        <i class="fa-solid fa-rotate"></i> Refresh
                    </button>
                </div>
            </div>
            <div class="table-container">
                <div class="table-toolbar">
                    <div class="search-box">
                        <i class="fa-solid fa-search"></i>
                        <input type="text" id="paymentSearch" placeholder="Search payments..." onkeyup="searchPayments()" />
                    </div>
                    <div class="table-stats">
                        <span>Total: <strong>${paymentsData.length}</strong> payments</span>
                    </div>
                </div>
                ${paymentsData?.length ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Loan</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Method</th>
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="paymentsTableBody">
                            ${paymentsData.map(payment => `
                                <tr>
                                    <td><strong>${payment.customer_name || 'N/A'}</strong></td>
                                    <td>${payment.loan_id ? `#${payment.loan_id.slice(0,8)}` : 'N/A'}</td>
                                    <td>KES ${payment.amount?.toLocaleString() || '0'}</td>
                                    <td><span class="status-badge ${payment.type || 'payment'}">${payment.type || 'Payment'}</span></td>
                                    <td>${payment.payment_method || 'N/A'}</td>
                                    <td><span class="status-badge ${payment.status || 'pending'}">${payment.status || 'Pending'}</span></td>
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
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    <div class="empty-state">
                        <i class="fa-solid fa-money-bill-wave"></i>
                        <p>No payments found</p>
                        <button class="btn-primary" onclick="showAddPayment()">Record first payment</button>
                    </div>
                `}
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
// VIEW PAYMENT DETAILS
// ============================================
window.viewPayment = async (id) => {
    try {
        const { data: payment, error } = await client
            .from('payments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        let html = `
            <div style="padding:20px;">
                <h3 style="margin-bottom:16px;">Payment Details</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
                    <div><strong>Customer:</strong> ${payment.customer_name}</div>
                    <div><strong>Loan ID:</strong> ${payment.loan_id ? `#${payment.loan_id.slice(0,12)}` : 'N/A'}</div>
                    <div><strong>Amount:</strong> KES ${payment.amount?.toLocaleString()}</div>
                    <div><strong>Type:</strong> ${payment.type || 'Payment'}</div>
                    <div><strong>Method:</strong> ${payment.payment_method || 'N/A'}</div>
                    <div><strong>Status:</strong> <span class="status-badge ${payment.status}">${payment.status}</span></div>
                    <div><strong>Reference:</strong> ${payment.reference || 'N/A'}</div>
                    <div><strong>Payment Date:</strong> ${payment.payment_date ? new Date(payment.payment_date).toLocaleString() : 'N/A'}</div>
                    ${payment.notes ? `<div><strong>Notes:</strong> ${payment.notes}</div>` : ''}
                </div>
                <div style="margin-top:20px;display:flex;gap:12px;justify-content:flex-end;border-top:1px solid var(--border-color);padding-top:16px;">
                    <button class="btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;

        showModal(html);
    } catch (error) {
        console.error('View payment error:', error);
        showToast('Failed to load payment details', 'error');
    }
};

// ============================================
// SEARCH FUNCTIONS
// ============================================
function searchCustomers() {
    const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#customersTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function searchApplications() {
    const searchTerm = document.getElementById('applicationSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#applicationsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function searchLoans() {
    const searchTerm = document.getElementById('loanSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#loansTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function searchPayments() {
    const searchTerm = document.getElementById('paymentSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#paymentsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// ============================================
// REFRESH FUNCTIONS
// ============================================
function refreshCustomers() { loadCustomers(); }
function refreshApplications() { loadApplications(); }
function refreshLoans() { loadLoans(); }
function refreshPayments() { loadPayments(); }

// ============================================
// REPORTS
// ============================================
async function loadReports() {
    document.getElementById('content').innerHTML = `
        <div class="page-header">
            <h2><i class="fa-solid fa-chart-pie"></i> Reports</h2>
        </div>
        <div class="reports-grid">
            <div class="report-card" onclick="generateReport('customers')">
                <i class="fa-solid fa-users"></i>
                <h3>User Report</h3>
                <p>View user analytics and demographics</p>
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
    document.getElementById('content').innerHTML = `
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
                        <input type="password" id="newPassword" placeholder="Enter new password (min 6 chars)" minlength="6" />
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
// HELPERS
// ============================================
async function getTableCount(tableName) {
    try {
        const { data, error } = await client
            .from(tableName)
            .select('id', { count: 'exact' });
        
        if (error) {
            console.warn(`Error counting ${tableName}:`, error.message);
            return 0;
        }
        return data?.length || 0;
    } catch (error) {
        console.error(`Error counting ${tableName}:`, error);
        return 0;
    }
}

function renderRecentApplications(applications) {
    if (!applications?.length) {
        return `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No recent applications</p></div>`;
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

function renderRecentCustomers(customers) {
    if (!customers?.length) {
        return `<div class="empty-state"><i class="fa-solid fa-inbox"></i><p>No recent users</p></div>`;
    }
    return `
        <div class="activity-list">
            ${customers.slice(0, 5).map(customer => `
                <div class="activity-item">
                    <div class="activity-icon customer">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div class="activity-content">
                        <p><strong>${customer.full_name || 'Unknown'}</strong> joined</p>
                        <span class="activity-date">${customer.created_at ? timeAgo(customer.created_at) : 'Recently'}</span>
                    </div>
                    <span class="status-badge small ${customer.role || 'customer'}">${customer.role || 'Customer'}</span>
                </div>
            `).join('')}
        </div>
    `;
}

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

// ============================================
// UI HELPERS
// ============================================
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
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' :
                 type === 'info' ? 'fa-info-circle' : 'fa-check-circle';
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// BASIC CRUD OPERATIONS (Placeholders / Stubs)
// ============================================

// Customers
window.showAddCustomer = () => { showToast('Add user form coming soon', 'info'); };
window.editCustomer = (id) => { showToast(`Editing user ${id}`, 'info'); };
window.deleteCustomer = async (id) => {
    if (!confirm('Delete this user?')) return;
    try {
        await client.from('profiles').delete().eq('id', id);
        showToast('User deleted', 'success');
        loadCustomers();
    } catch (e) {
        showToast('Error deleting user', 'error');
    }
};

// Applications
window.showAddApplication = () => { showToast('New application form coming soon', 'info'); };
window.editApplication = (id) => { showToast(`Editing application ${id}`, 'info'); };

window.approveApplication = async (id) => {
    if (!confirm('Approve this application?')) return;
    try {
        await client.from('applications').update({ status: 'approved' }).eq('id', id);
        showToast('Application approved', 'success');
        loadApplications();
    } catch (e) {
        showToast('Error approving application', 'error');
    }
};

window.rejectApplication = async (id) => {
    if (!confirm('Reject this application?')) return;
    try {
        await client.from('applications').update({ status: 'rejected' }).eq('id', id);
        showToast('Application rejected', 'success');
        loadApplications();
    } catch (e) {
        showToast('Error rejecting application', 'error');
    }
};

// Loans
window.showAddLoan = () => { showToast('Disburse loan form coming soon', 'info'); };
window.editLoan = (id) => { showToast(`Editing loan ${id}`, 'info'); };
window.makePayment = (id) => { recordPayment(id); };

// Payments
window.showAddPayment = () => { showToast('Record payment form coming soon', 'info'); };
window.editPayment = (id) => { showToast(`Editing payment ${id}`, 'info'); };
window.deletePayment = async (id) => {
    if (!confirm('Delete this payment?')) return;
    try {
        await client.from('payments').delete().eq('id', id);
        showToast('Payment deleted', 'success');
        loadPayments();
    } catch (e) {
        showToast('Error deleting payment', 'error');
    }
};

// Reports
window.generateReport = async (type) => {
    showToast(`Generating ${type} report...`, 'info');
    const container = document.getElementById('reportContainer');
    if (!container) return;
    try {
        let data = [], title = '';
        switch(type) {
            case 'customers':
                const { data: c } = await client.from('profiles').select('*');
                data = c || [];
                title = 'User Report';
                break;
            case 'applications':
                const { data: a } = await client.from('applications').select('*');
                data = a || [];
                title = 'Applications Report';
                break;
            case 'loans':
                const { data: l } = await client.from('loans').select('*');
                data = l || [];
                title = 'Loans Report';
                break;
            case 'payments':
                const { data: p } = await client.from('payments').select('*');
                data = p || [];
                title = 'Payments Report';
                break;
        }
        const total = data.length;
        const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
        container.innerHTML = `
            <div class="report-result">
                <h3>${title}</h3>
                <div class="report-preview">
                    <div class="report-stat"><span>Total Records</span><strong>${total}</strong></div>
                    <div class="report-stat"><span>Total Amount</span><strong>KES ${totalAmount.toLocaleString()}</strong></div>
                    <div class="report-stat"><span>Average</span><strong>KES ${total > 0 ? (totalAmount/total).toFixed(2) : '0.00'}</strong></div>
                </div>
                <div style="margin-top:16px;">
                    <button class="btn-primary" onclick="downloadReport('${type}')"><i class="fa-solid fa-download"></i> Download</button>
                    <button class="btn-secondary" onclick="document.getElementById('reportContainer').innerHTML=''"><i class="fa-solid fa-times"></i> Close</button>
                </div>
            </div>
        `;
        showToast('Report generated', 'success');
    } catch (e) {
        showToast('Error generating report', 'error');
    }
};

window.downloadReport = (type) => {
    showToast(`Downloading ${type} report...`, 'info');
    setTimeout(() => showToast('Downloaded!', 'success'), 1000);
};

// Settings
window.updateProfile = async () => {
    const name = document.getElementById('settingsName')?.value;
    if (!name) return showToast('Enter a name', 'error');
    try {
        await client.from('profiles').update({ full_name: name }).eq('id', adminInfo.user.id);
        showToast('Profile updated', 'success');
        adminInfo.profile.full_name = name;
        document.getElementById('welcomeAdmin').innerHTML = `Welcome, <strong>${name}</strong>`;
        document.getElementById('adminName').textContent = name;
    } catch (e) {
        showToast('Update failed', 'error');
    }
};

window.changePassword = async () => {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    if (!current || !newPass || !confirm) return showToast('Fill all fields', 'error');
    if (newPass !== confirm) return showToast('Passwords do not match', 'error');
    if (newPass.length < 6) return showToast('Password too short', 'error');
    try {
        await client.auth.updateUser({ password: newPass });
        showToast('Password changed', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (e) {
        showToast('Error changing password', 'error');
    }
};

console.log('✅ Admin panel loaded successfully');
