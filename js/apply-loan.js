// ============================================
// APPLY LOAN CONTROLLER
// ============================================

let currentUser = null;
let currentStep = 1;
let userProfile = null;

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

        userProfile = profile;

        // Update UI with user info
        const fullName = profile.full_name || "User";
        const initial = fullName.charAt(0).toUpperCase();
        const role = profile.role || "customer";

        // Welcome message
        document.getElementById("welcome").textContent = `Welcome, ${fullName}`;
        document.getElementById("welcome").innerHTML = `Welcome, <strong>${fullName}</strong>`;

        // Role display
        document.getElementById("role").textContent = role.toUpperCase();
        
        // User avatar initials
        document.querySelectorAll("#userInitial, #sidebarInitial").forEach(el => {
            el.textContent = initial;
        });

        // Header user info
        document.getElementById("headerUserName").textContent = fullName;
        document.getElementById("headerUserRole").textContent = role.charAt(0).toUpperCase() + role.slice(1);

        // Show Admin panel link for admins
        if (role === "admin") {
            document.getElementById("adminMenu").style.display = "block";
        }

        // Pre-fill form with user data
        document.getElementById("fullName").value = fullName;
        document.getElementById("email").value = profile.email || "";
        document.getElementById("phone").value = profile.phone || "";
        document.getElementById("nationalId").value = profile.national_id || "";
        document.getElementById("address").value = profile.address || "";

        // Add loan amount calculator
        setupLoanCalculator();

    } catch (error) {
        console.error("Initialization error:", error);
        showToast("Failed to load user profile", "error");
    }
})();

// ============================================
// LOAN CALCULATOR
// ============================================
function setupLoanCalculator() {
    const amountInput = document.getElementById("loanAmount");
    const termSelect = document.getElementById("loanTerm");
    
    amountInput.addEventListener("input", calculateLoan);
    termSelect.addEventListener("change", calculateLoan);
}

function calculateLoan() {
    const amount = parseFloat(document.getElementById("loanAmount").value) || 0;
    const term = parseInt(document.getElementById("loanTerm").value) || 1;
    const rate = 12.5; // Fixed rate 12.5% per annum
    
    if (amount <= 0 || term <= 0) {
        document.getElementById("monthlyPayment").textContent = "KES 0";
        document.getElementById("totalInterest").textContent = "KES 0";
        document.getElementById("totalAmount").textContent = "KES 0";
        return;
    }

    // Calculate monthly payment (simple interest formula)
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = amount * monthlyRate * Math.pow(1 + monthlyRate, term) / (Math.pow(1 + monthlyRate, term) - 1);
    const totalPayment = monthlyPayment * term;
    const totalInterest = totalPayment - amount;

    document.getElementById("monthlyPayment").textContent = `KES ${monthlyPayment.toFixed(2)}`;
    document.getElementById("totalInterest").textContent = `KES ${totalInterest.toFixed(2)}`;
    document.getElementById("totalAmount").textContent = `KES ${totalPayment.toFixed(2)}`;
}

// ============================================
// STEP NAVIGATION
// ============================================
function nextStep(step) {
    // Validate current step
    if (currentStep === 1) {
        if (!validateStep1()) {
            return;
        }
    }
    if (currentStep === 2) {
        if (!validateStep2()) {
            return;
        }
        // Update review section
        updateReview();
    }

    currentStep = step;
    updateSteps();
}

function prevStep(step) {
    currentStep = step;
    updateSteps();
}

function updateSteps() {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => el.style.display = 'none');
    
    // Show current step
    document.getElementById(`step${currentStep}`).style.display = 'block';
    
    // Update progress
    document.querySelectorAll('.progress-step').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        
        if (stepNum === currentStep) {
            el.classList.add('active');
        } else if (stepNum < currentStep) {
            el.classList.add('completed');
        }
    });
    
    // Update progress lines
    document.querySelectorAll('.progress-line').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.toggle('completed', stepNum < currentStep);
    });
}

