// voting.js
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

// ---------------- GLOBAL STYLE (Bootstrap + Custom Blue Theme) ----------------
function style(title = "College Voting System") {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>

  <!-- Bootstrap 5 CDN -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

  <style>
  @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Poppins', sans-serif;
    background: linear-gradient(135deg, #0d47a1, #1976d2, #42a5f5);
    min-height: 100vh;
    margin: 0;
    padding: 0;
    color: #fff;
  }

  .overlay-bg {
    background: url('https://images.unsplash.com/photo-1529101091764-c3526daf38fe?auto=format&fit=crop&w=1920&q=80')
      no-repeat center center fixed;
    background-size: cover;
    position: fixed;
    inset: 0;
    z-index: -2;
    filter: blur(2px);
    opacity: 0.4;
  }

  .overlay-tint {
    position: fixed;
    inset: 0;
    z-index: -1;
    background: linear-gradient(135deg, rgba(13, 71, 161, 0.85), rgba(21, 101, 192, 0.9));
  }

  h1, h2 {
    font-weight: 600;
    text-align: center;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.28);
  }

  .home-links a.btn {
    min-width: 220px;
    margin: 8px;
    font-size: 18px;
    font-weight: 500;
    border-radius: 999px;
    padding: 10px 24px;
    box-shadow: 0 6px 15px rgba(0,0,0,0.2);
  }

  .form-control, .form-select {
    background: rgba(255,255,255,0.92);
    border-radius: 10px;
  }

  .form-control:focus, .form-select:focus {
    box-shadow: 0 0 0 0.2rem rgba(25, 118, 210, 0.45);
    border-color: #1976d2;
  }

  .btn-primary {
    background: #1565c0;
    border-color: #1565c0;
  }

  .btn-primary:hover {
    background: #0d47a1;
    border-color: #0d47a1;
  }

  .btn-outline-light {
    border-radius: 999px;
  }

  table.table {
    color: #fff;
  }

  table.table thead {
    background: rgba(21, 101, 192, 0.9);
  }

  table.table tbody tr:nth-child(even) {
    background: rgba(255,255,255,0.06);
  }

  .badge-winner {
    background: #ffca28;
    color: #1a237e;
    font-weight: 700;
    padding: 6px 12px;
    border-radius: 999px;
  }

  .logout-btn {
    border-radius: 999px;
  }

  .stats-box {
    background: rgba(13, 71, 161, 0.8);
    border-radius: 12px;
    padding: 16px;
    color: #e3f2fd;
  }

  a {
    text-decoration: none;
  }

  .small-link {
    font-size: 14px;
  }
  </style>
</head>
<body>
<div class="overlay-bg"></div>
<div class="overlay-tint"></div>
<div class="container py-4">
`;
}

function endHtml() {
  return `
</div>
</body>
</html>`;
}

// ---------------- MYSQL CONNECTION (AIVEN via ENV) ----------------
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL connection failed:", err);
    process.exit(1);
  }
  console.log("✅ Connected to Aiven MySQL");
});

// ---------------- TABLE SETUP ----------------
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
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.send(
      style("Access Denied") +
        `<div class="row justify-content-center mt-5">
           <div class="col-md-5">
             <div class="glass-card text-center">
               <h2>Access Denied</h2>
               <p class="mt-3">Admin access required.</p>
               <a href="/" class="btn btn-outline-light mt-2">Back to Home</a>
             </div>
           </div>
         </div>` +
        endHtml()
    );
  }
  next();
}

// ---------------- HOME ----------------
app.get("/", (req, res) => {
  res.send(
    style("College Voting System") +
      `
<div class="row justify-content-center mt-4">
  <div class="col-lg-7 col-md-9">
    <div class="glass-card text-center">
      <h1 class="mb-3">College Voting System</h1>
      <p class="mb-4">Secure, transparent and simple voting system for your campus elections.</p>
      <div class="home-links d-flex flex-column flex-md-row justify-content-center">
        <a href="/login" class="btn btn-primary">Student Login</a>
        <a href="/register" class="btn btn-outline-light">Student Register</a>
        <a href="/admin-login" class="btn btn-warning text-dark">Admin Login</a>
      </div>
    </div>
  </div>
