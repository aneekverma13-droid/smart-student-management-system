# Smart Student Management System 🎓

A modern, responsive, and secure Academic ERP and Student Management Portal built with **React, Vite, Node.js, Express, and MongoDB (or zero-config fallback)**. Designed with role-based access controls (RBAC) specifically tailored for **Administrators, Faculty Teachers, and Students**.

---

## 🌟 Core Features & Modules

### 1. **Role-Based Portals**
- **Admin Portal**: Fully functional student CRUD engine (Create, Read, Update, Delete) with interactive modal windows. Register new faculty members, review administrative KPIs, and explore student strength analytics across physical departments.
- **Faculty Portal**: Track course lectures. Search class nominal rolls, register daily class attendance, update logs (with auto-loading of prior logs), and submit summative marks evaluations out of 100 for enrolled students.
- **Student Portal**: View GPA scales, keep track of subject-specific attendance rates (with visual alerts for falling below the required 75% bar), review graded scorecards, and download a complete high-fidelity academic PDF Transcript report client-side.

### 2. **Advanced Analytics Dashboard**
- **Participation Speedometers**: Interactive SVG speedometers charting subject attendance.
- **SVG Area Charts**: Staggered, glowing area trend line charts displaying class logs.
- **Department Distribution Bars**: Horizontal strength indicators showing enrollment percentages across branches.

### 3. **Pdf Report Generator**
- Student transcripts can be compiled instantly on the client side using `jsPDF`. Generates a beautiful PDF document complete with institution banners, metadata profiles, graded results tables, and dean authentication sign-offs.

### 4. **Adaptive Zero-Config Database**
- **Mongoose / MongoDB integration**: Automatically attempts to establish connection with a real MongoDB database if `MONGO_URI` is present in the environment variables.
- **JSON File Fallback**: If a server isn't running or `MONGO_URI` is blank, the app **safely falls back** to an auto-seeded, file-based database stored locally inside `/server/data/db.json` inside the container. **This makes the app 100% operational out of the box with zero database setup!**

---

## 🛠️ Quick Access Logins

The application comes **pre-seeded with realistic school data** for easy testing. Use these credentials to log in:

| Portal Role | Test Email | Password | Dashboards & Controls |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@smartedu.com` | `admin123` | Student Enrollments, Faculty Records, KPIs |
| **Faculty Instructor** | `faculty@smartedu.com` | `faculty123` | Mark Attendance, Upload Term Scores |
| **Active Student** | `alex@smartedu.com` | `student13` | Profile GPA, Term Grades, Attendance, Download PDF |

> *Note: For immediate testing, you can simply click the **"Quick Test Credentials"** buttons on the login page to authenticate instantly!*

---

## 🚀 Setting Up & Running Local Server

Follow these simple steps to run the application on your computer:

### 1. Clone & Install Dependencies
Run the command below in your project folder to install core packages:
```bash
npm install
```

### 2. Configure Environment Variables
Create a file named `.env` in the root directory and copy these variables:
```env
# Optional: Database connection URI. Leave blank to use JSON auto-seeded DB!
MONGO_URI="mongodb+srv://<auth_user>:<auth_password>@cluster.mongodb.net/smartedu"

# Port setting (Standard port 3000)
PORT=3000

# Secret token for signing JWT sessions-credentials
JWT_SECRET="smart-edu-super-secret-key-2026"
```

### 3. Start Development Mode
Boots up Express API controller and compiles Vite assets simultaneously:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 4. Production Build
To bundle the frontend with Vite and transpile the backend with Esbuild:
```bash
npm run build
```
Once built, launch the standalone production server:
```bash
npm run start
```

---

## 📁 System Architecture Directory

```text
├── server/
│   ├── db.ts           # Database controller & seeder abstraction (Mongoose vs fallback)
│   └── data/
│       └── db.json     # Auto-generated JSON database (persists profile CRUD actions)
├── src/
│   ├── components/
│   │   ├── Sidebar.tsx          # Collateral navigation and logout menu
│   │   ├── StatCard.tsx         # Dashboard modular KPI panel
│   │   └── DashboardCharts.tsx  # Dynamic SVG analytics and bar-line graphs
│   ├── pages/
│   │   ├── Login.tsx            # Login credentials verification and quick-fill triggers
│   │   ├── AdminDashboard.tsx   # Enrol students CRUD view & metrics
│   │   ├── FacultyDashboard.tsx # Register marks indices and lecture attendance logs
│   │   └── StudentDashboard.tsx # GPA meters, shortage flags, and jsPDF downloads
│   ├── utils/
│   │   └── api.ts               # Local authentication caching storage and API routing requests
│   ├── types.ts                 # Declarative typescript schemas
│   ├── App.tsx                  # Main router configuration & protected routes
│   └── main.tsx                 # Main client entrypoint
├── server.ts                    # Backend Node/Express initialization and Vite Dev integration
├── package.json                 # Script pipelines & production compile dependencies
└── tsconfig.json                # TypeScript compilation parameters
```
