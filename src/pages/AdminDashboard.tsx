import React, { useState, useEffect } from "react";
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  Award, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { api } from "../utils/api";
import { Student, Faculty, AdminStats } from "../types";
import StatCard from "../components/StatCard";
import { DepartmentDonutChart } from "../components/DashboardCharts";

interface AdminDashboardProps {
  activeTab?: string;
}

export default function AdminDashboard({ activeTab }: AdminDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "students" | "faculty" | "admins">("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Administrative confirmation states
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [deleteConfirmFaculty, setDeleteConfirmFaculty] = useState<Faculty | null>(null);
  const [deleteConfirmAdmin, setDeleteConfirmAdmin] = useState<any | null>(null);

  useEffect(() => {
    if (activeTab) {
      if (activeTab === "students") {
        setActiveSubTab("students");
      } else if (activeTab === "faculty") {
        setActiveSubTab("faculty");
      } else if (activeTab === "admins") {
        setActiveSubTab("admins");
      } else {
        setActiveSubTab("overview");
      }
    }
  }, [activeTab]);

  // Student CRUD states
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [studentForm, setStudentForm] = useState({
    name: "",
    email: "",
    password: "",
    usn: "",
    department: "Computer Science & Engineering",
    semester: "4th",
    cgpa: "0.00",
  });

  // Faculty register states
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: "",
    email: "",
    password: "",
    branch: "Computer Science & Engineering",
  });
  const [selectedFacultyDetails, setSelectedFacultyDetails] = useState<Faculty | null>(null);

  // Load admin statistics and profiles
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [adminStats, studentsList, facultyList, adminsListRes] = await Promise.all([
        api.admin.getStats(),
        api.admin.getStudents(),
        api.admin.getFaculty(),
        api.admin.getAdmins().catch(() => []),
      ]);
      setStats(adminStats);
      setStudents(studentsList || []);
      setFaculty(facultyList || []);
      setAdminsList(adminsListRes || []);
    } catch (err: any) {
      setError(err.message || "Failed to synchronise academic system data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle student creation or modification
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingStudent) {
        // Edit mode
        await api.admin.updateStudent(editingStudent._id, {
          name: studentForm.name,
          email: studentForm.email,
          usn: studentForm.usn,
          department: studentForm.department,
          semester: studentForm.semester,
          cgpa: parseFloat(studentForm.cgpa) || 0,
        });
      } else {
        // Create mode
        await api.admin.createStudent({
          ...studentForm,
          cgpa: parseFloat(studentForm.cgpa) || 0,
        });
      }
      setStudentModalOpen(false);
      resetStudentForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to persist student record transaction.");
    }
  };

  const handleEditStudentClick = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      email: student.email,
      password: "UNCHANGED", // Placeholders for security integrity
      usn: student.usn,
      department: student.department,
      semester: student.semester,
      cgpa: String(student.cgpa),
    });
    setStudentModalOpen(true);
  };

  const handleDeleteStudentClick = async (id: string, name: string) => {
    const studentObj = students.find(s => s._id === id);
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
    } catch (err: any) {
      setError(err.message || "Failed to process student deletion.");
      setDeleteConfirmStudent(null);
    }
  };

  const resetStudentForm = () => {
    setEditingStudent(null);
    setStudentForm({
      name: "",
      email: "",
      password: "",
      usn: "",
      department: "Computer Science & Engineering",
      semester: "4th",
      cgpa: "0.00",
    });
  };

  // Handle faculty registration submit
  const handleFacultySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.admin.createFaculty(facultyForm);
      setFacultyModalOpen(false);
      setFacultyForm({ name: "", email: "", password: "", branch: "Computer Science & Engineering" });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register faculty account core details.");
    }
  };

  // Handle Admin registration submit
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.admin.createAdmin(adminForm);
      setAdminModalOpen(false);
      setAdminForm({ name: "", email: "", password: "" });
      await loadData();
    } catch (err: any) {
      setError(err.message || "Failed to register Admin account core details.");
    }
  };

  // Handle Faculty deletion
  const handleDeleteFacultyClick = (f: Faculty) => {
    setDeleteConfirmFaculty(f);
  };

  const handleConfirmDeleteFaculty = async () => {
    if (!deleteConfirmFaculty) return;
    try {
      setError(null);
      await api.admin.deleteFaculty(deleteConfirmFaculty._id);
      await loadData();
      setDeleteConfirmFaculty(null);
    } catch (err: any) {
      setError(err.message || "Failed to process faculty deletion.");
      setDeleteConfirmFaculty(null);
    }
  };

  // Handle Admin deletion
  const handleDeleteAdminClick = (a: any) => {
    setDeleteConfirmAdmin(a);
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!deleteConfirmAdmin) return;
    try {
      setError(null);
      await api.admin.deleteAdmin(deleteConfirmAdmin._id);
      await loadData();
      setDeleteConfirmAdmin(null);
    } catch (err: any) {
      setError(err.message || "Failed to process administrative account deletion.");
      setDeleteConfirmAdmin(null);
    }
  };

  const filteredStudents = students.filter(
    (std) => 
      std.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      std.usn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      std.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 bg-[#F1F5F9] h-full overflow-y-auto">
      
      {/* Overview Dashboard Header Panel */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-3.5">
          <h1 className="text-base font-bold text-slate-800 tracking-tight font-display">SmartEdu Administration</h1>
          <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 tracking-wide">Systems Control</span>
        </div>
        <div className="flex items-center space-x-2">
          {activeSubTab === "students" && (
            <button 
              onClick={() => {
                resetStudentForm();
                setStudentModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs text-white rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Enrol Student</span>
            </button>
          )}
          {activeSubTab === "faculty" && (
            <button 
              onClick={() => {
                setFacultyForm({ name: "", email: "", password: "", branch: "Computer Science & Engineering" });
                setFacultyModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs text-white rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Enrol Faculty</span>
            </button>
          )}
          {activeSubTab === "admins" && (
            <button 
              onClick={() => {
                setAdminForm({ name: "", email: "", password: "" });
                setAdminModalOpen(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 font-bold text-xs text-white rounded-lg shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Enrol Admin</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container Workspace */}
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
            <span className="text-xs text-slate-400 font-medium">Fetching academic ledger records...</span>
          </div>
        ) : (
          <>
            {/* SUB-TAB: OVERVIEW INDEX */}
            {activeSubTab === "overview" && stats && (
              <div className="space-y-8">
                {/* Statistics Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="Total Registered Students" 
                    value={stats.totalStudents} 
                    icon={Users} 
                    color="blue"
                    description="Verified student enrollment"
                  />
                  <StatCard 
                    title="Professional Faculty" 
                    value={stats.totalFaculty} 
                    icon={GraduationCap} 
                    color="violet"
                    description="Course department instructors"
                  />
                  <StatCard 
                    title="Global Attendance Ratio" 
                    value={`${stats.avgAttendanceRate}%`} 
                    icon={UserCheck} 
                    color="emerald"
                    description="Avg. lecture participation rate"
                  />
                  <StatCard 
                    title="Department GPA Median" 
                    value={`${stats.avgMarks}%`} 
                    icon={Award} 
                    color="amber"
                    description="Subject overall average grade"
                  />
                </div>

                {/* Analytical charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xs font-bold text-slate-800 tracking-tight font-display">University Enrollment Breakdown</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold uppercase tracking-wider">Department strength scale</span>
                      </div>
                      <div className="min-h-[20rem] h-auto flex flex-col justify-start py-4 space-y-6">
                        {stats.departmentData.map((d, index) => {
                          const pct = stats.totalStudents > 0 ? (d.count / stats.totalStudents) * 100 : 0;
                          return (
                            <div key={index} className="space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                <span className="font-semibold text-slate-700">{d.name}</span>
                                <span className="font-bold text-slate-900 shrink-0">{d.count} Students ({Math.round(pct)}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex shadow-inner">
                                <div 
                                  className="h-full bg-blue-600 rounded-full transition-all duration-500 shadow-sm" 
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <DepartmentDonutChart data={stats.departmentData} />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: MANAGE STUDENTS LIST (CRUD PANEL) */}
            {activeSubTab === "students" && (
              <div className="space-y-6">
                
                {/* Toolbar actions bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm rounded-md shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-xs transition-colors bg-white"
                      placeholder="Search by Name, usn, or Department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      resetStudentForm();
                      setStudentModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg shadow-sm cursor-pointer transition-colors self-start sm:self-auto"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Add Student Profile</span>
                  </button>
                </div>

                {/* Students roster grids & table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Student Name</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">USN ID</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Semester</th>
                          <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">CGPA Score</th>
                          <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-150/70 text-xs">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((std) => (
                            <tr key={std._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center space-x-3">
                                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center uppercase border border-blue-100 text-2xs">
                                    {std.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-slate-900">{std.name}</div>
                                    <div className="text-4xs text-slate-400 mt-0.5">{std.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 font-semibold">{std.usn}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">{std.department}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-900 font-semibold">{std.semester} Sem</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded font-bold font-mono bg-blue-50 text-blue-700 border border-blue-100">
                                  ★ {Number(std.cgpa).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                <button
                                  onClick={() => handleEditStudentClick(std)}
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-700 transition-colors cursor-pointer"
                                  title="Edit profile"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudentClick(std._id, std.name)}
                                  className="inline-flex items-center justify-center h-7 w-7 rounded-md bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                                  title="Delete student and data"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                              No student profiles registered under this search.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-TAB: REVIEW FACULTY LEDGER */}
            {activeSubTab === "faculty" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Registered Department Faculty</h3>
                    <p className="text-2xs text-slate-500 mt-1">Direct listing of active pedagogical managers.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFacultyForm({ name: "", email: "", password: "", branch: "Computer Science & Engineering" });
                      setFacultyModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Register New Instructor</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {faculty.length > 0 ? (
                    faculty.map((f) => (
                      <div 
                        key={f._id} 
                        onClick={() => setSelectedFacultyDetails(f)}
                        className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-blue-350 shadow-sm flex items-center justify-between space-x-4 cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-md group"
                        title="Click to view full faculty profile details"
                      >
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-violet-50 text-violet-600 border border-violet-100 font-extrabold flex items-center justify-center text-xs uppercase group-hover:bg-violet-100 transition-colors">
                            {f.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{f.name}</h4>
                            <p className="text-3xs text-blue-600 font-semibold truncate mt-0.5">{f.branch || "General Academics"}</p>
                            <p className="text-4xs text-slate-400 truncate mt-0.5">{f.email}</p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-4xs font-bold uppercase tracking-wide border border-emerald-500/10 text-emerald-600 bg-emerald-50 mt-2">
                              Faculty Instructor
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFacultyClick(f);
                          }}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors border border-slate-100 cursor-pointer shrink-0"
                          title="Delete Faculty Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white border rounded-xl">
                      No instructors enrolled yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-TAB: MANAGE ADMIN ACCOUNTS */}
            {activeSubTab === "admins" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Registered System Administrators</h3>
                    <p className="text-2xs text-slate-500 mt-1">Direct listing of system and portal operators.</p>
                  </div>
                  <button
                    onClick={() => {
                      setAdminForm({ name: "", email: "", password: "" });
                      setAdminModalOpen(true);
                    }}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 font-semibold text-xs text-white rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Register New Admin</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {adminsList.length > 0 ? (
                    adminsList.map((a) => (
                      <div key={a._id} className="bg-white p-4.5 rounded-xl border border-slate-200 hover:border-amber-300 shadow-sm flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 border border-amber-100 font-extrabold flex items-center justify-center text-xs uppercase">
                            {a.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-slate-900 truncate">{a.name}</h4>
                            <p className="text-3xs text-slate-500 truncate mt-0.5">{a.email}</p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-4xs font-bold uppercase tracking-wide border border-amber-500/10 text-amber-600 bg-amber-55 mt-2">
                              System Operator
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAdminClick(a)}
                          className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors border border-slate-100 cursor-pointer shrink-0"
                          title="Delete Admin Profile"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-white border rounded-xl">
                      No system operators configured yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL WINDOW: STUDENT ENROLLMENT & UPDATE */}
      {studentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-250/60 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {editingStudent ? `Update Details - ${editingStudent.name}` : "Enroll New Student Profile"}
              </h3>
              <button 
                onClick={() => setStudentModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-200 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleStudentSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="sm:col-span-2">
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                  <input
                    type="text"
                    required
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                    placeholder="e.g. Liam Neeson"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                  <input
                    type="email"
                    required
                    value={studentForm.email}
                    onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                    placeholder="e.g. liam@smartedu.com"
                  />
                </div>

                {/* Hide password if editing to match real patterns */}
                {!editingStudent && (
                  <div className="sm:col-span-2">
                    <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Portal Password</label>
                    <input
                      type="password"
                      required
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                      placeholder="e.g. min 6 chars"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">University Seat Number (USN)</label>
                  <input
                    type="text"
                    required
                    value={studentForm.usn}
                    onChange={(e) => setStudentForm({ ...studentForm, usn: e.target.value })}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs tracking-wider uppercase font-mono bg-slate-50/50"
                    placeholder="e.g. 1MS22CS099"
                  />
                </div>

                <div>
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Enrollment Semester</label>
                  <select
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({ ...studentForm, semester: e.target.value })}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                  >
                    {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((sem) => (
                      <option key={sem} value={sem}>{sem} Semester</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Enrolled Department</label>
                  <select
                    value={studentForm.department}
                    onChange={(e) => setStudentForm({ ...studentForm, department: e.target.value })}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                  >
                    {[
                      "Computer Science & Engineering",
                      "Information Science & Engineering",
                      "Electronics & Communication",
                      "Mechanical Engineering",
                      "Electrical & Electronics",
                      "Biotechnology",
                    ].map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">CUMULATIVE GPA (CGPA)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    max="10"
                    value={studentForm.cgpa}
                    onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })}
                    className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs font-mono bg-slate-50/50"
                    placeholder="e.g. 9.15"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStudentModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  {editingStudent ? "Save Changes" : "Confirm Enrollment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOW: FACULTY REGISTRATION */}
      {facultyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-250/60 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Register New Faculty Instructor</h3>
              <button 
                onClick={() => setFacultyModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-200 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFacultySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Instructor Full Name</label>
                <input
                  type="text"
                  required
                  value={facultyForm.name}
                  onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                  placeholder="e.g. Prof. Stephen Hawking"
                />
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  required
                  value={facultyForm.email}
                  onChange={(e) => setFacultyForm({ ...facultyForm, email: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                  placeholder="e.g. stephen@smartedu.com"
                />
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Default Password</label>
                <input
                  type="password"
                  required
                  value={facultyForm.password}
                  onChange={(e) => setFacultyForm({ ...facultyForm, password: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                  placeholder="minimum 6 characters"
                />
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Core Department / Branch</label>
                <select
                  required
                  value={facultyForm.branch}
                  onChange={(e) => setFacultyForm({ ...facultyForm, branch: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-blue-600 text-xs bg-slate-50/50"
                >
                  {[
                    "Computer Science & Engineering",
                    "Electronics & Communication",
                    "Electrical & Electronics",
                    "Mechanical Engineering",
                    "Civil Engineering",
                    "Chemical Engineering",
                    "Biomedical Engineering",
                    "Computer Science (Artificial Intelligence)",
                    "General Academics"
                  ].map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setFacultyModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-semibold text-xs text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Register Instructor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOW: STUDENT EXTRA-CONFIRMED DELETION */}
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

      {/* MODAL WINDOW: ADMIN REGISTRATION */}
      {adminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-250/60 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm">Register New Administrator</h3>
              <button 
                onClick={() => setAdminModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-200 text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAdminSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Administrator Full Name</label>
                <input
                  type="text"
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-amber-600 text-xs bg-slate-50/50"
                  placeholder="e.g. Administrator"
                />
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Email Address</label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-amber-600 text-xs bg-slate-50/50"
                  placeholder="e.g. admin@smartedu.com"
                />
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 uppercase tracking-widest">Secure Password</label>
                <input
                  type="password"
                  required
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  className="mt-1.5 block w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-hidden focus:border-amber-600 text-xs bg-slate-50/50"
                  placeholder="minimum 6 characters"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAdminModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 font-semibold text-xs text-white rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Register Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION WINDOW: FACULTY DELETION */}
      {deleteConfirmFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm font-display">Delete Faculty Profile?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you absolutely sure you want to permanently delete faculty member and account for <span className="font-semibold text-slate-705">{deleteConfirmFaculty.name}</span>? This action cannot be reversed.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
              <div><strong className="text-slate-700">Email Address:</strong> {deleteConfirmFaculty.email}</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmFaculty(null)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Keep Profile
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFaculty}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs text-white rounded-lg cursor-pointer transition-colors font-bold shadow-xs"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION WINDOW: ADMIN DELETION */}
      {deleteConfirmAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-lg shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm font-display">Delete Administrator Account?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Are you absolutely sure you want to permanently delete administrative profile and account for <span className="font-semibold text-slate-705">{deleteConfirmAdmin.name}</span>? This action cannot be reversed.
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
              <div><strong className="text-slate-700">Email Address:</strong> {deleteConfirmAdmin.email}</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmAdmin(null)}
                className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Keep Account
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAdmin}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs text-white rounded-lg cursor-pointer transition-colors font-bold shadow-xs"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED VIEW WINDOW: FACULTY MEMBER PROFILE CARD */}
      {selectedFacultyDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-sm font-display">Faculty Profile Details</h3>
              <button 
                onClick={() => setSelectedFacultyDetails(null)}
                className="p-1 rounded-md text-slate-400 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-5 text-center flex flex-col items-center">
              {/* Initials Avatar */}
              <div className="h-20 w-20 rounded-full bg-violet-100 text-violet-700 border border-violet-250 font-black flex items-center justify-center text-3xl shadow-sm uppercase">
                {selectedFacultyDetails.name.charAt(0)}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-base">{selectedFacultyDetails.name}</h4>
                <p className="text-3xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-500/10 px-2 py-0.5 rounded-full inline-block">
                  Academic Faculty Member
                </p>
              </div>

              {/* Specs List */}
              <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-left space-y-4">
                <div className="space-y-1">
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Core Dept / Branch</span>
                  <span className="block font-bold text-slate-800 text-sm">{selectedFacultyDetails.branch || "General Academics"}</span>
                </div>
                
                <div className="space-y-1 border-t border-slate-200/70 pt-3">
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Institutional Email</span>
                  <span className="block font-mono text-slate-700 font-medium break-all selection:bg-blue-100">{selectedFacultyDetails.email}</span>
                </div>

                <div className="space-y-1 border-t border-slate-200/70 pt-3">
                  <span className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Account ID</span>
                  <span className="block font-mono text-2xs text-slate-500">{selectedFacultyDetails._id}</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedFacultyDetails(null)}
                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 font-bold text-xs text-white rounded-xl shadow-xs cursor-pointer transition-colors"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
