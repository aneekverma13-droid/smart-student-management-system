import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Paths and configurations
const MONGO_URI = process.env.MONGO_URI || "";
const DB_DIR = path.join(process.cwd(), "server", "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Define TypeScript interfaces for our collections
export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "faculty" | "student";
  branch?: string;
}

export interface StudentProfile {
  _id: string;
  userId: string; // Links to User
  name: string;
  email: string;
  usn: string; // University Seat Number (Register Number)
  department: string;
  semester: string;
  cgpa: number;
}

export interface AttendanceRecord {
  _id: string;
  studentId: string; // Links to StudentProfile
  studentName: string;
  usn: string;
  subject: string;
  date: string; // YYYY-MM-DD
  status: "Present" | "Absent";
}

export interface MarkRecord {
  _id: string;
  studentId: string; // Links to StudentProfile
  studentName: string;
  usn: string;
  subject: string;
  marks: number;
  maxMarks: number;
}

// Mongoose Schemas and Models (MongoDB)
const UserSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: ["admin", "faculty", "student"] },
  branch: { type: String }
}, { _id: false, timestamps: true });

const StudentProfileSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  usn: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  semester: { type: String, required: true },
  cgpa: { type: Number, required: true }
}, { _id: false, timestamps: true });

const AttendanceRecordSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  usn: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ["Present", "Absent"], required: true }
}, { _id: false, timestamps: true });

// Compound unique index to prevent duplicate attendance logs
AttendanceRecordSchema.index({ studentId: 1, date: 1, subject: 1 }, { unique: true });

const MarkRecordSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  usn: { type: String, required: true },
  subject: { type: String, required: true },
  marks: { type: Number, required: true },
  maxMarks: { type: Number, required: true, default: 100 }
}, { _id: false, timestamps: true });

// Complex unique index to avoid marking a student twice for the same exam subject
MarkRecordSchema.index({ studentId: 1, subject: 1 }, { unique: true });

export const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
export const StudentProfileModel = mongoose.models.StudentProfile || mongoose.model("StudentProfile", StudentProfileSchema);
export const AttendanceRecordModel = mongoose.models.AttendanceRecord || mongoose.model("AttendanceRecord", AttendanceRecordSchema);
export const MarkRecordModel = mongoose.models.MarkRecord || mongoose.model("MarkRecord", MarkRecordSchema);

// Database state schema
interface DatabaseState {
  users: User[];
  students: StudentProfile[];
  attendance: AttendanceRecord[];
  marks: MarkRecord[];
}

// Global active in-memory state
let dbState: DatabaseState = {
  users: [],
  students: [],
  attendance: [],
  marks: [],
};

// Flags
export let isUsingMongoDB = false;

// Helpers to read/write JSON DB
function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function loadLocalDB(): DatabaseState {
  try {
    ensureDirectoryExistence(DB_FILE);
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load local JSON DB:", error);
  }
  return { users: [], students: [], attendance: [], marks: [] };
}

function saveLocalDB() {
  if (isUsingMongoDB) return; // Don't save to JSON if using mongoose
  try {
    ensureDirectoryExistence(DB_FILE);
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save local JSON DB:", error);
  }
}

