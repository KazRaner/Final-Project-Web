// todos.js
// Get user info from session storage
const userInfo = document.getElementById("userInfo");
const user = JSON.parse(sessionStorage.getItem("user"));
userInfo.innerHTML = `
  <p>User Name: ${user.userName}</p>
  <p>Email: ${user.email}</p>
`;

const todoList = document.getElementById("todoList");
const todoForm = document.getElementById("todoForm");
const saveBtn = document.getElementById("saveBtn");
const logoutBtn = document.getElementById("logoutBtn");

// Function to render todos
function renderTodos() {
	todoList.innerHTML = "";
	todos.forEach((todo) => {
		const li = document.createElement("li");
		li.innerHTML = `
      <label class="todo-item">
        <input type="checkbox" class="completeBtn" data-id="${todo._id}" ${
			todo.completed ? "checked" : ""
		}>
        <span class="checkmark"></span>
        <span class="todo-text">${todo.task}</span>
      </label>
      <button class="deleteBtn" data-id="${todo._id}">Delete</button>
    `;
		todoList.appendChild(li);
	});
}

// Fetch user todos from server
fetch("/api/todos")
	.then((response) => response.json())
	.then((fetchedTodos) => {
		todos = fetchedTodos;
		renderTodos();
	});

// Add todo
todoForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const task = event.target.elements.task.value;
	const todo = { task, completed: false };

	fetch("/api/todos", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ todo }),
	})
		.then((response) => response.json())
		.then((newTodo) => {
			todos.push(newTodo);
			renderTodos();
			event.target.reset();
		});
});

// Update todo completed state
todoList.addEventListener("change", (event) => {
	if (event.target.classList.contains("completeBtn")) {
		const todoId = event.target.dataset.id;
		const completed = event.target.checked;
		const todo = todos.find((todo) => todo._id === todoId);
		todo.completed = completed;
	}
});

// Delete todo
todoList.addEventListener("click", (event) => {
	if (event.target.classList.contains("deleteBtn")) {
		const todoId = event.target.dataset.id;
		fetch(`/api/todos/${todoId}`, {
			method: "DELETE",
		}).then(() => {
			todos = todos.filter((todo) => todo._id !== todoId);
			renderTodos();
		});
	}
});

// Save todos
saveBtn.addEventListener("click", () => {
	fetch("/api/todos", {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ todos }),
	})
		.then((response) => {
			if (response.ok) {
				console.log("Todos saved successfully");
				alert("Todos saved successfully!");
			} else {
				console.error("Failed to save todos");
				alert("Failed to save todos. Please try again.");
			}
		})
		.catch((error) => {
			console.error("Error saving todos:", error);
			alert("Error saving todos. Please try again.");
		});
});

// Logout user
logoutBtn.addEventListener("click", () => {
	sessionStorage.removeItem("user");
	window.location.href = "/login";
});