</div>
` +
      endHtml()
  );
});

// ---------------- STUDENT LOGIN ----------------
app.get("/login", (req, res) => {
  res.send(
    style("Student Login") +
      `
<div class="row justify-content-center mt-4">
  <div class="col-md-5">
    <div class="glass-card">
      <h2>Student Login</h2>
      <form method="POST" action="/checkLogin" class="mt-3">
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="email" name="email" class="form-control" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary w-100 mt-2">Login</button>
      </form>
      <div class="d-flex justify-content-between mt-3">
        <a href="/register" class="small-link text-light">New student? Register</a>
        <a href="/" class="small-link text-light">Home</a>
      </div>
    </div>
  </div>
</div>
` +
      endHtml()
  );
});

app.post("/checkLogin", (req, res) => {
  const { email, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE email=? AND password=? AND role='student'",
    [email, password],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.send(
          style("Invalid Login") +
            `<div class="row justify-content-center mt-5">
               <div class="col-md-5">
                 <div class="glass-card text-center">
                   <h2>Invalid Login</h2>
                   <p class="mt-3">Please check your email and password.</p>
                   <a href="/login" class="btn btn-outline-light mt-2">Try Again</a>
                 </div>
               </div>
             </div>` +
            endHtml()
        );
      }
      req.session.user = rows[0];
      res.redirect("/dashboard");
    }
  );
});

// ---------------- STUDENT REGISTER ----------------
app.get("/register", (req, res) => {
  res.send(
    style("Student Registration") +
      `
<div class="row justify-content-center mt-4">
  <div class="col-md-5">
    <div class="glass-card">
      <h2>Student Registration</h2>
      <form method="POST" action="/createUser" class="mt-3">
        <div class="mb-3">
          <label class="form-label">Full Name</label>
          <input type="text" name="name" class="form-control" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Email (College ID)</label>
          <input type="email" name="email" class="form-control" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-control" required>
        </div>
        <button type="submit" class="btn btn-primary w-100 mt-2">Register</button>
      </form>
      <div class="mt-3">
        <a href="/login" class="small-link text-light">Back to Login</a>
      </div>
    </div>
  </div>
</div>
` +
      endHtml()
  );
});

app.post("/createUser", (req, res) => {
  const { name, email, password } = req.body;
  db.query(
    "INSERT INTO users (name,email,password,role) VALUES (?,?,?, 'student')",
    [name, email, password],
    (err) => {
      if (err) {
        return res.send(
          style("Register Error") +
            `<div class="row justify-content-center mt-5">
               <div class="col-md-5">
                 <div class="glass-card text-center">
                   <h2>Email already used</h2>
                   <a href="/register" class="btn btn-outline-light mt-3">Back</a>
                 </div>
               </div>
             </div>` +
            endHtml()
        );
      }
      res.send(
        style("Registered") +
          `<div class="row justify-content-center mt-5">
             <div class="col-md-5">
               <div class="glass-card text-center">
                 <h2>Registered Successfully ✅</h2>
                 <p class="mt-3">You can now login and vote.</p>
                 <a href="/login" class="btn btn-primary mt-2">Go to Login</a>
               </div>
             </div>
           </div>` +
          endHtml()
      );
    }
  );
});

// ---------------- ADMIN LOGIN ----------------
app.get("/admin-login", (req, res) => {
  res.send(
    style("Admin Login") +
      `
<div class="row justify-content-center mt-4">
  <div class="col-md-5">
    <div class="glass-card">
      <h2>Admin Login</h2>
      <form method="POST" action="/checkAdmin" class="mt-3">
        <div class="mb-3">
          <label class="form-label">Email</label>
          <input type="text" name="email" class="form-control">
        </div>
        <div class="mb-3">
          <label class="form-label">Password</label>
          <input type="password" name="password" class="form-control">
        </div>
        <button type="submit" class="btn btn-warning w-100 mt-2 text-dark">Login as Admin</button>
      </form>
      <div class="mt-3">
        <a href="/" class="small-link text-light">Back to Home</a>
      </div>
    </div>
  </div>