// Helper to generate IDs
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Database Seeding Logic
async function seedDefaultData() {
  const count = dbState.users.length;
  if (count > 0) return; // Already seeded

  console.log("Seeding fresh student database default users...");

  const salt = await bcrypt.genSalt(10);
  const passwordHashAdmin = await bcrypt.hash("admin123", salt);
  const passwordHashFaculty = await bcrypt.hash("faculty123", salt);
  const passwordHashStudent1 = await bcrypt.hash("student13", salt);
  const passwordHashStudent2 = await bcrypt.hash("student23", salt);
  const passwordHashStudent3 = await bcrypt.hash("student33", salt);

  // 1. Create Users
  const adminUser: User = {
    _id: "u_admin",
    name: "Dr. Rachel Green (Admin)",
    email: "admin@smartedu.com",
    passwordHash: passwordHashAdmin,
    role: "admin",
  };

  const facultyUser: User = {
    _id: "u_faculty",
    name: "Prof. Alan Turing",
    email: "faculty@smartedu.com",
    passwordHash: passwordHashFaculty,
    role: "faculty",
  };

  const studentUser1: User = {
    _id: "u_student1",
    name: "Alex Mercer",
    email: "alex@smartedu.com",
    passwordHash: passwordHashStudent1,
    role: "student",
  };

  const studentUser2: User = {
    _id: "u_student2",
    name: "Emily Watson",
    email: "emily@smartedu.com",
    passwordHash: passwordHashStudent2,
    role: "student",
  };

  const studentUser3: User = {
    _id: "u_student3",
    name: "Marcus Aurelius",
    email: "marcus@smartedu.com",
    passwordHash: passwordHashStudent3,
    role: "student",
  };

  const raghuUser: User = {
    _id: "u_raghu_seed",
    name: "raghu",
    email: "raghu@smartedu.com",
    passwordHash: passwordHashAdmin, // corresponds to "admin123"
    role: "admin",
  };

  dbState.users = [adminUser, raghuUser, facultyUser, studentUser1, studentUser2, studentUser3];

  // 2. Create Student Profiles
  const student1: StudentProfile = {
    _id: "s_student1",
    userId: "u_student1",
    name: "Alex Mercer",
    email: "alex@smartedu.com",
    usn: "1MS22CS001",
    department: "Computer Science & Engineering",
    semester: "4th",
    cgpa: 8.75,
  };

  const student2: StudentProfile = {
    _id: "s_student2",
    userId: "u_student2",
    name: "Emily Watson",
    email: "emily@smartedu.com",
    usn: "1MS22CS042",
    department: "Information Science & Engineering",
    semester: "4th",
    cgpa: 9.12,
  };

  const student3: StudentProfile = {
    _id: "s_student3",
    userId: "u_student3",
    name: "Marcus Aurelius",
    email: "marcus@smartedu.com",
    usn: "1MS22EC018",
    department: "Electronics & Communication",
    semester: "6th",
    cgpa: 7.95,
  };

  dbState.students = [student1, student2, student3];

  // 3. Create Marks/Grades
  const subjects = ["Mathematics-IV", "Database Systems", "Computer Networks", "Operating Systems", "Software Engineering"];

  dbState.marks = [
    // Alex Mercer
    { _id: "m_1", studentId: "s_student1", studentName: "Alex Mercer", usn: "1MS22CS001", subject: "Mathematics-IV", marks: 85, maxMarks: 100 },
    { _id: "m_2", studentId: "s_student1", studentName: "Alex Mercer", usn: "1MS22CS001", subject: "Database Systems", marks: 92, maxMarks: 100 },
    { _id: "m_3", studentId: "s_student1", studentName: "Alex Mercer", usn: "1MS22CS001", subject: "Computer Networks", marks: 78, maxMarks: 100 },
    { _id: "m_4", studentId: "s_student1", studentName: "Alex Mercer", usn: "1MS22CS001", subject: "Operating Systems", marks: 88, maxMarks: 100 },
    { _id: "m_5", studentId: "s_student1", studentName: "Alex Mercer", usn: "1MS22CS001", subject: "Software Engineering", marks: 95, maxMarks: 100 },

    // Emily Watson
    { _id: "m_6", studentId: "s_student2", studentName: "Emily Watson", usn: "1MS22CS042", subject: "Mathematics-IV", marks: 94, maxMarks: 100 },
    { _id: "m_7", studentId: "s_student2", studentName: "Emily Watson", usn: "1MS22CS042", subject: "Database Systems", marks: 89, maxMarks: 100 },
    { _id: "m_8", studentId: "s_student2", studentName: "Emily Watson", usn: "1MS22CS042", subject: "Computer Networks", marks: 91, maxMarks: 100 },
    { _id: "m_9", studentId: "s_student2", studentName: "Emily Watson", usn: "1MS22CS042", subject: "Operating Systems", marks: 87, maxMarks: 100 },
    { _id: "m_10", studentId: "s_student2", studentName: "Emily Watson", usn: "1MS22CS042", subject: "Software Engineering", marks: 93, maxMarks: 100 },

    // Marcus Aurelius
    { _id: "m_11", studentId: "s_student3", studentName: "Marcus Aurelius", usn: "1MS22EC018", subject: "Mathematics-IV", marks: 72, maxMarks: 100 },
    { _id: "m_12", studentId: "s_student3", studentName: "Marcus Aurelius", usn: "1MS22EC018", subject: "Database Systems", marks: 80, maxMarks: 100 },
    { _id: "m_13", studentId: "s_student3", studentName: "Marcus Aurelius", usn: "1MS22EC018", subject: "Computer Networks", marks: 75, maxMarks: 100 },
    { _id: "m_14", studentId: "s_student3", studentName: "Marcus Aurelius", usn: "1MS22EC018", subject: "Operating Systems", marks: 82, maxMarks: 100 },
    { _id: "m_15", studentId: "s_student3", studentName: "Marcus Aurelius", usn: "1MS22EC018", subject: "Software Engineering", marks: 78, maxMarks: 100 },
  ];

  // 4. Create Attendance Logs
  const dates = ["2026-05-24", "2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28"];
  let attId = 1;

  for (const date of dates) {
    for (const student of dbState.students) {
      for (const subject of subjects) {
        // Random attendance (mostly present)
        const isPresent = Math.random() > 0.15;
        dbState.attendance.push({
          _id: `a_${attId++}`,
          studentId: student._id,
          studentName: student.name,
          usn: student.usn,
          subject,
          date,
          status: isPresent ? "Present" : "Absent",
        });
      }
    }
  }

  saveLocalDB();
  console.log("Database seeded successfully.");
}

