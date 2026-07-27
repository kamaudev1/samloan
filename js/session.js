async function checkSession() {

    const { data } = await client.auth.getSession();

    if (!data.session)
        return;

    const user = data.session.user;

    const { data: profile } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile.role === "admin") {

        location.href = "admin/dashboard.html";

    } else {

        location.href = "dashboard.html";

    }

}

checkSession();
