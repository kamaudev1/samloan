(async () => {

    const user = await requireLogin();

    if (!user) return;

    const { data: profile, error } = await client
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error(error);
        return;
    }

    // Welcome message
    document.getElementById("welcome").textContent =
        `Welcome, ${profile.full_name}`;

    // Show role
    document.getElementById("role").textContent =
        profile.role.toUpperCase();

    // Show Admin button only for admins
    if (profile.role === "admin") {

        document
            .getElementById("adminMenu")
            .style.display = "block";

    }

})();
