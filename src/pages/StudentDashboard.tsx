import React, { useState, useEffect } from "react";
import { 
  User, 
  Award, 
  CalendarDays, 
  BookOpen, 
  FileDown, 
  Check, 
  X, 
  AlertTriangle,
  GraduationCap,
  Clock,
  AlertCircle
} from "lucide-react";
import { api } from "../utils/api";
import { UserSession, Student, StudentAttendanceSummary, StudentAcademicSummary } from "../types";
import StatCard from "../components/StatCard";
import { SubjectPerformanceChart } from "../components/DashboardCharts";
import { jsPDF } from "jspdf";

interface StudentProps {
  session: UserSession;
  activeTab?: string;
}

export default function StudentDashboard({ session, activeTab }: StudentProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "attendance" | "marks">("overview");

  useEffect(() => {
    if (activeTab) {
      if (activeTab === "attendance") {
        setActiveSubTab("attendance");
      } else if (activeTab === "marks") {
        setActiveSubTab("marks");
      } else {
        setActiveSubTab("overview");
      }
    }
  }, [activeTab]);
  const [student, setStudent] = useState<Student | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceSummary | null>(null);
  const [academics, setAcademics] = useState<StudentAcademicSummary | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 1. Fetch Student profile corresponding to user
      const profile = await api.student.getProfile(session.id);
      setStudent(profile);

      if (profile) {
        // 2. Load attendance summaries & mark sheets corresponding to profile ID
        const [attData, acadData] = await Promise.all([
          api.student.getAttendance(profile._id),
          api.student.getMarks(profile._id),
        ]);
        setAttendance(attData);
        setAcademics(acadData);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load academic records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session.id]);

  // Client-Side High-Fidelity Report Transcript generation via jsPDF
  const handleDownloadTranscript = async () => {
    if (!student || !attendance || !academics) return;

    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      
      // --- VISUAL PALETTE ---
      const navyDark = "#0f172a";
      const blueAccent = "#2563eb";
      const slateGrey = "#64748b";
      const lineLight = "#e2e8f0";

      // 1. Header Portal Banner Band
      doc.setFillColor(15, 23, 42); // slate-900 / dark-blue
      doc.rect(0, 0, 210, 40, "F");

      // Header Text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("SMARTEDU ACADEMIC PORTAL", 15, 18);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text("Official Academic Roster & Performance Transcript Report", 15, 28);
      
      const compileDate = new Date().toLocaleDateString("en-US", {
        year: "numeric", 
        month: "long", 
        day: "numeric"
      });
      doc.text(`Issued On: ${compileDate}`, 150, 28);

      // 2. Personal Student Profile Metadata Card
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("STUDENT INTEGRATED PROFILE", 15, 55);

      // Underline
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 58, 195, 58);

      // Metadata layout grid
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      
      doc.text("Candidate Name:", 15, 68);
      doc.text("University USN:", 110, 68);
      doc.text("Enrolled Major Department:", 15, 78);
      doc.text("Active Semester:", 110, 78);
      doc.text("Profile Email:", 15, 88);
      doc.text("Cumulative GPA (CGPA):", 110, 88);

      // Metadata values
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42); // dark-slate
      doc.setFontSize(9.5);
      
      doc.text(student.name, 48, 68);
      doc.text(student.usn, 138, 68);
      doc.text(student.department, 60, 78);
      doc.text(student.semester + " Semester", 138, 78);
      doc.text(student.email, 38, 88);
      doc.setTextColor(37, 99, 235); // blue accent CGPA
      doc.text(`★  ${student.cgpa.toFixed(2)} / 10.00`, 155, 88);

      // Draw Separator line
      doc.line(15, 96, 195, 96);

      // 3. Exam Grades Sheet Tables
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TERMS EVALUATION EXAMINATION MARKS", 15, 110);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      
      // Header labels for roster
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, 116, 180, 8, "F");
      doc.line(15, 116, 195, 116);
      doc.line(15, 124, 195, 124);

      doc.setTextColor(71, 85, 105);
      doc.text("Subject Evaluation Area Description", 20, 121);
      doc.text("Exam Marks", 120, 121);
      doc.text("Max", 150, 121);
      doc.text("Status Verdict", 170, 121);

      // Print marks data
      let currentY = 131;
      doc.setFont("helvetica", "semibold");
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);

      academics.marks.forEach((m) => {
        doc.text(m.subject, 20, currentY);
        doc.setFont("helvetica", "bold");
        doc.text(String(m.marks), 123, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(String(m.maxMarks), 151, currentY);
        
        let status = "Outstanding";
        doc.setTextColor(22, 163, 74); // green
        if (m.marks < 50) {
          status = "Fail";
          doc.setTextColor(220, 38, 38); // red
        } else if (m.marks < 75) {
          status = "Pass";
          doc.setTextColor(217, 119, 6); // amber
        } else if (m.marks < 90) {
          status = "First Class";
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(status, 170, currentY);
        
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");
        currentY += 8;
      });

      // 4. Attendance Statistics Block
      doc.line(15, currentY + 3, 195, currentY + 3);
      currentY += 15;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("CLASSROOM ATTENDANCE METRICS PROFILE", 15, currentY);

      currentY += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Total Logged Class Hours: ${attendance.summary.totalSessions}`, 15, currentY);
      doc.text(`Attended Periods count: ${attendance.summary.presentSessions}`, 85, currentY);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`Overall Participation: ${attendance.summary.overallPercentage}%`, 145, currentY);

      // 5. Official Verification footer
      doc.setDrawColor(203, 213, 225);
      doc.line(15, 245, 195, 245);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("This is an electronically consolidated academic record card generated on behalf of SmartEdu ERP system and does not require manual signature credentials.", 15, 252);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Dr. Rachel Green", 15, 270);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Office of Dean (Academics & Registries)", 15, 274);

      // Save file
      doc.save(`${student.usn}_Academic_Report.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to compile PDF. Please ensure all details are loaded.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="flex-1 bg-[#F1F5F9] h-full overflow-y-auto">
      
      {/* Header Panel */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-3.5">
          <h1 className="text-base font-bold text-slate-800 tracking-tight font-display">Academic Student Portal</h1>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 tracking-wide">Scholar Desk</span>
        </div>
        <div>
          {student && (
            <button
              onClick={handleDownloadTranscript}
              disabled={generatingPdf || loading}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded-lg shadow-xs cursor-pointer disabled:opacity-50 transition-colors"
            >
              <FileDown className="h-4 w-4" />
              <span>{generatingPdf ? "Compiling..." : "Download Transcript"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="p-4 md:p-6 space-y-6 min-h-[calc(100vh-4rem)] pb-32">
        


        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 text-red-700 text-xs text-sans">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            <span className="text-xs text-slate-400 font-semibold">Gathering your academic ledger...</span>
          </div>
        ) : (
          student && attendance && academics && (
            <>
              {/* SUB-TAB: PORTAL OVERVIEW */}
              {activeSubTab === "overview" && (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                      title="Cumulative CGPA Score" 
                      value={`★ ${Number(student.cgpa).toFixed(2)}`} 
                      icon={Award} 
                      color="blue"
                      description="Academics scale out of 10.0"
                    />
                    <StatCard 
                      title="Class Participation Rate" 
                      value={`${attendance.summary.overallPercentage}%`}
                      icon={CalendarDays} 
                      color="emerald"
                      description={`Attended: ${attendance.summary.presentSessions} / ${attendance.summary.totalSessions} sessions`}
                    />
                    <StatCard 
                      title="Completed Subject Courses" 
                      value={`${academics.summary.subjectCount}`} 
                      icon={GraduationCap} 
                      color="violet"
                      description="Active curriculum records"
                    />
                    <StatCard 
                      title="Exam Aggregate Average" 
                      value={`${academics.summary.averageMarks} %`} 
                      icon={BookOpen} 
                      color="amber"
                      description="Consolidated grades index evaluation"
                    />
                  </div>

                  {/* Visual charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Visual Performance Chart */}
                    <div className="lg:col-span-2">
                      <SubjectPerformanceChart 
                        data={academics.marks.map((m) => ({
                          label: m.subject,
                          value: m.marks,
                        }))} 
                      />
                    </div>

                    {/* Circular Speedometer Attendance Chart */}
                    <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center">
                      <div className="w-full text-left mb-3">
                        <h3 className="text-xs font-bold text-slate-800 tracking-tight font-display">Active Attendance Gauge</h3>
                        <p className="text-[10px] text-slate-500 font-medium">Compulsory ledger. Minimum benchmark required: 75%</p>
                      </div>

                      {/* Animated SVG circular ring index */}
                      <div className="relative h-32 w-32 flex items-center justify-center">
                        <svg className="absolute inset-0 h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Inner Gray Ring track */}
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                          {/* Outer filled ring depending on values */}
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                            stroke={attendance.summary.overallPercentage >= 75 ? "#10b981" : "#ef4444"} 
                            strokeWidth="8" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - attendance.summary.overallPercentage / 100)}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                            {attendance.summary.overallPercentage}%
                          </span>
                          <span className={`text-5xs font-bold uppercase tracking-widest mt-1 ${attendance.summary.overallPercentage >= 75 ? "text-emerald-600" : "text-red-500"}`}>
                            {attendance.summary.overallPercentage >= 75 ? "Clear" : "Shortage"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center space-x-1.5 p-2 bg-slate-50 border border-slate-150/70 rounded-lg text-slate-550 text-4xs">
                        {attendance.summary.overallPercentage >= 75 ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-500" />
                            <span>Academic clearance requirements fully met. Excellent!</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                            <span className="font-bold text-red-600">Shortage alert. Attendance must remain above 75%.</span>
                          </>
                        )}
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* SUB-TAB: ATTENDANCE DETAILED LOGS REPORT */}
              {activeSubTab === "attendance" && (
                <div className="space-y-6">
                  
                  {/* Alert criteria block to help students */}
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 p-5 rounded-xl flex items-start space-x-4">
                    <AlertCircle className="h-6 w-6 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Regulatory Lecture Threshold Requirements</h4>
                      <p className="text-xs text-blue-600 leading-relaxed mt-1">
                        In accordance with core academic regulations, all students must maintain a minimum attendance of **75%** per registered subject area to remain eligible for term examinations clearance. Any course marked short will flag warning signs.
                      </p>
                    </div>
                  </div>

                  {/* Subject aggregates logs row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {attendance.subjectStats.map((stat, idx) => {
                      const isClear = stat.attendancePercentage >= 75;
                      return (
                        <div key={idx} className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3.5">
                          <div>
                            <h4 className="font-bold text-slate-900 text-xs">{stat.subject}</h4>
                            <p className="text-3xs text-slate-500 font-semibold mt-1">Curriculum core course</p>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-2xl font-black font-mono text-slate-800">{stat.attendancePercentage}%</span>
                            </div>
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-4xs font-bold uppercase tracking-wider ${isClear ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"}`}>
                              {isClear ? "Clear" : "Deficit"}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${isClear ? "bg-emerald-500" : "bg-red-500"}`}
                                style={{ width: `${stat.attendancePercentage}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-4xs font-semibold text-slate-500 font-mono">
                              <span>Hours: {stat.present} attended</span>
                              <span>Total: {stat.total} periods</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed day-by-day checklist log table */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-5 border-b border-slate-100">
                      <h4 className="font-bold text-slate-800 text-xs font-display">Interactive Session Logs</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Chronological record list of active lecture hours class entries.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-150">
                        <thead className="bg-slate-50 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4 text-left">Subject Course</th>
                            <th className="px-6 py-4 text-left">Lecture Date</th>
                            <th className="px-6 py-4 text-right">Status Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-150 text-xs">
                          {attendance.logs.map((log) => {
                            const isPresent = log.status === "Present";
                            return (
                              <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{log.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 font-semibold">{log.date}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-4xs font-bold uppercase tracking-wider border ${isPresent ? "bg-emerald-55/10 border-emerald-500/10 text-emerald-600" : "bg-red-500/10 border-red-500/10 text-red-600"}`}>
                                    {log.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* SUB-TAB: ACADEMIC MARKS SHEET TRANSCRIPT */}
              {activeSubTab === "marks" && (
                <div className="space-y-6">
                  
                  {/* Transcript table card class */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 md:p-5 border-b border-slate-100">
                      <h4 className="font-bold text-slate-800 text-xs font-display tracking-tight">Academic Grade Transcript Scorecard</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Summative evaluation marks log across standard course examinations.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-150">
                        <thead className="bg-slate-50 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-6 py-4 text-left">Course Area Description</th>
                            <th className="px-6 py-4 text-center">Marks Scored</th>
                            <th className="px-6 py-4 text-center">Max Marks Allowable</th>
                            <th className="px-6 py-4 text-right">Evaluation Verdict</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-150 text-xs font-medium">
                          {academics.marks.map((m) => {
                            let rating = "Distinction";
                            let ratingColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
                            
                            if (m.marks < 50) {
                              rating = "Unsatisfactory / Fail";
                              ratingColor = "text-red-600 bg-red-55/10 border-red-500/10";
                            } else if (m.marks < 75) {
                              rating = "First Class Pass";
                              ratingColor = "text-amber-600 bg-amber-50 border-amber-100";
                            } else if (m.marks < 90) {
                              rating = "Outstanding Merit";
                            }

                            return (
                              <tr key={m._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-900">{m.subject}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center font-black font-mono text-sm text-blue-600">{m.marks}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center font-mono text-slate-400 font-semibold">{m.maxMarks}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span className={`inline-flex px-2 py-0.5 rounded text-4xs font-bold uppercase tracking-wider border ${ratingColor}`}>
                                    {rating}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </>
          )
        )}

      </main>

    </div>
  );
}
