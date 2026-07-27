// ============================================
// LOANS CONTROLLER
// ============================================

let currentUser = null;
let allLoans = [];
let filteredLoans = [];

// ============================================
// INITIALIZATION
// ============================================
(async () => {
    try {
        currentUser = await requireLogin();
        if (!currentUser) return;

        // Fetch user profile
        const { data: profile, error } = await client
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();

        if (error) throw error;

        // Update UI with user info
        const fullName = profile.full_name || "User";
        const initial = fullName.charAt(0).toUpperCase();
        const role = profile.role || "customer";

        document.getElementById("welcome").textContent = `Welcome, ${fullName}`;
        document.getElementById("welcome").innerHTML = `Welcome, <strong>${fullName}</strong>`;
        document.getElementById("role").textContent = role.toUpperCase();
        
        document.querySelectorAll("#userInitial, #sidebarInitial").forEach(el => {
            el.textContent = initial;
        });

        document.getElementById("headerUserName").textContent = fullName;
        document.getElementById("headerUserRole").textContent = role.charAt(0).toUpperCase() + role.slice(1);

        if (role === "admin") {
            document.getElementById("adminMenu").style.display = "block";
        }

        // Load loans
        await loadLoans();

    } catch (error) {
        console.error("Initialization error:", error);
        showToast("Failed to load your loans", "error");
    }
})();