</div>
` +
      endHtml()
  );
});

app.post("/checkAdmin", (req, res) => {
  const { email, password } = req.body;
  db.query(
    "SELECT * FROM users WHERE email=? AND password=? AND role='admin'",
    [email, password],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.send(
          style("Admin Login Error") +
            `<div class="row justify-content-center mt-5">
               <div class="col-md-5">
                 <div class="glass-card text-center">
                   <h2>Invalid Admin Login</h2>
                   <a href="/admin-login" class="btn btn-outline-light mt-3">Try Again</a>
                 </div>
               </div>
             </div>` +
            endHtml()
        );
      }
      req.session.user = rows[0];
      res.redirect("/admin");
    }
  );
});

// ---------------- STUDENT DASHBOARD ----------------
app.get("/dashboard", requireLogin, (req, res) => {
  db.query("SELECT * FROM candidates", (err, candidates) => {
    const user = req.session.user;
    const rows =
      candidates && candidates.length
        ? candidates
            .map(
              (c) => `
<tr>
  <td>${c.name}</td>
  <td>${c.party}</td>
  <td>
    ${
      user.voted
        ? "<span class='badge bg-success'>Voted</span>"
        : `<form method="POST" action="/vote" class="d-inline">
             <input type="hidden" name="id" value="${c.id}">
             <button type="submit" class="btn btn-sm btn-primary">Vote</button>
           </form>`
    }
  </td>
</tr>`
            )
            .join("")
        : `<tr><td colspan="3" class="text-center">No candidates added yet.</td></tr>`;

    res.send(
      style("Dashboard") +
        `
<div class="row justify-content-center mt-4">
  <div class="col-lg-9">
    <div class="glass-card">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0">Welcome, ${user.name}</h2>
        <a href="/logout" class="btn btn-danger btn-sm logout-btn">Logout</a>
      </div>
      <p class="mb-3">Please cast your vote carefully. You can vote only once.</p>

      <table class="table table-hover align-middle">
        <thead>
          <tr>
            <th>Candidate Name</th>
            <th>Group</th>
            <th style="width:150px;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>

      <div class="mt-3 d-flex justify-content-between">
        <a href="/results" class="btn btn-outline-light btn-sm">View Results</a>
      </div>
    </div>
  </div>
</div>
` +
        endHtml()
    );
  });
});

// ---------------- STUDENT VOTE ----------------
app.post("/vote", requireLogin, (req, res) => {
  const user = req.session.user;
  if (user.voted) {
    return res.send(
      style("Already Voted") +
        `<div class="row justify-content-center mt-5">
           <div class="col-md-5">
             <div class="glass-card text-center">
               <h2>You Have Already Voted</h2>
               <a href="/dashboard" class="btn btn-outline-light mt-3">Back</a>
             </div>
           </div>
         </div>` +
        endHtml()
    );
  }

  const id = req.body.id;
  db.query("UPDATE candidates SET votes=votes+1 WHERE id=?", [id], (err) => {
    if (err) console.log(err);
    db.query("UPDATE users SET voted=1 WHERE id=?", [user.id], (err2) => {
      if (err2) console.log(err2);
      req.session.user.voted = 1;
      res.send(
        style("Vote Submitted") +
          `<div class="row justify-content-center mt-5">
             <div class="col-md-6">
               <div class="glass-card text-center">
                 <h2>🎉 Vote Submitted!</h2>
                 <p class="success mt-2">Thank you for participating in the election.</p>
                 <a href="/results" class="btn btn-primary mt-3">View Results</a>
                 <a href="/dashboard" class="btn btn-outline-light mt-3 ms-2">Back to Dashboard</a>
               </div>
             </div>
           </div>` +
          endHtml()
      );
    });
  });
});

// ---------------- RESULTS (Winner Highlight) ----------------
app.get("/results", (req, res) => {
  db.query("SELECT * FROM candidates ORDER BY votes DESC", (err, rows) => {
    let html = style("Election Results") + `
<div class="row justify-content-center mt-4">
  <div class="col-lg-9">
    <div class="glass-card">
      <h2>Election Results</h2>
