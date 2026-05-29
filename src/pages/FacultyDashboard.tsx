import React, { useState, useEffect } from "react";
import { 
  CalendarDays, 
  Award, 
  Users, 
  Check, 
  X, 
  Save, 
  ChevronRight, 
  AlertCircle,
  FileSpreadsheet,
  Trash2
} from "lucide-react";
import { api } from "../utils/api";
import { Student, UserSession } from "../types";

interface FacultyDashboardProps {
  session: UserSession;
  activeTab?: string;
}

export default function FacultyDashboard({ session, activeTab }: FacultyDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"students" | "attendance" | "marks">("students");

  useEffect(() => {
    if (activeTab) {
      if (activeTab === "attendance") {
        setActiveSubTab("attendance");
      } else if (activeTab === "marks") {
        setActiveSubTab("marks");
      } else {
        setActiveSubTab("students");
      }
    }
  }, [activeTab]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Helper to extract the faculty candidate's assigned subject from name
  const getFacultySubject = () => {
    if (!session || !session.name) return null;
    const match = session.name.match(/\(([^)]+)\)/);
    return match ? match[1] : null;
  };

  const facultySubject = getFacultySubject();

  // Combine faculty subjective core course with fallback standard CS subjects list
  const baseSubjects = [
    "Mathematics-IV", 
    "Database Systems", 
    "Computer Networks", 
    "Operating Systems", 
    "Software Engineering"
  ];

  const subjects = facultySubject && !baseSubjects.includes(facultySubject)
    ? [facultySubject, ...baseSubjects]
    : baseSubjects;

  // Attendance Worksheets States
  const [attendanceSubject, setAttendanceSubject] = useState(facultySubject || subjects[0]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [attendanceList, setAttendanceList] = useState<{ [studentId: string]: "Present" | "Absent" }>({});
  
  // Marks Worksheets States
  const [marksSubject, setMarksSubject] = useState(facultySubject || subjects[0]);
  const [marksList, setMarksList] = useState<{ [studentId: string]: string }>({});
  
  // Student deletion confirmation state
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const studentData = await api.admin.getStudents();
      setStudents(studentData || []);
      
      // Initialize default attendance checkboxes to "Present"
      const defaultAtt: { [studentId: string]: "Present" | "Absent" } = {};
      const defaultMrks: { [studentId: string]: string } = {};
      
      studentData.forEach((s: Student) => {
        defaultAtt[s._id] = "Present";
        defaultMrks[s._id] = "";
      });

      setAttendanceList(defaultAtt);
      setMarksList(defaultMrks);
    } catch (err: any) {
      setError(err.message || "Failed to load class roster registry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch logged attendance for date and subject if it exists so faculty can UPDATE it
  const handleFetchAttendanceLogs = async () => {
    if (!attendanceDate || !attendanceSubject) return;
    try {
      setError(null);
      setSuccessMessage(null);
      const logs = await api.faculty.getAttendanceLogs(attendanceDate, attendanceSubject);
      
      if (logs && logs.length > 0) {
        const updatedList = { ...attendanceList };
        logs.forEach((log: any) => {
          updatedList[log.studentId] = log.status;
        });
        setAttendanceList(updatedList);
        setSuccessMessage("Loaded existing attendance records for editing!");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        // Reset sheet to Present if no existing values
        const resetAtt: { [studentId: string]: "Present" | "Absent" } = {};
        students.forEach((s) => {
          resetAtt[s._id] = "Present";
        });
        setAttendanceList(resetAtt);
        setSuccessMessage("No existing logs for this date. Starting fresh sheet.");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError("No logs fetched yet for this criteria.");
    }
  };

  // Trigger search on date/subject change to align records
  useEffect(() => {
    if (students.length > 0) {
      handleFetchAttendanceLogs();
    }
  }, [attendanceDate, attendanceSubject, students.length]);

  // Handle Attendance submission
  const handleAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const payloadList = Object.entries(attendanceList).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    try {
      await api.faculty.markAttendance({
        date: attendanceDate,
        subject: attendanceSubject,
        attendanceList: payloadList,
      });
      setSuccessMessage("Daily attendance registry compiled and synchronized successfully!");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to store attendance values.");
    }
  };

  // Toggle single attendance value
  const handleToggleAttendance = (studentId: string) => {
    setAttendanceList((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "Present" ? "Absent" : "Present",
    }));
  };

  // Auto-mark all Present
  const handleMarkAllPresent = () => {
    const updated: { [studentId: string]: "Present" | "Absent" } = {};
    students.forEach((s) => {
      updated[s._id] = "Present";
    });
    setAttendanceList(updated);
  };

  // Handle Marks registration
  const handleMarksSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Filter list to only contain populated marks
    const payloadList = Object.entries(marksList)
      .filter(([_, val]) => val.trim() !== "")
      .map(([studentId, marks]) => ({
        studentId,
        marks: parseFloat(marks),
      }));

    if (payloadList.length === 0) {
      setError("Please input exam marks for at least one student before uploading.");
      return;
    }

    // Verify values limits
    const isOutOfRange = payloadList.some((p) => p.marks < 0 || p.marks > 100);
    if (isOutOfRange) {
      setError("Scores must strictly remain within the 0 to 100 limit.");
      return;
    }

    try {
      await api.faculty.uploadMarks({
        subject: marksSubject,
        marksList: payloadList,
      });
      
      setSuccessMessage(`Course evaluation grades for "${marksSubject}" updated successfully!`);
      // Clear input fields
      const cleared: { [studentId: string]: string } = {};
      students.forEach((s) => { cleared[s._id] = ""; });
      setMarksList(cleared);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to persist score evaluations.");
    }
  };

  const handleMarksInputChange = (studentId: string, value: string) => {
    setMarksList((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const handleDeleteStudentClick = (studentId: string) => {
    const studentObj = students.find((s) => s._id === studentId);
    if (studentObj) {
      setDeleteConfirmStudent(studentObj);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteConfirmStudent) return;
    try {
      setError(null);
      await api.admin.deleteStudent(deleteConfirmStudent._id);
      await loadData();
      setDeleteConfirmStudent(null);
      setSuccessMessage(`Student profile for "${deleteConfirmStudent.name}" has been successfully deleted.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to process student deletion.");
      setDeleteConfirmStudent(null);
    }
  };

  return (
    <div className="flex-1 bg-[#F1F5F9] h-full overflow-y-auto">
      
      {/* Header panel */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-3.5">
          <h1 className="text-base font-bold text-slate-800 tracking-tight font-display">Academic Grading & Attendance</h1>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 tracking-wide">Pedagogical Console</span>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900">{session.name}</p>
          <p className="text-[10px] text-slate-500 font-mono">{session.email}</p>
        </div>
      </header>

      {/* Main layout */}
      <main className="p-4 md:p-6 space-y-6 min-h-[calc(100vh-4rem)] pb-32">
        


        {/* Feedback indicators */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 text-red-700 text-xs">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-lg p-4 flex items-start space-x-3 text-xs">
            <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            <span className="font-bold leading-relaxed">{successMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            <span className="text-xs text-slate-400 font-semibold">Loading roster database sheets...</span>
          </div>
        ) : (
          <>
            {/* SUB-VIEW 1: VIEW STUDENT ROSTER */}
            {activeSubTab === "students" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-930 text-sm">Class Nominal Roll</h3>
                      <p className="text-3xs text-slate-400 mt-0.5">Enrolled candidates under evaluation semesters.</p>
                    </div>
                    <span className="bg-blue-50 text-blue-700 border border-blue-100 font-bold px-2 py-0.5 text-4xs rounded uppercase">
                      Class Strengths
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-150">
                      <thead className="bg-slate-50 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4 text-left">Candidate Name</th>
                          <th className="px-6 py-4 text-left">Academic USN</th>
                          <th className="px-6 py-4 text-left">Affilitation Major</th>
                          <th className="px-6 py-4 text-left">Semester Level</th>
                          <th className="px-6 py-4 text-right">CGPA Rating</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100 text-xs">
                        {students.map((s) => (
                          <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center uppercase border text-2xs">
                                  {s.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900">{s.name}</div>
                                  <div className="text-4xs text-slate-400 mt-0.5">{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 font-bold">{s.usn}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-semibold">{s.department}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-slate-800 font-bold">{s.semester} Semester</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-bold text-blue-600">
                              ★ {Number(s.cgpa).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                              <button
                                onClick={() => handleDeleteStudentClick(s._id)}
                                className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                                title="Delete student profile and associated records"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-VIEW 2: MARK ATTENDANCE */}
            {activeSubTab === "attendance" && (
              <form onSubmit={handleAttendanceSubmit} className="space-y-6">
                
                {/* Search & Selector parameters */}
                <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 py-6">
                  
                  <div>
                    <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Select Subject Course</label>
                    <select
                      value={attendanceSubject}
                      onChange={(e) => setAttendanceSubject(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/30 cursor-pointer"
                    >
                      {subjects.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Marking Date</label>
                    <input
                      type="date"
                      required
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/30"
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="flex-1 py-2 px-3 border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold cursor-pointer transition-colors text-center"
                    >
                      Mark All Present
                    </button>
                  </div>

                </div>

                {/* Attendance worksheet layout */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">Attendance Roster sheet</h3>
                    <p className="text-3xs text-slate-400 mt-1">Check to switch status. Green signifies Present, grey represents Absent.</p>
                  </div>

                  <div className="divide-y divide-slate-150">
                    {students.map((s) => {
                      const isPresent = attendanceList[s._id] === "Present";
                      return (
                        <div 
                          key={s._id} 
                          onClick={() => handleToggleAttendance(s._id)}
                          className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                        >
                          <div className="flex items-center space-x-4 min-w-0">
                            {/* Toggle checkbox UI */}
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${isPresent ? "bg-emerald-500 border-emerald-500 text-white shadow-xs" : "bg-white border-slate-300 text-transparent"}`}>
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-xs">{s.name}</h4>
                              <p className="text-3xs font-mono font-bold text-slate-500 mt-1">{s.usn} — {s.department}</p>
                            </div>
                          </div>

                          <div>
                            <span className={`inline-flex px-3 py-1 text-4xs font-bold tracking-widest uppercase border rounded-full transition-colors ${isPresent ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-500"}`}>
                              {isPresent ? "Present" : "Absent"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Submission bar */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-semibold text-xs text-white rounded-lg shadow-md cursor-pointer transition-colors"
                      id="attendance-submit"
                    >
                      <Save className="h-4 w-4" />
                      <span>Sync Attendance Sheet</span>
                    </button>
                  </div>
                </div>

              </form>
            )}

            {/* SUB-VIEW 3: UPLOAD MARKS */}
            {activeSubTab === "marks" && (
              <form onSubmit={handleMarksSubmit} className="space-y-6">
                
                {/* Subject Selector parameters */}
                <div className="bg-white p-4 md:p-5 border border-slate-200 shadow-sm rounded-xl max-w-sm py-5">
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Evaluation Subject Course</label>
                  <select
                    value={marksSubject}
                    onChange={(e) => setMarksSubject(e.target.value)}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/30 cursor-pointer"
                  >
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Score inputs worksheet table className */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Exam Grades Sheet</h3>
                      <p className="text-3xs text-slate-400 mt-1">Enter marks scored by each candidate out of 100.</p>
                    </div>
                    <span className="text-3xs font-bold text-slate-500 uppercase tracking-wider font-mono">Max: 100 Marks</span>
                  </div>

                  <div className="divide-y divide-slate-150">
                    {students.map((s) => (
                      <div key={s._id} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-3 hover:bg-slate-50/40 transition-colors">
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs">{s.name}</h4>
                          <p className="text-3xs text-slate-500 font-mono font-semibold mt-1">{s.usn} • {s.semester} Semester • {s.department}</p>
                        </div>

                        <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
                          <span className="text-3xs font-semibold text-slate-400">Awarded Mars:</span>
                          <div className="relative rounded-lg shadow-2xs">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="--"
                              className="block w-20 border border-slate-300 rounded-lg px-3 py-1.5 text-center text-slate-900 text-xs font-bold font-mono focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 bg-slate-50/30"
                              value={marksList[s._id] || ""}
                              onChange={(e) => handleMarksInputChange(s._id, e.target.value)}
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-300 font-mono text-3xs"></div>
                          </div>
                          <span className="text-2xs font-bold text-slate-400 font-mono">/ 100</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Submission bar */}
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg shadow-md cursor-pointer transition-colors"
                      id="marks-submit"
                    >
                      <Save className="h-4 w-4" />
                      <span>Sync Student Marks</span>
                    </button>
                  </div>
                </div>

              </form>
            )}

          </>
        )}

      </main>

      {deleteConfirmStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm font-display">Delete Student Profile?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you absolutely sure you want to permanently delete student profile and account for <span className="font-semibold text-slate-705">{deleteConfirmStudent.name}</span>? This action cannot be reversed.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
              <div><strong className="text-slate-700">USN / ID:</strong> {deleteConfirmStudent.usn}</div>
              <div><strong className="text-slate-700">Department:</strong> {deleteConfirmStudent.department}</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmStudent(null)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Keep Profile
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs text-white rounded-lg cursor-pointer transition-colors font-bold shadow-xs"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
