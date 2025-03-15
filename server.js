import express from "express";
import { v4 as uuidv4 } from "uuid";
import cookieParser from "cookie-parser";

import { seedUsers, loadUsers } from "./users_db.js";
import { seedPosts, loadPosts, addPost } from "./posts_db.js";

const app = express();
app.use(express.json());
app.use(cookieParser());

seedUsers();
seedPosts();

// get post of a specific user
// user should authenticate
// then authorization is performed based on username
app.get("/posts", isAuthenticated, async (req, res) => {
  const username = req.username;
  const posts = loadPosts();
  res.json(posts.filter((post) => post.author === username));
});

// create a post by a specific user
// user should authenticate
app.post("/posts", isAuthenticated, async (req, res) => {
  const username = req.username;
  const { title } = req.body;
  if (!username || !title) {
    return res.send("Both username and title are required");
  }

  addPost(title, username);
  res.send("Post created successfully");
});

let sessions = [];
// user logs in only one time
// then authentication is done using cookies
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Check username and password value existence
  if (!username || !password) {
    return res.send("Both username and password are required");
  }

  // Check user existence
  const users = loadUsers();
  const user = users.find((user) => user.username === username);
  if (!user) {
    return res.send("Invalid username or password");
  }

  // Check password matching
  if (user.password !== password) {
    return res.send("Invalid username or password");
  }

  // Create and store session
  const sessionId = uuidv4();
  const newSession = { sessionId, username };
  sessions.push(newSession);

  // Send sessionId to client via cookies
  res.cookie("session", sessionId, {
    // maxAge: 5000,
  });

  res.send("You have successfully logged in");
});

let blacklist = [];

// session-based authentication
function isAuthenticated(req, res, next) {
  const cookies = req.cookies;
  if (!cookies) {
    return res.status(401).send("Unauthenticated");
  }
  const sessionId = cookies.session;

  // verify sessions existance
  const userSession = sessions.find(
    (session) => session.sessionId === sessionId
  );
  if (!userSession) {
    return res.status(401).send("Unauthenticated");
  }

  // Check if the sessionId is not blacklisted
  const check = blacklist.includes(sessionId);
  if (check) {
    return res.status(401).send("Invalid session");
  }
  // req.user = {
  //   username: userSession.username,
  //   sessionId: userSession.sessionId,
  // };
  req.username = userSession.username;
  next();
}

// Logout route
// app.post("/logout", (req, res) => {
//   res.cookie("session", "", {
//     maxAge: 0,
//   });
//   res.json({ message: "Logged out successfully" });
// });

app.post("/logout", (req, res) => {
  const cookies = req.cookies;
  if (!cookies) {
    return res.status(401).send("Unauthenticated");
  }
  const sessionId = cookies.session;
  if (!sessionId) {
    return res.send("Unauthenticated");
  }
  // 2. Option 2: Blacklist the session
  blacklist.push(sessionId);
  // this step is optional, if id is blacklisted
  // is it optional to delete its associated session
  // // const newSessions = sessions.filter(
  // //   (session) => session.sessionId !== sessionId
  // // );
  // sessions = newSessions;
  return res.send("Succefully Logged out");
});

const PORT = 1000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
