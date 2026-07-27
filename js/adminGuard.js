async function requireAdmin() {

    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {

        window.location.href = "../login.html";
        return null;

    }

    const user = data.session.user;

    const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {

        await client.auth.signOut();
        window.location.href = "../login.html";
        return null;

    }

    if (profile.role !== "admin") {

        alert("Access denied.");
        window.location.href = "../dashboard.html";
        return null;

    }

    return {
        user,
        profile
    };

}
