export type UserRole = "admin" | "faculty" | "student";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentProfileId?: string;
}

export interface Student {
  _id: string;
  userId: string;
  name: string;
  email: string;
  usn: string;
  department: string;
  semester: string;
  cgpa: number;
}

export interface Faculty {
  _id: string;
  name: string;
  email: string;
  role: "faculty";
  branch?: string;
}

export interface Admin {
  _id: string;
  name: string;
  email: string;
  role: "admin";
}

export interface Attendance {
  _id: string;
  studentId: string;
  studentName: string;
  usn: string;
  subject: string;
  date: string;
  status: "Present" | "Absent";
}

export interface Mark {
  _id: string;
  studentId: string;
  studentName: string;
  usn: string;
  subject: string;
  marks: number;
  maxMarks: number;
}

export interface AdminStats {
  totalStudents: number;
  totalFaculty: number;
  avgMarks: number;
  avgAttendanceRate: number;
  departmentData: Array<{ name: string; count: number }>;
}

export interface StudentAttendanceSummary {
  logs: Attendance[];
  summary: {
    totalSessions: number;
    presentSessions: number;
    overallPercentage: number;
  };
  subjectStats: Array<{
    subject: string;
    attendancePercentage: number;
    present: number;
    total: number;
  }>;
}

export interface StudentAcademicSummary {
  marks: Mark[];
  summary: {
    subjectCount: number;
    totalMarks: number;
    averageMarks: number;
  };
}
