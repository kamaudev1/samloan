// ============================================
// REGISTRATION CONTROLLER - Modern
// ============================================

let currentStep = 1;
const totalSteps = 2;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    checkAuthStatus();
    
    // Password strength checker
    document.getElementById('regPassword').addEventListener('input', checkPasswordStrength);
    document.getElementById('regConfirmPassword').addEventListener('input', checkPasswordMatch);
});

// ============================================
// CHECK AUTH STATUS
// ============================================
async function checkAuthStatus() {
    try {
        const { data: { user } } = await client.auth.getUser();
        if (user) {
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.log('Not logged in');
    }
}

// ============================================
// STEP NAVIGATION
// ============================================
function nextStep() {
    // Validate step 1
    if (!validateStep1()) {
        return;
    }
    
    currentStep = 2;
    updateSteps();
}

function prevStep() {
    currentStep = 1;
    updateSteps();
}

function updateSteps() {
    // Hide all steps
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    
    // Show current step
    document.getElementById(`step${currentStep}`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step-indicator').forEach((el, index) => {
        const stepNum = index + 1;
        el.classList.remove('active', 'completed');
        
        if (stepNum === currentStep) {
            el.classList.add('active');
        } else if (stepNum < currentStep) {
            el.classList.add('completed');
        }
    });
}

// ============================================
// VALIDATE STEP 1
// ============================================
function validateStep1() {
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const nationalId = document.getElementById('regNationalId').value.trim();

    if (!fullName) {
        showToast('Please enter your full name', 'error');
        document.getElementById('fullName').focus();
        return false;
    }

    if (fullName.length < 2) {
        showToast('Please enter a valid full name', 'error');
        document.getElementById('fullName').focus();
        return false;
    }

    if (!email) {
        showToast('Please enter your email address', 'error');
        document.getElementById('regEmail').focus();
        return false;
    }

    if (!isValidEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        document.getElementById('regEmail').focus();
        return false;
    }

    if (phone && !isValidPhone(phone)) {
        showToast('Please enter a valid phone number', 'error');
        document.getElementById('regPhone').focus();
        return false;
    }

    return true;
}

// ============================================
// HANDLE REGISTRATION
// ============================================
async function handleRegister(event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const nationalId = document.getElementById('regNationalId').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const termsCheck = document.getElementById('termsCheck');

    // Validate step 2
    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        document.getElementById('regPassword').focus();
        return;
    }

    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        document.getElementById('regConfirmPassword').focus();
        return;
    }

    if (!termsCheck.checked) {
        showToast('Please agree to the Terms of Service', 'error');
        termsCheck.focus();
        return;
    }

    // Show loading state
    const registerBtn = document.getElementById('registerBtn');
    const btnContent = registerBtn.querySelector('.btn-content');
    const btnLoading = registerBtn.querySelector('.btn-loading');
    
    registerBtn.disabled = true;
    btnContent.style.display = 'none';
    btnLoading.style.display = 'flex';

    try {
        // Check if user already exists
        const { data: existingUser } = await client
            .from('profiles')
            .select('email')
            .eq('email', email)
            .maybeSingle();

        if (existingUser) {
            showToast('An account with this email already exists. Please login.', 'error');
            registerBtn.disabled = false;
            btnContent.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
        }

        // Create auth user
        const { data: authData, error: authError } = await client.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: fullName,
                    role: 'customer'
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                showToast('This email is already registered. Please login.', 'error');
            } else {
                showToast(authError.message, 'error');
            }
            registerBtn.disabled = false;
            btnContent.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
        }

        if (!authData.user) {
            showToast('Failed to create account. Please try again.', 'error');
            registerBtn.disabled = false;
            btnContent.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
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
                role: 'customer'
            });

        if (profileError) {
            console.error('Profile creation error:', profileError);
            showToast('Account created but profile setup failed. Please contact support.', 'error');
            registerBtn.disabled = false;
            btnContent.style.display = 'flex';
            btnLoading.style.display = 'none';
            return;
        }

        showToast('Account created successfully! Redirecting...', 'success');

        // Redirect after short delay
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);

    } catch (error) {
        console.error('Registration error:', error);
        showToast('An unexpected error occurred. Please try again.', 'error');
        registerBtn.disabled = false;
        btnContent.style.display = 'flex';
        btnLoading.style.display = 'none';
    }
}

