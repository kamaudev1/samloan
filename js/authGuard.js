async function requireLogin() {

    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {

        window.location.href = "../login.html";

        return;
    }

    return data.session.user;

}