// ============================================
// VALIDATION
// ============================================
function validateStep1() {
    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const nationalId = document.getElementById("nationalId").value.trim();

    if (!fullName) {
        showToast("Please enter your full name", "error");
        document.getElementById("fullName").focus();
        return false;
    }

    if (!email) {
        showToast("Please enter your email address", "error");
        document.getElementById("email").focus();
        return false;
    }

    if (!isValidEmail(email)) {
        showToast("Please enter a valid email address", "error");
        document.getElementById("email").focus();
        return false;
    }

    if (!phone) {
        showToast("Please enter your phone number", "error");
        document.getElementById("phone").focus();
        return false;
    }

    if (!nationalId) {
        showToast("Please enter your National ID", "error");
        document.getElementById("nationalId").focus();
        return false;
    }

    return true;
}

function validateStep2() {
    const amount = document.getElementById("loanAmount").value.trim();
    const purpose = document.getElementById("loanPurpose").value;
    const term = document.getElementById("loanTerm").value;

    if (!amount || parseFloat(amount) < 1000) {
        showToast("Please enter a valid loan amount (minimum KES 1,000)", "error");
        document.getElementById("loanAmount").focus();
        return false;
    }

    if (!purpose) {
        showToast("Please select a loan purpose", "error");
        document.getElementById("loanPurpose").focus();
        return false;
    }

    if (!term) {
        showToast("Please select a loan term", "error");
        document.getElementById("loanTerm").focus();
        return false;
    }

    return true;
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// UPDATE REVIEW
// ============================================
function updateReview() {
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
    const nationalId = document.getElementById("nationalId").value;
    const address = document.getElementById("address").value || "Not provided";
    const amount = document.getElementById("loanAmount").value;
    const purpose = document.getElementById("loanPurpose").value;
    const term = document.getElementById("loanTerm").value;
    const monthlyPayment = document.getElementById("monthlyPayment").textContent;

    document.getElementById("reviewName").textContent = fullName;
    document.getElementById("reviewEmail").textContent = email;
    document.getElementById("reviewPhone").textContent = phone;
    document.getElementById("reviewNationalId").textContent = nationalId;
    document.getElementById("reviewAddress").textContent = address;
    document.getElementById("reviewAmount").textContent = `KES ${parseInt(amount).toLocaleString()}`;
    document.getElementById("reviewPurpose").textContent = purpose;
    document.getElementById("reviewTerm").textContent = `${term} months`;
    document.getElementById("reviewMonthly").textContent = monthlyPayment;
}

// ============================================
// FORM SUBMISSION
// ============================================
async function handleSubmit(event) {
    event.preventDefault();

    const termsCheck = document.getElementById("termsCheck");
    if (!termsCheck.checked) {
        showToast("Please agree to the Terms and Conditions", "error");
        termsCheck.focus();
        return;
    }

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';

    try {
        // Get form data
        const fullName = document.getElementById("fullName").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const nationalId = document.getElementById("nationalId").value.trim();
        const address = document.getElementById("address").value.trim();
        const amount = parseFloat(document.getElementById("loanAmount").value);
        const purpose = document.getElementById("loanPurpose").value;
        const term = parseInt(document.getElementById("loanTerm").value);
        const notes = document.getElementById("loanNotes").value.trim();

        // Create application
        const { data: application, error } = await client
            .from("applications")
            .insert({
                customer_id: currentUser.id,
                applicant_name: fullName,
                email: email,
                phone: phone,
                national_id: nationalId,
                address: address,
                amount: amount,
                purpose: purpose,
                term_months: term,
                notes: notes,
                status: "pending"
            })
            .select()
            .single();

        if (error) throw error;

        // Show success message
        document.getElementById("applicationForm").style.display = "none";
        document.getElementById("successMessage").style.display = "block";

        // Show toast
        showToast("Loan application submitted successfully!", "success");

    } catch (error) {
        console.error("Submission error:", error);
        showToast(error.message || "Failed to submit application", "error");
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Application';
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = "success") {
    const existingToasts = document.querySelectorAll(".toast");
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "fa-check-circle" : "fa-exclamation-circle";
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
// SHOW TERMS
// ============================================
function showTerms() {
    alert(
        "Sam Loans Terms and Conditions\n\n" +
        "1. All loan applications are subject to approval.\n" +
        "2. Interest rates are fixed at 12.5% per annum.\n" +
        "3. Late payments will incur additional fees.\n" +
        "4. All information provided must be accurate.\n" +
        "5. Loans are subject to credit assessment.\n" +
        "6. Terms may vary based on loan amount.\n\n" +
        "By applying, you agree to these terms."
    );
}

// ============================================
// ADD TOAST STYLES (Dynamic)
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
