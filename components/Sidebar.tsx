import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Layers,
  CheckSquare,
  Users,
  Settings,
  HelpCircle,
  FilePlus,
  Bot,
  Mail,
  Zap,
  BookOpen,
  Gamepad2,
  Sparkles,
  UserCheck,
  Search,
} from "lucide-react";
import { UserProfile } from "../types";
import { supabase } from "../lib/supabase";
import logo from "./assets/QPGPT-fevicon.png";

interface SidebarProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, isOpen, onClose }) => {
  const [approvalCount, setApprovalCount] = useState(0);
  const [teacherRequestCount, setTeacherRequestCount] = useState(0);

  useEffect(() => {
    if (user.role !== "admin") return;

    const fetchCounts = async () => {
      // Content Approvals: only count genuinely new/unseen pending items
      const { count: fileCount } = await supabase
        .from("files")
        .select("*", { count: "exact", head: true })
        .eq("approval_status", "pending")
        .eq("is_seen", false);

      setApprovalCount(fileCount || 0);

      // Teacher Requests: only count ones not yet reviewed
      const { count: teacherCount } = await supabase
        .from("teacher_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .is("reviewed_at", null);

      setTeacherRequestCount(teacherCount || 0);
    };

    fetchCounts();

    const channel1 = supabase
      .channel("sidebar-approvals")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "files" },
        () => fetchCounts(),
      )
      .subscribe();

    const channel2 = supabase
      .channel("sidebar-teacher-reqs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teacher_applications" },
        () => fetchCounts(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [user.role]);

  // Modern Pill Style Link
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 px-3 py-2.5 mx-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
      isActive
        ? "bg-brand text-white shadow-lg shadow-brand/25"
        : "text-muted hover:text-txt hover:bg-card hover:shadow-sm"
    }`;

  const SectionLabel = ({ label }: { label: string }) => (
    <div className="px-5 py-2 mt-6 mb-1 text-[10px] font-bold text-muted/50 uppercase tracking-widest font-sans">
      {label}
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-sidebar border-r border-border flex flex-col z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-20 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm border border-border/50">
              <img
                src={logo}
                alt="QPGPT Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-lg text-txt tracking-tight block leading-none">
                QPGPT
              </span>
              <span className="text-[10px] text-muted font-medium tracking-wide">
                STUDENT SUITE
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto space-y-0.5 scrollbar-hide py-2">
          <NavLink
            to={`/dashboard/${user.role || "student"}`}
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </NavLink>

          <SectionLabel label="AI Learning Tools" />
          <NavLink
            to="/questions"
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <Search className="w-4 h-4" />
            <span>Browse Papers</span>
          </NavLink>
          <NavLink
            to="/qpgpt"
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <Bot className="w-4 h-4" />
            <span>QPGPT</span>
          </NavLink>
          <NavLink
            to="/generate"
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <FilePlus className="w-4 h-4" />
            <span>Paper Generator</span>
          </NavLink>
          <NavLink
            to="/quiz-game"
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Live Quiz</span>
          </NavLink>

          {(user.role === "teacher" || user.role === "admin") && (
            <>
              <SectionLabel label="Contribution" />
              <NavLink
                to="/upload"
                className={linkClass}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Resource</span>
              </NavLink>
            </>
          )}

          {user.role === "admin" && (
            <>
              <SectionLabel label="Administration" />
              <NavLink
                to="/approvals"
                className={linkClass}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <div className="relative">
                  <CheckSquare className="w-4 h-4" />
                  {approvalCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-sidebar animate-pulse"></span>
                  )}
                </div>
                <span className="flex-1">Content Approvals</span>
                {approvalCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold min-w-[1.2rem] text-center">
                    {approvalCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/admin/teacher-approvals"
                className={linkClass}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <div className="relative">
                  <UserCheck className="w-4 h-4" />
                  {teacherRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-sidebar animate-pulse"></span>
                  )}
                </div>
                <span className="flex-1">Teacher Requests</span>
                {teacherRequestCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-500 text-white text-[10px] font-bold min-w-[1.2rem] text-center">
                    {teacherRequestCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/users"
                className={linkClass}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <Users className="w-4 h-4" />
                <span>Users</span>
              </NavLink>
              <NavLink
                to="/categories"
                className={linkClass}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <Layers className="w-4 h-4" />
                <span>Taxonomy</span>
              </NavLink>
              <NavLink
                to="/settings"
                className={linkClass}
                onClick={() => window.innerWidth < 1024 && onClose()}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </NavLink>
            </>
          )}

          <SectionLabel label="Support" />
          <NavLink
            to="/help"
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help Center</span>
          </NavLink>
          <NavLink
            to="/contact"
            className={linkClass}
            onClick={() => window.innerWidth < 1024 && onClose()}
          >
            <Mail className="w-4 h-4" />
            <span>Contact</span>
          </NavLink>
        </nav>

        {/* Footer Promo */}
        <div className="p-4">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand/10 to-purple-500/10 border border-brand/10 p-4">
            <div className="flex items-center gap-2 mb-2 text-brand">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold">Pro Feature</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed mb-3">
              Generate quizzes from any PDF notes instantly using AI.
            </p>
            <button className="w-full py-1.5 bg-card text-xs font-bold text-txt rounded-lg border border-border shadow-sm hover:shadow-md transition-all">
              Try Live Quiz
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
