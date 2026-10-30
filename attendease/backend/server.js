
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const cron = require("node-cron");
require("dotenv").config();

const db = require("./db");
const attendanceRoutes = require("./attendanceRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

//app.use(cors());
app.use(
  cors({
    origin: "https://project2-0-topaz.vercel.app",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// --------------------------------------------------
// Home
// --------------------------------------------------
app.get("/", (req, res) => {
  res.send("AttendEase Backend is running!");
});

// --------------------------------------------------
// Test PostgreSQL connection
// --------------------------------------------------
app.get("/api/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT current_database()");

    res.json({
      message: "Database connected successfully!",
      database: result.rows[0].current_database,
    });
  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(500).json({
      message: "Database connection failed.",
    });
  }
});

// --------------------------------------------------
// List existing database tables
// --------------------------------------------------
app.get("/api/tables", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tables:", error.message);

    res.status(500).json({
      message: "Could not fetch tables.",
    });
  }
});

// --------------------------------------------------
// Login
// --------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password, and role are required.",
      });
    }

    const result = await db.query(
      `SELECT user_id, name, email, password_hash, role
       FROM public.users
       WHERE LOWER(email) = LOWER($1)
         AND role = $2`,
      [email.trim(), role.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Invalid email, password, or role.",
      });
    }

    const user = result.rows[0];

    if (!user.password_hash.startsWith("$2")) {
      return res.status(401).json({
        message:
          "This account needs secure password setup before login.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email, password, or role.",
      });
    }

    res.json({
      message: "Login successful!",
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    res.status(500).json({
      message: "An internal server error occurred.",
    });
  }
});

// --------------------------------------------------
// Admin dashboard
// --------------------------------------------------
app.get("/api/admin/dashboard", async (req, res) => {
  try {
    const studentResult = await db.query(`
      SELECT COUNT(*) AS total_students
      FROM users
      WHERE role = 'student'
    `);

    const attendanceResult = await db.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'present'
        ) AS present_today,
        COUNT(*) FILTER (
          WHERE status = 'absent'
        ) AS absent_today,
        COUNT(*) FILTER (
          WHERE status IN ('present', 'late')
        ) AS attended_today,
        COUNT(*) AS total_marked_today
      FROM attendance
      WHERE attendance_date = CURRENT_DATE
    `);

    const recentResult = await db.query(`
      SELECT
        u.user_id AS student_id,
        u.name AS student_name,
        a.attendance_date AS date,
        a.status
      FROM attendance a
      JOIN users u ON u.user_id = a.student_id
      WHERE u.role = 'student'
      ORDER BY
        a.attendance_date DESC,
        a.check_in_time DESC NULLS LAST
      LIMIT 10
    `);

    const attendance = attendanceResult.rows[0];
    const totalMarked = Number(attendance.total_marked_today);
    const attended = Number(attendance.attended_today);

    res.json({
      stats: {
        totalStudents: Number(
          studentResult.rows[0].total_students
        ),
        presentToday: Number(attendance.present_today),
        absentToday: Number(attendance.absent_today),
        attendanceRate:
          totalMarked > 0
            ? Math.round((attended / totalMarked) * 100)
            : 0,
      },
      records: recentResult.rows,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error.message);

    res.status(500).json({
      message: "Unable to load admin dashboard data.",
    });
  }
});

// --------------------------------------------------
// Get all students
// Used by the admin's Student Profile Update dropdown
// --------------------------------------------------
app.get("/api/students", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        u.user_id,
        u.name,
        u.email,
        s.student_id,
        s.first_name,
        s.last_name,
        s.course
      FROM users u
      JOIN student_details s ON s.user_id = u.user_id
      WHERE u.role = 'student'
      ORDER BY s.first_name ASC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch students error:", error.message);

    res.status(500).json({
      message: "Unable to fetch students.",
    });
  }
});

// --------------------------------------------------
// Student attendance history
// --------------------------------------------------
app.get("/api/student/attendance/:studentId", async (req, res) => {
  try {
    const studentId = Number(req.params.studentId);

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({
        message: "Invalid student ID.",
      });
    }

    const studentResult = await db.query(
      `SELECT user_id, name
       FROM users
       WHERE user_id = $1 AND role = 'student'`,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Student account not found.",
      });
    }

    const summaryResult = await db.query(
      `SELECT
         COUNT(*) AS total_classes,
         COUNT(*) FILTER (
           WHERE LOWER(status) = 'present'
         ) AS present_days,
         COUNT(*) FILTER (
           WHERE LOWER(status) = 'absent'
         ) AS absent_days,
         COUNT(*) FILTER (
           WHERE LOWER(status) IN ('present', 'late')
         ) AS attended_classes
       FROM attendance
       WHERE student_id = $1`,
      [studentId]
    );

    const summary = summaryResult.rows[0];
    const totalClasses = Number(summary.total_classes);
    const attendedClasses = Number(summary.attended_classes);

    const recordsResult = await db.query(
      `SELECT
         attendance_id AS id,
         attendance_date AS date,
         check_in_time,
         status
       FROM attendance
       WHERE student_id = $1
       ORDER BY
         attendance_date DESC,
         check_in_time DESC NULLS LAST
       LIMIT 20`,
      [studentId]
    );

    res.json({
      studentName: studentResult.rows[0].name,
      summary: {
        totalClasses,
        presentDays: Number(summary.present_days),
        absentDays: Number(summary.absent_days),
        attendanceRate:
          totalClasses > 0
            ? Math.round(
                (attendedClasses / totalClasses) * 100
              )
            : 0,
      },
      records: recordsResult.rows.map((record) => ({
        ...record,
        subject: null,
      })),
    });
  } catch (error) {
    console.error("Student attendance error:", error.message);

    res.status(500).json({
      message: "Unable to load student attendance.",
    });
  }
});

// --------------------------------------------------
// Get one student's profile
// --------------------------------------------------
app.get("/api/student/profile/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const result = await db.query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         s.student_id,
         s.first_name,
         s.last_name,
         s.contact,
         s.course,
         s.enrollment_date,
         s.duration
       FROM users u
       LEFT JOIN student_details s ON s.user_id = u.user_id
       WHERE u.user_id = $1
         AND u.role = 'student'`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Student account not found.",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Student profile error:", error.message);

    return res.status(500).json({
      message: "Unable to load profile.",
    });
  }
});

