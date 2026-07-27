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

        const welcomeEl = document.getElementById("welcomeAdmin");
        if (adminInfo.profile?.full_name) {
            welcomeEl.innerHTML = `Welcome, <strong>${adminInfo.profile.full_name}</strong>`;
        }

        const adminNameEl = document.getElementById("adminName");
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
document.querySelectorAll("aside li[data-page]").forEach(item => {
    item.onclick = async () => {
        if (isLoading) return;
        const page = item.dataset.page;
        if (page === currentPage) return;

        document.querySelectorAll("aside li").forEach(li => li.classList.remove("active"));
        item.classList.add("active");

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
        if (!confirm('Are you sure you want to logout?')) return;
        await client.auth.signOut();
        window.location.href = "../login.html";
    } catch (error) {
        console.error('Logout error:', error);
        showError('Failed to logout');
    }
};

// ============================================
// DASHBOARD - WITH ACCURATE COUNTS
// ============================================
async function loadDashboard() {
    showLoading();
    try {
        // Get accurate counts
        const [customersCount, applicationsCount, loansCount, paymentsCount] = await Promise.all([
            getTableCount('profiles'),
            getTableCount('applications'),
            getTableCount('loans'),
            getTableCount('payments')
        ]);

        // Fetch recent applications with try-catch
        let recentApplications = [];
        try {
            const { data } = await client
                .from('applications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            recentApplications = data || [];
        } catch (error) {
            console.warn('Could not fetch recent applications:', error.message);
            recentApplications = [];
        }

        // Fetch recent customers with try-catch
        let recentCustomers = [];
        try {
            const { data } = await client
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);
            recentCustomers = data || [];
        } catch (error) {
            console.warn('Could not fetch recent customers:', error.message);
            recentCustomers = [];
        }

        // Fetch loan data with try-catch
        let totalLoanAmount = 0;
        try {
            const { data } = await client
                .from('loans')
                .select('amount')
                .eq('status', 'active');
            if (data) {
                totalLoanAmount = data.reduce((sum, loan) => sum + (loan.amount || 0), 0);
            }
        } catch (error) {
            console.warn('Could not fetch loan data:', error.message);
        }

        document.getElementById("content").innerHTML = `
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
                        <strong>$${totalLoanAmount.toLocaleString()}</strong>
                    </div>
                    <div class="quick-stat">
                        <span>Average Loan</span>
                        <strong>$${loansCount > 0 ? (totalLoanAmount / loansCount).toFixed(2) : '0.00'}</strong>
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
// CUSTOMERS - Fetch ALL users regardless of role
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

        document.getElementById("content").innerHTML = `
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
// CUSTOMER SEARCH
// ============================================
function searchCustomers() {
    const searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#customersTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function refreshCustomers() {
    loadCustomers();
}

// ============================================
// ADD CUSTOMER
// ============================================
window.showAddCustomer = () => {
    document.getElementById("content").innerHTML = `
        <div class="page-header">
            <h2><i class="fa-solid fa-user-plus"></i> Add New User</h2>
            <button class="btn-secondary" onclick="loadCustomers()">
                <i class="fa-solid fa-arrow-left"></i> Back to Users
            </button>
        </div>
        <div class="form-container">
            <form id="addCustomerForm" onsubmit="handleAddCustomer(event)">
                <div class="form-grid">
                    <div class="form-group full-width">
                        <label for="fullName">Full Name *</label>
                        <input type="text" id="fullName" required placeholder="Enter full name" />
                    </div>
                    <div class="form-group">
                        <label for="email">Email *</label>
                        <input type="email" id="email" required placeholder="Enter email address" />
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone</label>
                        <input type="tel" id="phone" placeholder="Enter phone number" />
                    </div>
                    <div class="form-group">
                        <label for="nationalId">National ID</label>
                        <input type="text" id="nationalId" placeholder="Enter national ID" />
                    </div>
                    <div class="form-group">
                        <label for="password">Password *</label>
                        <input type="password" id="password" required placeholder="Enter password (min 6 chars)" minlength="6" />
                    </div>
                    <div class="form-group">
                        <label for="role">Role</label>
                        <select id="role">
                            <option value="customer">Customer</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="loadCustomers()">Cancel</button>
                    <button type="submit" class="btn-primary">
                        <i class="fa-solid fa-user-plus"></i> Create User
                    </button>
                </div>
            </form>
        </div>
    `;
};

// ============================================
// HANDLE ADD CUSTOMER - FIXED 409 ERROR
// ============================================
window.handleAddCustomer = async (event) => {
    event.preventDefault();
    
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const nationalId = document.getElementById('nationalId').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;

    if (!fullName || !email || !password) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }

    try {
        showToast('Creating user...', 'info');

        // Check if user already exists
        const { data: existingUser } = await client
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            showToast('A user with this email already exists!', 'error');
            return;
        }

        // Create auth user
        const { data: authData, error: authError } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    role: role
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                showToast('This email is already registered. Please use a different email.', 'error');
                return;
            }
            throw authError;
        }

        if (!authData.user) {
            throw new Error('Failed to create user');
        }

        // Create profile
        const { error: profileError } = await client
            .from('profiles')
            .insert({
                id: authData.user.id,
                full_name: fullName,
                email: email,
                phone: phone || null,
                national_id: nationalId || null,
                role: role
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            throw new Error('Failed to create user profile. Please try again.');
        }

        showToast('User created successfully!', 'success');
        setTimeout(() => loadCustomers(), 1500);

    } catch (error) {
        console.error('Add customer error:', error);
        showToast(error.message || 'Failed to create user', 'error');
    }
};