`;

    if (!rows || rows.length === 0) {
      html += `<p class="mt-3">No candidates available.</p>`;
    } else {
      const maxVotes = Math.max(...rows.map((c) => c.votes));
      const totalVotes = rows.reduce((sum, c) => sum + c.votes, 0);
      const winners = rows.filter((c) => c.votes === maxVotes && maxVotes > 0);

      if (maxVotes > 0 && winners.length > 0) {
        html += `<div class="mt-3 mb-3">
          <span class="badge-winner">🏆 Winner: ${winners
            .map((w) => w.name)
            .join(", ")} (${winners[0].party})</span>
          <p class="mt-2 mb-0">Total Votes Cast: <b>${totalVotes}</b></p>
        </div>`;
      }

      html += `
      <table class="table table-hover align-middle mt-3">
        <thead>
          <tr>
            <th>Name</th>
            <th>Group</th>
            <th>Votes</th>
          </tr>
        </thead>
        <tbody>
      `;

      rows.forEach((c) => {
        const isWinner = c.votes === maxVotes && maxVotes > 0;
        html += `
        <tr ${isWinner ? `style="background:rgba(255, 215, 0, 0.22);"` : ""}>
          <td>${c.name}</td>
          <td>${c.party}</td>
          <td>${c.votes} ${isWinner ? "🏆" : ""}</td>
        </tr>`;
      });

      html += `
        </tbody>
      </table>`;
    }

    html += `
      <div class="mt-3">
        <a href="/dashboard" class="btn btn-outline-light btn-sm">Back</a>
      </div>
    </div>
  </div>
</div>
` + endHtml();

    res.send(html);
  });
});

// ---------------- ADMIN PANEL (with stats + Edit/Delete) ----------------
app.get("/admin", requireAdmin, (req, res) => {
  db.query("SELECT * FROM candidates", (err, candidates) => {
    db.query("SELECT COUNT(*) AS totalStudents, SUM(voted) AS votedStudents FROM users WHERE role='student'", (err2, statsRows) => {
      const stats = statsRows && statsRows[0] ? statsRows[0] : { totalStudents: 0, votedStudents: 0 };
      const totalCandidates = candidates ? candidates.length : 0;
      const totalVotes =
        candidates && candidates.length
          ? candidates.reduce((sum, c) => sum + c.votes, 0)
          : 0;

      const list =
        candidates && candidates.length
          ? candidates
              .map(
                (c) => `
<tr>
  <td>${c.id}</td>
  <td>${c.name}</td>
  <td>${c.party}</td>
  <td>${c.votes}</td>
  <td>
    <a href="/admin/edit/${c.id}" class="btn btn-sm btn-outline-light me-1">Edit</a>
    <form method="POST" action="/admin/delete" class="d-inline">
      <input type="hidden" name="id" value="${c.id}">
      <button type="submit" class="btn btn-sm btn-danger">Delete</button>
    </form>
  </td>
</tr>`
              )
              .join("")
          : `<tr><td colspan="5" class="text-center">No candidates added yet.</td></tr>`;

      res.send(
        style("Admin Panel") +
          `
<div class="row justify-content-center mt-3">
  <div class="col-lg-10">
    <div class="glass-card">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h2 class="mb-0">Admin Panel</h2>
        <a href="/logout" class="btn btn-danger btn-sm logout-btn">Logout</a>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-3">
          <div class="stats-box text-center">
            <div>Total Students</div>
            <div class="fs-4 fw-bold">${stats.totalStudents || 0}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stats-box text-center">
            <div>Students Voted</div>
            <div class="fs-4 fw-bold">${stats.votedStudents || 0}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stats-box text-center">
            <div>Total Candidates</div>
            <div class="fs-4 fw-bold">${totalCandidates}</div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="stats-box text-center">
            <div>Total Votes</div>
            <div class="fs-4 fw-bold">${totalVotes}</div>
          </div>
        </div>
      </div>

      <h5>Add Candidate</h5>
      <form method="POST" action="/admin/add" class="row g-2 mb-4">
        <div class="col-md-4">
          <input type="text" name="name" class="form-control" placeholder="Candidate Name" required>
        </div>
        <div class="col-md-4">
          <select name="party" class="form-select" required>
            <option value="">Select Group</option>
            <option value="Student Council">Student Council</option>
            <option value="Cultural Committee">Cultural Committee</option>
            <option value="Sports Committee">Sports Committee</option>
            <option value="Science Club">Science Club</option>
            <option value="Literature Club">Literature Club</option>
            <option value="NSS / NCC Unit">NSS / NCC Unit</option>
            <option value="Independent Candidate">Independent Candidate</option>
          </select>
        </div>
        <div class="col-md-4">
          <button type="submit" class="btn btn-primary w-100">Add Candidate</button>
        </div>
      </form>

      <h5>Existing Candidates</h5>
      <div class="table-responsive">
        <table class="table table-hover align-middle">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Group</th>
              <th>Votes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${list}
          </tbody>
        </table>
      </div>

      <form method="POST" action="/admin/reset" class="mt-3">
        <button type="submit" class="btn btn-outline-danger">RESET ALL VOTES</button>
      </form>
    </div>
  </div>