// ============================================
// LOAD LOANS
// ============================================
async function loadLoans() {
    const spinner = document.getElementById("loadingSpinner");
    const content = document.getElementById("loansContent");
    
    spinner.style.display = "flex";
    content.style.display = "none";

    try {
        const { data: loans, error } = await client
            .from("loans")
            .select("*")
            .eq("customer_id", currentUser.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        allLoans = loans || [];
        filteredLoans = [...allLoans];
        
        // Update stats
        updateStats(allLoans);
        
        // Render table
        renderLoans(allLoans);

        spinner.style.display = "none";
        content.style.display = "block";

    } catch (error) {
        console.error("Load loans error:", error);
        showToast("Failed to load your loans", "error");
        spinner.style.display = "none";
        content.style.display = "block";
    }
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats(loans) {
    const total = loans.length;
    const active = loans.filter(l => l.status === 'active').length;
    const paid = loans.filter(l => l.status === 'paid').length;
    const totalAmount = loans.reduce((sum, l) => sum + (l.amount || 0), 0);

    document.getElementById("totalLoans").textContent = total;
    document.getElementById("activeLoans").textContent = active;
    document.getElementById("paidLoans").textContent = paid;
    document.getElementById("totalAmount").textContent = `KES ${totalAmount.toLocaleString()}`;
}

// ============================================
// RENDER LOANS
// ============================================
function renderLoans(loans) {
    const tbody = document.getElementById("loansTableBody");
    const emptyState = document.getElementById("emptyState");

    if (!loans || loans.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    tbody.innerHTML = loans.map(loan => `
        <tr>
            <td><strong>#${loan.id.slice(0, 8)}</strong></td>
            <td><strong>KES ${(loan.amount || 0).toLocaleString()}</strong></td>
            <td>${loan.interest_rate || 0}%</td>
            <td><span class="status-badge ${loan.status || 'pending'}">${loan.status || 'Pending'}</span></td>
            <td>${loan.term_months || 0} months</td>
            <td>${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn-icon primary" onclick="viewLoan('${loan.id}')" title="View Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
                ${loan.status === 'active' ? `
                    <button class="btn-icon success" onclick="makePayment('${loan.id}')" title="Make Payment">
                        <i class="fa-solid fa-money-bill-wave"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// ============================================
// FILTER LOANS
// ============================================
function filterLoans() {
    const statusFilter = document.getElementById("statusFilter").value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    filteredLoans = allLoans.filter(loan => {
        // Filter by status
        if (statusFilter !== 'all' && loan.status !== statusFilter) {
            return false;
        }
        
        // Filter by search
        if (searchTerm) {
            const searchable = [
                loan.id,
                loan.status,
                loan.customer_name,
                String(loan.amount),
                String(loan.term_months)
            ].join(' ').toLowerCase();
            if (!searchable.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });

    renderLoans(filteredLoans);
}

// ============================================
// SEARCH LOANS
// ============================================
function searchLoans() {
    filterLoans();
}

// ============================================
// RESET FILTERS
// ============================================
function resetFilters() {
    document.getElementById("statusFilter").value = 'all';
    document.getElementById("searchInput").value = '';
    filteredLoans = [...allLoans];
    renderLoans(allLoans);
}

// ============================================
// REFRESH LOANS
// ============================================
function refreshLoans() {
    showToast("Refreshing loans...", "info");
    loadLoans();
}

// ============================================
// VIEW LOAN DETAILS
// ============================================
async function viewLoan(loanId) {
    try {
        const { data: loan, error } = await client
            .from("loans")
            .select("*")
            .eq("id", loanId)
            .single();

        if (error) throw error;

        // Show modal
        const modal = document.getElementById("loanModal");
        const details = document.getElementById("loanDetails");

        details.innerHTML = `
            <div class="loan-detail-grid">
                <div class="loan-detail-item">
                    <label>Loan ID</label>
                    <strong>#${loan.id.slice(0, 12)}</strong>
                </div>
                <div class="loan-detail-item">
                    <label>Status</label>
                    <strong><span class="status-badge ${loan.status}">${loan.status}</span></strong>
                </div>
                <div class="loan-detail-item">
                    <label>Amount</label>
                    <strong>KES ${(loan.amount || 0).toLocaleString()}</strong>
                </div>
                <div class="loan-detail-item">
                    <label>Interest Rate</label>
                    <strong>${loan.interest_rate || 0}%</strong>
                </div>
                <div class="loan-detail-item">
                    <label>Term</label>
                    <strong>${loan.term_months || 0} months</strong>
                </div>
                <div class="loan-detail-item">
                    <label>Due Date</label>
                    <strong>${loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div class="loan-detail-item loan-detail-full">
                    <label>Customer Name</label>
                    <strong>${loan.customer_name || 'N/A'}</strong>
                </div>
                <div class="loan-detail-item loan-detail-full">
                    <label>Created At</label>
                    <strong>${loan.created_at ? new Date(loan.created_at).toLocaleString() : 'N/A'}</strong>
                </div>
                ${loan.notes ? `
                    <div class="loan-detail-item loan-detail-full">
                        <label>Notes</label>
                        <strong>${loan.notes}</strong>
                    </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                ${loan.status === 'active' ? `
                    <button class="btn-primary" onclick="makePayment('${loan.id}')">
                        <i class="fa-solid fa-money-bill-wave"></i> Make Payment
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="closeModal()">Close</button>
            </div>
        `;

        modal.style.display = "flex";

    } catch (error) {
        console.error("View loan error:", error);
        showToast("Failed to load loan details", "error");
    }
}

// ============================================
// CLOSE MODAL
// ============================================
function closeModal() {
    document.getElementById("loanModal").style.display = "none";
}

// Close modal on outside click
document.addEventListener("click", (e) => {
    const modal = document.getElementById("loanModal");
    if (e.target === modal) {
        closeModal();
    }
});

// ============================================
// MAKE PAYMENT
// ============================================
function makePayment(loanId) {
    // Redirect to payments page with loan ID
    window.location.href = `payments.html?loan_id=${loanId}`;
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = "success") {
    const existingToasts = document.querySelectorAll(".toast");
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "fa-check-circle" : 
                 type === "error" ? "fa-exclamation-circle" :
                 type === "info" ? "fa-info-circle" : "fa-check-circle";
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(20px)";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// ADD TOAST STYLES
// ============================================
const toastStyles = document.createElement("style");
toastStyles.textContent = `
    .toast {
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 16px 24px;
        border-radius: 12px;
        background: var(--bg-card);
        color: var(--text-primary);
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        animation: slideUp 0.3s ease;
        z-index: 1000;
        border: 1px solid var(--border-color);
        min-width: 280px;
        max-width: 400px;
    }
    .toast.success {
        border-left: 4px solid var(--success);
    }
    .toast.success i {
        color: var(--success-light);
    }
    .toast.error {
        border-left: 4px solid var(--danger);
    }
    .toast.error i {
        color: var(--danger-light);
    }
    .toast.info {
        border-left: 4px solid var(--primary);
    }
    .toast.info i {
        color: var(--primary-light);
    }
    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @media (max-width: 480px) {
        .toast {
            bottom: 16px;
            right: 16px;
            left: 16px;
            min-width: auto;
        }
    }
`;
document.head.appendChild(toastStyles);
