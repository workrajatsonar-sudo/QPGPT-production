import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  Search,
  Sun,
  Moon,
  Monitor,
  Settings,
  Menu,
  LogOut,
  Bell,
} from "lucide-react";
import { UserProfile } from "../types";
import { useNavigate, useLocation } from "react-router-dom";
import ConfirmModal from "./ConfirmModal";

interface TopBarProps {
  user: UserProfile;
  toggleSidebar: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ user, toggleSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<"white" | "black" | "space">("white");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Sync theme from document or DB
    const current = document.documentElement.getAttribute("data-theme") as any;
    if (current) setTheme(current);

    const handleThemeChange = () => {
      const updated = document.documentElement.getAttribute(
        "data-theme",
      ) as any;
      if (updated) setTheme(updated);
    };

    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  // Notifications Logic
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("topbar-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchNotifications(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  };

  const handleNotifClick = async (n: any) => {
    if (!n.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id);
      fetchNotifications();
    }
    if (n.link) {
      navigate(n.link);
      setIsNotifOpen(false);
    }
  };

  const markAllAsRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id);
    fetchNotifications();
  };

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  const performLogout = () => {
    localStorage.removeItem("qb_user");
    localStorage.removeItem("qb_session_token");
    window.dispatchEvent(new Event("auth-change"));
    navigate("/login");
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes("dashboard")) return "Dashboard";
    if (path.includes("questions")) return "Question Bank";
    if (path.includes("qpgpt")) return "QPGPT Assistant";
    if (path.includes("generate")) return "Paper Generator";
    if (path.includes("quiz-game")) return "Live Quiz Game";
    if (path.includes("upload")) return "Upload Files";
    if (path.includes("approvals")) return "Approvals";
    if (path.includes("settings")) return "Settings";
    if (path.includes("users")) return "User Management";
    if (path.includes("help")) return "Help Center";
    return "QPGPT Platform";
  };

  const cycleTheme = async () => {
    const themes: ("white" | "black" | "space")[] = ["white", "black", "space"];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];

    // Apply locally immediately
    document.documentElement.setAttribute("data-theme", nextTheme);
    setTheme(nextTheme);

    // Save if admin
    if (user.role === "admin") {
      await supabase
        .from("app_settings")
        .update({ theme: nextTheme })
        .eq("platform_name", "QPGPT");
    }
  };

  return (
    <header className="h-16 border-b border-border bg-header backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 transition-colors">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 text-muted hover:text-txt hover:bg-card rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>QPGPT</span>
            <span>/</span>
            <span className="capitalize">{user.role}</span>
          </div>
          <h1 className="text-sm font-bold text-txt">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search Bar (Desktop) */}
        <div className="hidden md:flex items-center relative group">
          <Search className="w-4 h-4 absolute left-3 text-muted group-focus-within:text-brand transition-colors" />
          <input
            type="text"
            placeholder="Search anything..."
            onClick={() => navigate("/questions")}
            className="pl-9 pr-4 py-1.5 text-sm bg-input border border-border rounded-lg text-txt focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all w-64"
          />
          <div className="absolute right-2 px-1.5 py-0.5 rounded border border-border bg-card text-[10px] text-muted font-medium">
            ⌘K
          </div>
        </div>

        <div className="h-6 w-px bg-border hidden md:block"></div>

        {/* Theme Toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 text-muted hover:text-txt hover:bg-card rounded-lg transition-all"
          title={`Current theme: ${theme}`}
        >
          {theme === "white" && <Sun className="w-5 h-5" />}
          {theme === "black" && <Moon className="w-5 h-5" />}
          {theme === "space" && <Monitor className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 text-muted hover:text-txt hover:bg-card rounded-lg transition-all"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-header animate-pulse"></span>
            )}
          </button>

          {isNotifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotifOpen(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-glass overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border bg-muted/5 flex justify-between items-center">
                  <h3 className="font-bold text-txt text-sm">Notifications</h3>
                  <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">
                    {unreadCount} New
                  </span>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 bg-page rounded-full flex items-center justify-center mx-auto mb-3 opacity-20">
                        <Bell className="w-6 h-6" />
                      </div>
                      <p className="text-muted text-xs">
                        No recent notifications
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`p-4 cursor-pointer hover:bg-page transition-colors relative ${!n.is_read ? "bg-brand/5" : ""}`}
                        >
                          {!n.is_read && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand"></div>
                          )}
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-xs text-txt">
                              {n.title}
                            </h4>
                            <span className="text-[10px] text-muted">
                              {new Date(n.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-2 border-t border-border bg-muted/5 text-center">
                  <button
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-brand hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 p-1 pl-2 pr-1 hover:bg-card rounded-full border border-transparent hover:border-border transition-all"
          >
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-txt leading-none">
                {user.full_name?.split(" ")[0]}
              </p>
              <p className="text-[10px] text-muted leading-none mt-1 capitalize">
                {user.role}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-brand-hover flex items-center justify-center text-inv shadow-sm">
              <span className="text-xs font-bold">
                {user.full_name?.[0] || "U"}
              </span>
            </div>
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-glass overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-4 border-b border-border bg-muted/5">
                  <p className="font-semibold text-txt text-sm">
                    {user.full_name}
                  </p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setIsProfileOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted hover:text-txt hover:bg-page rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Custom Confirmation Modal */}
        <ConfirmModal
          isOpen={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          onConfirm={performLogout}
          title="Sign Out"
          message="Are you sure you want to end your session? You will need to log in again to access the dashboard."
          type="logout"
          confirmText="Yes, Logout"
          cancelText="Stay logged in"
        />
      </div>
    </header>
  );
};

export default TopBar;