// ============================================
// GOOGLE REGISTRATION
// ============================================
async function handleGoogleRegister() {
    try {
        showToast('Redirecting to Google...', 'info');
        
        const { data, error } = await client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/dashboard.html'
            }
        });

        if (error) throw error;

    } catch (error) {
        console.error('Google registration error:', error);
        showToast('Failed to continue with Google. Please try again.', 'error');
    }
}

// ============================================
// PASSWORD STRENGTH
// ============================================
function checkPasswordStrength() {
    const password = document.getElementById('regPassword').value;
    const strengthBar = document.querySelector('.strength-meter');
    const strengthText = document.querySelector('.strength-text');
    const strengthContainer = document.getElementById('passwordStrength');

    if (password.length === 0) {
        strengthContainer.style.display = 'none';
        return;
    }

    strengthContainer.style.display = 'block';

    let strength = 0;
    let label = '';

    // Length check
    if (password.length >= 8) strength += 25;
    else if (password.length >= 6) strength += 15;

    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 25;

    // Lowercase check
    if (/[a-z]/.test(password)) strength += 25;

    // Number check
    if (/[0-9]/.test(password)) strength += 12.5;

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 12.5;

    // Determine label
    if (strength < 30) label = 'Weak';
    else if (strength < 50) label = 'Fair';
    else if (strength < 70) label = 'Good';
    else if (strength < 85) label = 'Strong';
    else label = 'Very Strong';

    // Update UI
    strengthBar.style.width = strength + '%';
    strengthBar.style.background = 
        strength < 30 ? '#dc2626' :
        strength < 50 ? '#d97706' :
        strength < 70 ? '#fbbf24' :
        strength < 85 ? '#34d399' :
        '#059669';
    
    strengthText.textContent = label;
    strengthText.style.color = 
        strength < 30 ? '#dc2626' :
        strength < 50 ? '#d97706' :
        strength < 70 ? '#fbbf24' :
        strength < 85 ? '#34d399' :
        '#059669';
}

function checkPasswordMatch() {
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    
    if (confirm.length === 0) return;
    
    const inputWrapper = document.getElementById('regConfirmPassword').closest('.input-wrapper');
    const icon = inputWrapper.querySelector('.input-icon');
    
    if (password === confirm) {
        icon.style.color = 'var(--success-light)';
    } else {
        icon.style.color = 'var(--danger-light)';
    }
}

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const toggleBtn = input.closest('.input-wrapper').querySelector('.toggle-password i');
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        toggleBtn.className = 'fas fa-eye';
    }
}

// ============================================
// MODALS
// ============================================
function showTerms() {
    document.getElementById('termsModal').style.display = 'flex';
    document.getElementById('termsModal').classList.add('show');
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
    document.getElementById('termsModal').classList.remove('show');
}

function showPrivacy() {
    document.getElementById('privacyModal').style.display = 'flex';
    document.getElementById('privacyModal').classList.add('show');
}

function closePrivacyModal() {
    document.getElementById('privacyModal').style.display = 'none';
    document.getElementById('privacyModal').classList.remove('show');
}

// Close modals on outside click
document.addEventListener('click', function(e) {
    const modals = ['termsModal', 'privacyModal'];
    modals.forEach(id => {
        const modal = document.getElementById(id);
        if (e.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
});

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' : 
                 'fa-info-circle';
    
    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    toast.className = `toast show ${type}`;
    
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    // Basic phone validation (Kenyan format)
    return /^(\+254|0)[7-9][0-9]{8}$/.test(phone.replace(/\s/g, ''));
}
