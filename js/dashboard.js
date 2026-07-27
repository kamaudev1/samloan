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

    document.getElementById("welcome").textContent =
        `Welcome, ${profile.full_name}!`;

})();
