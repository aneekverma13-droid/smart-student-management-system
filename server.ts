import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { DB, initDatabase, generateId } from "./server/db";

const JWT_SECRET = process.env.JWT_SECRET || "smart-edu-super-secret-key-2026";

// Extend Request interface to include user info from JWT
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: "admin" | "faculty" | "student";
    name: string;
  };
}

function isRunningOnVercel(): boolean {
  return process.env.VERCEL === "1";
}

export async function createApp() {
  // Initialize the database (MongoDB or local JSON fallback)
  await initDatabase();

  const app = express();
  app.use(express.json());

  // --- API ROUTE MIDDLEWARE: JWT AUTHENTICATION ---
  const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Access denied. Token missing or invalid." });
      return;
    }

    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: "admin" | "faculty" | "student";
        name: string;
      };
      req.user = decoded;
      next();
    } catch (err) {
      res.status(403).json({ error: "Invalid or expired authorization token." });
    }
  };

  // Helper middleware for role-based authorization
  const authorizeRoles = (...allowedRoles: Array<"admin" | "faculty" | "student">) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user || !allowedRoles.includes(req.user.role)) {
        res.status(403).json({ error: `Unauthorized. Required role: ${allowedRoles.join(" or ")}` });
        return;
      }
      next();
    };
  };

  // --- 1. AUTHENTICATION ENDPOINTS ---

  app.post("/api/auth/login", async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required fields." });
      return;
    }

    try {
      let user = await DB.users.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Fallback: search by name/username (case-insensitive) for ultra-convenient logins (e.g. typing "raghu")
        const allUsers = await DB.users.find();
        user = allUsers.find(u => u.name && u.name.toLowerCase() === email.toLowerCase()) || null;
      }

      if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
      }

      // Generate JWT Token
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // If user is a student, we also want to return their student profile ID
      let studentProfileId = "";
      if (user.role === "student") {
        const student = await DB.students.findOne({ userId: user._id });
        if (student) {
          studentProfileId = student._id;
        }
      }

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentProfileId,
        },
      });
    } catch (error) {
      console.error("Login failed:", error);
      res.status(500).json({ error: "Internal server authentication error" });
    }
  });

  app.get("/api/auth/profile", authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ error: "User context not found in request." });
      return;
    }
    res.json({ user: req.user });
  });

  // --- 2. ADMIN ENDPOINTS ---

  // Get Admin Dashboard Stats
  app.get("/api/admin/stats", authenticateJWT, authorizeRoles("admin"), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allStudents = await DB.students.find();
      const allUsers = await DB.users.find();
      const faculty = allUsers.filter(u => u.role === "faculty");

      // Calculate state calculations
      const totalStudents = allStudents.length;
      const totalFaculty = faculty.length;

      // Class average calculations
      const allMarks = await DB.marks.find();
      const avgMarks = allMarks.length > 0
        ? Math.round(allMarks.reduce((acc, m) => acc + m.marks, 0) / allMarks.length)
        : 0;

      // Department distribution for visual grids
      const deptCounts: { [key: string]: number } = {};
      allStudents.forEach((std) => {
        const dept = std.department || "General";
        deptCounts[dept] = (deptCounts[dept] || 0) + 1;
      });

      const departmentData = Object.entries(deptCounts).map(([name, count]) => ({
        name,
        count,
      }));

      // Calculate attendance average across all students
      const allAttendance = await DB.attendance.find();
      const presentCount = allAttendance.filter(a => a.status === "Present").length;
      const totalAttendanceCount = allAttendance.length;
      const avgAttendanceRate = totalAttendanceCount > 0
        ? Math.round((presentCount / totalAttendanceCount) * 100)
        : 0;

      res.json({
        totalStudents,
        totalFaculty,
        avgMarks,
        avgAttendanceRate,
        departmentData,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to gather admin analytics stats." });
    }
  });

  const normalizeSubjectForMatching = (sub: string): string => {
    if (!sub) return "";
    let s = sub.toLowerCase();
    
    // Custom synonyms/replacements
    s = s.replace(/&/g, "and");
    s = s.replace(/\bla\b/g, "linearalgebra");
    s = s.replace(/\bpde\b/g, "partialdifferentialequations");
    s = s.replace(/\bstats\b/g, "statistics");
    s = s.replace(/\bmgmt\b/g, "management");
    s = s.replace(/\bdiploma\b/g, "");
    
    // Strip all non-alphanumeric
    s = s.replace(/[\s\-/\(\),.]/g, "");
    
    // Normalise problem solving analysis
    if (s.includes("problemsolving") && s.includes("analysis") && !s.includes("and")) {
      s = s.replace("problemsolvinganalysis", "problemsolvingandanalysis");
    }
    
    return s;
  };

  const getFacultyPrivileges = (facultyUser: { userId: string, name: string, email: string }) => {
    // 1. Extract subject taught by faculty from their name (e.g., "(Database Systems)")
    let subjectTaught: string | null = null;
    const match = facultyUser.name.match(/\(([^)]+)\)/);
    if (match) {
      subjectTaught = match[1].trim();
    }

    const normalizedSubjectTaught = subjectTaught ? normalizeSubjectForMatching(subjectTaught) : null;

    // 2. Map of faculty ID prefixes or domains to departments (e.g. cv/me/ch/ec/ee/cs/bm)
    let facultyDept: string | null = null;
    const userId = facultyUser.userId;
    if (userId.includes("_fac_cv_") || userId.includes("_cv_")) {
      facultyDept = "Civil Engineering";
    } else if (userId.includes("_fac_me_") || userId.includes("_me_")) {
      facultyDept = "Mechanical Engineering";
    } else if (userId.includes("_fac_ch_") || userId.includes("_ch_")) {
      facultyDept = "Chemical Engineering";
    } else if (userId.includes("_fac_ec_") || userId.includes("_ec_")) {
      facultyDept = "Electronics & Communication";
    } else if (userId.includes("_fac_ee_") || userId.includes("_ee_")) {
      facultyDept = "Electrical & Electronics";
    } else if (userId.includes("_fac_cs_") || userId.includes("_cs_")) {
      facultyDept = "Computer Science & Engineering";
    } else if (userId.includes("_fac_bm_") || userId.includes("_bm_")) {
      facultyDept = "Biomedical Engineering";
    }

    const deptSubjects: { [key: string]: string[] } = {
      "Civil Engineering": [
        "Applied Probability and Statistics",
        "Structural Analysis-I",
        "Water & Wastewater Engineering",
        "Concrete Technology",
        "Construction Project Management",
        "Hydrology & Irrigation Engineering",
        "Problem Solving and Analysis",
        "Survey Practice – II",
        "Concrete Laboratory",
        "Generative AI for Civil Engineering"
      ],
      "Mechanical Engineering": [
        "Numerical Methods and Partial Differential Equations",
        "Fundamentals of Machine Design",
        "Machines & Mechanisms",
        "Engineering Materials",
        "Mechatronics",
        "Microcontroller & Interfacing",
        "Microcontroller & Interfacing Lab",
        "Machines & Mechanisms Lab",
        "Engineering Materials Lab",
        "Problem Solving & Analysis"
      ],
      "Chemical Engineering": [
        "Numerical methods, Linear Algebra and Partial differential equations",
        "Industrial Pollution Control",
        "Process Heat Transfer",
        "Chemical Engineering Thermodynamics",
        "Material Science & Engineering",
        "Computer-based Chemical Calculations",
        "Process Heat Transfer Lab.",
        "Technical Chemistry Lab.",
        "Problem Solving & Analysis"
      ],
      "Electronics & Communication": [
        "Linear Algebra & Partial Differential Equations",
        "Problem Solving & Analysis",
        "Electromagnetic Fields and Waves",
        "Linear Integrated Circuits",
        "Control Systems",
        "ARM Processor & Applications",
        "Digital System Design Using Verilog",
        "Data Acquisition and Controls Lab",
        "ARM Microcontroller Lab",
        "Data Structure Applications Lab",
        "Data Structure Using C Lab (Diploma)"
      ],
      "Computer Science & Engineering": [
        "Applied Statistics with R/ Vectors and Linear Algebra",
        "Microcontroller: Programming and Interfacing",
        "Object-Oriented Programming",
        "Principles of Compiler Design",
        "Operating System Principles and Programming",
        "Exploratory Data Analysis",
        "Object Oriented Programming Lab",
        "Problem Solving & Analysis"
      ],
      "Electrical & Electronics": [
        "Linear Algebra and Partial Differential equations",
        "Problem Solving Analysis",
        "ARM Processor & Applications",
        "Linear Control Systems",
        "Electrical Machines",
        "Signals & Systems",
        "Power Electronics",
        "ARM Microcontroller Lab",
        "Digital System Design using Verilog",
        "Data Structure Applications Lab",
        "Data Structure Using C Lab (Diploma)"
      ],
      "Computer Science (Artificial Intelligence)": ["Machine Learning", "Neural Networks", "Data Structures", "Design & Analysis of Algorithms", "Artificial Intelligence"],
      "Biomedical Engineering": [
        "Linear Algebra &Partial Differential Equations",
        "Signal Conditioning and Data acquisition",
        "Biomedical Instrumentation",
        "Human Anatomy and Physiology",
        "ARM Processor & Applications",
        "ARM Microcontroller Lab",
        "Biomedical Instrumentation Lab",
        "Signal Conditioning and Data acquisition Lab",
        "Data Structure Using C Lab(Diploma)",
        "Vector Calculus Differential Equations(Diploma)",
        "Problem Solving & Analysis"
      ]
    };

    // If we couldn't resolve the department through the ID, let's find the first department that offers the subject taught
    if (!facultyDept && normalizedSubjectTaught) {
      for (const [dept, subs] of Object.entries(deptSubjects)) {
        if (subs.some(sub => normalizeSubjectForMatching(sub) === normalizedSubjectTaught)) {
          facultyDept = dept;
          break;
        }
      }
    }

    // Also build list of all departments that include this subject
    const branchesOfferingSubject: string[] = [];
    if (normalizedSubjectTaught) {
      for (const [dept, subs] of Object.entries(deptSubjects)) {
        if (subs.some(sub => normalizeSubjectForMatching(sub) === normalizedSubjectTaught)) {
          branchesOfferingSubject.push(dept);
        }
      }
    }

    return {
      facultyDept,
      normalizedSubjectTaught,
      branchesOfferingSubject,
    };
  };

  const getAllowedStudentIds = async (facultyUser: { userId: string, name: string, email: string }): Promise<Set<string>> => {
    const privileges = getFacultyPrivileges(facultyUser);
    const students = await DB.students.find();
    const allowed = new Set<string>();
    
    students.forEach((std) => {
      if (privileges.facultyDept && std.department === privileges.facultyDept) {
        allowed.add(std._id);
      } else if (privileges.branchesOfferingSubject.includes(std.department)) {
        allowed.add(std._id);
      }
    });
    
    return allowed;
  };

  // Fetch all students (Optional Name/USN query filter)
  app.get("/api/admin/students", authenticateJWT, authorizeRoles("admin", "faculty"), async (req: Request, res: Response) => {
    try {
      let students = await DB.students.find();

      const authReq = req as AuthenticatedRequest;
      if (authReq.user && authReq.user.role === "faculty") {
        const privileges = getFacultyPrivileges(authReq.user);
        students = students.filter((std) => {
          // 1. Same department/branch
          if (privileges.facultyDept && std.department === privileges.facultyDept) {
            return true;
          }
          // 2. Exception: professor teaching same subject in different branch
          if (privileges.branchesOfferingSubject.includes(std.department)) {
            return true;
          }
          return false;
        });
      }

      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to retrieve student records." });
    }
  });

  // Add a new Student (And create their credentials user account simultaneously)
  app.post("/api/admin/students", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, usn, department, semester, cgpa } = req.body;

    if (!name || !email || !password || !usn || !department || !semester) {
      res.status(400).json({ error: "Missing required student profile or security fields." });
      return;
    }

    try {
      // Check if email already in use
      const existingUser = await DB.users.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ error: "A user account with this email address already exists." });
        return;
      }

      // Check if USN already exists
      const existingUSN = await DB.students.findOne({ usn: usn.toUpperCase() });
      if (existingUSN) {
        res.status(400).json({ error: "A student record with this University Seat Number (USN) already exists." });
        return;
      }

      // 1. Create User account credentials
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = await DB.users.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "student",
      });

      // 2. Create Student profile linking to the newly instantiated user credentials record
      const studentProfile = await DB.students.create({
        userId: newUser._id,
        name,
        email: newUser.email,
        usn: usn.toUpperCase(),
        department,
        semester,
        cgpa: parseFloat(cgpa) || 0.00,
      });

      // 3. Preseed dummy marks/grades entries for immediate dashboard fidelity
      const defaultSubjects = ["Database Systems", "Computer Networks", "Operating Systems"];
      for (const subj of defaultSubjects) {
        await DB.marks.createOrUpdate(
          studentProfile._id,
          subj,
          Math.floor(Math.random() * 25) + 70, // 70 to 95 marks
          studentProfile.name,
          studentProfile.usn
        );
        // Preseed initial attendance logging
        await DB.attendance.createOrUpdate(
          new Date().toISOString().split("T")[0],
          studentProfile._id,
          subj,
          "Present",
          studentProfile.name,
          studentProfile.usn
        );
      }

      res.status(201).json({
        message: "Student user successfully created and enrolled.",
        student: studentProfile,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to assemble and persist student profile." });
    }
  });

  // Edit / Update an existing student profile
  app.put("/api/admin/students/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
    const studentId = req.params.id;
    const updateData = req.body;

    try {
      const student = await DB.students.findOne({ _id: studentId });
      if (!student) {
        res.status(404).json({ error: "Target student profile record not found." });
        return;
      }

      // If updating USN, check if already exists elsewhere
      if (updateData.usn && updateData.usn.toUpperCase() !== student.usn) {
        const existingUSN = await DB.students.findOne({ usn: updateData.usn.toUpperCase() });
        if (existingUSN) {
          res.status(400).json({ error: "Another student profile already claims this USN." });
          return;
        }
        updateData.usn = updateData.usn.toUpperCase();
      }

      const success = await DB.students.updateOne({ _id: studentId }, updateData);
      if (success) {
        const updated = await DB.students.findOne({ _id: studentId });
        res.json({ message: "Student record synchronized successfully.", student: updated });
      } else {
        res.status(400).json({ error: "Unresolvable request data. No updates persisted." });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to modify student record details." });
    }
  });

  // Delete student profile and linked records
  app.delete("/api/admin/students/:id", authenticateJWT, authorizeRoles("admin", "faculty"), async (req: Request, res: Response) => {
    const studentId = req.params.id;
    try {
      const success = await DB.students.deleteOne({ _id: studentId });
      if (success) {
        res.json({ message: "Student record and all associated logs permanently deleted." });
      } else {
        res.status(404).json({ error: "Target student profile record not found." });
      }
    } catch (error) {
      res.status(500).json({ error: "An error occurred during transaction rollback delete." });
    }
  });

  // Fetch lists of all Faculty user profiles
  app.get("/api/admin/faculty", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
    try {
      const users = await DB.users.find({ role: "faculty" });
      const sanitized = users.map(({ _id, name, email, role, branch }) => ({ _id, name, email, role, branch: branch || "General Academics" }));
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to gather faculty listings." });
    }
  });

  // Add Faculty profile
  app.post("/api/admin/faculty", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
    const { name, email, password, branch } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Faculty name, email and secure passcodes are vital." });
      return;
    }

    try {
      const existingUser = await DB.users.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ error: "Authentication system records another user with this email." });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newFaculty = await DB.users.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "faculty",
        branch: branch || "General Academics"
      });

      res.status(201).json({
        message: "Faculty instructor registered successfully.",
        faculty: {
          id: newFaculty._id,
          name: newFaculty.name,
          email: newFaculty.email,
          branch: newFaculty.branch,
          role: newFaculty.role
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Authentication credentials enrollment failed." });
    }
  });

  // Delete Faculty profile
  app.delete("/api/admin/faculty/:id", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
    const facultyId = req.params.id;
    try {
      const success = await DB.users.deleteOne({ _id: facultyId, role: "faculty" });
      if (success) {
        res.json({ message: "Faculty instructor profile permanently deleted." });
      } else {
        res.status(404).json({ error: "Target faculty record not found." });
      }
    } catch (error) {
      res.status(500).json({ error: "An error occurred during faculty deletion." });
    }
  });

  // Fetch lists of all Admin user profiles
  app.get("/api/admin/admins", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
    try {
      const users = await DB.users.find({ role: "admin" });
      const sanitized = users.map(({ _id, name, email, role }) => ({ _id, name, email, role }));
      res.json(sanitized);
    } catch (error) {
      res.status(500).json({ error: "Failed to gather admin listings." });
    }
  });

  // Add Admin profile
  app.post("/api/admin/admins", authenticateJWT, authorizeRoles("admin"), async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "Admin name, email and details are required." });
      return;
    }

    try {
      const existingUser = await DB.users.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(400).json({ error: "Another user already claims this email address." });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newAdmin = await DB.users.create({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: "admin",
      });

      res.status(201).json({
        message: "Admin model registered successfully.",
        adminObj: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Admin account credentials enrollment failed." });
    }
  });

  // Delete Admin profile
  app.delete("/api/admin/admins/:id", authenticateJWT, authorizeRoles("admin"), async (req: AuthenticatedRequest, res: Response) => {
    const adminId = req.params.id;
    try {
      // Prevent deleting self
      if (req.user && req.user.userId === adminId) {
        res.status(400).json({ error: "You cannot delete your own administrative account." });
        return;
      }

      const success = await DB.users.deleteOne({ _id: adminId, role: "admin" });
      if (success) {
        res.json({ message: "Admin profile permanently deleted." });
      } else {
        res.status(404).json({ error: "Target Admin record not found." });
      }
    } catch (error) {
      res.status(500).json({ error: "An error occurred during Admin deletion." });
    }
  });

  // --- 3. FACULTY MANAGEMENT ENDPOINTS ---

  // Upload or Update multiple student marks
  app.post("/api/faculty/marks", authenticateJWT, authorizeRoles("faculty"), async (req: Request, res: Response) => {
    const { subject, marksList } = req.body; // marksList: Array<{ studentId: string, marks: number }>

    if (!subject || !marksList || !Array.isArray(marksList)) {
      res.status(400).json({ error: "Subject title and grades registry list are required." });
      return;
    }

    try {
      const authReq = req as AuthenticatedRequest;
      const allowedIds = authReq.user ? await getAllowedStudentIds(authReq.user) : new Set<string>();

      for (const entry of marksList) {
        if (authReq.user && !allowedIds.has(entry.studentId)) {
          continue;
        }

        const student = await DB.students.findOne({ _id: entry.studentId });
        if (student) {
          await DB.marks.createOrUpdate(
            student._id,
            subject,
            Number(entry.marks),
            student.name,
            student.usn
          );
        }
      }
      res.json({ message: "Student marks successfully registered and updated." });
    } catch (error) {
      res.status(500).json({ error: "Failed to persist subject marks updates." });
    }
  });

  // Fetch student grade profile lists
  app.get("/api/faculty/marks", authenticateJWT, authorizeRoles("faculty"), async (req: Request, res: Response) => {
    const { subject } = req.query;
    try {
      const query = subject ? { subject: String(subject) } : {};
      let marks = await DB.marks.find(query);

      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        const allowedIds = await getAllowedStudentIds(authReq.user);
        marks = marks.filter(m => allowedIds.has(m.studentId));
      }

      res.json(marks);
    } catch (error) {
      res.status(500).json({ error: "Failed to compile grades registry logs." });
    }
  });

  // Submit / Update Daily Attendance logs
  app.post("/api/faculty/attendance", authenticateJWT, authorizeRoles("faculty"), async (req: Request, res: Response) => {
    const { date, subject, attendanceList } = req.body; // attendanceList: Array<{ studentId: string, status: "Present" | "Absent" }>

    if (!date || !subject || !attendanceList || !Array.isArray(attendanceList)) {
      res.status(400).json({ error: "Log date, target subject, and attendance registration arrays are mandatory." });
      return;
    }

    try {
      const authReq = req as AuthenticatedRequest;
      const allowedIds = authReq.user ? await getAllowedStudentIds(authReq.user) : new Set<string>();

      for (const entry of attendanceList) {
        if (authReq.user && !allowedIds.has(entry.studentId)) {
          continue;
        }

        const student = await DB.students.findOne({ _id: entry.studentId });
        if (student) {
          await DB.attendance.createOrUpdate(
            date,
            student._id,
            subject,
            entry.status,
            student.name,
            student.usn
          );
        }
      }
      res.json({ message: "Daily attendance values registered and synchronized." });
    } catch (error) {
      res.status(500).json({ error: "Failed to persist bulk attendance parameters." });
    }
  });

  // Get attendance lists logged for a specific date and course / subject
  app.get("/api/faculty/attendance", authenticateJWT, authorizeRoles("faculty"), async (req: Request, res: Response) => {
    const { date, subject } = req.query;
    if (!date || !subject) {
      res.status(400).json({ error: "Provide both date and subject parameter filters." });
      return;
    }

    try {
      let logs = await DB.attendance.find({
        date: String(date),
        subject: String(subject),
      });

      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        const allowedIds = await getAllowedStudentIds(authReq.user);
        logs = logs.filter(log => allowedIds.has(log.studentId));
      }

      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance logs." });
    }
  });

  // --- 4. STUDENT USER PROFILE INDIVIDUAL ENDPOINTS ---

  // Get specific student stats
  app.get("/api/student/profile/:userId", authenticateJWT, async (req: Request, res: Response) => {
    const { userId } = req.params;
    try {
      const student = await DB.students.findOne({ userId });
      if (!student) {
        res.status(404).json({ error: "Student profile associated with this account credentials is empty." });
        return;
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile." });
    }
  });

  // Get specific student's attendance records with computed analysis
  app.get("/api/student/attendance/:studentId", authenticateJWT, async (req: Request, res: Response) => {
    const { studentId } = req.params;
    try {
      const logs = await DB.attendance.find({ studentId });
      const totalSessions = logs.length;
      const presentSessions = logs.filter(l => l.status === "Present").length;
      const overallPercentage = totalSessions > 0
        ? Math.round((presentSessions / totalSessions) * 100)
        : 100; // default to perfect on zero records to keep layout clean

      // Compile subject-wise attendance aggregation
      const subjectMap: { [key: string]: { present: number; total: number } } = {};
      logs.forEach((log) => {
        if (!subjectMap[log.subject]) {
          subjectMap[log.subject] = { present: 0, total: 0 };
        }
        subjectMap[log.subject].total += 1;
        if (log.status === "Present") {
          subjectMap[log.subject].present += 1;
        }
      });

      const subjectStats = Object.entries(subjectMap).map(([subject, counts]) => ({
        subject,
        attendancePercentage: Math.round((counts.present / counts.total) * 100),
        present: counts.present,
        total: counts.total,
      }));

      res.json({
        logs,
        summary: {
          totalSessions,
          presentSessions,
          overallPercentage,
        },
        subjectStats,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to compute attendance analyses." });
    }
  });

  // Get specific student's academic performance marks list
  app.get("/api/student/marks/:studentId", authenticateJWT, async (req: Request, res: Response) => {
    const { studentId } = req.params;
    try {
      const marks = await DB.marks.find({ studentId });
      const totalMarks = marks.reduce((acc, m) => acc + m.marks, 0);
      const subjectCount = marks.length;
      const averageMarks = subjectCount > 0 ? Math.round(totalMarks / subjectCount) : 0;

      res.json({
        marks,
        summary: {
          subjectCount,
          totalMarks,
          averageMarks,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to compile mark records." });
    }
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING (only for standalone, not Vercel)
  if (!isRunningOnVercel()) {
    if (process.env.NODE_ENV !== "production") {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  return app;
}

// Only start the server when run directly (not imported by Vercel)
if (!isRunningOnVercel()) {
  createApp().then((app) => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Smart Student Management System server running securely on http://localhost:${PORT}`);
    });
  }).catch((error) => {
    console.error("Critical server bootstrap error:", error);
  });
}
