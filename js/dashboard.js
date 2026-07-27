// ============================================
// DASHBOARD CONTROLLER
// ============================================

(async () => {
    try {
        const user = await requireLogin();
        if (!user) return;

        // Fetch user profile
        const { data: profile, error } = await client
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        if (error) {
            console.error("Profile fetch error:", error);
            return;
        }

        // Update user information
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

        // Dashboard subtitle with name
        document.getElementById("dashboardSubtitle").textContent = `Welcome back, ${fullName}! Here's your loan overview`;

        // Show Admin panel link for admins
        if (role === "admin") {
            document.getElementById("adminMenu").style.display = "block";
        }

        // Load real data from database
        await loadDashboardData(user.id);

    } catch (error) {
        console.error("Dashboard initialization error:", error);
    }
})();

// ============================================
// LOAD DASHBOARD DATA
// ============================================
async function loadDashboardData(userId) {
    try {
        // Fetch active loans
        const { data: loans, error: loansError } = await client
            .from("loans")
            .select("*")
            .eq("customer_id", userId)
            .eq("status", "active");

        if (loansError) {
            console.error("Loans fetch error:", loansError);
            return;
        }

        // Get active loan
        const activeLoan = loans && loans.length > 0 ? loans[0] : null;

        // Update UI with real data
        if (activeLoan) {
            document.getElementById("activeLoan").textContent = `KES ${activeLoan.amount?.toLocaleString() || '0.00'}`;
            document.getElementById("loanStatus").textContent = `Active Loan`;
            document.getElementById("loanStatus").style.color = "#059669";
            
            // Calculate balance (simplified)
            const balance = activeLoan.amount - (activeLoan.paid_amount || 0);
            document.getElementById("balance").textContent = `KES ${balance.toLocaleString()}`;

            // Next payment (simplified)
            if (activeLoan.due_date) {
                const dueDate = new Date(activeLoan.due_date);
                document.getElementById("nextPayment").textContent = dueDate.toLocaleDateString('en-KE', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } else {
            document.getElementById("activeLoan").textContent = "KES 0.00";
            document.getElementById("loanStatus").textContent = "No Active Loan";
            document.getElementById("loanStatus").style.color = "#6b7280";
            document.getElementById("balance").textContent = "KES 0.00";
            document.getElementById("nextPayment").textContent = "--";
        }

        // Fetch recent applications
        const { data: applications } = await client
            .from("applications")
            .select("*")
            .eq("customer_id", userId)
            .order("created_at", { ascending: false })
            .limit(4);

        // Update activity list with real data
        if (applications && applications.length > 0) {
            const activityList = document.querySelector('.activity-list');
            if (activityList) {
                activityList.innerHTML = applications.map(app => `
                    <div class="activity-item">
                        <div class="activity-icon ${app.status === 'approved' ? 'status' : app.status === 'pending' ? 'loan' : 'alert'}">
                            <i class="fa-solid ${app.status === 'approved' ? 'fa-circle-check' : app.status === 'pending' ? 'fa-hand-holding-dollar' : 'fa-times-circle'}"></i>
                        </div>
                        <div class="activity-content">
                            <div class="activity-title">${app.status === 'approved' ? 'Application Approved' : app.status === 'pending' ? 'Application Submitted' : 'Application Rejected'}</div>
                            <div class="activity-desc">${app.status === 'approved' ? 'Your loan was approved' : app.status === 'pending' ? 'You applied for a loan' : 'Application was rejected'}</div>
                        </div>
                        <div class="activity-time">${app.created_at ? timeAgo(app.created_at) : 'Recently'}</div>
                    </div>
                `).join('');
            }
        }

        // Fetch loan data for chart
        const { data: loanHistory } = await client
            .from("loans")
            .select("amount, created_at")
            .eq("customer_id", userId)
            .order("created_at", { ascending: true });

        if (loanHistory && loanHistory.length > 0) {
            updateChart(loanHistory);
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

// ============================================
// UPDATE CHART
// ============================================
function updateChart(loanData) {
    const chartBars = document.querySelectorAll('.chart-bar');
    if (!chartBars.length) return;

    // Group loans by month
    const monthlyData = {};
    loanData.forEach(loan => {
        const date = new Date(loan.created_at);
        const month = date.toLocaleString('default', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + (loan.amount || 0);
    });

    // Get current month index
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    // Update bars
    chartBars.forEach((bar, index) => {
        const monthName = months[(currentMonth - 11 + index + 12) % 12];
        const value = monthlyData[monthName] || 0;
        
        // Update bar height (percentage of max)
        const maxValue = Math.max(...Object.values(monthlyData), 1);
        const height = maxValue > 0 ? (value / maxValue) * 90 : 5;
        bar.style.height = `${Math.max(height, 5)}%`;
        
        // Update label
        const label = bar.querySelector('.bar-label');
        if (label) label.textContent = monthName;
        
        // Update value
        const valueEl = bar.querySelector('.bar-value');
        if (valueEl) valueEl.textContent = value > 0 ? `KES ${value.toLocaleString()}` : 'KES 0';
    });
}

// ============================================
// TIME AGO HELPER
// ============================================
function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, value] of Object.entries(intervals)) {
        const count = Math.floor(seconds / value);
        if (count >= 1) {
            return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
}
