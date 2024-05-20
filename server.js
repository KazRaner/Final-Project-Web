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

// MongoDB connection URL
const url = "mongodb://127.0.0.1:27017";

// Database name
const dbName = "todo-app";

// Create a new MongoClient
const client = new MongoClient(url);

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		res.redirect("/login");
	}
}

// Home route
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/client/home.html");
});
app.get("/register", (req, res) => {
	res.sendFile(__dirname + "/client/RegisterUser.html");
});

app.get("/login", (req, res) => {
	res.sendFile(__dirname + "/client/LoginUser.html");
});
// Register user route
app.post("/register", async (req, res) => {
	const { email, password, repeatPassword, userName } = req.body;

	// Perform validations
	if (!email || !password || !repeatPassword || !userName) {
		return res.status(400).send("All fields are required");
	}

	if (password !== repeatPassword) {
		return res.status(400).send("Passwords do not match");
	}

	if (password.length < 8) {
		return res
			.status(400)
			.send("Password must be at least 8 characters long");
	}

	try {
		await client.connect();
		const db = client.db(dbName);
		const usersCollection = db.collection("users");

		// Check if user with the same email already exists
		const existingUser = await usersCollection.findOne({ email });
		if (existingUser) {
			return res
				.status(400)
				.send("User with the same email already exists");
		}

		// Create new user
		const newUser = {
			email,
			password,
			userName,
		};

		// Save user to database
		await usersCollection.insertOne(newUser);

		res.redirect("/login");
	} catch (error) {
		console.error("Error registering user:", error);
		res.status(500).send("Internal Server Error");
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

// Logout user route
app.get("/logout", (req, res) => {
	req.session.destroy();
	res.redirect("/login");
});

app.get("/todos", isAuthenticated, (req, res) => {
	res.sendFile(__dirname + "/client/todosUser.html");
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

app.put("/api/todos/:id", isAuthenticated, async (req, res) => {
	const todoId = req.params.id;
	const { completed } = req.body;

	try {
		await client.connect();
		const db = client.db(dbName);
		const todosCollection = db.collection("todos");

		const { ObjectId } = require("mongodb");
		await todosCollection.updateOne(
			{ _id: new ObjectId(todoId) },
			{ $set: { completed } }
		);

		res.sendStatus(200);
	} catch (error) {
		console.error("Error updating user todo completion:", error);
		res.status(500).send("Internal Server Error");
	} finally {
		await client.close();
	}
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
			completed: false, // Add a completed field with default value of false
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
