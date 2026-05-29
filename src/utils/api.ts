import { UserSession } from "../types";

const API_BASE = "/api";

export const api = {
  getToken(): string | null {
    return localStorage.getItem("smart_edu_token");
  },

  setToken(token: string) {
    localStorage.setItem("smart_edu_token", token);
  },

  getSession(): UserSession | null {
    const raw = localStorage.getItem("smart_edu_session");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(session: UserSession) {
    localStorage.setItem("smart_edu_session", JSON.stringify(session));
  },

  clearSession() {
    localStorage.removeItem("smart_edu_token");
    localStorage.removeItem("smart_edu_session");
  },

  getHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...this.getHeaders(), ...options.headers };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  },

  // Auth endpoints
  auth: {
    async login(email: string, password: string): Promise<{ token: string; user: any; message: string }> {
      return api.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    async profile(): Promise<{ user: any }> {
      return api.request("/auth/profile");
    },
  },

  // Admin endpoints
  admin: {
    async getStats(): Promise<any> {
      return api.request("/admin/stats");
    },
    async getStudents(): Promise<any[]> {
      return api.request("/admin/students");
    },
    async createStudent(studentData: any): Promise<any> {
      return api.request("/admin/students", {
        method: "POST",
        body: JSON.stringify(studentData),
      });
    },
    async updateStudent(id: string, studentData: any): Promise<any> {
      return api.request(`/admin/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(studentData),
      });
    },
    async deleteStudent(id: string): Promise<any> {
      return api.request(`/admin/students/${id}`, {
        method: "DELETE",
      });
    },
    async getFaculty(): Promise<any[]> {
      return api.request("/admin/faculty");
    },
    async createFaculty(facultyData: any): Promise<any> {
      return api.request("/admin/faculty", {
        method: "POST",
        body: JSON.stringify(facultyData),
      });
    },
    async deleteFaculty(id: string): Promise<any> {
      return api.request(`/admin/faculty/${id}`, {
        method: "DELETE",
      });
    },
    async getAdmins(): Promise<any[]> {
      return api.request("/admin/admins");
    },
    async createAdmin(adminData: any): Promise<any> {
      return api.request("/admin/admins", {
        method: "POST",
        body: JSON.stringify(adminData),
      });
    },
    async deleteAdmin(id: string): Promise<any> {
      return api.request(`/admin/admins/${id}`, {
        method: "DELETE",
      });
    },
  },

  // Faculty endpoints
  faculty: {
    async markAttendance(payload: { date: string; subject: string; attendanceList: Array<{ studentId: string; status: "Present" | "Absent" }> }): Promise<any> {
      return api.request("/faculty/attendance", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async getAttendanceLogs(date: string, subject: string): Promise<any[]> {
      return api.request(`/faculty/attendance?date=${date}&subject=${encodeURIComponent(subject)}`);
    },
    async uploadMarks(payload: { subject: string; marksList: Array<{ studentId: string; marks: number }> }): Promise<any> {
      return api.request("/faculty/marks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    async getMarks(subject?: string): Promise<any[]> {
      const query = subject ? `?subject=${encodeURIComponent(subject)}` : "";
      return api.request(`/faculty/marks${query}`);
    },
  },

  // Student endpoints
  student: {
    async getProfile(userId: string): Promise<any> {
      return api.request(`/student/profile/${userId}`);
    },
    async getAttendance(studentId: string): Promise<any> {
      return api.request(`/student/attendance/${studentId}`);
    },
    async getMarks(studentId: string): Promise<any> {
      return api.request(`/student/marks/${studentId}`);
    },
  },
};