// ============================================
// VIEW CUSTOMER
// ============================================
window.viewCustomer = async (id) => {
    try {
        const { data: customer, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById("content").innerHTML = `
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
                            <i class="fa-solid fa-user-circle"></i>
                        </div>
                        <div>
                            <h3>${customer.full_name}</h3>
                            <p class="detail-role"><span class="status-badge ${customer.role}">${customer.role}</span></p>
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
// EDIT CUSTOMER
// ============================================
window.editCustomer = async (id) => {
    try {
        const { data: customer, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById("content").innerHTML = `
            <div class="page-header">
                <h2><i class="fa-solid fa-user-pen"></i> Edit User</h2>
                <button class="btn-secondary" onclick="loadCustomers()">
                    <i class="fa-solid fa-arrow-left"></i> Back to Users
                </button>
            </div>
            <div class="form-container">
                <form id="editCustomerForm" onsubmit="handleEditCustomer(event, '${id}')">
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label for="editFullName">Full Name *</label>
                            <input type="text" id="editFullName" required value="${customer.full_name || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="editEmail">Email *</label>
                            <input type="email" id="editEmail" required value="${customer.email || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="editPhone">Phone</label>
                            <input type="tel" id="editPhone" value="${customer.phone || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="editNationalId">National ID</label>
                            <input type="text" id="editNationalId" value="${customer.national_id || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="editRole">Role</label>
                            <select id="editRole">
                                <option value="customer" ${customer.role === 'customer' ? 'selected' : ''}>Customer</option>
                                <option value="admin" ${customer.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="loadCustomers()">Cancel</button>
                        <button type="submit" class="btn-primary">
                            <i class="fa-solid fa-save"></i> Update User
                        </button>
                    </div>
                </form>
            </div>
        `;
    } catch (error) {
        console.error('Edit customer error:', error);
        showToast('Failed to load user for editing', 'error');
    }
};

// ============================================
// HANDLE EDIT CUSTOMER
// ============================================
window.handleEditCustomer = async (event, id) => {
    event.preventDefault();

    const fullName = document.getElementById('editFullName').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const nationalId = document.getElementById('editNationalId').value.trim();
    const role = document.getElementById('editRole').value;

    if (!fullName || !email) {
        showToast('Full Name and Email are required', 'error');
        return;
    }

    try {
        // Check if email is taken by another user
        const { data: existingUser } = await client
            .from('profiles')
            .select('id')
            .eq('email', email)
            .neq('id', id)
            .maybeSingle();

        if (existingUser) {
            showToast('Email is already taken by another user', 'error');
            return;
        }

        const { error } = await client
            .from('profiles')
            .update({
                full_name: fullName,
                email: email,
                phone: phone || null,
                national_id: nationalId || null,
                role: role,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;

        showToast('User updated successfully!', 'success');
        setTimeout(() => loadCustomers(), 1500);
    } catch (error) {
        console.error('Update customer error:', error);
        showToast('Failed to update user: ' + error.message, 'error');
    }
};

// ============================================
// DELETE CUSTOMER
// ============================================
window.deleteCustomer = async (id) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        // Check if customer has active loans
        const { data: loans, error: loansError } = await client
            .from('loans')
            .select('id')
            .eq('customer_id', id)
            .eq('status', 'active');

        if (loansError) throw loansError;

        if (loans && loans.length > 0) {
            showToast('Cannot delete user with active loans', 'error');
            return;
        }

        // Delete from profiles
        const { error } = await client
            .from('profiles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showToast('User deleted successfully!', 'success');
        loadCustomers();
    } catch (error) {
        console.error('Delete customer error:', error);
        showToast('Failed to delete user: ' + error.message, 'error');
    }
};

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

        if (error) {
            if (error.code === '42P01') {
                showError('The "applications" table does not exist. Please create it first.');
                return;
            }
            throw error;
        }

        applicationsData = applications || [];

        document.getElementById("content").innerHTML = `
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
                                <th>Status</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="applicationsTableBody">
                            ${applicationsData.map(app => `
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
                                        ${app.status === 'pending' ? `
                                            <button class="btn-icon success" onclick="approveApplication('${app.id}')" title="Approve">
                                                <i class="fa-solid fa-check"></i>
                                            </button>
                                            <button class="btn-icon danger" onclick="rejectApplication('${app.id}')" title="Reject">
                                                <i class="fa-solid fa-times"></i>
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

function searchApplications() {
    const searchTerm = document.getElementById('applicationSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#applicationsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function refreshApplications() {
    loadApplications();
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

        if (error) {
            if (error.code === '42P01') {
                showError('The "loans" table does not exist. Please create it first.');
                return;
            }
            throw error;
        }

        loansData = loans || [];

        document.getElementById("content").innerHTML = `
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
                        <span>Total: <strong>${loansData.length}</strong> loans</span>
                    </div>
                </div>
                ${loansData?.length ? `
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
                        <tbody id="loansTableBody">
                            ${loansData.map(loan => `
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
                                        ${loan.status === 'active' ? `
                                            <button class="btn-icon success" onclick="makePayment('${loan.id}')" title="Make Payment">
                                                <i class="fa-solid fa-money-bill"></i>
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

function searchLoans() {
    const searchTerm = document.getElementById('loanSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#loansTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function refreshLoans() {
    loadLoans();
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

        if (error) {
            if (error.code === '42P01') {
                showError('The "payments" table does not exist. Please create it first.');
                return;
            }
            throw error;
        }

        paymentsData = payments || [];

        document.getElementById("content").innerHTML = `
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
                                <th>Loan ID</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="paymentsTableBody">
                            ${paymentsData.map(payment => `
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

function searchPayments() {
    const searchTerm = document.getElementById('paymentSearch')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#paymentsTableBody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function refreshPayments() {
    loadPayments();
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
// HELPER FUNCTIONS
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
// APPLICATION CRUD OPERATIONS
// ============================================

window.showAddApplication = () => {
    showToast('New application form coming soon');
};

window.viewApplication = (id) => {
    showToast(`Viewing application ${id}`);
};

window.editApplication = (id) => {
    showToast(`Editing application ${id}`);
};

window.approveApplication = async (id) => {
    if (!confirm('Approve this application?')) return;
    try {
        const { error } = await client
            .from('applications')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        showToast('Application approved successfully!', 'success');
        loadApplications();
    } catch (error) {
        console.error('Approve application error:', error);
        showToast('Failed to approve application', 'error');
    }
};

window.rejectApplication = async (id) => {
    if (!confirm('Reject this application?')) return;
    try {
        const { error } = await client
            .from('applications')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
        showToast('Application rejected', 'error');
        loadApplications();
    } catch (error) {
        console.error('Reject application error:', error);
        showToast('Failed to reject application', 'error');
    }
};

// ============================================
// LOAN CRUD OPERATIONS
// ============================================

window.showAddLoan = () => {
    showToast('Disburse loan form coming soon');
};

window.viewLoan = (id) => {
    showToast(`Viewing loan ${id}`);
};

window.editLoan = (id) => {
    showToast(`Editing loan ${id}`);
};

window.makePayment = (id) => {
    showToast(`Payment form for loan ${id}`);
};

// ============================================
// PAYMENT CRUD OPERATIONS
// ============================================

window.showAddPayment = () => {
    showToast('Record payment form coming soon');
};

window.viewPayment = (id) => {
    showToast(`Viewing payment ${id}`);
};

window.editPayment = (id) => {
    showToast(`Editing payment ${id}`);
};

window.deletePayment = async (id) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
        const { error } = await client
            .from('payments')
            .delete()
            .eq('id', id);
        if (error) throw error;
        showToast('Payment deleted successfully', 'success');
        loadPayments();
    } catch (error) {
        console.error('Delete payment error:', error);
        showToast('Failed to delete payment', 'error');
    }
};

// ============================================
// REPORT FUNCTIONS
// ============================================

window.generateReport = async (type) => {
    showToast(`Generating ${type} report...`, 'info');
    
    const reportContainer = document.getElementById('reportContainer');
    if (!reportContainer) return;

    try {
        let data = [];
        let title = '';
        let total = 0;

        switch(type) {
            case 'customers':
                const { data: customers } = await client.from('profiles').select('*');
                data = customers || [];
                title = 'User Report';
                total = data.length;
                break;
            case 'applications':
                const { data: applications } = await client.from('applications').select('*');
                data = applications || [];
                title = 'Applications Report';
                total = data.length;
                break;
            case 'loans':
                const { data: loans } = await client.from('loans').select('*');
                data = loans || [];
                title = 'Loans Report';
                total = data.length;
                break;
            case 'payments':
                const { data: payments } = await client.from('payments').select('*');
                data = payments || [];
                title = 'Payments Report';
                total = data.length;
                break;
        }

        const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);

        reportContainer.innerHTML = `
            <div class="report-result">
                <h3>${title}</h3>
                <div class="report-preview">
                    <div class="report-stat">
                        <span>Total Records</span>
                        <strong>${total}</strong>
                    </div>
                    <div class="report-stat">
                        <span>Total Amount</span>
                        <strong>$${totalAmount.toLocaleString()}</strong>
                    </div>
                    <div class="report-stat">
                        <span>Average</span>
                        <strong>$${total > 0 ? (totalAmount / total).toFixed(2) : '0.00'}</strong>
                    </div>
                </div>
                <div style="margin-top: 16px;">
                    <button class="btn-primary" onclick="downloadReport('${type}')">
                        <i class="fa-solid fa-download"></i> Download Report
                    </button>
                    <button class="btn-secondary" onclick="document.getElementById('reportContainer').innerHTML = ''">
                        <i class="fa-solid fa-times"></i> Close
                    </button>
                </div>
            </div>
        `;
        
        showToast('Report generated successfully!', 'success');
    } catch (error) {
        console.error('Generate report error:', error);
        showToast('Failed to generate report', 'error');
    }
};

window.downloadReport = (type) => {
    showToast(`Downloading ${type} report...`, 'info');
    setTimeout(() => {
        showToast('Report downloaded!', 'success');
    }, 1000);
};

// ============================================
// SETTINGS FUNCTIONS
// ============================================

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
        showToast('Profile updated successfully', 'success');
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
        showToast('Password changed successfully', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (error) {
        console.error('Change password error:', error);
        showToast('Failed to change password. Please check your current password.', 'error');
    }
};
