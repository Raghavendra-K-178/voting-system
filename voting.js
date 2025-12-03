const express = require("express");
const mysql = require("mysql2");
const session = require("express-session");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------- SESSION ----------------
app.use(
  session({
    secret: "voting_secret_key",
    resave: false,
    saveUninitialized: true
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
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(4px);
    z-index:-1;
}

h1, h2 {
    text-align:center;
    font-weight:600;
    color:#ffffff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.home-links a {
    display:block;
    font-size:22px;
    margin:15px auto;
    width:260px;
    padding:12px;
    text-decoration:none;
    color:white;
    background:rgba(0, 123, 255, 0.7);
    border-radius:8px;
    text-align:center;
    transition:0.3s;
    backdrop-filter: blur(8px);
}
.home-links a:hover {
    background:rgba(0, 123, 255, 1);
    transform: scale(1.05);
}

form {
  width:350px;
  margin:auto;
  background:rgba(255,255,255,0.15);
  padding:25px;
  border-radius:12px;
  box-shadow:0 8px 20px rgba(0,0,0,0.3);
  backdrop-filter: blur(12px);
}

input, select {
  width:95%;
  padding:10px;
  margin:8px 0;
  border-radius:6px;
  border:none;
  background:rgba(255,255,255,0.7);
}

input:focus {
  outline:2px solid #007bff;
  background:white;
}

input[type=submit] {
  background:#007bff;
  padding:12px;
  border:none;
  width:100%;
  color:white;
  font-size:16px;
  border-radius:8px;
  margin-top:10px;
  cursor:pointer;
  transition:0.3s;
}
input[type=submit]:hover {
  background:#0056b3;
  transform: scale(1.03);
}

.table {
  width:80%;
  margin:auto;
  background:rgba(255,255,255,0.1);
  border-collapse:collapse;
  border-radius:12px;
  overflow:hidden;
  color:white;
}

.table th {
  padding:12px;
  background:#007bff;
  color:white;
}

.table td {
  padding:10px;
  border-bottom:1px solid rgba(255,255,255,0.2);
}

.logout {
    background:#d9534f;
    color:white !important;
    padding:12px;
    width:200px;
    margin:20px auto;
    border-radius:8px;
    display:block;
    text-align:center;
    font-weight:600;
    transition:0.3s;
}
.logout:hover {
    background:#b52d2d;
    transform:scale(1.05);
}

.success {
    color:#00ff8c;
    font-size:22px;
    font-weight:600;
    text-align:center;
}a {
    display: inline-block;
    margin: 10px;
    font-size: 18px;
    text-decoration: none;
    color: #ffffff !important;
    font-weight: 600;
    transition: 0.3s ease;
    text-shadow: 0 2px 4px rgba(0,0,0,0.6);
}

a:hover {
    color: #00e1ff !important;
    transform: scale(1.05);
}

/* Center the bottom links */
.links-container {
    text-align: center;
    margin-top: 20px;
}



</style>
`;
}

// ---------------- MYSQL CONNECTION ----------------
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Rock@2005",
    database: "voting_db"
});

db.connect(err => {
    if (err) throw err;
    console.log("MySQL Connected");
});

// ---------------- CREATE TABLES ----------------
db.query(`
CREATE TABLE IF NOT EXISTS users(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50),
  email VARCHAR(50),
  password VARCHAR(50),
  role VARCHAR(10) DEFAULT 'student',
  voted INT DEFAULT 0
)`);

db.query(`
CREATE TABLE IF NOT EXISTS candidates(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50),
  party VARCHAR(50),
  votes INT DEFAULT 0
)`);

// Insert default admin
db.query(`
  INSERT IGNORE INTO users (id,name,email,password,role,voted)
  VALUES (1,'Admin','admin@voting.com','admin123','admin',0)
`);

// ---------------- MIDDLEWARE ----------------
function requireLogin(req, res, next) {
  if (req.session.user) next();
  else res.redirect("/login");
}

function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") next();
  else res.send(style() + "<h2>Access Denied</h2>");
}

// ---------------- HOME PAGE ----------------
app.get("/", (req, res) => {
  res.send(
    style() +
    `
<h1>Online Voting System</h1>

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
  Email:<input type="text" name="email">
  Password:<input type="password" name="password">
  <input type="submit" value="Login">
</form>
<div class="links-container">
    <a href="/register">Register</a>
    <a href="/">Home</a>
</div>

