// server.js
const express = require("express");
const app = express();
const session = require("express-session");
const { MongoClient } = require("mongodb");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("client"));

app.use(
	session({
		secret: "your-secret-key",
		resave: false,
		saveUninitialized: true,
	})
);

const url = "mongodb://127.0.0.1:27017";
const dbName = "todo-app";
const client = new MongoClient(url);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		res.redirect("/login");
	}
}

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/client/home.html");
});

app.get("/login", (req, res) => {
	res.sendFile(__dirname + "/client/LoginUser.html");
});

app.get("/register", (req, res) => {
	res.sendFile(__dirname + "/client/RegisterUser.html");
});

app.get("/logout", (req, res) => {
	req.session.destroy();
	res.redirect("/login");
});

app.get("/todos", isAuthenticated, (req, res) => {
	res.sendFile(__dirname + "/client/todosUser.html");
});

// Get user todos route
app.get("/api/todos", isAuthenticated, async (req, res) => {
	const user = req.session.user;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		const userTodos = await todosCollection
			.find({ userEmail: user.email })
			.toArray();
		res.json(userTodos);
	} catch (error) {
		console.error("Error getting user todos:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Register user route
app.post("/register", async (req, res) => {
	const { email, password, repeatPassword, userName } = req.body;

	// Perform validations
	if (!email || !password || !repeatPassword || !userName) {
		return res.json({ error: "All fields are required" });
	}

	if (password !== repeatPassword) {
		return res.json({ error: "Passwords do not match" });
	}

	if (password.length < 8) {
		return res.json({
			error: "Password must be at least 8 characters long",
		});
	}

	try {
		await client.connect();
		const db = client.db(dbName);
		const usersCollection = db.collection("users");

		// Check if user with the same email already exists
		const existingUser = await usersCollection.findOne({ email });
		if (existingUser) {
			return res.json({
				error: "User with the same email already exists",
			});
		}

		// Create new user
		const newUser = {
			email,
			password,
			userName,
		};

		// Save user to database
		await usersCollection.insertOne(newUser);

		res.json({ success: true });
	} catch (error) {
		console.error("Error registering user:", error);
		res.json({ error: "Internal Server Error" });
	} finally {
		await client.close();
	}
});

// Login user route
app.post("/login", async (req, res) => {
	const { email, password } = req.body;

	// Perform validations
	if (!email || !password) {
		return res.status(400).send("Email and password are required");
	}

	try {
		await client.connect();
		const db = client.db(dbName);
		const usersCollection = db.collection("users");

		// Check if user exists
		const user = await usersCollection.findOne({ email, password });
		if (!user) {
			return res.status(401).send("Invalid email or password");
		}

		// Set user session
		req.session.user = user;
		res.json(user);
	} catch (error) {
		console.error("Error logging in user:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Save user todos route
app.post("/todos", isAuthenticated, async (req, res) => {
	const user = req.session.user;
	const { todos } = req.body;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		// Delete existing user todos
		await todosCollection.deleteMany({ userEmail: user.email });

		// Save new todos to database
		const newTodos = todos.map((todo) => ({
			...todo,
			userEmail: user.email,
		}));
		await todosCollection.insertMany(newTodos);

		res.sendStatus(200);
	} catch (error) {
		console.error("Error saving user todos:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Add user todo route
app.post("/api/todos", isAuthenticated, async (req, res) => {
	const user = req.session.user;
	const { todo } = req.body;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		const newTodo = {
			...todo,
			userEmail: user.email,
			completed: false,
		};

		const result = await todosCollection.insertOne(newTodo);
		newTodo._id = result.insertedId;

		res.json(newTodo);
	} catch (error) {
		console.error("Error adding user todo:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Update user todos route
app.put("/api/todos", isAuthenticated, async (req, res) => {
	const user = req.session.user;
	const { todos } = req.body;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		await todosCollection.deleteMany({ userEmail: user.email });

		if (todos.length > 0) {
			const newTodos = todos.map((todo) => ({
				...todo,
				userEmail: user.email,
			}));
			await todosCollection.insertMany(newTodos);
		}

		res.sendStatus(200);
	} catch (error) {
		console.error("Error updating user todos:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Delete user todo route
app.delete("/api/todos/:id", isAuthenticated, async (req, res) => {
	const todoId = req.params.id;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		const { ObjectId } = require("mongodb");
		await todosCollection.deleteOne({ _id: new ObjectId(todoId) });

		res.sendStatus(200);
	} catch (error) {
		console.error("Error deleting user todo:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Update user todos route
app.put("/api/todos", isAuthenticated, async (req, res) => {
	const user = req.session.user;
	const { todos } = req.body;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		// Delete existing user todos
		await todosCollection.deleteMany({ userEmail: user.email });

		// Save new todos to database
		const newTodos = todos.map((todo) => ({
			...todo,
			userEmail: user.email,
		}));
		await todosCollection.insertMany(newTodos);

		res.sendStatus(200);
	} catch (error) {
		console.error("Error updating user todos:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
});

// Start server
app.listen(3000, () => {
	console.log("Server started on port 3000");
});
