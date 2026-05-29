import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  CalendarDays, 
  Award, 
  LogOut, 
  User, 
  GraduationCap, 
  BookOpen,
  Menu,
  X
} from "lucide-react";
import { UserSession } from "../types";

interface SidebarProps {
  session: UserSession;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ 
  session, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  isOpen, 
  setIsOpen 
}: SidebarProps) {
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    if (logoutConfirm) {
      const timer = setTimeout(() => {
        setLogoutConfirm(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [logoutConfirm]);
  
  // Custom navigation items based on user role
  const getNavItems = () => {
    switch (session.role) {
      case "admin":
        return [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "students", label: "Manage Students", icon: Users },
          { id: "faculty", label: "Manage Faculty", icon: GraduationCap },
          { id: "admins", label: "Manage Admins", icon: UserCheck },
        ];
      case "faculty":
        return [
          { id: "dashboard", label: "Class Overview", icon: LayoutDashboard },
          { id: "attendance", label: "Mark Attendance", icon: CalendarDays },
          { id: "marks", label: "Upload Marks", icon: Award },
        ];
      case "student":
        return [
          { id: "dashboard", label: "Academic Portal", icon: LayoutDashboard },
          { id: "attendance", label: "Attendance Log", icon: CalendarDays },
          { id: "marks", label: "Marks Sheet", icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  const getRoleBadgeColor = () => {
    switch (session.role) {
      case "admin": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "faculty": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "student": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  return (
    <>
      {/* Mobile top navigation rail */}
      <div className="md:hidden flex items-center justify-between bg-[#0F172A] text-white px-5 py-4 border-b border-slate-800 shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg text-white">
            S
          </div>
          <span className="font-bold tracking-tight text-white font-display text-lg">SmartEdu</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-300 hover:text-white"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Primary Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-[#1E293B] border-r border-[#1e293b] text-slate-300 transform transition-transform duration-250 ease-out h-full
        md:translate-x-0 md:relative md:z-0
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Header Branding */}
        <div className="h-16 flex items-center px-6 bg-[#0F172A] border-b border-slate-800 shrink-0 select-none">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3 shrink-0">
            <span className="text-white font-bold text-lg font-display">S</span>
          </div>
          <span className="text-white font-bold text-[17px] tracking-tight font-display">SmartEdu</span>
          <span className="ml-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">Active</span>
        </div>

        {/* Profile Card Summary */}
        <div className="p-4 border-b border-slate-700 bg-slate-900/20">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/15 font-bold text-sm uppercase shrink-0">
              {session.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold text-white truncate">{session.name}</h2>
              <p className="text-[10px] text-slate-450 truncate mt-0.5 font-mono">{session.email}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getRoleBadgeColor()}`}>
              {session.role}
            </span>
          </div>
        </div>

        {/* Nav tabs list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false); // Auto close sidebar on click on mobile
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-all group
                  ${isActive 
                    ? "bg-blue-600 font-bold text-white shadow-xs" 
                    : "hover:bg-slate-800/80 text-slate-350 hover:text-white"
                  }
                `}
                id={`sidebar-tab-${item.id}`}
              >
                <IconComponent className={`h-4.5 w-4.5 shrink-0 ${isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Control Panel footer */}
        <div className="p-3 border-t border-slate-700 bg-slate-900/10">
          <button
            onClick={() => {
              if (logoutConfirm) {
                onLogout();
              } else {
                setLogoutConfirm(true);
              }
            }}
            className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              logoutConfirm 
                ? "bg-red-600 text-white hover:bg-red-750 animate-pulse shadow-sm" 
                : "text-red-400 hover:bg-red-500/10 hover:text-red-350"
            }`}
            id="sidebar-logout"
          >
            <LogOut className={`h-4.5 w-4.5 shrink-0 transition-transform ${logoutConfirm ? "text-white scale-110" : "text-red-400"}`} />
            <span>{logoutConfirm ? "Confirm Sign Out" : "Sign Out"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