async function ensureIndianStudents() {
  console.log("Generating 60 Indian student records across multiple departments...");

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash("student123", salt);

  const departments = [
    { name: "Civil Engineering", usnCode: "CV" },
    { name: "Mechanical Engineering", usnCode: "ME" },
    { name: "Chemical Engineering", usnCode: "CH" },
    { name: "Electronics & Communication", usnCode: "EC" },
    { name: "Computer Science & Engineering", usnCode: "CS" },
    { name: "Electrical & Electronics", usnCode: "EE" },
    { name: "Computer Science (Artificial Intelligence)", usnCode: "AI" },
    { name: "Biomedical Engineering", usnCode: "BM" }
  ];

  const firstNames = [
    "Aarav", "Vihaan", "Aditya", "Arjun", "Kabir", "Sai", "Rohan", "Krishna", "Ishan", "Reyansh",
    "Ananya", "Diya", "Aaradhya", "Saanvi", "Kiara", "Meera", "Sneha", "Tanvi", "Shruti", "Pooja",
    "Pranav", "Devendra", "Akhil", "Harish", "Jatin", "Kshitiz", "Lalit", "Madhav", "Naman", "Ojas",
    "Rhea", "Shreya", "Kriti", "Alia", "Deepika", "Priyanka", "Katrina", "Shraddha", "Anushka", "Sonam",
    "Yash", "Varun", "Siddharth", "Ranbir", "Ranveer", "Vicky", "Ayushmann", "Kartik", "Ishaan", "Tiger",
    "Goutam", "Rittika", "Soumitra", "Prosenjit", "Dev", "Mimi", "Nusrat", "Subhashree", "Koel", "Srabanti"
  ];

  const lastNames = [
    "Sharma", "Patel", "Verma", "Rao", "Gupta", "Reddy", "Mehta", "Nair", "Joshi", "Mishra",
    "Sen", "Iyer", "Patil", "Kulkarni", "Banerjee", "Chawla", "Bhat", "Deshmukh", "Gowda", "Saxena",
    "Singh", "Kumar", "Pillai", "Garg", "Chaudhary", "Yadav", "Soni", "Jain", "Dwivedi", "Kapoor"
  ];

  const semesters = ["2nd", "4th", "6th", "8th"];

  // Clear existing generated Indian students first to guarantee clean idempotent run
  dbState.users = dbState.users.filter(u => !u._id.includes("ind_student"));
  dbState.students = dbState.students.filter(s => !s._id.includes("ind_student"));
  dbState.marks = dbState.marks.filter(m => !m._id.includes("ind_"));
  dbState.attendance = dbState.attendance.filter(a => !a._id.includes("ind_"));

  for (let i = 0; i < 60; i++) {
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[Math.floor(i / 2) % lastNames.length];
    const name = `${fName} ${lName}`;
    const email = `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@smartedu.com`;

    const deptObj = departments[i % departments.length];
    const rollNum = String(100 + i).padStart(3, "0");
    const usn = `1MS22${deptObj.usnCode}${rollNum}`;
    const semester = semesters[i % semesters.length];
    const cgpa = parseFloat((7.5 + (i % 25) * 0.1).toFixed(2));

    const userId = `u_ind_student_${i}`;
    const studentId = `s_ind_student_${i}`;

    const userObj: User = {
      _id: userId,
      name,
      email,
      passwordHash: commonPasswordHash,
      role: "student",
    };

    const profileObj: StudentProfile = {
      _id: studentId,
      userId,
      name,
      email,
      usn,
      department: deptObj.name,
      semester,
      cgpa,
    };

    dbState.users.push(userObj);
    dbState.students.push(profileObj);

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

    const subs = deptSubjects[deptObj.name] || ["Mathematics-IV", "Database Systems", "Computer Networks"];
    
    subs.forEach((subject, subIdx) => {
      const marks = 70 + ((i + subIdx) % 28);
      dbState.marks.push({
        _id: `m_ind_${i}_${subIdx}`,
        studentId,
        studentName: name,
        usn,
        subject,
        marks,
        maxMarks: 100
      });
    });

    const dates = ["2026-05-24", "2026-05-25", "2026-05-26", "2026-05-27", "2026-05-28"];
    let attCounter = 0;
    
    dates.forEach((date) => {
      subs.forEach((subject) => {
        const isPresent = ((i + attCounter) % 9) !== 0; // ~89% attendance
        dbState.attendance.push({
          _id: `a_ind_${i}_${attCounter++}`,
          studentId,
          studentName: name,
          usn,
          subject,
          date,
          status: isPresent ? "Present" : "Absent"
        });
      });
    });
  }

  saveLocalDB();
  console.log("60 Indian student records dynamically registered!");
}

