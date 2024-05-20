const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", (event) => {
	event.preventDefault();

	const email = document.querySelector("input[name='email']").value;
	const password = document.querySelector("input[name='password']").value;

	fetch("/login", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ email, password }),
	})
		.then((response) => {
			if (response.ok) {
				return response.json();
			} else {
				throw new Error("Login failed");
			}
		})
		.then((user) => {
			sessionStorage.setItem("user", JSON.stringify(user));
			window.location.href = "/todos";
		})
		.catch((error) => {
			console.error("Error logging in:", error);
			alert("Invalid email or password");
		});
});
