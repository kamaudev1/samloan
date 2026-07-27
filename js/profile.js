// ============================================
// PROFILE CONTROLLER
// ============================================

let currentUser = null;
let userProfile = null;
let avatarFile = null;
let idFile = null;
let passportFile = null;
let signatureFile = null;

// Supabase Storage bucket names
const STORAGE_BUCKET = 'profiles';
const AVATAR_FOLDER = 'avatars';
const ID_FOLDER = 'ids';
const PASSPORT_FOLDER = 'passports';
const SIGNATURE_FOLDER = 'signatures';

// ============================================
// INITIALIZATION
// ============================================
(async () => {
    try {
        currentUser = await requireLogin();
        if (!currentUser) return;

        await loadProfile();
        await loadDocuments();

    } catch (error) {
        console.error("Initialization error:", error);
        showToast("Failed to load profile", "error");
    }
})();

// ============================================
// LOAD PROFILE
// ============================================
async function loadProfile() {
    try {
        const { data: profile, error } = await client
            .from("profiles")
            .select("*")
            .eq("id", currentUser.id)
            .single();

        if (error) throw error;

        userProfile = profile;

        // Update UI
        const fullName = profile.full_name || "User";
        const initial = fullName.charAt(0).toUpperCase();
        const role = profile.role || "customer";

        // Profile header
        document.getElementById("profileFullName").textContent = fullName;
        document.getElementById("profileRole").textContent = role.charAt(0).toUpperCase() + role.slice(1);
        document.getElementById("avatarInitial").textContent = initial;

        // Form fields
        document.getElementById("fullName").value = fullName;
        document.getElementById("email").value = profile.email || "";
        document.getElementById("phone").value = profile.phone || "";
        document.getElementById("nationalId").value = profile.national_id || "";
        document.getElementById("address").value = profile.address || "";

        // Sidebar and header
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

        // Load avatar if exists
        if (profile.avatar_url) {
            loadAvatar(profile.avatar_url);
        }

    } catch (error) {
        console.error("Load profile error:", error);
        showToast("Failed to load profile", "error");
    }
}

// ============================================
// LOAD DOCUMENTS STATUS
// ============================================
async function loadDocuments() {
    try {
        // Check for existing documents in storage
        const userId = currentUser.id;

        // Check avatar
        const avatarPath = `${AVATAR_FOLDER}/${userId}/avatar.jpg`;
        const { data: avatarData } = await client.storage
            .from(STORAGE_BUCKET)
            .list(`${AVATAR_FOLDER}/${userId}/`);
        
        if (avatarData && avatarData.length > 0) {
            document.getElementById("photoStatus").textContent = "Uploaded ✓";
            document.getElementById("photoStatus").style.color = "var(--success-light)";
        }

        // Check ID
        const idPath = `${ID_FOLDER}/${userId}/`;
        const { data: idData } = await client.storage
            .from(STORAGE_BUCKET)
            .list(idPath);
        
        if (idData && idData.length > 0) {
            document.getElementById("idStatus").textContent = "Uploaded ✓";
            document.getElementById("idStatus").style.color = "var(--success-light)";
        }

        // Check Passport
        const passportPath = `${PASSPORT_FOLDER}/${userId}/`;
        const { data: passportData } = await client.storage
            .from(STORAGE_BUCKET)
            .list(passportPath);
        
        if (passportData && passportData.length > 0) {
            document.getElementById("passportStatus").textContent = "Uploaded ✓";
            document.getElementById("passportStatus").style.color = "var(--success-light)";
        }

        // Check Signature
        const signaturePath = `${SIGNATURE_FOLDER}/${userId}/`;
        const { data: signatureData } = await client.storage
            .from(STORAGE_BUCKET)
            .list(signaturePath);
        
        if (signatureData && signatureData.length > 0) {
            document.getElementById("signatureStatus").textContent = "Uploaded ✓";
            document.getElementById("signatureStatus").style.color = "var(--success-light)";
        }

    } catch (error) {
        console.error("Load documents error:", error);
    }
}