async function ensureIndianFaculty() {
  console.log("Generating Civil, Mechanical, and Chemical Indian faculty records...");

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash("faculty123", salt);

  const civilFaculties = [
    { name: "Dr. Vikram Sen (Applied Probability & Stats)", email: "vikram.sen@smartedu.com" },
    { name: "Prof. Amit Sharma (Structural Analysis-I)", email: "amit.sharma@smartedu.com" },
    { name: "Dr. Ananya Iyer (Water & Wastewater Eng)", email: "ananya.iyer@smartedu.com" },
    { name: "Prof. Suresh Patel (Concrete Technology)", email: "suresh.patel@smartedu.com" },
    { name: "Dr. Pooja Verma (Construction Project Mgmt)", email: "pooja.verma@smartedu.com" },
    { name: "Prof. Rohan Mishra (Hydrology & Irrigation Eng)", email: "rohan.mishra@smartedu.com" },
    { name: "Dr. Sneha Desai (Problem Solving & Analysis)", email: "sneha.desai@smartedu.com" },
    { name: "Prof. Rajesh Kulkarni (Survey Practice – II)", email: "rajesh.kulkarni@smartedu.com" },
    { name: "Dr. Sunita Gokhale (Concrete Laboratory)", email: "sunita.gokhale@smartedu.com" },
    { name: "Prof. Aditya Banerjee (Generative AI for Civil)", email: "aditya.banerjee@smartedu.com" }
  ];

  const mechFaculties = [
    { name: "Dr. Arun Mehta (Numerical Methods & PDE)", email: "arun.mehta@smartedu.com" },
    { name: "Prof. Sanjay Rao (Fundamentals of Machine Design)", email: "sanjay.rao@smartedu.com" },
    { name: "Dr. Rajesh Gupta (Machines & Mechanisms)", email: "rajesh.gupta@smartedu.com" },
    { name: "Prof. Nitin Patil (Engineering Materials)", email: "nitin.patil@smartedu.com" },
    { name: "Dr. Jyoti Deshmukh (Mechatronics)", email: "jyoti.deshmukh@smartedu.com" },
    { name: "Prof. Sandeep Nair (Microcontroller & Interfacing)", email: "sandeep.nair@smartedu.com" },
    { name: "Dr. Meera Reddy (Microcontroller & Interfacing Lab)", email: "meera.reddy@smartedu.com" },
    { name: "Prof. Anil Sharma (Machines & Mechanisms Lab)", email: "anil.sharma@smartedu.com" },
    { name: "Dr. Kavita Joshi (Engineering Materials Lab)", email: "kavita.joshi@smartedu.com" },
    { name: "Prof. Vijay Kumar (Problem Solving & Analysis)", email: "vijay.kumar@smartedu.com" }
  ];

  const chemFaculties = [
    { name: "Dr. S. K. Gupta (Numerical methods, Linear Algebra & PDE)", email: "sk.gupta@smartedu.com" },
    { name: "Dr. Ranjana Rao (Industrial Pollution Control)", email: "ranjana.rao@smartedu.com" },
    { name: "Prof. Harish Sen (Process Heat Transfer)", email: "harish.sen@smartedu.com" },
    { name: "Dr. Goutam Biswas (Chemical Eng Thermodynamics)", email: "goutam.biswas@smartedu.com" },
    { name: "Prof. Manas Mukherjee (Material Science & Eng)", email: "manas.mukherjee@smartedu.com" },
    { name: "Dr. Swati Ghosh (Computer-based Chemical Calculations)", email: "swati.ghosh@smartedu.com" },
    { name: "Prof. Dilip Joshi (Process Heat Transfer Lab.)", email: "dilip.joshi@smartedu.com" },
    { name: "Dr. Monali Sen (Technical Chemistry Lab.)", email: "monali.sen@smartedu.com" }
    // "Problem Solving & Analysis" is handled by Prof. Vijay Kumar (already registered)
  ];

  const eceFaculties = [
    { name: "Dr. K. S. Lakshmi (Linear Algebra & PDE)", email: "ks.lakshmi@smartedu.com" },
    { name: "Dr. G. Sasi Kumar (Electromagnetic Fields and Waves)", email: "sasi.kumar@smartedu.com" },
    { name: "Prof. Radhakrishnan Pillai (Linear Integrated Circuits)", email: "r.pillai@smartedu.com" },
    { name: "Dr. Vinay Chandrasekhar (Control Systems)", email: "vinay.c@smartedu.com" },
    { name: "Prof. Venkatesh Prasad (ARM Processor & Applications)", email: "v.prasad@smartedu.com" },
    { name: "Dr. Preeti Deshpande (Digital System Design Using Verilog)", email: "preeti.d@smartedu.com" },
    { name: "Prof. Manoj Kumar (Data Acquisition & Controls Lab)", email: "manoj.kumar@smartedu.com" },
    { name: "Prof. Raghavendra Rao (ARM Microcontroller Lab)", email: "r.rao@smartedu.com" },
    { name: "Dr. Snehalata Nair (Data Structure Applications Lab)", email: "snehalata.n@smartedu.com" },
    { name: "Prof. Karthik Sundaram (Data Structure Using C Lab)", email: "karthik.s@smartedu.com" }
    // "Problem Solving & Analysis" is handled by Prof. Vijay Kumar (already registered)
  ];

  const eeeFaculties = [
    { name: "Dr. Suresh Nair (Linear Control Systems)", email: "suresh.nair@smartedu.com" },
    { name: "Prof. G. V. Iyer (Electrical Machines)", email: "gv.iyer@smartedu.com" },
    { name: "Dr. Haripriya Sen (Signals & Systems)", email: "haripriya.sen@smartedu.com" },
    { name: "Prof. Manoj Gupta (Power Electronics)", email: "manoj.gupta@smartedu.com" }
    // Note: The rest of the subjects ("Linear Algebra & PDE", "ARM Processor & Applications", 
    // "ARM Microcontroller Lab", "Digital System Design using Verilog", "Data Structure Applications Lab",
    // "Data Structure Using C Lab (Diploma)", "Problem Solving Analysis") map to same faculty as ECE/Chem/Mechanical.
  ];

  const cseFaculties = [
    { name: "Dr. Rajeshwari Kumar (Applied Statistics with R/ Vectors & LA)", email: "rajeshwari.kumar@smartedu.com" },
    { name: "Prof. Sunil Verma (Microcontroller: Programming & Interfacing)", email: "sunil.verma@smartedu.com" },
    { name: "Dr. Dilip Sen (Object-Oriented Programming & Lab)", email: "dilip.sen@smartedu.com" },
    { name: "Prof. Naman Gupta (Principles of Compiler Design)", email: "naman.gupta@smartedu.com" },
    { name: "Dr. Kavita Iyer (Operating System Principles & Programming)", email: "kavita.iyer@smartedu.com" },
    { name: "Prof. Jatin Sharma (Exploratory Data Analysis)", email: "jatin.sharma@smartedu.com" }
    // "Problem Solving & Analysis" is mapped to Prof. Vijay Kumar (already registered)
  ];

  const biomedFaculties = [
    { name: "Dr. Arvind Deshpande (Signal Conditioning & Data acquisition)", email: "arvind.deshpande@smartedu.com" },
    { name: "Dr. Shruti Sen (Biomedical Instrumentation)", email: "shruti.sen@smartedu.com" },
    { name: "Dr. Rajeshwari Nair (Human Anatomy & Physiology)", email: "rajeshwari.nair@smartedu.com" },
    { name: "Dr. Divya Pillai (Biomedical Instrumentation Lab)", email: "divya.pillai@smartedu.com" },
    { name: "Prof. Alok Chaturvedi (Signal Conditioning & Data acquisition Lab)", email: "alok.chaturvedi@smartedu.com" },
    { name: "Prof. Jayant Patil (Vector Calculus Differential Equations)", email: "jayant.patil@smartedu.com" }
    // Note: The rest of the subjects ("Linear Algebra & Partial Differential Equations", "ARM Processor & Applications", 
    // "ARM Microcontroller Lab", "Data Structure Using C Lab", "Problem Solving & Analysis") map to same faculty as ECE/Chem/Mechanical.
  ];

  // Clear existing generated Indian faculty to ensure idempotency
  dbState.users = dbState.users.filter(u => !u._id.startsWith("u_ind_fac_"));

  civilFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_cv_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Civil Engineering"
    };
    dbState.users.push(userObj);
  });

  mechFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_me_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Mechanical Engineering"
    };
    dbState.users.push(userObj);
  });

  chemFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_ch_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Chemical Engineering"
    };
    dbState.users.push(userObj);
  });

  eceFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_ec_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Electronics & Communication"
    };
    dbState.users.push(userObj);
  });

  eeeFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_ee_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Electrical & Electronics"
    };
    dbState.users.push(userObj);
  });

  cseFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_cs_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Computer Science & Engineering"
    };
    dbState.users.push(userObj);
  });

  biomedFaculties.forEach((fac, idx) => {
    const userObj: User = {
      _id: `u_ind_fac_bm_${idx}`,
      name: fac.name,
      email: fac.email.toLowerCase(),
      passwordHash: commonPasswordHash,
      role: "faculty",
      branch: "Biomedical Engineering"
    };
    dbState.users.push(userObj);
  });

  saveLocalDB();
  console.log("Indian faculty records registered successfully!");
}

