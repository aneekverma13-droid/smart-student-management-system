import React, { useState } from "react";
import { GraduationCap, Lock, Mail, AlertCircle } from "lucide-react";
import { api } from "../utils/api";
import { UserSession } from "../types";

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please input both email address and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.auth.login(email, password);
      // Save token & session variables
      api.setToken(data.token);
      
      const sessionObj: UserSession = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        studentProfileId: data.user.studentProfileId,
      };

      api.setSession(sessionObj);
      onLoginSuccess(sessionObj);
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-fills form fields for convenient testing
  const handleQuickLogin = async (role: "admin" | "faculty" | "student") => {
    let mockEmail = "";
    let mockPass = "";

    switch (role) {
      case "admin":
        mockEmail = "admin@smartedu.com";
        mockPass = "admin123";
        break;
      case "faculty":
        mockEmail = "faculty@smartedu.com";
        mockPass = "faculty123";
        break;
      case "student":
        mockEmail = "alex@smartedu.com";
        mockPass = "student13";
        break;
    }

    setEmail(mockEmail);
    setPassword(mockPass);
    setError(null);
    setLoading(true);

    try {
      const data = await api.auth.login(mockEmail, mockPass);
      api.setToken(data.token);
      
      const sessionObj: UserSession = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        studentProfileId: data.user.studentProfileId,
      };

      api.setSession(sessionObj);
      onLoginSuccess(sessionObj);
    } catch (err: any) {
      setError(err.message || "Failed to log in via quick access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Portal Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <GraduationCap className="h-9 w-9" />
          </div>
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-slate-900 tracking-tight">SmartEdu Portal</h2>
        <p className="mt-2 text-sm text-slate-600">
          Smart Academics & Student ERP Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md rounded-xl border border-slate-200/60 sm:px-10">
          
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3 text-red-700 text-xs text-sans">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <span className="font-semibold leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Email Address
              </label>
              <div className="mt-2 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm transition-all bg-slate-50/50"
                  placeholder="e.g. name@smartedu.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <div className="mt-2 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-sm transition-all bg-slate-50/50"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 transition-all"
                id="login-submit"
              >
                {loading ? "Verifying Credentials..." : "Authenticate Profile"}
              </button>
            </div>
          </form>



        </div>
      </div>
    </div>
  );
}