`
  );
});

app.post("/checkLogin", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email=? AND password=? AND role='student'",
    [email, password],
    (err, result) => {
      if (result.length > 0) {
        req.session.user = result[0];
        res.redirect("/dashboard");
      } else {
        res.send(style() + "<h2>Invalid Login</h2><a href='/login'>Try Again</a>");
      }
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
  Name:<input type="text" name="name">
  Email:<input type="text" name="email">
  Password:<input type="password" name="password">
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
    () => res.send(style() + "<h2>Registered Successfully</h2><a href='/login'>Login</a>")
  );
});

// ---------------- ADMIN LOGIN ----------------
app.get("/admin-login", (req, res) => {
  res.send(
    style() +
    `
<h2>Admin Login</h2>
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
    (err, result) => {
      if (result.length > 0) {
        req.session.user = result[0];
        res.redirect("/admin");
      } else {
        res.send(style() + "<h2>Invalid Admin Login</h2><a href='/admin-login'>Try Again</a>");
      }
    }
  );
});

// ---------------- STUDENT DASHBOARD ----------------
app.get("/dashboard", requireLogin, (req, res) => {
  const user = req.session.user;

  db.query("SELECT * FROM candidates", (err, candidates) => {
    let rows = candidates
      .map(
        c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.party}</td>
            <td>
              ${
                user.voted
                  ? "Voted"
                  : `<form method='POST' action='/vote'>
                       <input type='hidden' name='candidate_id' value='${c.id}'>
                       <input type='submit' value='Vote'>
                     </form>`
              }
            </td>
        </tr>
        `
      )
      .join("");

    res.send(
      style() +
      `
<h2>Welcome ${user.name}</h2>

<table class="table">
<tr><th>Name</th><th>Party</th><th>Action</th></tr>
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
  const user = req.session.user;

  if (user.voted)
    return res.send(style() + "<h2>You Have Already Voted</h2><a href='/dashboard'>Back</a>");

  const candidate_id = req.body.candidate_id;

  db.query("UPDATE candidates SET votes=votes+1 WHERE id=?", [candidate_id], () => {
    db.query("UPDATE users SET voted=1 WHERE id=?", [user.id], () => {
      req.session.user.voted = 1;

      res.send(
        style() +
        `
<h2>🎉 Vote Submitted Successfully!</h2>
<p class="success">Your vote has been recorded.</p>

<a href='/results'>View Results</a>
<a href='/dashboard'>Back to Dashboard</a>
<a class='logout' href='/logout'>Logout</a>
`
      );
    });
  });
});

// ---------------- RESULTS ----------------
app.get("/results", (req, res) => {
  db.query("SELECT * FROM candidates ORDER BY votes DESC", (err, rows) => {
    let html =
      style() +
      "<h2>Election Results</h2><table class='table'><tr><th>Name</th><th>Party</th><th>Votes</th></tr>";

    rows.forEach(c => {
      html += `<tr><td>${c.name}</td><td>${c.party}</td><td>${c.votes}</td></tr>`;
    });

    html += "</table><a href='/dashboard'>Back</a>";

    res.send(html);
  });
});

// ---------------- ADMIN PANEL ----------------
app.get("/admin", requireAdmin, (req, res) => {
  db.query("SELECT * FROM candidates", (err, candidates) => {
    let rows = candidates
      .map(
        c => `<tr>
                <td>${c.id}</td>
                <td>${c.name}</td>
                <td>${c.party}</td>
                <td>${c.votes}</td>
              </tr>`
      )
      .join("");

    res.send(
      style() +
      `
<h2>Admin Panel</h2>

<form method='POST' action='/admin/add'>
  <input type='text' name='name' placeholder='Candidate Name'>
  <input type='text' name='role' placeholder='Role'>
  <input type='submit' value='Add Candidate'>
</form>

<h3>Existing Candidates</h3>

<table class="table">
<tr><th>ID</th><th>Name</th><th>Party</th><th>Votes</th></tr>
${rows}
</table>

<form method='POST' action='/admin/reset'>
  <input type='submit' class='btn-danger' value='RESET ALL VOTES'>
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
    () => res.redirect("/admin")
  );
});

// ---------------- ADMIN RESET ----------------
app.post("/admin/reset", requireAdmin, (req, res) => {
  db.query("UPDATE candidates SET votes=0", () => {
    db.query("UPDATE users SET voted=0", () => res.redirect("/admin"));
  });
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send(style() + "<h2>Logged Out</h2><a href='/'>Home</a>");
});

// ---------------- START SERVER ----------------
app.listen(3000, () =>
  console.log("Server running at http://localhost:3000")
);