// Initialize Database Connection / Loads
export async function initDatabase() {
  if (MONGO_URI) {
    try {
      console.log("Attempting to connect to MongoDB URI...");
      await mongoose.connect(MONGO_URI);
      isUsingMongoDB = true;
      console.log("MongoDB connected successfully via Mongoose.");

      // Check if MongoDB needs seeding
      const userCount = await UserModel.countDocuments();
      if (userCount === 0) {
        console.log("MongoDB is empty. Seeding standard Indian data into your live connection...");
        
        // Reset local in-memory state to prepare seed arrays
        dbState = { users: [], students: [], attendance: [], marks: [] };
        
        // Call seeding generators to populate dbState
        await seedDefaultData();
        await ensureIndianStudents();
        await ensureIndianFaculty();

        // Ensure 'raghu' user exists in seeded database
        const raghuExists = dbState.users.some(
          (u) => u.email === "raghu@smartedu.com" || (u.name && u.name.toLowerCase() === "raghu")
        );
        if (!raghuExists) {
          const salt = await bcrypt.genSalt(10);
          const hash = await bcrypt.hash("admin123", salt);
          dbState.users.push({
            _id: "u_raghu_auto",
            name: "raghu",
            email: "raghu@smartedu.com",
            passwordHash: hash,
            role: "admin",
          });
        }

        console.log(`Inserting ${dbState.users.length} users, ${dbState.students.length} students, ${dbState.attendance.length} attendance, and ${dbState.marks.length} marks into MongoDB...`);

        // Bulk insert records to MongoDB
        await UserModel.insertMany(dbState.users as any[]);
        await StudentProfileModel.insertMany(dbState.students as any[]);
        await AttendanceRecordModel.insertMany(dbState.attendance as any[]);
        await MarkRecordModel.insertMany(dbState.marks as any[]);

        console.log("MongoDB database successfully populated with Indian student registries!");
      }
    } catch (error) {
      console.error("MongoDB connection failed, falling back to secure Local JSON database.", error);
      isUsingMongoDB = false;
    }
  } else {
    console.log("No MONGO_URI specified, using developer-friendly Local JSON database.");
    isUsingMongoDB = false;
  }

  if (!isUsingMongoDB) {
    dbState = loadLocalDB();
    await seedDefaultData();
    await ensureIndianStudents();
    await ensureIndianFaculty();

    // Ensure 'raghu' user always exists with fallback "admin123" password
    const raghuExists = dbState.users.some(
      (u) => u.email === "raghu@smartedu.com" || (u.name && u.name.toLowerCase() === "raghu")
    );
    if (!raghuExists) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash("admin123", salt);
      dbState.users.push({
        _id: "u_raghu_auto",
        name: "raghu",
        email: "raghu@smartedu.com",
        passwordHash: hash,
        role: "admin",
      });
      saveLocalDB();
      console.log("Auto-ensured admin 'raghu' user in database.");
    }
  }
}