// --------------------------------------------------
// Update student profile
// --------------------------------------------------
app.put("/api/student/profile/:userId", async (req, res) => {
  const userId = Number(req.params.userId);

  const {
    first_name,
    last_name,
    email,
    contact,
    course,
    enrollment_date,
    duration,
  } = req.body;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID.",
    });
  }

  if (
    !first_name?.trim() ||
    !email?.trim() ||
    !course?.trim() ||
    !Number.isInteger(Number(duration)) ||
    Number(duration) <= 0
  ) {
    return res.status(400).json({
      message:
        "First name, email, course, and a valid duration are required.",
    });
  }

  if (
    enrollment_date &&
    !/^\d{4}-\d{2}-\d{2}$/.test(enrollment_date)
  ) {
    return res.status(400).json({
      message: "Enrollment date must use YYYY-MM-DD format.",
    });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const existingUser = await client.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1 AND role = 'student'`,
      [userId]
    );

    if (existingUser.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Student account not found.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailCheck = await client.query(
      `SELECT user_id
       FROM users
       WHERE LOWER(email) = $1 AND user_id <> $2`,
      [normalizedEmail, userId]
    );

    if (emailCheck.rowCount > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "This email is already used by another account.",
      });
    }

    await client.query(
      `UPDATE users
       SET name = $1, email = $2
       WHERE user_id = $3`,
      [
        `${first_name.trim()} ${last_name?.trim() || ""}`.trim(),
        normalizedEmail,
        userId,
      ]
    );

    const profileResult = await client.query(
      `UPDATE student_details
       SET first_name = $1,
           last_name = $2,
           contact = $3,
           course = $4,
           enrollment_date = $5,
           duration = $6
       WHERE user_id = $7
       RETURNING user_id, first_name, last_name, contact,
                 course, enrollment_date, duration`,
      [
        first_name.trim(),
        last_name?.trim() || null,
        contact?.trim() || null,
        course.trim(),
        enrollment_date || null,
        Number(duration),
        userId,
      ]
    );

    if (profileResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Student profile record not found.",
      });
    }

    await client.query("COMMIT");

    return res.json({
      message: "Student profile updated successfully!",
      profile: {
        ...profileResult.rows[0],
        email: normalizedEmail,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Update student profile error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "This email or profile already exists.",
      });
    }

    if (error.code === "22P02" || error.code === "22007") {
      return res.status(400).json({
        message: "Please check the duration and enrollment date.",
      });
    }

    return res.status(500).json({
      message: "Unable to update student profile.",
    });
  } finally {
    client.release();
  }
});

// --------------------------------------------------
// Register a new student
// Saves to the existing users and student_details tables
// --------------------------------------------------
app.post("/api/students/register", async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    password,
    contact,
    course,
    enrollment_date,
    duration,
  } = req.body;

  if (
    typeof first_name !== "string" ||
    !first_name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password ||
    typeof course !== "string" ||
    !course.trim() ||
    duration === undefined ||
    duration === null ||
    String(duration).trim() === ""
  ) {
    return res.status(400).json({
      message:
        "First name, email, password, course, and duration are required.",
    });
  }

  const parsedDuration = Number(duration);

  if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
    return res.status(400).json({
      message: "Duration must be a positive whole number.",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must contain at least 8 characters.",
    });
  }

  if (last_name != null && typeof last_name !== "string") {
    return res.status(400).json({
      message: "Last name must be text.",
    });
  }

  if (contact != null && typeof contact !== "string") {
    return res.status(400).json({
      message: "Contact must be text.",
    });
  }

  if (
    enrollment_date &&
    !/^\d{4}-\d{2}-\d{2}$/.test(enrollment_date)
  ) {
    return res.status(400).json({
      message: "Enrollment date must use YYYY-MM-DD format.",
    });
  }

  let client;

  try {
    client = await db.pool.connect();

    await client.query("BEGIN");

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await client.query(
      "SELECT user_id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'student')
       RETURNING user_id, name, email, role`,
      [
        `${first_name.trim()} ${last_name?.trim() || ""}`.trim(),
        normalizedEmail,
        passwordHash,
      ]
    );

    const newUser = userResult.rows[0];

    const studentResult = await client.query(
      `INSERT INTO student_details
         (user_id, first_name, last_name, contact, course,
          enrollment_date, duration)
       VALUES ($1, $2, $3, $4, $5,
               COALESCE($6::date, CURRENT_DATE), $7)
       RETURNING student_id, user_id, first_name, last_name,
                 contact, course, enrollment_date, duration`,
      [
        newUser.user_id,
        first_name.trim(),
        last_name?.trim() || null,
        contact?.trim() || null,
        course.trim(),
        enrollment_date || null,
        parsedDuration,
      ]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Student registered successfully.",
      user: newUser,
      student: studentResult.rows[0],
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK").catch(() => {});
    }

    console.error("Student registration error:", error.message);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "An account or student profile already exists.",
      });
    }

    if (error.code === "22P02" || error.code === "22007") {
      return res.status(400).json({
        message: "Please check the enrollment date and duration.",
      });
    }

    return res.status(500).json({
      message: "Unable to register student.",
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// --------------------------------------------------
// Mark student attendance using college location
// --------------------------------------------------
app.post("/api/student/attendance/mark", async (req, res) => {
  try {
    const { student_id, latitude, longitude } = req.body;

    const COLLEGE_LAT = 12.754383872187988;
    const COLLEGE_LON = 77.82868321013642;
    const ALLOWED_RADIUS = 150;

    if (
      !student_id ||
      latitude == null ||
      longitude == null ||
      !Number.isFinite(Number(latitude)) ||
      !Number.isFinite(Number(longitude)) ||
      Number(latitude) < -90 ||
      Number(latitude) > 90 ||
      Number(longitude) < -180 ||
      Number(longitude) > 180
    ) {
      return res.status(400).json({
        message: "Valid student ID and location are required.",
      });
    }

    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadius = 6371000;

    const lat1 = toRadians(COLLEGE_LAT);
    const lat2 = toRadians(Number(latitude));
    const deltaLat = toRadians(Number(latitude) - COLLEGE_LAT);
    const deltaLon = toRadians(Number(longitude) - COLLEGE_LON);

    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) ** 2;

    const distance =
      2 *
      earthRadius *
      Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (distance > ALLOWED_RADIUS) {
      return res.status(403).json({
        message: "You must be within the college attendance area.",
        distance: Math.round(distance),
      });
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const day = new Date(`${today}T12:00:00+05:30`).getDay();

    if (day === 0) {
      return res.status(403).json({
        message: "Attendance cannot be marked on Sundays.",
      });
    }

    // Check public holidays
    const holidayResult = await db.query(
      `SELECT holiday_name, holiday_date, description
       FROM public_holidays
       WHERE holiday_date = $1::date
       LIMIT 1`,
      [today]
    );

    if (holidayResult.rowCount > 0) {
      const holiday = holidayResult.rows[0];

      return res.status(403).json({
        isHoliday: true,
        holiday,
        message: `Today is ${holiday.holiday_name}. Attendance marking is disabled.`,
      });
    }

    const student = await db.query(
      `SELECT user_id
       FROM users
       WHERE user_id = $1 AND role = 'student'`,
      [student_id]
    );

    if (student.rowCount === 0) {
      return res.status(404).json({
        message: "Student account not found.",
      });
    }

    const result = await db.query(
      `INSERT INTO attendance (student_id, attendance_date, status)
       VALUES ($1, $2, 'present')
       ON CONFLICT (student_id, attendance_date) DO NOTHING
       RETURNING attendance_id, student_id, attendance_date,
                 check_in_time, status`,
      [student_id, today]
    );

    if (result.rowCount === 0) {
      return res.status(409).json({
        message: "You have already marked attendance today.",
      });
    }

    return res.status(201).json({
      message: "Attendance marked successfully!",
      attendance: result.rows[0],
    });
  } catch (error) {
    console.error("Mark attendance error:", error);

    return res.status(500).json({
      message: "Unable to mark attendance. Please try again.",
    });
  }
});

// --------------------------------------------------
// Automatically mark absent students after 6:00 PM IST
// --------------------------------------------------
async function closeAttendanceDay() {
  try {
    const now = new Date();

    const indiaTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(now);

    if (indiaTime < "18:00") {
      console.log("Attendance closure skipped: before 6 PM IST.");
      return;
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);

    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(now);

    if (weekday === "Sun") {
      console.log("Sunday attendance closure skipped.");
      return;
    }

    const holidayResult = await db.query(
      `SELECT holiday_name
       FROM public_holidays
       WHERE holiday_date = $1::date
       LIMIT 1`,
      [today]
    );

    if (holidayResult.rowCount > 0) {
      console.log(
        `Attendance closure skipped for public holiday: ${holidayResult.rows[0].holiday_name} (${today}).`
      );
      return;
    }

    const result = await db.query(
      `INSERT INTO attendance (
         student_id,
         attendance_date,
         status
       )
       SELECT
         u.user_id,
         $1::date,
         'absent'
       FROM users u
       WHERE u.role = 'student'
         AND NOT EXISTS (
           SELECT 1
           FROM attendance a
           WHERE a.student_id = u.user_id
             AND a.attendance_date = $1::date
         )
       ON CONFLICT (student_id, attendance_date)
       DO NOTHING
       RETURNING attendance_id, student_id`,
      [today]
    );

    console.log(
      `Attendance closed for ${today}. New absent records: ${result.rowCount}.`
    );
  } catch (error) {
    console.error("Automatic absence error:", error.message);
  }
}

// --------------------------------------------------
// Attendance routes and scheduler
// --------------------------------------------------
app.use("/api/attendance", attendanceRoutes);

console.log("Automatic attendance scheduler registered for 6 PM.");
console.log("Next scheduled time: 6:00 PM Asia/Kolkata, every day.");

cron.schedule(
  "0 18 * * *",
  async () => {
    await closeAttendanceDay();
  },
  {
    timezone: "Asia/Kolkata",
  }
);

console.log("Automatic attendance scheduler registered for 6 PM IST.");

// --------------------------------------------------
// Check today's public holiday
// --------------------------------------------------
app.get("/api/public-holiday/today", async (req, res) => {
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const result = await db.query(
      `SELECT holiday_name, holiday_date, description
       FROM public_holidays
       WHERE holiday_date = $1::date
       LIMIT 1`,
      [today]
    );

    if (result.rows.length > 0) {
      return res.json({
        isHoliday: true,
        holiday: result.rows[0],
        message: `Today is ${result.rows[0].holiday_name}. Attendance marking is disabled.`,
      });
    }

    return res.json({
      isHoliday: false,
      holiday: null,
      message: "Today is not a public holiday.",
    });
  } catch (error) {
    console.error("Public holiday check failed:", error.message);

    res.status(500).json({
      message: "Unable to check public holidays.",
    });
  }
});

/* ==========================================
   Employee Profile: Get and Update
   Uses the existing admin_details table
========================================== */

// --------------------------------------------------
// Get employee profile for a linked user account
// --------------------------------------------------
app.get("/api/admin/profile/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    const result = await db.query(
      `SELECT
         u.user_id,
         u.email,
         a.first_name,
         a.last_name,
         a.contact,
         a.designation,
         TO_CHAR(a.date_of_join, 'YYYY-MM-DD') AS date_of_join
       FROM admin_details a
       JOIN users u ON u.user_id = a.user_id
       WHERE a.user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Employee details were not found for this user.",
      });
    }

    return res.json({
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Get employee profile error:", error.message);

    return res.status(500).json({
      message: "Unable to load employee details.",
    });
  }
});

// --------------------------------------------------
// Update employee profile for a linked user account
// --------------------------------------------------
app.put("/api/admin/profile/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    const {
      first_name,
      last_name,
      contact,
      designation,
      date_of_join,
    } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    if (
      typeof first_name !== "string" ||
      !first_name.trim() ||
      typeof designation !== "string" ||
      !designation.trim() ||
      typeof date_of_join !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date_of_join)
    ) {
      return res.status(400).json({
        message:
          "First name, designation, and a valid joining date are required.",
      });
    }

    if (last_name != null && typeof last_name !== "string") {
      return res.status(400).json({
        message: "Last name must be text.",
      });
    }

    if (
      contact != null &&
      (typeof contact !== "string" || contact.length > 15)
    ) {
      return res.status(400).json({
        message: "Contact must be text with at most 15 characters.",
      });
    }

    const result = await db.query(
      `UPDATE admin_details
       SET first_name = $1,
           last_name = $2,
           contact = $3,
           designation = $4,
           date_of_join = $5::date
       WHERE user_id = $6
       RETURNING
         user_id,
         first_name,
         last_name,
         contact,
         designation,
         TO_CHAR(date_of_join, 'YYYY-MM-DD') AS date_of_join`,
      [
        first_name.trim(),
        last_name?.trim() || null,
        contact?.trim() || null,
        designation.trim(),
        date_of_join,
        userId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Employee record not found. No changes were saved.",
      });
    }

    return res.json({
      message: "Employee profile updated successfully!",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Update employee profile error:", error.message);

    return res.status(500).json({
      message: "Unable to update employee details.",
    });
  }
});

/* ==========================================
   Admin Dashboard: Employee Details
   Uses the existing admin_details table
   Employees do not need login accounts
========================================== */

// --------------------------------------------------
// Get all employee records
// --------------------------------------------------
app.get("/api/admin/employees", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        admin_id,
        first_name,
        last_name,
        contact,
        designation,
        TO_CHAR(date_of_join, 'YYYY-MM-DD') AS date_of_join
      FROM admin_details
      ORDER BY admin_id DESC
    `);

    return res.json({
      employees: result.rows,
    });
  } catch (error) {
    console.error("Fetch employees error:", error.message);

    return res.status(500).json({
      message: "Unable to fetch employee details.",
    });
  }
});

