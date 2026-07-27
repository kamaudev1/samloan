// Mobile menu (we'll expand this later)
const menu = document.querySelector(".menu-toggle");

menu.addEventListener("click", () => {
    alert("Mobile menu will be added in the next update.");
});

// Loan Calculator
const calculateBtn = document.getElementById("calculateBtn");

if (calculateBtn) {

    calculateBtn.addEventListener("click", () => {

        const amount = parseFloat(document.getElementById("amount").value);

        const interest = parseFloat(document.getElementById("interest").value);

        const months = parseInt(document.getElementById("months").value);

        if (!amount || !interest || !months) {

            document.getElementById("result").innerHTML =
                "Please fill all fields.";

            return;
        }

        const monthlyRate = (interest / 100) / 12;

        const payment =
            (amount * monthlyRate) /
            (1 - Math.pow(1 + monthlyRate, -months));

        document.getElementById("result").innerHTML =
            "Estimated Monthly Payment: KES " +
            payment.toFixed(2);
    });

}
