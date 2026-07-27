const logoutBtn = document.getElementById("logout");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        await client.auth.signOut();

        window.location.href = "../login.html";

    });

}