// --------------------------------------------------
// Add a new employee without creating a login account
// Rejects an already-used contact number
// --------------------------------------------------
app.post("/api/admin/employees", async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      contact,
      designation,
      date_of_join,
    } = req.body;

    // Validate required fields
    if (
      typeof first_name !== "string" ||
      !first_name.trim() ||
      typeof designation !== "string" ||
      !designation.trim()
    ) {
      return res.status(400).json({
        message: "First name and designation are required.",
      });
    }

    if (last_name != null && typeof last_name !== "string") {
      return res.status(400).json({
        message: "Last name must be text.",
      });
    }

    if (
      contact != null &&
      (typeof contact !== "string" || contact.length > 15)
    ) {
      return res.status(400).json({
        message: "Contact must be text with at most 15 characters.",
      });
    }

    if (
      date_of_join &&
      !/^\d{4}-\d{2}-\d{2}$/.test(date_of_join)
    ) {
      return res.status(400).json({
        message: "Joining date must use YYYY-MM-DD format.",
      });
    }

    const firstName = first_name.trim();
    const lastName = last_name?.trim() || null;
    const contactNumber = contact?.trim() || null;
    const jobTitle = designation.trim();

    // Reject if the contact number already exists.
    // Existing records are not modified or deleted.
    if (contactNumber) {
      const duplicateResult = await db.query(
        `SELECT admin_id
         FROM admin_details
         WHERE contact = $1
         LIMIT 1`,
        [contactNumber]
      );

      if (duplicateResult.rowCount > 0) {
        return res.status(409).json({
          message:
            "This contact number is already registered to an employee.",
        });
      }
    }

    // Insert only when the contact number is not already registered.
    const result = await db.query(
      `INSERT INTO admin_details
         (user_id, first_name, last_name, contact, designation, date_of_join)
       VALUES (NULL, $1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
       RETURNING
         admin_id,
         first_name,
         last_name,
         contact,
         designation,
         TO_CHAR(date_of_join, 'YYYY-MM-DD') AS date_of_join`,
      [
        firstName,
        lastName,
        contactNumber,
        jobTitle,
        date_of_join || null,
      ]
    );

    return res.status(201).json({
      message: "Employee added successfully!",
      employee: result.rows[0],
    });
  } catch (error) {
    console.error("Add employee error:", error.message);

    if (error.code === "22P02" || error.code === "22007") {
      return res.status(400).json({
        message: "Please enter a valid joining date.",
      });
    }

    return res.status(500).json({
      message: "Unable to save employee details.",
    });
  }
});

