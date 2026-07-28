const form = document.getElementById("registerForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    message.style.color = "#2563eb";
    message.textContent = "Creating account...";

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const nationalId = document.getElementById("nationalId").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        message.style.color = "red";
        message.textContent = "Passwords do not match.";
        return;
    }

    if (password.length < 8) {
        message.style.color = "red";
        message.textContent = "Password must be at least 8 characters.";
        return;
    }

    const { error } = await client.auth.signUp({

        email,

        password,

        options: {

            data: {

                full_name: fullName,
                phone: phone,
                national_id: nationalId

            }

        }

    });

    if (error) {

        message.style.color = "red";
        message.textContent = error.message;
        return;

    }

    message.style.color = "green";

    message.innerHTML = `
        Registration successful!<br>
        Please verify your email before logging in.
    `;

    form.reset();

});
