const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bodyParser = require("body-parser");
require("dotenv").config();


const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------- SESSION ----------------
app.use(
  session({
    secret: "voting_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

// ---------------- BEAUTIFUL GLOBAL CSS ----------------
function style() {
  return `
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');

body {
  font-family: 'Poppins', sans-serif;
  background: url('https://images.unsplash.com/photo-1529101091764-c3526daf38fe?auto=format&fit=crop&w=1920&q=80')
              no-repeat center center fixed;
  background-size: cover;
  margin: 0;
  padding: 40px;
  color: #fff;
}
body::before {
  content:"";
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.35);
  backdrop-filter:blur(4px);
  z-index:-1;
}
h1,h2 {
  text-align:center;
  font-weight:600;
  color:white;
  text-shadow:0 2px 4px rgba(0,0,0,0.5);
}
.home-links { text-align:center; margin-top:40px; }
.home-links a {
  display:block; width:280px; margin:15px auto;
  padding:14px; font-size:22px; text-decoration:none; color:white;
  background:rgba(0,123,255,0.8); border-radius:10px;
  transition:0.3s; backdrop-filter:blur(8px);
}
.home-links a:hover { background:#007bff; transform:scale(1.05); }

form {
  width:360px; margin:auto;
  background:rgba(255,255,255,0.15);
  padding:25px; border-radius:12px;
  box-shadow:0 8px 20px rgba(0,0,0,0.3);
  backdrop-filter:blur(12px);
}

input, select {
  width:95%; padding:10px; margin:8px 0;
  border-radius:6px; border:none;
  background:rgba(255,255,255,0.8);
}
input[type=submit] {
  background:#007bff; padding:12px; border:none; width:100%;
  color:white; font-size:16px; border-radius:8px;
  margin-top:10px; cursor:pointer; transition:0.3s;
}
input[type=submit]:hover { background:#0056b3; transform:scale(1.03); }

.table {
  width:80%; margin:auto; color:white;
  background:rgba(255,255,255,0.15);
  border-collapse:collapse;
  border-radius:12px; overflow:hidden;
}
.table th {
  background:#007bff; padding:12px; color:white;
}
.table td {
  padding:10px;
  border-bottom:1px solid rgba(255,255,255,0.2);
}

.logout {
  background:#d9534f; padding:12px;
  width:200px; margin:20px auto;
  display:block; text-align:center;
  color:white !important;
  border-radius:8px;
  font-weight:600;
}
.logout:hover { background:#9c2424; }

.success {
  text-align:center;
  color:#00ff8c;
  font-size:22px;
  font-weight:600;
}

a { color:white; font-weight:600; }
</style>
`;
}

// ---------------- MYSQL CONNECTION ----------------
// Use host.docker.internal when running inside Docker
// ---------------- MYSQL CONNECTION ----------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});


db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to Aiven MySQL");
});


// ---------------- TABLES ----------------
db.query(`
CREATE TABLE IF NOT EXISTS users(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password VARCHAR(100),
  role VARCHAR(20) DEFAULT 'student',
  voted TINYINT DEFAULT 0
)`);

db.query(`
CREATE TABLE IF NOT EXISTS candidates(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  party VARCHAR(100) NOT NULL,
  votes INT DEFAULT 0
)`);

// Default admin
db.query(`
INSERT IGNORE INTO users (id,name,email,password,role,voted)
VALUES (1,'Admin','admin@college.com','admin123','admin',0)
`);

// ---------------- MIDDLEWARE ----------------
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin")
    return res.send(style() + "<h2>Access Denied</h2>");
  next();
}

// ---------------- HOME ----------------
app.get("/", (req, res) => {
  res.send(
    style() +
      `
<h1>College Voting System</h1>
<div class="home-links">
  <a href="/login">Student Login</a>
  <a href="/register">Student Register</a>
  <a href="/admin-login">Admin Login</a>
</div>
`
  );
});

// ---------------- STUDENT LOGIN ----------------
app.get("/login", (req, res) => {
  res.send(
    style() +
      `
<h2>Student Login</h2>
<form method="POST" action="/checkLogin">
  Email:<input type="email" name="email" required>
  Password:<input type="password" name="password" required>
  <input type="submit" value="Login">
</form>
<a href="/register">Register</a>
<a href="/">Home</a>
`
  );
});

app.post("/checkLogin", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=? AND password=? AND role='student'",
    [email, password],
    (err, rows) => {
      if (rows.length === 0)
        return res.send(style() + "<h2>Invalid Login</h2>");

      req.session.user = rows[0];
      res.redirect("/dashboard");
    }
  );
});

// ---------------- STUDENT REGISTER ----------------
app.get("/register", (req, res) => {
  res.send(
    style() +
      `
<h2>Student Registration</h2>
<form method="POST" action="/createUser">
  Name:<input type="text" name="name" required>
  Email:<input type="email" name="email" required>
  Password:<input type="password" name="password" required>
  <input type="submit" value="Register">
</form>
<a href="/login">Back to Login</a>
`
  );
});

