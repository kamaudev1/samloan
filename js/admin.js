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


function loadDashboard() {

    document.getElementById("content").innerHTML = `
        <h2>Dashboard</h2>
        <p>Dashboard widgets will appear here.</p>
    `;

}

function loadCustomers() {

    document.getElementById("content").innerHTML = `
        <h2>Customers</h2>
        <p>Customer table will appear here.</p>
    `;

}

function loadApplications() {

    document.getElementById("content").innerHTML = `
        <h2>Loan Applications</h2>
    `;

}

function loadLoans() {

    document.getElementById("content").innerHTML = `
        <h2>Loans</h2>
    `;

}

function loadPayments() {

    document.getElementById("content").innerHTML = `
        <h2>Payments</h2>
    `;

}

function loadReports() {

    document.getElementById("content").innerHTML = `
        <h2>Reports</h2>
    `;

}

function loadSettings() {

    document.getElementById("content").innerHTML = `
        <h2>Settings</h2>
    `;

}


