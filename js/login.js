const form = document.getElementById("loginForm");

const message = document.getElementById("message");

const toggle = document.getElementById("togglePassword");

const password = document.getElementById("password");

// Show / Hide Password
toggle.addEventListener("click", () => {

    if (password.type === "password") {

        password.type = "text";

        toggle.classList.replace("fa-eye", "fa-eye-slash");

    } else {

        password.type = "password";

        toggle.classList.replace("fa-eye-slash", "fa-eye");

    }

});

// Login
form.addEventListener("submit", async (e) => {

    e.preventDefault();

    message.style.color = "#2563EB";
    message.textContent = "Signing in...";

    const email = document.getElementById("email").value.trim();

    const pass = password.value;

    const { data, error } =
        await client.auth.signInWithPassword({

            email,

            password: pass

        });

    if (error) {

        message.style.color = "red";

        message.textContent = error.message;

        return;

    }

    // Read profile
    const { data: profile } = await client
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (profile.role === "admin") {

        window.location.href = "admin/dashboard.html";

    } else {

        window.location.href = "dashboard.html";

    }

});