app.post("/createUser", (req, res) => {
  const { name, email, password } = req.body;

  db.query(
    "INSERT INTO users (name,email,password,role) VALUES (?,?,?, 'student')",
    [name, email, password],
    (err) => {
      if (err)
        return res.send(style() + "<h2>Email already used</h2>");

      res.send(style() + "<h2>Registered!</h2><a href='/login'>Login</a>");
    }
  );
});

// ---------------- ADMIN LOGIN ----------------
app.get("/admin-login", (req, res) => {
  res.send(
    style() +
      `
<h2>Admin Login </h2>
<form method="POST" action="/checkAdmin">
  Email:<input type="text" name="email">
  Password:<input type="password" name="password">
  <input type="submit" value="Login">
</form>
<a href="/">Home</a>
`
  );
});

app.post("/checkAdmin", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=? AND password=? AND role='admin'",
    [email, password],
    (err, rows) => {
      if (rows.length === 0)
        return res.send(style() + "<h2>Invalid Admin Login</h2>");

      req.session.user = rows[0];
      res.redirect("/admin");
    }
  );
});

// ---------------- STUDENT DASHBOARD ----------------
app.get("/dashboard", requireLogin, (req, res) => {
  db.query("SELECT * FROM candidates", (err, candidates) => {
    const rows = candidates
      .map(
        (c) => `
<tr>
 <td>${c.name}</td>
 <td>${c.party}</td>
 <td>${
   req.session.user.voted
     ? "Voted"
     : `<form method='POST' action='/vote'>
          <input type='hidden' name='id' value='${c.id}'>
          <input type='submit' value='Vote'>
        </form>`
 }</td>
</tr>`
      )
      .join("");

    res.send(
      style() +
        `
<h2>Welcome ${req.session.user.name}</h2>

<table class="table">
<tr><th>Name</th><th>Group</th><th>Action</th></tr>
${rows}
</table>

<a href="/results">View Results</a>
<a class="logout" href="/logout">Logout</a>
`
    );
  });
});

// ---------------- STUDENT VOTE ----------------
app.post("/vote", requireLogin, (req, res) => {
  if (req.session.user.voted)
    return res.send(style() + "<h2>You Already Voted</h2>");

  const id = req.body.id;

  db.query("UPDATE candidates SET votes=votes+1 WHERE id=?", [id]);
  db.query("UPDATE users SET voted=1 WHERE id=?", [req.session.user.id]);

  req.session.user.voted = 1;

  res.send(
    style() +
      `
<h2>🎉 Vote Submitted!</h2>
<p class="success">Thank you for voting.</p>
<a href="/dashboard">Back</a>
`
  );
});

// ---------------- RESULTS ----------------
app.get("/results", (req, res) => {
  db.query("SELECT * FROM candidates ORDER BY votes DESC", (err, rows) => {
    let html = style() + "<h2>Election Results</h2><table class='table'>";
    html += "<tr><th>Name</th><th>Group</th><th>Votes</th></tr>";

    rows.forEach((c) => {
      html += `<tr><td>${c.name}</td><td>${c.party}</td><td>${c.votes}</td></tr>`;
    });

    html += "</table><a href='/dashboard'>Back</a>";

    res.send(html);
  });
});

// ---------------- ADMIN PANEL ----------------
app.get("/admin", requireAdmin, (req, res) => {
  db.query("SELECT * FROM candidates", (err, rows) => {
    const list = rows
      .map(
        (c) =>
          `<tr><td>${c.id}</td><td>${c.name}</td><td>${c.party}</td><td>${c.votes}</td></tr>`
      )
      .join("");

    res.send(
      style() +
        `
<h2>Admin Panel</h2>

<form method='POST' action='/admin/add'>
  <input type='text' name='name' placeholder='Candidate Name' required>
  <select name='party' required>
      <option value="">Select Group</option>
      <option value="Student Council">Student Council</option>
      <option value="Cultural Committee">Cultural Committee</option>
      <option value="Sports Committee">Sports Committee</option>
      <option value="Science Club">Science Club</option>
      <option value="Literature Club">Literature Club</option>
      <option value="NSS / NCC Unit">NSS / NCC Unit</option>
      <option value="Independent Candidate">Independent Candidate</option>
  </select>
  <input type='submit' value='Add Candidate'>
</form>

<h3>Existing Candidates</h3>

<table class="table">
<tr><th>ID</th><th>Name</th><th>Group</th><th>Votes</th></tr>
${list}
</table>

<form method='POST' action='/admin/reset'>
  <input type='submit' class='logout' value='RESET ALL VOTES'>
</form>

<a class="logout" href="/logout">Logout</a>
`
    );
  });
});

// ---------------- ADMIN ADD CANDIDATE ----------------
app.post("/admin/add", requireAdmin, (req, res) => {
  const { name, party } = req.body;

  db.query(
    "INSERT INTO candidates (name, party) VALUES (?,?)",
    [name, party],
    (err) => {
      if (err) console.log(err);
      res.redirect("/admin");
    }
  );
});

// ---------------- ADMIN RESET ----------------
app.post("/admin/reset", requireAdmin, (req, res) => {
  db.query("UPDATE candidates SET votes=0");
  db.query("UPDATE users SET voted=0");
  res.redirect("/admin");
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.send(style() + "<h2>Logged Out</h2><a href='/'>Home</a>");
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});

