let adminInfo = null;

const pages = {

    dashboard: loadDashboard,
    customers: loadCustomers,
    applications: loadApplications,
    loans: loadLoans,
    payments: loadPayments,
    reports: loadReports,
    settings: loadSettings

};

(async () => {

    adminInfo = await requireAdmin();

    if (!adminInfo) return;

    document.getElementById("welcomeAdmin").innerHTML =
        "Welcome, <strong>" + adminInfo.profile.full_name + "</strong>";

    loadDashboard();

})();

document.querySelectorAll("aside li[data-page]").forEach(item => {

    item.onclick = () => {

        document.querySelectorAll("aside li")
            .forEach(li => li.classList.remove("active"));

        item.classList.add("active");

        const page = item.dataset.page;

        document.getElementById("pageTitle").innerText =
            item.innerText.trim();

        pages[page]();

    };

});

document.getElementById("logout").onclick = async () => {

    await client.auth.signOut();

    window.location.href = "../login.html";

};