// Database API Methods (Abstraction Layer)
export const DB = {
  users: {
    find: async (query: Partial<User> = {}): Promise<User[]> => {
      if (isUsingMongoDB) {
        return await UserModel.find(query as any).lean() as unknown as User[];
      }
      return dbState.users.filter((user) => {
        for (const key of Object.keys(query)) {
          if (user[key as keyof User] !== query[key as keyof User]) return false;
        }
        return true;
      });
    },
    findOne: async (query: Partial<User>): Promise<User | null> => {
      if (isUsingMongoDB) {
        return await UserModel.findOne(query as any).lean() as unknown as User | null;
      }
      const results = await DB.users.find(query);
      return results.length > 0 ? results[0] : null;
    },
    create: async (data: Omit<User, "_id">): Promise<User> => {
      const newUser: User = { ...data, _id: "u_" + generateId() };
      if (isUsingMongoDB) {
        const created = await UserModel.create(newUser);
        return created.toObject() as unknown as User;
      }
      dbState.users.push(newUser);
      saveLocalDB();
      return newUser;
    },
    updateOne: async (query: Partial<User>, update: Partial<User>): Promise<boolean> => {
      if (isUsingMongoDB) {
        const res = await UserModel.updateOne(query as any, { $set: update });
        return res.modifiedCount > 0 || res.matchedCount > 0;
      }
      const idx = dbState.users.findIndex((user) => {
        for (const key of Object.keys(query)) {
          if (user[key as keyof User] !== query[key as keyof User]) return false;
        }
        return true;
      });
      if (idx !== -1) {
        dbState.users[idx] = { ...dbState.users[idx], ...update };
        saveLocalDB();
        return true;
      }
      return false;
    },
    deleteOne: async (query: Partial<User>): Promise<boolean> => {
      if (isUsingMongoDB) {
        const res = await UserModel.deleteOne(query as any);
        return res.deletedCount > 0;
      }
      const originalLen = dbState.users.length;
      dbState.users = dbState.users.filter((user) => {
        let matchesAll = true;
        for (const key of Object.keys(query)) {
          if (user[key as keyof User] !== query[key as keyof User]) {
            matchesAll = false;
            break;
          }
        }
        return !matchesAll;
      });
      saveLocalDB();
      return dbState.users.length < originalLen;
    },
  },

  students: {
    find: async (query: Partial<StudentProfile> = {}): Promise<StudentProfile[]> => {
      if (isUsingMongoDB) {
        return await StudentProfileModel.find(query as any).lean() as unknown as StudentProfile[];
      }
      return dbState.students.filter((student) => {
        for (const key of Object.keys(query)) {
          if (student[key as keyof StudentProfile] !== query[key as keyof StudentProfile]) return false;
        }
        return true;
      });
    },
    findOne: async (query: Partial<StudentProfile>): Promise<StudentProfile | null> => {
      if (isUsingMongoDB) {
        return await StudentProfileModel.findOne(query as any).lean() as unknown as StudentProfile | null;
      }
      const results = await DB.students.find(query);
      return results.length > 0 ? results[0] : null;
    },
    create: async (data: Omit<StudentProfile, "_id">): Promise<StudentProfile> => {
      const newStudent: StudentProfile = { ...data, _id: "s_" + generateId() };
      if (isUsingMongoDB) {
        const created = await StudentProfileModel.create(newStudent);
        return created.toObject() as unknown as StudentProfile;
      }
      dbState.students.push(newStudent);
      saveLocalDB();
      return newStudent;
    },
    updateOne: async (query: Partial<StudentProfile>, update: Partial<StudentProfile>): Promise<boolean> => {
      if (isUsingMongoDB) {
        const student = await StudentProfileModel.findOne(query as any);
        if (student) {
          await StudentProfileModel.updateOne(query as any, { $set: update });
          if (update.name || update.email) {
            await UserModel.updateOne(
              { _id: student.userId } as any,
              {
                $set: {
                  ...(update.name ? { name: update.name } : {}),
                  ...(update.email ? { email: update.email } : {}),
                }
              }
            );
          }
          return true;
        }
        return false;
      }
      const idx = dbState.students.findIndex((student) => {
        for (const key of Object.keys(query)) {
          if (student[key as keyof StudentProfile] !== query[key as keyof StudentProfile]) return false;
        }
        return true;
      });
      if (idx !== -1) {
        dbState.students[idx] = { ...dbState.students[idx], ...update };
        if (update.name || update.email) {
          const userId = dbState.students[idx].userId;
          DB.users.updateOne(
            { _id: userId },
            {
              ...(update.name ? { name: update.name } : {}),
              ...(update.email ? { email: update.email } : {}),
            }
          );
        }
        saveLocalDB();
        return true;
      }
      return false;
    },
    deleteOne: async (query: Partial<StudentProfile>): Promise<boolean> => {
      if (isUsingMongoDB) {
        const student = await StudentProfileModel.findOne(query as any);
        if (student) {
          await UserModel.deleteOne({ _id: student.userId } as any);
          await AttendanceRecordModel.deleteMany({ studentId: student._id } as any);
          await MarkRecordModel.deleteMany({ studentId: student._id } as any);
          await StudentProfileModel.deleteOne({ _id: student._id } as any);
          return true;
        }
        return false;
      }
      const student = await DB.students.findOne(query);
      if (student) {
        await DB.users.deleteOne({ _id: student.userId });
        dbState.attendance = dbState.attendance.filter((rec) => rec.studentId !== student._id);
        dbState.marks = dbState.marks.filter((rec) => rec.studentId !== student._id);
        dbState.students = dbState.students.filter((rec) => rec._id !== student._id);
        saveLocalDB();
        return true;
      }
      return false;
    },
  },

  attendance: {
    find: async (query: Partial<AttendanceRecord> = {}): Promise<AttendanceRecord[]> => {
      if (isUsingMongoDB) {
        return await AttendanceRecordModel.find(query as any).lean() as unknown as AttendanceRecord[];
      }
      return dbState.attendance.filter((rec) => {
        for (const key of Object.keys(query)) {
          if (rec[key as keyof AttendanceRecord] !== query[key as keyof AttendanceRecord]) return false;
        }
        return true;
      });
    },
    create: async (data: Omit<AttendanceRecord, "_id">): Promise<AttendanceRecord> => {
      const newRecord: AttendanceRecord = { ...data, _id: "a_" + generateId() };
      if (isUsingMongoDB) {
        const created = await AttendanceRecordModel.create(newRecord);
        return created.toObject() as unknown as AttendanceRecord;
      }
      dbState.attendance.push(newRecord);
      saveLocalDB();
      return newRecord;
    },
    createOrUpdate: async (date: string, studentId: string, subject: string, status: "Present" | "Absent", studentName: string, usn: string): Promise<AttendanceRecord> => {
      if (isUsingMongoDB) {
        const existing = await AttendanceRecordModel.findOne({ date, studentId, subject } as any);
        if (existing) {
          existing.status = status;
          await existing.save();
          return existing.toObject() as unknown as AttendanceRecord;
        } else {
          const newRecord = {
            _id: "a_" + generateId(),
            studentId,
            studentName,
            usn,
            subject,
            date,
            status,
          };
          const created = await AttendanceRecordModel.create(newRecord);
          return created.toObject() as unknown as AttendanceRecord;
        }
      }
      const existing = dbState.attendance.find(
        (rec) => rec.date === date && rec.studentId === studentId && rec.subject === subject
      );
      if (existing) {
        existing.status = status;
        saveLocalDB();
        return existing;
      } else {
        const newRecord: AttendanceRecord = {
          _id: "a_" + generateId(),
          studentId,
          studentName,
          usn,
          subject,
          date,
          status,
        };
        dbState.attendance.push(newRecord);
        saveLocalDB();
        return newRecord;
      }
    },
  },

  marks: {
    find: async (query: Partial<MarkRecord> = {}): Promise<MarkRecord[]> => {
      if (isUsingMongoDB) {
        return await MarkRecordModel.find(query as any).lean() as unknown as MarkRecord[];
      }
      return dbState.marks.filter((rec) => {
        for (const key of Object.keys(query)) {
          if (rec[key as keyof MarkRecord] !== query[key as keyof MarkRecord]) return false;
        }
        return true;
      });
    },
    createOrUpdate: async (studentId: string, subject: string, marks: number, studentName: string, usn: string): Promise<MarkRecord> => {
      if (isUsingMongoDB) {
        const existing = await MarkRecordModel.findOne({ studentId, subject } as any);
        if (existing) {
          existing.marks = marks;
          await existing.save();
          return existing.toObject() as unknown as MarkRecord;
        } else {
          const newRecord = {
            _id: "m_" + generateId(),
            studentId,
            studentName,
            usn,
            subject,
            marks,
            maxMarks: 100,
          };
          const created = await MarkRecordModel.create(newRecord);
          return created.toObject() as unknown as MarkRecord;
        }
      }
      const existing = dbState.marks.find(
        (rec) => rec.studentId === studentId && rec.subject === subject
      );
      if (existing) {
        existing.marks = marks;
        saveLocalDB();
        return existing;
      } else {
        const newRecord: MarkRecord = {
          _id: "m_" + generateId(),
          studentId,
          studentName,
          usn,
          subject,
          marks,
          maxMarks: 100,
        };
        dbState.marks.push(newRecord);
        saveLocalDB();
        return newRecord;
      }
    },
  },
};
