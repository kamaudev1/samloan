// ============================================
// PAYMENTS CONTROLLER
// ============================================

let currentUser = null;
let allPayments = [];
let filteredPayments = [];
let userLoans = [];

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

        // Load payments
        await loadPayments();
        await loadUserLoans();

        // Check if loan_id is in URL (from loans page)
        const urlParams = new URLSearchParams(window.location.search);
        const loanId = urlParams.get('loan_id');
        if (loanId) {
            setTimeout(() => {
                showMakePayment(loanId);
            }, 500);
        }

    } catch (error) {
        console.error("Initialization error:", error);
        showToast("Failed to load your payments", "error");
    }
})();

// ============================================
// LOAD PAYMENTS
// ============================================
async function loadPayments() {
    const spinner = document.getElementById("loadingSpinner");
    const content = document.getElementById("paymentsContent");
    
    spinner.style.display = "flex";
    content.style.display = "none";

    try {
        const { data: payments, error } = await client
            .from("payments")
            .select("*")
            .eq("customer_id", currentUser.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        allPayments = payments || [];
        filteredPayments = [...allPayments];
        
        // Update stats
        updateStats(allPayments);
        
        // Render table
        renderPayments(allPayments);

        spinner.style.display = "none";
        content.style.display = "block";

    } catch (error) {
        console.error("Load payments error:", error);
        showToast("Failed to load your payments: " + error.message, "error");
        spinner.style.display = "none";
        content.style.display = "block";
    }
}

// ============================================
// LOAD USER LOANS (for payment form)
// ============================================
async function loadUserLoans() {
    try {
        const { data: loans, error } = await client
            .from("loans")
            .select("*")
            .eq("customer_id", currentUser.id)
            .eq("status", "active");

        if (error) throw error;

        userLoans = loans || [];
        
        // Populate loan dropdown
        const select = document.getElementById("paymentLoanId");
        select.innerHTML = '<option value="">Select a loan</option>';
        userLoans.forEach(loan => {
            const option = document.createElement("option");
            option.value = loan.id;
            option.textContent = `#${loan.id.slice(0, 8)} - KES ${(loan.amount || 0).toLocaleString()}`;
            option.dataset.amount = loan.amount || 0;
            select.appendChild(option);
        });

        // Add change event to update balance hint
        select.addEventListener('change', function() {
            const amount = this.options[this.selectedIndex]?.dataset?.amount || 0;
            document.getElementById("loanBalanceHint").textContent = 
                `Loan Amount: KES ${parseInt(amount).toLocaleString()}`;
        });

    } catch (error) {
        console.error("Load user loans error:", error);
    }
}

// ============================================
// UPDATE STATS
// ============================================
function updateStats(payments) {
    const total = payments.length;
    const completed = payments.filter(p => p.status === 'completed').length;
    const pending = payments.filter(p => p.status === 'pending').length;
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    document.getElementById("totalPayments").textContent = total;
    document.getElementById("completedPayments").textContent = completed;
    document.getElementById("pendingPayments").textContent = pending;
    document.getElementById("totalAmount").textContent = `KES ${totalAmount.toLocaleString()}`;
}

// ============================================
// RENDER PAYMENTS
// ============================================
function renderPayments(payments) {
    const tbody = document.getElementById("paymentsTableBody");
    const emptyState = document.getElementById("emptyState");

    if (!payments || payments.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    
    tbody.innerHTML = payments.map(payment => `
        <tr>
            <td><strong>#${payment.id.slice(0, 8)}</strong></td>
            <td>${payment.loan_id ? `#${payment.loan_id.slice(0, 8)}` : 'N/A'}</td>
            <td><strong>KES ${(payment.amount || 0).toLocaleString()}</strong></td>
            <td><span class="status-badge ${payment.type || 'payment'}">${payment.type || 'Payment'}</span></td>
            <td>${payment.payment_method || 'N/A'}</td>
            <td><span class="status-badge ${payment.status || 'pending'}">${payment.status || 'Pending'}</span></td>
            <td>${payment.created_at ? new Date(payment.created_at).toLocaleDateString() : 'N/A'}</td>
            <td>
                <button class="btn-icon primary" onclick="viewPayment('${payment.id}')" title="View Details">
                    <i class="fa-solid fa-eye"></i>
                </button>
                ${payment.status === 'pending' ? `
                    <button class="btn-icon success" onclick="completePayment('${payment.id}')" title="Complete Payment">
                        <i class="fa-solid fa-check"></i>
                    </button>
                ` : ''}
                <button class="btn-icon danger" onclick="deletePayment('${payment.id}')" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// FILTER PAYMENTS
// ============================================
function filterPayments() {
    const statusFilter = document.getElementById("statusFilter").value;
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    filteredPayments = allPayments.filter(payment => {
        if (statusFilter !== 'all' && payment.status !== statusFilter) {
            return false;
        }
        
        if (searchTerm) {
            const searchable = [
                payment.id,
                payment.loan_id || '',
                payment.status || '',
                payment.type || '',
                String(payment.amount),
                payment.payment_method || ''
            ].join(' ').toLowerCase();
            if (!searchable.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });

    renderPayments(filteredPayments);
}

function searchPayments() {
    filterPayments();
}

function resetFilters() {
    document.getElementById("statusFilter").value = 'all';
    document.getElementById("searchInput").value = '';
    filteredPayments = [...allPayments];
    renderPayments(allPayments);
}

function refreshPayments() {
    showToast("Refreshing payments...", "info");
    loadPayments();
}

// ============================================
// SHOW MAKE PAYMENT MODAL
// ============================================
function showMakePayment(loanId = null) {
    const modal = document.getElementById("paymentModal");
    const form = document.getElementById("paymentForm");
    form.reset();
    
    // Reset loan selection
    const select = document.getElementById("paymentLoanId");
    if (loanId) {
        select.value = loanId;
    }
    
    // Update balance hint
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption && selectedOption.dataset.amount) {
        document.getElementById("loanBalanceHint").textContent = 
            `Loan Amount: KES ${parseInt(selectedOption.dataset.amount).toLocaleString()}`;
    }
    
    modal.style.display = "flex";
}

// ============================================
// CLOSE PAYMENT MODAL
// ============================================
function closePaymentModal() {
    document.getElementById("paymentModal").style.display = "none";
}

// ============================================
// HANDLE PAYMENT SUBMIT
// ============================================
async function handlePaymentSubmit(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("submitPaymentBtn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
        const loanId = document.getElementById("paymentLoanId").value;
        const amount = parseFloat(document.getElementById("paymentAmount").value);
        const method = document.getElementById("paymentMethod").value;
        const type = document.getElementById("paymentType").value;
        const reference = document.getElementById("paymentReference").value.trim();
        const notes = document.getElementById("paymentNotes").value.trim();

        if (!loanId) {
            showToast("Please select a loan", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Payment';
            return;
        }

        if (!amount || amount < 100) {
            showToast("Please enter a valid amount (minimum KES 100)", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Payment';
            return;
        }

        // Get loan details
        const { data: loan, error: loanError } = await client
            .from("loans")
            .select("customer_name, amount")
            .eq("id", loanId)
            .single();

        if (loanError) throw loanError;

        // Create payment
        const { data: payment, error } = await client
            .from("payments")
            .insert({
                loan_id: loanId,
                customer_id: currentUser.id,
                customer_name: loan.customer_name || "Customer",
                amount: amount,
                type: type,
                payment_method: method,
                status: "completed",
                reference: reference || null,
                notes: notes || null,
                payment_date: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        showToast("Payment submitted successfully!", "success");
        closePaymentModal();
        loadPayments();

    } catch (error) {
        console.error("Payment submission error:", error);
        showToast(error.message || "Failed to submit payment", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Payment';
    }
}

// ============================================
// VIEW PAYMENT DETAILS
// ============================================
async function viewPayment(paymentId) {
    try {
        const { data: payment, error } = await client
            .from("payments")
            .select("*")
            .eq("id", paymentId)
            .single();

        if (error) throw error;

        const modal = document.getElementById("detailsModal");
        const details = document.getElementById("paymentDetails");

        details.innerHTML = `
            <div class="payment-detail-grid">
                <div class="payment-detail-item">
                    <label>Payment ID</label>
                    <strong>#${payment.id.slice(0, 12)}</strong>
                </div>
                <div class="payment-detail-item">
                    <label>Status</label>
                    <strong><span class="status-badge ${payment.status}">${payment.status}</span></strong>
                </div>
                <div class="payment-detail-item">
                    <label>Amount</label>
                    <strong>KES ${(payment.amount || 0).toLocaleString()}</strong>
                </div>
                <div class="payment-detail-item">
                    <label>Type</label>
                    <strong>${payment.type || 'Payment'}</strong>
                </div>
                <div class="payment-detail-item">
                    <label>Method</label>
                    <strong>${payment.payment_method || 'N/A'}</strong>
                </div>
                <div class="payment-detail-item">
                    <label>Loan ID</label>
                    <strong>${payment.loan_id ? `#${payment.loan_id.slice(0, 12)}` : 'N/A'}</strong>
                </div>
                <div class="payment-detail-item">
                    <label>Payment Date</label>
                    <strong>${payment.payment_date ? new Date(payment.payment_date).toLocaleString() : 'N/A'}</strong>
                </div>
                <div class="payment-detail-item">
                    <label>Created At</label>
                    <strong>${payment.created_at ? new Date(payment.created_at).toLocaleString() : 'N/A'}</strong>
                </div>
                ${payment.reference ? `
                    <div class="payment-detail-item payment-detail-full">
                        <label>Reference</label>
                        <strong>${payment.reference}</strong>
                    </div>
                ` : ''}
                ${payment.notes ? `
                    <div class="payment-detail-item payment-detail-full">
                        <label>Notes</label>
                        <strong>${payment.notes}</strong>
                    </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-color);">
                <button class="btn-secondary" onclick="closeDetailsModal()">Close</button>
            </div>
        `;

        modal.style.display = "flex";

    } catch (error) {
        console.error("View payment error:", error);
        showToast("Failed to load payment details", "error");
    }
}

// ============================================
// COMPLETE PAYMENT
// ============================================
async function completePayment(paymentId) {
    if (!confirm("Mark this payment as completed?")) return;

    try {
        const { error } = await client
            .from("payments")
            .update({ 
                status: "completed",
                updated_at: new Date().toISOString()
            })
            .eq("id", paymentId);

        if (error) throw error;

        showToast("Payment marked as completed!", "success");
        loadPayments();
    } catch (error) {
        console.error("Complete payment error:", error);
        showToast("Failed to complete payment", "error");
    }
}

// ============================================
// DELETE PAYMENT
// ============================================
async function deletePayment(paymentId) {
    if (!confirm("Are you sure you want to delete this payment? This action cannot be undone.")) return;

    try {
        const { error } = await client
            .from("payments")
            .delete()
            .eq("id", paymentId);

        if (error) throw error;

        showToast("Payment deleted successfully!", "success");
        loadPayments();
    } catch (error) {
        console.error("Delete payment error:", error);
        showToast("Failed to delete payment", "error");
    }
}

// ============================================
// CLOSE DETAILS MODAL
// ============================================
function closeDetailsModal() {
    document.getElementById("detailsModal").style.display = "none";
}

// Close modals on outside click
document.addEventListener("click", (e) => {
    const paymentModal = document.getElementById("paymentModal");
    const detailsModal = document.getElementById("detailsModal");
    if (e.target === paymentModal) closePaymentModal();
    if (e.target === detailsModal) closeDetailsModal();
});

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
