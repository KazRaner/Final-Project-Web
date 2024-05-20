//register.js

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", (event) => {
	event.preventDefault();

	const email = document.querySelector("input[name='email']").value;
	const password = document.querySelector("input[name='password']").value;
	const repeatPassword = document.querySelector(
		"input[name='repeatPassword']"
	).value;
	const userName = document.querySelector("input[name='userName']").value;

	fetch("/register", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email, password, repeatPassword, userName }),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.error) {
				alert(data.error);
			} else if (data.success) {
				alert("Registration successful!");
				window.location.href = "/login";
			}
		})
		.catch((error) => {
			console.error("Error registering user:", error);
			alert("An error occurred during registration. Please try again.");
		});
});
