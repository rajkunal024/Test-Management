import { ReactNode, useState, useMemo } from "react";
import { NavLink, useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileQuestion,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  User,
  Key,
  PlusCircle,
  Sun,
  Moon,
  Menu,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuthStore } from "../../store/authStore";
import { logout as apiLogout, getNotifications, markNotificationsRead, clearAllNotifications, changePassword } from "../../services/api";
import { Modal } from "../ui/Modal";
import { PasswordInput } from "../ui/PasswordInput";
import { Button } from "../ui/Button";
import { useTheme } from "../../context/ThemeContext";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Test Creation", icon: FileQuestion, to: "/tests/create" },
  { label: "Test Tracking", icon: ClipboardList, to: "/dashboard?status=live" },
];

const railIcons = [BookOpenCheck, ShieldCheck, BarChart3, ClipboardList, Settings];

export const AppShell = ({ children, compactRail = false }: { children: ReactNode; compactRail?: boolean }) => {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toggleTheme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [navHidden, setNavHidden] = useState(() => {
    return localStorage.getItem("parikshya_nav_hidden") === "true";
  });

  const toggleNav = () => {
    setNavHidden((prev) => {
      const newVal = !prev;
      localStorage.setItem("parikshya_nav_hidden", String(newVal));
      return newVal;
    });
  };

  const currentSidebarItems = useMemo(() => {
    if (user?.role === "Teacher") {
      return [
        { label: "Add Question", icon: PlusCircle, to: "/dashboard?tab=add" },
        { label: "View Question", icon: BookOpenCheck, to: "/dashboard?tab=view" },
        { label: "Test Tracking", icon: ClipboardList, to: "/dashboard?tab=monitoring" },
      ];
    }
    if (user?.role === "Student") {
      return [
        { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
        { label: "Analytics", icon: BarChart3, to: "/analytics" },
      ];
    }
    return sidebarItems;
  }, [user?.role]);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  const changePwdMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (data) => {
      if (data.success) {
        setPwdSuccess("Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        window.setTimeout(() => {
          setPwdSuccess("");
          setChangePasswordModalOpen(false);
        }, 1500);
      } else {
        setPwdError(data.message || "Failed to change password.");
      }
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || "Error changing password.";
      setPwdError(errMsg);
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 4) {
      setPwdError("New password must be at least 4 characters.");
      return;
    }

    changePwdMutation.mutate({ oldPassword, newPassword });
  };

  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
    enabled: Boolean(user),
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationsRead,
    onSuccess: () => {
      refetchNotifications();
    },
  });

  const clearNotificationsMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      refetchNotifications();
    },
    onError: (err) => {
      alert("Error clearing notifications. Please try again.");
      console.error(err);
    }
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const logout = async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.error("Logout API failed", e);
    }
    clearAuth();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
      <aside
        className={`fixed inset-y-0 left-0 z-30 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 ${
          navHidden
            ? "w-0 -translate-x-full border-r-0 opacity-0 pointer-events-none"
            : compactRail
            ? "w-[156px] lg:block hidden"
            : "w-[252px] lg:block hidden"
        }`}
      >
        <div className={`${compactRail ? "px-4" : "px-7"} flex h-[100px] items-center border-b border-slate-100 dark:border-slate-800/80`}>
          <Link to="/dashboard" className="cursor-pointer hover:opacity-85 transition flex items-center">
            <Logo compact={compactRail} />
          </Link>
        </div>
        {compactRail ? (
          <div className="flex">
            <div className="w-6 border-r border-slate-100 dark:border-slate-800 pt-16">
              <div className="flex flex-col items-center gap-5">
                {railIcons.map((Icon, index) => (
                  <Icon key={index} className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                ))}
              </div>
            </div>
            <nav className="flex-1 px-3 pt-14">
              {user?.role === "Admin" && (
                <>
                  <NavLink
                    to="/tests/create"
                    className="mb-3 flex items-center justify-between rounded-md px-2 py-2 text-[11px] font-medium text-slate-600 dark:text-slate-350"
                  >
                    Question creation
                    <span className="text-primary-500">≪</span>
                  </NavLink>
                  <p className="mb-4 px-2 text-[11px] text-slate-500 dark:text-slate-400">Total Questions . 50</p>
                  {["Question 1", "Question 2", "Question 3", "Question x", "Question x", "Question 6"].map((label, index) => (
                    <div
                      key={`${label}-${index}`}
                      className={`mb-2 flex h-7 items-center justify-between rounded-md border px-2 text-[10px] ${
                        index < 4
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800/80 dark:bg-emerald-950/20 dark:text-emerald-450"
                          : "border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      <span className="flex-1 pl-2">{label}</span>
                      <span>›</span>
                    </div>
                  ))}
                </>
              )}
            </nav>
          </div>
        ) : (
          <nav className="space-y-2 px-3 py-8">
            {currentSidebarItems.map(({ label, icon: Icon, to }) => {
              const currentPath = location.pathname + location.search;
              
              const isAddTab = to === "/dashboard?tab=add";
              const isViewTab = to === "/dashboard?tab=view";
              
              let isActive = false;
              if (isAddTab) {
                isActive = currentPath === "/dashboard" || currentPath === "/dashboard?tab=add" || currentPath.includes("tab=add");
              } else if (isViewTab) {
                isActive = currentPath.includes("tab=view");
              } else {
                isActive = currentPath === to;
              }

              const subItems = [
                { label: "All Questions", classVal: "all" },
                { label: "Class 9", classVal: "Class 9" },
                { label: "Class 10", classVal: "Class 10" },
                { label: "Class 11", classVal: "Class 11" },
                { label: "Class 12", classVal: "Class 12" },
              ];

              return (
                <div key={label} className="space-y-1">
                  <Link
                    to={isViewTab ? "/dashboard?tab=view&class=all" : to}
                    className={`relative flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-850 dark:hover:text-slate-200"
                    }`}
                  >
                    {isActive ? <span className="absolute left-0 h-9 w-1 rounded-r-full bg-primary-600" /> : null}
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>

                  {isViewTab && isActive && (
                    <div className="pl-6 space-y-1 mt-1">
                      {subItems.map((sub) => {
                        const subUrl = `/dashboard?tab=view&class=${encodeURIComponent(sub.classVal)}`;
                        const isSubActive = searchParams.get("class") === sub.classVal || 
                          (!searchParams.get("class") && sub.classVal === "all");
                        return (
                          <Link
                            key={sub.label}
                            to={subUrl}
                            className={`flex h-9 items-center gap-2 rounded-md px-4 text-xs font-semibold transition-all ${
                              isSubActive
                                ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-650 dark:text-slate-500 dark:hover:bg-slate-850/50 dark:hover:text-slate-300"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isSubActive ? "bg-primary-600 dark:bg-primary-400 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}
      </aside>

      <header
        className={`fixed right-0 top-0 z-20 flex h-[100px] items-center justify-between border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-7 transition-all duration-300 ${
          navHidden ? "left-0" : compactRail ? "left-0 lg:left-[156px]" : "left-0 lg:left-[252px]"
        }`}
      >
        {/* Toggle Button for Navigation Panel */}
        <button
          onClick={toggleNav}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 text-slate-700 transition focus:outline-none cursor-pointer"
          title={navHidden ? "Show Navigation" : "Hide Navigation"}
          id="nav-visibility-toggle"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4 animate-fade-in">
          {/* Light/Dark Mode Toggle Switch */}
          <button
            onClick={toggleTheme}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 text-slate-700 transition-all duration-300 focus:outline-none cursor-pointer"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            id="theme-mode-toggle"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-amber-500 animate-[spin_10s_linear_infinite]" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                if (!dropdownOpen && unreadCount > 0) {
                  markReadMutation.mutate();
                }
              }}
              className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition focus:outline-none cursor-pointer"
            >
              <Bell className="h-5 w-5 text-slate-700 dark:text-slate-300" />
              {unreadCount > 0 && (
                <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-600 dark:border-slate-900 animate-pulse" />
              )}
            </button>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 shadow-xl z-50 max-h-[380px] overflow-y-auto transform origin-top-right transition-all duration-200 ease-out">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Notifications</span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => clearNotificationsMutation.mutate()}
                        disabled={clearNotificationsMutation.isPending}
                        className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-colors duration-200 lowercase cursor-pointer"
                      >
                        {clearNotificationsMutation.isPending ? "clearing..." : "clear all"}
                      </button>
                    )}
                    {unreadCount > 0 && (
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={`space-y-2 transition-all duration-300 ease-in-out ${clearNotificationsMutation.isPending ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"}`}>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-3 rounded-lg border text-left transition duration-155 ${
                          n.read 
                            ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20" 
                            : "border-indigo-100 bg-indigo-50/20 dark:border-indigo-900/30 dark:bg-indigo-950/30"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            n.type === "test_live" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                          }`}>
                            {n.type === "test_live" ? "Exam Live" : "Results Out"}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">{n.message}</p>
                        {user?.role === "Student" && (
                          <div className="mt-2 text-right">
                            {n.type === "test_live" ? (
                              <Link 
                                to={`/tests/${n.test_id}/attempt`} 
                                onClick={() => setDropdownOpen(false)}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Attempt Test →
                              </Link>
                            ) : (
                              <Link 
                                to={`/tests/${n.test_id}/result`} 
                                onClick={() => setDropdownOpen(false)}
                                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                View Scorecard →
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-3 text-left focus:outline-none hover:opacity-85 transition group cursor-pointer"
              title="User menu"
            >
              <div className="h-12 w-12 overflow-hidden rounded-full border border-primary-400 bg-[#ffd584] group-hover:ring-2 group-hover:ring-primary-200 transition">
                <div className="mt-1 text-center text-3xl">🙂</div>
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-2 text-lg font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition">
                  {user?.name ?? "Alex Wando"} <ChevronDown className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{user?.role ?? "Admin"}</p>
              </div>
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-2 shadow-xl z-50 transform origin-top-right transition-all duration-200 ease-out">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setProfileModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition focus:outline-none cursor-pointer"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  View Profile
                </button>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    setChangePasswordModalOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition focus:outline-none cursor-pointer"
                >
                  <Key className="h-4 w-4 text-slate-400" />
                  Change Password
                </button>
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Modal 1: View Profile */}
      <Modal
        open={profileModalOpen}
        title="My Profile"
        onClose={() => setProfileModalOpen(false)}
      >
        <div className="space-y-6 max-w-md mx-auto">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-primary-300 bg-[#ffd584] flex items-center justify-center text-4xl">
              🙂
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{user?.name ?? "Alex Wando"}</h3>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-50 text-primary-700">
                {user?.role ?? "Admin"}
              </span>
            </div>
          </div>

          <div className="space-y-3.5 text-sm text-slate-600">
            <div className="flex justify-between items-center py-2 border-b border-slate-100/50">
              <span className="font-semibold text-slate-400 uppercase text-[11px] tracking-wider">User ID / Username</span>
              <span className="font-semibold text-slate-700">{user?.userId ?? "admin1"}</span>
            </div>
            {user?.role === "Teacher" && user?.subject && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100/50">
                <span className="font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Assigned Subject</span>
                <span className="font-semibold text-emerald-600">{user.subject}</span>
              </div>
            )}
            {user?.role === "Student" && user?.class && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100/50">
                <span className="font-semibold text-slate-400 uppercase text-[11px] tracking-wider">Assigned Class</span>
                <span className="font-semibold text-indigo-600">{user.class}</span>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal 2: Change Password */}
      <Modal
        open={changePasswordModalOpen}
        title="Change Password"
        onClose={() => {
          setChangePasswordModalOpen(false);
          setOldPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPwdError("");
          setPwdSuccess("");
        }}
      >
        <div className="space-y-4 max-w-md mx-auto">
          <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Update Password</h4>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <PasswordInput
              label="Current Password"
              placeholder="Enter current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
            <PasswordInput
              label="New Password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <PasswordInput
              label="Confirm New Password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {pwdError && (
              <div className="rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
                {pwdError}
              </div>
            )}

            {pwdSuccess && (
              <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 animate-pulse">
                {pwdSuccess}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={changePwdMutation.isPending}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-2.5 rounded-md transition"
              >
                {changePwdMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <main className={`min-h-screen pt-[100px] transition-all duration-300 ${navHidden ? "pl-0" : compactRail ? "lg:pl-[156px]" : "lg:pl-[252px]"}`}>{children}</main>
    </div>
  );
};
