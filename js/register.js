// ============================================================
// REGISTER · Sam Loans
// Fully improved with validation, loading states & error handling
// ============================================================

const form = document.getElementById('registerForm');
const message = document.getElementById('message');

// Get form fields
const fullName = document.getElementById('fullName');
const email = document.getElementById('email');
const phone = document.getElementById('phone');
const nationalId = document.getElementById('nationalId');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');
const termsCheck = document.getElementById('terms');

// ── Helper: Show message ──
function setMessage(text, type = 'info') {
    message.textContent = text;
    const colors = {
        info: '#2563EB',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b'
    };
    message.style.color = colors[type] || colors.info;
}

// ── Helper: Toggle button loading state ──
function setLoading(loading) {
    const btn = form.querySelector('button[type="submit"]');
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating account...';
    } else {
        btn.disabled = false;
        btn.innerHTML = 'Create Account';
    }
}

// ── Validation ──
function validateForm() {
    const name = fullName.value.trim();
    const emailVal = email.value.trim();
    const phoneVal = phone.value.trim();
    const idVal = nationalId.value.trim();
    const pass = password.value;
    const confirm = confirmPassword.value;

    if (!name || !emailVal || !phoneVal || !idVal || !pass || !confirm) {
        setMessage('Please fill in all fields.', 'warning');
        return false;
    }

    if (pass.length < 8) {
        setMessage('Password must be at least 8 characters.', 'error');
        return false;
    }

    if (pass !== confirm) {
        setMessage('Passwords do not match.', 'error');
        return false;
    }

    if (!termsCheck.checked) {
        setMessage('You must agree to the Terms & Conditions.', 'warning');
        return false;
    }

    // Basic email format check
    if (!emailVal.includes('@') || !emailVal.includes('.')) {
        setMessage('Please enter a valid email address.', 'error');
        return false;
    }

    return { name, emailVal, phoneVal, idVal, pass };
}

// ── Main submit ──
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous message
    message.textContent = '';

    // Validate
    const validated = validateForm();
    if (!validated) return;

    const { name, emailVal, phoneVal, idVal, pass } = validated;

    // Show loading state
    setLoading(true);
    setMessage('Creating your account...', 'info');

    try {
        // 1. Sign up with Supabase
        const { data, error } = await client.auth.signUp({
            email: emailVal,
            password: pass,
            options: {
                data: {
                    full_name: name,
                    phone: phoneVal,
                    national_id: idVal,
                }
            }
        });

        if (error) throw error;

        // 2. Check if user was created
        if (!data.user) {
            throw new Error('Signup succeeded but no user returned.');
        }

        // 3. Optionally create profile row directly (in case trigger not set)
        //    Supabase usually auto-creates via trigger, but this is a safety net.
        try {
            const { error: profileError } = await client
                .from('profiles')
                .insert({
                    id: data.user.id,
                    full_name: name,
                    email: emailVal,
                    phone: phoneVal,
                    national_id: idVal,
                    role: 'customer'
                });

            if (profileError) {
                // If it fails because row already exists (trigger did it), ignore
                if (profileError.code !== '23505') {
                    console.warn('Profile insert warning:', profileError.message);
                }
            }
        } catch (profileErr) {
            console.warn('Profile creation skipped (may exist):', profileErr.message);
        }

        // 4. Success
        setLoading(false);
        setMessage('✅ Registration successful! Please check your email to verify your account.', 'success');
        form.reset();

        // Optional: redirect after 3 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 4000);

    } catch (err) {
        console.error('Registration error:', err);

        // Handle specific errors
        let userMsg = err.message;
        if (err.message.includes('already registered')) {
            userMsg = 'This email is already registered. Please login instead.';
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
            userMsg = 'Network error. Please check your internet connection and try again.';
        } else if (err.message.includes('rate limit')) {
            userMsg = 'Too many attempts. Please wait a moment and try again.';
        }

        setLoading(false);
        setMessage('❌ ' + userMsg, 'error');
    }
});

// ── Reset message on input change ──
form.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
        if (message.textContent && !message.textContent.includes('✅')) {
            message.textContent = '';
        }
    });
});

console.log('✅ Registration script loaded.');