// ============================================
// UPDATE PROFILE
// ============================================
async function updateProfile(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("updateProfileBtn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

    try {
        const fullName = document.getElementById("fullName").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const nationalId = document.getElementById("nationalId").value.trim();
        const address = document.getElementById("address").value.trim();

        if (!fullName) {
            showToast("Please enter your full name", "error");
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Profile';
            return;
        }

        const { error } = await client
            .from("profiles")
            .update({
                full_name: fullName,
                phone: phone || null,
                national_id: nationalId || null,
                address: address || null,
                updated_at: new Date().toISOString()
            })
            .eq("id", currentUser.id);

        if (error) throw error;

        // Update UI
        document.getElementById("profileFullName").textContent = fullName;
        document.getElementById("welcome").innerHTML = `Welcome, <strong>${fullName}</strong>`;
        document.getElementById("headerUserName").textContent = fullName;

        showToast("Profile updated successfully!", "success");
        await loadProfile();

    } catch (error) {
        console.error("Update profile error:", error);
        showToast("Failed to update profile: " + error.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-save"></i> Update Profile';
    }
}

// ============================================
// UPLOAD AVATAR
// ============================================
async function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast("Please upload an image file", "error");
        return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be less than 5MB", "error");
        return;
    }

    try {
        showToast("Uploading avatar...", "info");

        const userId = currentUser.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar.${fileExt}`;
        const filePath = `${AVATAR_FOLDER}/${userId}/${fileName}`;

        // Upload file
        const { error: uploadError } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = client.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filePath);

        const avatarUrl = urlData.publicUrl;

        // Update profile with avatar URL
        const { error: updateError } = await client
            .from("profiles")
            .update({ avatar_url: avatarUrl })
            .eq("id", userId);

        if (updateError) throw updateError;

        // Update UI
        loadAvatar(avatarUrl);
        document.getElementById("photoStatus").textContent = "Uploaded ✓";
        document.getElementById("photoStatus").style.color = "var(--success-light)";

        showToast("Avatar uploaded successfully!", "success");

    } catch (error) {
        console.error("Upload avatar error:", error);
        showToast("Failed to upload avatar: " + error.message, "error");
    }
}

// ============================================
// LOAD AVATAR
// ============================================
function loadAvatar(avatarUrl) {
    const img = document.getElementById("profileImage");
    const initial = document.getElementById("avatarInitial");
    
    if (avatarUrl) {
        img.src = avatarUrl;
        img.classList.add("show");
        initial.style.display = "none";
    }
}

// ============================================
// UPLOAD ID
// ============================================
async function uploadID(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        showToast("Please upload a JPG, PNG, or PDF file", "error");
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast("File size must be less than 10MB", "error");
        return;
    }

    try {
        showToast("Uploading ID...", "info");

        const userId = currentUser.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `id.${fileExt}`;
        const filePath = `${ID_FOLDER}/${userId}/${fileName}`;

        // Upload file
        const { error: uploadError } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Update status
        document.getElementById("idStatus").textContent = "Uploaded ✓";
        document.getElementById("idStatus").style.color = "var(--success-light)";

        showToast("ID uploaded successfully!", "success");

    } catch (error) {
        console.error("Upload ID error:", error);
        showToast("Failed to upload ID: " + error.message, "error");
    }
}

// ============================================
// UPLOAD PASSPORT
// ============================================
async function uploadPassport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast("Please upload an image file", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be less than 5MB", "error");
        return;
    }

    try {
        showToast("Uploading passport photo...", "info");

        const userId = currentUser.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `passport.${fileExt}`;
        const filePath = `${PASSPORT_FOLDER}/${userId}/${fileName}`;

        const { error: uploadError } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        document.getElementById("passportStatus").textContent = "Uploaded ✓";
        document.getElementById("passportStatus").style.color = "var(--success-light)";

        showToast("Passport photo uploaded successfully!", "success");

    } catch (error) {
        console.error("Upload passport error:", error);
        showToast("Failed to upload passport: " + error.message, "error");
    }
}

// ============================================
// UPLOAD SIGNATURE
// ============================================
async function uploadSignature(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast("Please upload an image file", "error");
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showToast("File size must be less than 5MB", "error");
        return;
    }

    try {
        showToast("Uploading signature...", "info");

        const userId = currentUser.id;
        const fileExt = file.name.split('.').pop();
        const fileName = `signature.${fileExt}`;
        const filePath = `${SIGNATURE_FOLDER}/${userId}/${fileName}`;

        const { error: uploadError } = await client.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) throw uploadError;

        document.getElementById("signatureStatus").textContent = "Uploaded ✓";
        document.getElementById("signatureStatus").style.color = "var(--success-light)";

        showToast("Signature uploaded successfully!", "success");

    } catch (error) {
        console.error("Upload signature error:", error);
        showToast("Failed to upload signature: " + error.message, "error");
    }
}

// ============================================
// CHANGE PASSWORD
// ============================================
function showChangePassword() {
    document.getElementById("passwordModal").style.display = "flex";
    document.getElementById("passwordForm").reset();
}

function closePasswordModal() {
    document.getElementById("passwordModal").style.display = "none";
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showToast("Please fill in all fields", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showToast("Passwords do not match", "error");
        return;
    }

    if (newPassword.length < 6) {
        showToast("Password must be at least 6 characters", "error");
        return;
    }

    const submitBtn = document.getElementById("changePasswordBtn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Changing...';

    try {
        const { error } = await client.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showToast("Password changed successfully!", "success");
        closePasswordModal();

    } catch (error) {
        console.error("Change password error:", error);
        showToast("Failed to change password. Please check your current password.", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-key"></i> Change Password';
    }
}

// ============================================
// REFRESH PROFILE
// ============================================
function refreshProfile() {
    showToast("Refreshing profile...", "info");
    loadProfile();
    loadDocuments();
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

// ============================================
// CLOSE MODALS ON OUTSIDE CLICK
// ============================================
document.addEventListener("click", (e) => {
    const passwordModal = document.getElementById("passwordModal");
    if (e.target === passwordModal) closePasswordModal();
});