</div>
` +
          endHtml()
      );
    });
  });
});

// ---------------- ADMIN: ADD CANDIDATE ----------------
app.post("/admin/add", requireAdmin, (req, res) => {
  const { name, party } = req.body;
  if (!name || !party) return res.redirect("/admin");
  db.query("INSERT INTO candidates (name, party) VALUES (?,?)", [name, party], (err) => {
    if (err) console.log(err);
    res.redirect("/admin");
  });
});

// ---------------- ADMIN: EDIT CANDIDATE (FORM) ----------------
app.get("/admin/edit/:id", requireAdmin, (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM candidates WHERE id=?", [id], (err, rows) => {
    if (err || rows.length === 0) return res.redirect("/admin");
    const c = rows[0];
    res.send(
      style("Edit Candidate") +
        `
<div class="row justify-content-center mt-4">
  <div class="col-md-6">
    <div class="glass-card">
      <h2>Edit Candidate</h2>
      <form method="POST" action="/admin/edit" class="mt-3">
        <input type="hidden" name="id" value="${c.id}">
        <div class="mb-3">
          <label class="form-label">Candidate Name</label>
          <input type="text" name="name" class="form-control" value="${c.name}" required>
        </div>
        <div class="mb-3">
          <label class="form-label">Student Group</label>
          <select name="party" class="form-select" required>
            <option value="">Select Group</option>
            <option value="Student Council" ${c.party === "Student Council" ? "selected" : ""}>Student Council</option>
            <option value="Cultural Committee" ${c.party === "Cultural Committee" ? "selected" : ""}>Cultural Committee</option>
            <option value="Sports Committee" ${c.party === "Sports Committee" ? "selected" : ""}>Sports Committee</option>
            <option value="Science Club" ${c.party === "Science Club" ? "selected" : ""}>Science Club</option>
            <option value="Literature Club" ${c.party === "Literature Club" ? "selected" : ""}>Literature Club</option>
            <option value="NSS / NCC Unit" ${c.party === "NSS / NCC Unit" ? "selected" : ""}>NSS / NCC Unit</option>
            <option value="Independent Candidate" ${c.party === "Independent Candidate" ? "selected" : ""}>Independent Candidate</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary w-100 mt-2">Save Changes</button>
      </form>
      <a href="/admin" class="btn btn-outline-light w-100 mt-3">Cancel</a>
    </div>
  </div>
</div>
` +
        endHtml()
    );
  });
});

// ---------------- ADMIN: EDIT CANDIDATE (SUBMIT) ----------------
app.post("/admin/edit", requireAdmin, (req, res) => {
  const { id, name, party } = req.body;
  db.query(
    "UPDATE candidates SET name=?, party=? WHERE id=?",
    [name, party, id],
    (err) => {
      if (err) console.log(err);
      res.redirect("/admin");
    }
  );
});

// ---------------- ADMIN: DELETE CANDIDATE ----------------
app.post("/admin/delete", requireAdmin, (req, res) => {
  const id = req.body.id;
  db.query("DELETE FROM candidates WHERE id=?", [id], (err) => {
    if (err) console.log(err);
    res.redirect("/admin");
  });
});

// ---------------- ADMIN RESET ----------------
app.post("/admin/reset", requireAdmin, (req, res) => {
  db.query("UPDATE candidates SET votes=0", (err) => {
    if (err) console.log(err);
    db.query("UPDATE users SET voted=0", (err2) => {
      if (err2) console.log(err2);
      res.redirect("/admin");
    });
  });
});

// ---------------- LOGOUT ----------------
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.send(
      style("Logged Out") +
        `<div class="row justify-content-center mt-5">
           <div class="col-md-5">
             <div class="glass-card text-center">
               <h2>Logged Out</h2>
               <a href="/" class="btn btn-outline-light mt-3">Back to Home</a>
             </div>
           </div>
         </div>` +
        endHtml()
    );
  });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