/* ==========================================
   Student Attendance Reports
========================================== */

app.get("/api/reports/student-attendance", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate the selected date range
    const isValidDate = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
        return false;
      }

      const date = new Date(`${value}T00:00:00Z`);

      return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
      );
    };

    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return res.status(400).json({
        message: "Please provide valid startDate and endDate values in YYYY-MM-DD format.",
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        message: "Start date cannot be later than end date.",
      });
    }

    const result = await db.query(
      `SELECT
         u.user_id,
         u.name,
         u.email,
         a.attendance_id,
         a.attendance_date,
         a.check_in_time,
         a.status
       FROM attendance a
       JOIN users u ON u.user_id = a.student_id
       WHERE u.role = 'student'
         AND a.attendance_date >= $1::date
         AND a.attendance_date < ($2::date + INTERVAL '1 day')
       ORDER BY
         a.attendance_date DESC,
         u.name ASC,
         a.check_in_time DESC NULLS LAST`,
      [startDate, endDate]
    );

    return res.json({
      startDate,
      endDate,
      totalRecords: result.rows.length,
      records: result.rows,
    });
  } catch (error) {
    console.error("Student attendance report error:", error.message);

    return res.status(500).json({
      message: "Unable to generate the student attendance report.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`AttendEase server running on port ${PORT}`);
});
