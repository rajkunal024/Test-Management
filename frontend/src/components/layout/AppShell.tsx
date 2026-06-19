import { ReactNode, useState, useMemo, useRef } from "react";
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
  Users,
  Key,
  PlusCircle,
  Sun,
  Moon,
  Menu,
  Mail,
  Calendar,
  Clock,
  Heart,
  BookOpen,
  Camera,
  Crop,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Logo } from "./Logo";
import { useAuthStore } from "../../store/authStore";
import { logout as apiLogout, getNotifications, markNotificationsRead, clearAllNotifications, changePassword, uploadProfilePicture, getErrorMessage } from "../../services/api";
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

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

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
    if (user?.role === "Admin") {
      return [
        { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
        { label: "Students", icon: Users, to: "/admin/students" },
        { label: "Test Creation", icon: FileQuestion, to: "/tests/create" },
        { label: "Test Tracking", icon: ClipboardList, to: "/dashboard?status=live" },
      ];
    }
    return sidebarItems;
  }, [user?.role]);

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Profile Photo Cropping & Upload flow
  const [cropStep, setCropStep] = useState<"view" | "crop" | "preview">("view");
  const [selectedImage, setSelectedImage] = useState("");
  const [croppedImage, setCroppedImage] = useState("");
  const [imgAspect, setImgAspect] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX - offsetX, y: e.touches[0].clientY - offsetY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setOffsetX(e.touches[0].clientX - dragStart.x);
    setOffsetY(e.touches[0].clientY - dragStart.y);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleCropConfirm = () => {
    const imgElement = document.getElementById("crop-image-preview") as HTMLImageElement | null;
    if (!imgElement) return;

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viewportSize = 192;
    const canvasSize = 300;
    const scaleRatio = canvasSize / viewportSize;

    const renderedWidth = imgAspect > 1 ? viewportSize * imgAspect : viewportSize;
    const renderedHeight = imgAspect > 1 ? viewportSize : viewportSize / imgAspect;

    const baseStartX = (viewportSize - renderedWidth) / 2;
    const baseStartY = (viewportSize - renderedHeight) / 2;

    const totalX = baseStartX + offsetX;
    const totalY = baseStartY + offsetY;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const centerX = totalX + renderedWidth / 2;
    const centerY = totalY + renderedHeight / 2;

    const finalWidth = renderedWidth * zoom;
    const finalHeight = renderedHeight * zoom;

    const finalStartX = centerX - finalWidth / 2;
    const finalStartY = centerY - finalHeight / 2;

    ctx.drawImage(
      imgElement,
      finalStartX * scaleRatio,
      finalStartY * scaleRatio,
      finalWidth * scaleRatio,
      finalHeight * scaleRatio
    );

    const croppedDataUrl = canvas.toDataURL("image/png");
    setCroppedImage(croppedDataUrl);
    setCropStep("preview");
  };

  const handleUploadCropped = async () => {
    if (!croppedImage) return;

    setUploading(true);
    setUploadError("");

    try {
      const croppedFile = dataURLtoFile(croppedImage, "profile-picture.png");
      const formData = new FormData();
      formData.append("file", croppedFile);
      
      const res = await uploadProfilePicture(formData);
      if (res.success && res.profilePicture) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, profilePicture: res.profilePicture };
          useAuthStore.getState().setAuth({
            token: useAuthStore.getState().token || "",
            user: updatedUser
          });
        }
        setCropStep("view");
        setSelectedImage("");
        setCroppedImage("");
        setProfileModalOpen(false);
      } else {
        setUploadError("Failed to upload profile picture.");
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image size should be less than 5MB");
      return;
    }

    setUploadError("");

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setImgAspect(img.width / img.height);
        setSelectedImage(reader.result as string);
        setZoom(1);
        setOffsetX(0);
        setOffsetY(0);
        setCropStep("crop");
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setUploadError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

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
        className={`fixed inset-y-0 left-0 z-30 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 transition-all duration-300 ${navHidden
            ? "w-0 -translate-x-full border-r-0 opacity-0 pointer-events-none"
            : compactRail
              ? "w-[64px] lg:block hidden"
              : "w-[252px] lg:block hidden"
          }`}
      >
        <div className={`${compactRail ? "px-0 justify-center" : "px-7"} flex h-[100px] items-center border-b border-slate-100 dark:border-slate-800/80`}>
          <Link to="/dashboard" className="cursor-pointer hover:opacity-85 transition flex items-center justify-center w-full">
            <Logo compact={compactRail} />
          </Link>
        </div>
        {compactRail ? (
          <nav className="flex flex-col items-center gap-6 py-8">
            {railIcons.map((Icon, index) => (
              <div key={index} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition cursor-pointer">
                <Icon className="h-5 w-5" />
              </div>
            ))}
          </nav>
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
                    className={`relative flex h-12 items-center gap-3 rounded-md px-4 text-sm font-semibold transition-all ${isActive
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
                            className={`flex h-9 items-center gap-2 rounded-md px-4 text-xs font-semibold transition-all ${isSubActive
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
        className={`fixed right-0 top-0 z-20 flex h-[100px] items-center justify-between border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 px-7 transition-all duration-300 ${navHidden ? "left-0" : compactRail ? "left-0 lg:left-[64px]" : "left-0 lg:left-[252px]"
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
                        className={`p-3 rounded-lg border text-left transition duration-155 ${n.read
                            ? "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20"
                            : "border-indigo-100 bg-indigo-50/20 dark:border-indigo-900/30 dark:bg-indigo-950/30"
                          }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${n.type === "test_live" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450" : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
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
              <div className="h-12 w-12 overflow-hidden rounded-full border border-primary-400 group-hover:ring-2 group-hover:ring-primary-200 transition">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[#ffd584] flex items-center justify-center text-3xl">
                    <span className="mt-1">🙂</span>
                  </div>
                )}
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
        title={cropStep === "crop" ? "Crop Profile Photo" : cropStep === "preview" ? "Preview Photo" : "My Profile"}
        onClose={() => {
          setProfileModalOpen(false);
          setCropStep("view");
          setSelectedImage("");
          setCroppedImage("");
          setZoom(1);
          setOffsetX(0);
          setOffsetY(0);
        }}
      >
        {cropStep === "view" && (
          <div className="space-y-6 max-w-md mx-auto overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
            {/* Cover Header Graphic with role-themed gradient */}
            {(() => {
              const coverGradient =
                user?.role === "Admin" ? "from-slate-900 via-indigo-950 to-purple-950" :
                user?.role === "Teacher" ? "from-emerald-600 via-teal-600 to-indigo-600" :
                "from-blue-500 via-indigo-600 to-violet-600";
              return (
                <div className={`relative h-24 bg-gradient-to-r ${coverGradient} p-4 flex items-end justify-center`}>
                  <div className="absolute -bottom-10 h-20 w-20 rounded-full border-4 border-white dark:border-slate-900 shadow-md bg-gradient-to-br from-[#ffd584] to-[#fbc564] flex items-center justify-center text-4xl group/avatar overflow-hidden">
                    {user?.profilePicture ? (
                      <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span className="mt-1">🙂</span>
                    )}
                    {/* Hover Overlay for upload */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 text-white cursor-pointer"
                      title="Upload profile picture"
                      type="button"
                    >
                      {uploading ? (
                        <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <Camera className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* User Name & Role */}
            <div className="px-6 pt-12 pb-4 text-center border-b border-slate-100 dark:border-slate-800/60">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 leading-tight">
                {user?.name ?? "Alex Wando"}
              </h3>
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 border border-indigo-200/30">
                {user?.role ?? "Admin"} Account
              </span>
              {uploadError && (
                <p className="mt-2 text-xs font-semibold text-rose-500">{uploadError}</p>
              )}
              {uploading && (
                <p className="mt-2 text-xs font-semibold text-indigo-500 animate-pulse">Uploading photo...</p>
              )}
            </div>

            {/* Details list */}
            <div className="p-6 pt-2 space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Username / ID</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350 block">{user?.userId ?? "admin1"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Email Address</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block truncate">{user?.email || "N/A"}</span>
                </div>
              </div>

              {user?.role === "Teacher" && user?.subject && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Specialist Subject</span>
                    <span className="font-semibold text-emerald-650 dark:text-emerald-400 block">{user.subject}</span>
                  </div>
                </div>
              )}

              {user?.role === "Student" && user?.class && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 shrink-0">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Assigned Class</span>
                    <span className="font-semibold text-indigo-650 dark:text-indigo-400 block">{user.class}</span>
                  </div>
                </div>
              )}

              {user?.gender && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Gender</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">{user.gender}</span>
                  </div>
                </div>
              )}

              {user?.dob && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Date of Birth</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">{user.dob}</span>
                  </div>
                </div>
              )}

              {user?.joined_at && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 block tracking-widest">Member Since</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">
                      {new Date(user.joined_at).toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {cropStep === "crop" && (
          <div className="space-y-6 max-w-md mx-auto overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 flex flex-col items-center animate-fade-in">
            <p className="text-xs text-slate-500 text-center font-medium">
              Drag the photo to position it, and adjust the scale slider below.
            </p>
            
            {/* Viewport frame */}
            <div 
              className="w-48 h-48 rounded-full border-4 border-primary-500 shadow-lg overflow-hidden relative cursor-move bg-slate-950/40 flex items-center justify-center select-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={selectedImage}
                alt="Crop Target"
                className="max-w-none pointer-events-none select-none"
                style={{
                  height: imgAspect > 1 ? "192px" : "auto",
                  width: imgAspect > 1 ? "auto" : "192px",
                  transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                id="crop-image-preview"
              />
            </div>

            {/* Slider */}
            <div className="w-full space-y-2">
              <div className="flex justify-between text-xs text-slate-400 font-bold">
                <span>Zoom / Scale</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-primary-600 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {uploadError && (
              <p className="text-xs font-semibold text-rose-500 w-full text-center">{uploadError}</p>
            )}

            <div className="flex gap-3 w-full pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCropStep("view");
                  setSelectedImage("");
                }}
                className="flex-1 font-bold h-10 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCropConfirm}
                className="flex-1 font-bold h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white"
              >
                <Crop className="mr-2 h-4 w-4" /> Next
              </Button>
            </div>
          </div>
        )}

        {cropStep === "preview" && (
          <div className="space-y-6 max-w-md mx-auto overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-6 flex flex-col items-center animate-fade-in">
            <p className="text-xs text-slate-500 text-center font-medium">
              Review your cropped profile picture below.
            </p>

            {/* Cropped Image Preview */}
            <div className="w-48 h-48 rounded-full border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={croppedImage}
                alt="Cropped Preview"
                className="h-full w-full object-cover"
              />
            </div>

            {uploadError && (
              <p className="text-xs font-semibold text-rose-500 w-full text-center">{uploadError}</p>
            )}
            
            {uploading && (
              <p className="text-xs font-semibold text-indigo-500 animate-pulse w-full text-center">Uploading photo...</p>
            )}

            <div className="flex gap-3 w-full pt-2">
              <Button
                variant="secondary"
                onClick={() => setCropStep("crop")}
                disabled={uploading}
                className="flex-1 font-bold h-10 rounded-xl"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                onClick={handleUploadCropped}
                disabled={uploading}
                className="flex-1 font-bold h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white"
              >
                {uploading ? (
                  <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" /> Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
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

      <main className={`min-h-screen pt-[100px] transition-all duration-300 ${navHidden ? "pl-0 nav-hidden" : compactRail ? "lg:pl-[64px]" : "lg:pl-[252px]"}`}>{children}</main>
    </div>
  );
};
