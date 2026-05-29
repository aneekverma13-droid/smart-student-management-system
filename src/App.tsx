import React, { useState, useEffect } from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  useNavigate,
  useLocation
} from "react-router-dom";
import { UserSession } from "./types";
import { api } from "./utils/api";

// Page Views
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import StudentDashboard from "./pages/StudentDashboard";

// Sidebar Navigation Element
import Sidebar from "./components/Sidebar";

// Protected Route Component to mandate authentication and roles
interface ProtectedRouteProps {
  session: UserSession | null;
  allowedRoles?: Array<"admin" | "faculty" | "student">;
  children: React.ReactNode;
}

function ProtectedRoute({ session, allowedRoles, children }: ProtectedRouteProps) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Internal wrapper to let us access react-router-dom context hooks
function MainAppContent({ 
  session, 
  setSession 
}: { 
  session: UserSession | null; 
  setSession: (s: UserSession | null) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Deduce active core section based on path metadata or tabs
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleLogout = () => {
    api.clearSession();
    setSession(null);
    navigate("/login");
  };

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    navigate("/dashboard");
  };

  // Sync sub-tabs on route changes 
  useEffect(() => {
    const parts = location.pathname.split("/");
    const lastPart = parts[parts.length - 1];
    if (["dashboard", "students", "faculty", "admins", "attendance", "marks"].includes(lastPart)) {
      setActiveTab(lastPart);
    } else {
      setActiveTab("dashboard");
    }
  }, [location.pathname]);

  // Handle local sidebar active states redirections if clicked inside main Sidebar navigation
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/${tabId}`);
    
    // Smooth scroll page to initial focus position
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#F1F5F9] font-sans antialiased text-slate-800">
      
      {/* Dynamic Navigation Rails */}
      <Sidebar 
        session={session}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Primary Dashboard Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Routes>
          <Route 
            path="/:tabId" 
            element={
              <ProtectedRoute session={session}>
                {session.role === "admin" && <AdminDashboard activeTab={activeTab} />}
                {session.role === "faculty" && <FacultyDashboard session={session} activeTab={activeTab} />}
                {session.role === "student" && <StudentDashboard session={session} activeTab={activeTab} />}
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Load session from localStorage cache on bootstrapping first boot
  useEffect(() => {
    const cachedSession = api.getSession();
    if (cachedSession) {
      setSession(cachedSession);
    }
    setInitializing(false);
  }, []);

  if (initializing) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <div className="h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs font-semibold text-slate-400">Bootstrapping Academic Portal...</span>
      </div>
    );
  }

  return (
    <Router>
      <MainAppContent session={session} setSession={setSession} />
    </Router>
  );
}
