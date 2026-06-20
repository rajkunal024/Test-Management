import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  GraduationCap,
  Briefcase,
  FileText,
  Eye,
  Search,
  ChevronLeft,
  Edit2,
  Save,
  CheckCircle2,
  X,
  AlertCircle,
  User,
  Shield,
  Layers,
  Slash,
  ChevronsUpDown,
  Building,
  Image as ImageIcon,
} from "lucide-react";

interface SecurityFeatures {
  cameraMonitoring: boolean;
  microphoneMonitoring: boolean;
  fullscreenMode: boolean;
  tabSwitchingDetection: boolean;
  screenSharingDetection: boolean;
  copyPasteDisabled: boolean;
  rightClickDisabled: boolean;
  developerToolsDetection: boolean;
  multipleMonitorDetection: boolean;
  faceDetection: boolean;
  browserLock: boolean;
  autoSave: boolean;
  screenRecordingDetection: boolean;
  printDisabled: boolean;
}

interface Organization {
  id: string;
  name: string;
  code: string;
  logo: string;
  contactEmail: string;
  phone: string;
  address: string;
  status: "Active" | "Inactive";
  createdAt: string;
  securityFeatures: SecurityFeatures;
  adminName: string;
  adminEmail: string;
}

interface OrgStats {
  students: number;
  teachers: number;
  admins: number;
  testsCreated: number;
  testsConducted: number;
  questionPoolSize: number;
  activeUsers: number;
}

interface DirectoryUser {
  id: string;
  name: string;
  email: string;
  role: "Student" | "Teacher" | "Admin";
  class: string;
  organization: string;
  status: string;
  lastLogin: string;
  profilePicture?: string;
}

interface DossierData {
  id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  dob: string;
  gender: string;
  class: string;
  registrationDate: string;
  lastLogin: string;
  status: string;
  profilePicture: string;
}

const FEATURE_META = [
  { key: "cameraMonitoring", name: "Camera Monitoring", desc: "Enforces webcam recording and proctor streaming throughout the test." },
  { key: "microphoneMonitoring", name: "Microphone Monitoring", desc: "Records audio and detects ambient noise/voice alerts." },
  { key: "fullscreenMode", name: "Strict Fullscreen Mode", desc: "Forces candidate to remain in full-screen; exits invalidate progress." },
  { key: "tabSwitchingDetection", name: "Tab Switching Detection", desc: "Logs and penalizes the student if they change browser tabs." },
  { key: "screenSharingDetection", name: "Screen Sharing Interception", desc: "Checks and prevents active screen sharing or mirroring." },
  { key: "copyPasteDisabled", name: "Disable Copy-Paste", desc: "Prevents copying question text or pasting answers into fields." },
  { key: "rightClickDisabled", name: "Disable Right Click", desc: "Disables mouse right click context menu shortcuts." },
  { key: "developerToolsDetection", name: "Developer Tools Detection", desc: "Detects if browser DevTools panels are accessed." },
  { key: "multipleMonitorDetection", name: "Multiple Monitor Detection", desc: "Flags connections of supplementary displays." },
  { key: "faceDetection", name: "Face Detection", desc: "Utilizes AI models to match face presence." },
  { key: "browserLock", name: "Browser Lock", desc: "Enforces standard locked client interfaces." },
  { key: "autoSave", name: "Auto Save", desc: "Saves inputs in periodic background intervals." },
  { key: "screenRecordingDetection", name: "Screen Recording Detection", desc: "Interprets and blocks video recording captures." },
  { key: "printDisabled", name: "Print Disabled", desc: "Restricts key triggers like print-screen captures." },
];

export const OrganizationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization | null>(null);
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"security" | "users">("security");

  // Edit details modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCountryCode, setEditCountryCode] = useState("+91");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLogo, setEditLogo] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");

  // Security features state
  const [secFeatures, setSecFeatures] = useState<SecurityFeatures | null>(null);
  const [secLoading, setSecLoading] = useState(false);
  const [secSuccess, setSecSuccess] = useState(false);

  // User Directory state
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  // User Dossier state
  const [dossierUserId, setDossierUserId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<DossierData | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/organizations/${id}`);
      if (response.data.success) {
        const oData = response.data.data.organization;
        setOrg(oData);
        setStats(response.data.data.stats);

        setSecFeatures(
          oData.securityFeatures || {
            cameraMonitoring: false,
            microphoneMonitoring: false,
            fullscreenMode: false,
            tabSwitchingDetection: false,
            screenSharingDetection: false,
            copyPasteDisabled: false,
            rightClickDisabled: false,
            developerToolsDetection: false,
            multipleMonitorDetection: false,
            faceDetection: false,
            browserLock: false,
            autoSave: false,
            screenRecordingDetection: false,
            printDisabled: false,
          }
        );

        setEditName(oData.name || "");
        setEditEmail(oData.contactEmail || "");
        const oPhone = oData.phone || "";
        const matchedCode = ["+91", "+1", "+44", "+61", "+977", "+880", "+971", "+65"].find(code => oPhone.startsWith(code));
        if (matchedCode) {
          setEditCountryCode(matchedCode);
          setEditPhone(oPhone.substring(matchedCode.length).trim());
        } else {
          setEditCountryCode("+91");
          setEditPhone(oPhone);
        }
        setEditAddress(oData.address || "");
        setEditLogo(oData.logo || "");
        setEditAdminName(oData.adminName || "");
        setEditAdminEmail(oData.adminEmail || "");
      }
    } catch (err: any) {
      console.error("Error fetching org details:", err);
      setError(err.response?.data?.message || "Failed to load tenant details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDirectory = async () => {
    if (!id || activeTab !== "users") return;
    try {
      setUsersLoading(true);
      setUsersError(null);
      const rParam = roleFilter === "All" ? "" : roleFilter;
      const response = await api.get(
        `/users?organization_id=${id}&search=${encodeURIComponent(searchQuery)}&role=${rParam}`
      );
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error("Error fetching user directory:", err);
      setUsersError("Could not retrieve user directory.");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, [activeTab, searchQuery, roleFilter, id]);

  const toggleStatus = async () => {
    if (!org) return;
    const nextStatus = org.status === "Active" ? "Inactive" : "Active";
    try {
      const response = await api.put(`/organizations/${org.id}/status`, { status: nextStatus });
      if (response.data.success) {
        setOrg((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to toggle organization status.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setEditError(null);
    setEditLoading(true);

    try {
      const payload = {
        name: editName,
        contactEmail: editEmail,
        phone: editPhone.trim() ? `${editCountryCode} ${editPhone.trim()}` : "",
        address: editAddress,
        logo: editLogo,
        adminName: editAdminName,
        adminEmail: editAdminEmail,
      };

      const response = await api.put(`/organizations/${org.id}`, payload);
      if (response.data.success) {
        await fetchDetails();
        setIsEditModalOpen(false);
      } else {
        setEditError(response.data.message || "Failed to update organization details.");
      }
    } catch (err: any) {
      console.error("Error editing organization:", err);
      setEditError(err.response?.data?.message || "Server error occurred during updates.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post("../questions/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success && response.data.image_url) {
        setEditLogo(response.data.image_url);
      } else {
        alert("Failed to upload image.");
      }
    } catch (err) {
      console.error("Error uploading logo:", err);
      alert("An error occurred during image upload.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSecurityToggle = (key: keyof SecurityFeatures) => {
    if (!secFeatures) return;
    setSecFeatures((prev) => (prev ? { ...prev, [key]: !prev[key] } : null));
    setSecSuccess(false);
  };

  const saveSecurityFeatures = async () => {
    if (!org || !secFeatures) return;
    setSecLoading(true);
    setSecSuccess(false);
    try {
      const response = await api.put(`/organizations/${org.id}/security-features`, {
        securityFeatures: secFeatures,
      });
      if (response.data.success) {
        setSecSuccess(true);
        setTimeout(() => setSecSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving security configs:", err);
      alert("Could not update proctoring settings.");
    } finally {
      setSecLoading(false);
    }
  };

  const viewDossier = async (userId: string) => {
    setDossierUserId(userId);
    setDossierLoading(true);
    setDossierError(null);
    setDossierData(null);
    try {
      const response = await api.get(`/users/${encodeURIComponent(userId)}`);
      if (response.data.success) {
        setDossierData(response.data.data);
      }
    } catch (err) {
      console.error("Dossier load error:", err);
      setDossierError("Failed to retrieve profile dossier information.");
    } finally {
      setDossierLoading(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toLowerCase();
    if (r === "admin") {
      return "bg-amber-500/5 text-amber-600 dark:bg-amber-950/20 dark:text-amber-550 border border-amber-500/20 dark:border-amber-950/40";
    } else if (r === "teacher") {
      return "bg-blue-50/60 dark:bg-blue-950/20 text-[#4B52DC] dark:text-[#818CF8] border border-blue-100/50 dark:border-blue-900/30";
    } else {
      // Student
      return "bg-slate-50/60 dark:bg-slate-900/20 text-slate-550 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800/30";
    }
  };

  const getAvatarBgColor = (name: string) => {
    const code = name.charCodeAt(0) % 5;
    const colors = ["bg-indigo-600", "bg-purple-600", "bg-emerald-600", "bg-cyan-600", "bg-blue-600"];
    return colors[code];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-10 h-10 border-3 border-[#4B52DC] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
          Retrieving organization record...
        </p>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Link to="/organizations" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-550 dark:text-slate-400 hover:text-[#4B52DC] transition-colors">
          <ChevronLeft className="w-4.5 h-4.5" /> Back to Organizations
        </Link>
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">{error || "Failed to load organization."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative text-slate-700 dark:text-slate-350">
      {/* Back button */}
      <div>
        <Link
          to="/organizations"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/50 dark:border-[#161B26] bg-white/60 dark:bg-[#0B0E14]/60 text-xs font-bold text-slate-650 dark:text-slate-400 hover:text-[#4B52DC] dark:hover:text-white transition-colors shadow-sm backdrop-blur-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Tenants</span>
        </Link>
      </div>

      {/* Profile Details Banner Card */}
      <div className="p-6 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#4B52DC] to-[#7C3AED] flex items-center justify-center text-white font-extrabold text-2xl shrink-0 shadow-md">
            {org.logo ? (
              <img
                src={org.logo}
                alt={org.name}
                className="w-full h-full object-contain rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              org.code.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-title font-extrabold text-slate-900 dark:text-white leading-tight truncate">
                {org.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-[#818CF8] text-[9px] font-mono tracking-wider font-bold uppercase border border-indigo-500/10">
                {org.code}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-[10px] text-slate-500 dark:text-slate-450 font-medium">
              <span className="flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Enrolled: {new Date(org.createdAt).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1.5 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  Primary Admin: <strong className="text-slate-800 dark:text-slate-200 font-semibold">{org.adminName}</strong>{" "}
                  <span className="font-mono text-slate-450">({org.adminEmail})</span>
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap z-10">
          <span
            className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${org.status === "Active"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
              }`}
          >
            {org.status}
          </span>

          <button
            onClick={toggleStatus}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 dark:border-[#161B26] hover:bg-slate-100 dark:hover:bg-[#151A26] text-slate-700 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Slash className="w-3.5 h-3.5" />
            <span>{org.status === "Active" ? "Deactivate" : "Activate"}</span>
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] hover:from-[#3f47d9] hover:to-[#6d28d9] text-white font-bold rounded-xl shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all text-xs cursor-pointer uppercase tracking-wider"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher Layout */}
      <div className="border-b border-slate-200 dark:border-[#161B26] flex gap-2 pt-2">
        <button
          onClick={() => setActiveTab("security")}
          className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer uppercase tracking-wider ${activeTab === "security"
            ? "border-[#4B52DC] text-[#4B52DC] dark:text-[#818CF8]"
            : "border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
        >
          <Shield className="w-4.5 h-4.5" />
          <span>Security & Policies</span>
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`py-3.5 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer uppercase tracking-wider ${activeTab === "users"
            ? "border-[#4B52DC] text-[#4B52DC] dark:text-[#818CF8]"
            : "border-transparent text-slate-450 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
        >
          <Users className="w-4.5 h-4.5" />
          <span>User Directory</span>
        </button>
      </div>

      {/* Tab Contents Grid layout */}
      {activeTab === "security" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Cards Stack (Contact + Stats) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Info Card */}
            <div className="p-6 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl shadow-sm space-y-4 backdrop-blur-md">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5 pb-2.5 border-b border-slate-200/40 dark:border-[#161B26]/60">
                Contact Information
              </h3>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                    Contact Email
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white break-all">{org.contactEmail}</div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                    Phone Number
                  </span>
                  <div className="font-semibold text-slate-900 dark:text-white">{org.phone || "N/A"}</div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">
                    Registered Address
                  </span>
                  <div className="font-semibold text-slate-905 dark:text-white whitespace-pre-line leading-relaxed">
                    {org.address || "No address provided."}
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Volume Metrics Card */}
            {stats && (
              <div className="p-6 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl shadow-sm space-y-4 backdrop-blur-md">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1.5 pb-2.5 border-b border-slate-200/40 dark:border-[#161B26]/60">
                  Tenant Volumes
                </h3>
                <div className="space-y-3">
                  {/* Students count */}
                  <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-lg">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-950 dark:text-white leading-tight">
                        {stats.students.toLocaleString()}
                      </div>
                      <div className="text-[8px] font-bold text-slate-450 uppercase tracking-wide mt-0.5">
                        Students Enrolled
                      </div>
                    </div>
                  </div>

                  {/* Instructors count */}
                  <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 rounded-lg">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-950 dark:text-white leading-tight">
                        {stats.teachers.toLocaleString()}
                      </div>
                      <div className="text-[8px] font-bold text-slate-450 uppercase tracking-wide mt-0.5">
                        Faculty Teachers
                      </div>
                    </div>
                  </div>

                  {/* Admins count */}
                  <div className="p-3 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-xl flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 rounded-lg">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-slate-950 dark:text-white leading-tight">
                        {stats.admins.toLocaleString()}
                      </div>
                      <div className="text-[8px] font-bold text-slate-450 uppercase tracking-wide mt-0.5">
                        Tenant Admins
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Security Policies Card - 2 Cols */}
          <div className="lg:col-span-2 p-6 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl shadow-sm space-y-6 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3.5 border-b border-slate-200/40 dark:border-[#161B26]/60">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Proctoring & Boundary Policies</h3>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1">
                  Configure platform-enforced restrictions on candidate browser boundaries.
                </p>
              </div>
              <button
                onClick={saveSecurityFeatures}
                disabled={secLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#4B52DC] hover:bg-[#3f47d9] text-white font-bold rounded-xl shadow-md active:scale-[0.98] transition-all text-xs cursor-pointer shrink-0 uppercase tracking-wider"
              >
                {secLoading ? (
                  <span>Saving...</span>
                ) : secSuccess ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Config</span>
                  </>
                )}
              </button>
            </div>

            {/* List features with toggles */}
            {secFeatures && (
              <div className="divide-y divide-slate-200/40 dark:divide-[#161B26]/60 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {FEATURE_META.map((feat) => {
                  const val = secFeatures[feat.key as keyof SecurityFeatures];
                  return (
                    <div
                      key={feat.key}
                      className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{feat.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-450 leading-normal max-w-md">
                          {feat.desc}
                        </div>
                      </div>

                      {/* Custom Slide Switches */}
                      <button
                        type="button"
                        onClick={() => handleSecurityToggle(feat.key as keyof SecurityFeatures)}
                        className={`rounded-full transition-colors relative cursor-pointer outline-none focus:outline-none shrink-0 ${val ? "bg-[#4B52DC]" : "bg-slate-300 dark:bg-slate-800"
                          }`}
                        style={{ width: "44px", height: "24px" }}
                        aria-label={`Toggle ${feat.name}`}
                      >
                        <span
                          className={`block rounded-full bg-white shadow transform transition-transform duration-200 absolute top-0.5 left-0.5 ${val ? "translate-x-5" : "translate-x-0"
                            }`}
                          style={{ width: "20px", height: "20px" }}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* User Directory tab context */
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-sm backdrop-blur-md">
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search tenant users by name or email account..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1422] border border-slate-350 dark:border-[#1C2434] text-slate-900 dark:text-white placeholder-slate-550 focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 outline-none hover:border-[#4B52DC]/60 transition-all text-xs font-semibold"
              />
            </div>
            <div className="relative w-full md:w-48 flex flex-col justify-center">
              <label className="absolute -top-2 left-3 px-1.5 bg-white dark:bg-[#0B0E14] text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest z-10">
                Filter Role
              </label>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1422] border border-[#4B52DC]/75 dark:border-[#4B52DC]/60 hover:border-[#4B52DC] focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 outline-none appearance-none transition-all text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="All">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Teacher">Teacher</option>
                  <option value="Student">Student</option>
                </select>
                <ChevronsUpDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B52DC] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* User Table directory list */}
          {usersLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[25vh] space-y-4">
              <div className="w-8 h-8 border-3 border-[#4B52DC] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
                Querying environment accounts...
              </p>
            </div>
          ) : usersError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{usersError}</span>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] text-slate-500 text-xs font-semibold backdrop-blur-md">
              No matching records established under this directory search.
            </div>
          ) : (
            <div className="bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#161B26] text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-slate-50/50 dark:bg-[#0f1422]/30">
                      <th className="px-6 py-4">User Identity</th>
                      <th className="px-6 py-4">Assigned Role</th>
                      <th className="px-6 py-4">Grade / Subject</th>
                      <th className="px-6 py-4">Account Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-[#161B26]/60">
                    {users.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`hover:bg-slate-100/40 dark:hover:bg-[#121824]/40 transition-all text-xs text-slate-700 dark:text-slate-350 border-l-[3.5px] ${idx === 0 ? "border-l-[#4B52DC]" : "border-l-transparent"
                          }`}
                      >
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-sm">
                              {u.profilePicture ? (
                                <img src={u.profilePicture} alt={u.name} className="w-full h-full object-cover animate-fade-in" />
                              ) : (
                                <div className={`w-full h-full ${getAvatarBgColor(u.name)} flex items-center justify-center text-white font-extrabold text-sm`}>
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 dark:text-white leading-tight">{u.name}</span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-450 font-mono mt-0.5">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${getRoleBadgeStyle(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${u.role.toLowerCase() === "teacher"
                            ? "bg-indigo-50 dark:bg-indigo-950/20 text-[#4B52DC] dark:text-[#818CF8]"
                            : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400"
                            }`}>
                            {u.class || (u.role.toLowerCase() === "teacher" ? "Mathematics" : "Class 10")}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          {u.status.toLowerCase() === "active" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border bg-emerald-50/60 dark:bg-emerald-950/25 text-emerald-650 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{u.status}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border bg-slate-50/60 dark:bg-slate-900/20 text-slate-550 dark:text-slate-400 border-slate-200/50 dark:border-slate-800/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span>{u.status}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDossier(u.id);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200/60 dark:border-[#161B26] bg-white/80 dark:bg-[#0B0E14]/80 text-slate-500 dark:text-slate-400 hover:text-[#4B52DC] hover:border-[#4B52DC]/30 hover:bg-slate-50 dark:hover:bg-[#121824] transition-all cursor-pointer shadow-sm inline-flex items-center justify-center"
                            title="View Dossier"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Profile Modal - Centers strictly on screen */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#06080c]/60 backdrop-blur-md">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 hover:border-[#4B52DC]/25 dark:hover:border-indigo-500/20 transition-all duration-300">
            {/* Close Button */}
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#121824] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Title & Icon Header */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[#4B52DC] dark:text-[#818CF8] shrink-0">
                <Building className="w-5.5 h-5.5" />
              </div>
              <div>
                <h3 className="font-title font-extrabold text-base text-slate-900 dark:text-white">Edit Organization Profile</h3>
                <p className="font-title text-slate-500 dark:text-slate-400 text-xs mt-0.5 font-medium">
                  Update general settings and metadata details for this environment.
                </p>
              </div>
            </div>

            {editError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-5">
              {/* Organization Name Card */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all">
                <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-550 outline-none font-title text-sm font-bold mt-1"
                />
              </div>

              {/* Email & Phone Two-Column Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-550 outline-none font-title text-sm font-bold mt-1"
                    />
                  </div>
                  <Mail className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      Phone Number
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={editCountryCode}
                        onChange={(e) => setEditCountryCode(e.target.value)}
                        className="bg-transparent text-slate-900 dark:text-white outline-none font-title text-sm font-bold cursor-pointer dark:bg-[#070A10]"
                      >
                        <option value="+91" className="text-slate-900 dark:text-white dark:bg-[#070A10]">IN (+91)</option>
                        <option value="+1" className="text-slate-900 dark:text-white dark:bg-[#070A10]">US (+1)</option>
                        <option value="+44" className="text-slate-900 dark:text-white dark:bg-[#070A10]">UK (+44)</option>
                        <option value="+61" className="text-slate-900 dark:text-white dark:bg-[#070A10]">AU (+61)</option>
                        <option value="+977" className="text-slate-900 dark:text-white dark:bg-[#070A10]">NP (+977)</option>
                        <option value="+880" className="text-slate-900 dark:text-white dark:bg-[#070A10]">BD (+880)</option>
                        <option value="+971" className="text-slate-900 dark:text-white dark:bg-[#070A10]">AE (+971)</option>
                        <option value="+65" className="text-slate-900 dark:text-white dark:bg-[#070A10]">SG (+65)</option>
                      </select>
                      <input
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-550 outline-none font-title text-sm font-bold"
                      />
                    </div>
                  </div>
                  <Phone className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </div>
              </div>

              {/* Logo Image Upload */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all flex items-center justify-between gap-3 relative">
                <div className="flex-1 min-w-0">
                  <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    Logo Image URL (Optional)
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    {editLogo ? (
                      <div className="w-8 h-8 rounded bg-white border border-slate-200 dark:bg-[#0F1422] dark:border-[#161B26] overflow-hidden flex items-center justify-center shrink-0">
                        <img src={editLogo} alt="Logo Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-455 dark:text-slate-500">
                        <Building className="w-4 h-4" />
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 dark:bg-[#121824] dark:hover:bg-[#151A26] border border-slate-200 dark:border-[#161D2A] text-slate-650 dark:text-slate-350 font-title text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        disabled={uploadingLogo}
                      />
                    </label>
                    {editLogo && (
                      <button
                        type="button"
                        onClick={() => setEditLogo("")}
                        className="font-title text-[11px] font-bold text-red-500 hover:text-red-650 dark:text-red-450 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-slate-400 dark:text-slate-500 font-title text-[11px] font-semibold max-w-[40%] text-right truncate">
                  {editLogo ? "Uploaded to ImageKit" : "No image selected"}
                </div>
              </div>

              {/* Registered Address */}
              <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                    Registered Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-550 outline-none font-title text-sm font-bold mt-1"
                  />
                </div>
                <MapPin className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
              </div>

              {/* Primary Organization Admin Heading */}
              <div className="font-title text-[11px] font-bold text-[#4B52DC] dark:text-[#818CF8] uppercase tracking-widest pt-2">
                Primary Organization Admin
              </div>

              {/* Admin Username & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      value={editAdminName}
                      onChange={(e) => setEditAdminName(e.target.value)}
                      className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-550 outline-none font-title text-sm font-bold mt-1"
                    />
                  </div>
                  <User className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </div>

                <div className="rounded-2xl bg-slate-50 dark:bg-[#070A10] border border-slate-200/80 dark:border-[#161D2A] px-4.5 py-2.5 focus-within:border-[#4B52DC]/80 dark:focus-within:border-indigo-500/80 transition-all flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <label className="block font-title text-[11px] font-bold text-slate-400 dark:text-slate-500">
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={editAdminEmail}
                      onChange={(e) => setEditAdminEmail(e.target.value)}
                      className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-550 outline-none font-title text-sm font-bold mt-1"
                    />
                  </div>
                  <Mail className="w-4.5 h-4.5 text-slate-400 dark:text-slate-500 shrink-0" />
                </div>
              </div>

              {/* Bottom Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-[#161B26]/60 font-title">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-[#161D2A] bg-white dark:bg-[#070A10] hover:bg-slate-50 dark:hover:bg-[#121825] text-slate-500 dark:text-slate-400 font-bold text-xs transition-all cursor-pointer font-title"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] hover:from-[#3f47d9] hover:to-[#6d28d9] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer font-title"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{editLoading ? "Saving..." : "Save Details"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Dossier View Modal - Centers strictly on screen */}
      {dossierUserId && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 dark:bg-[#06080c]/60 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0B0E14] border border-slate-200/60 dark:border-[#161B26] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 hover:border-[#4B52DC]/25 dark:hover:border-indigo-500/20 transition-all duration-300">
            {/* Close Button */}
            <button
              onClick={() => setDossierUserId(null)}
              className="absolute top-6 right-6 p-1.5 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#121824] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-title font-extrabold text-lg text-slate-900 dark:text-white tracking-wide">User Account File Dossier</h3>
            </div>

            {dossierLoading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold animate-pulse">Requesting account dossier...</p>
              </div>
            ) : dossierError ? (
              <div className="p-3.5 rounded-2xl bg-red-500/10 dark:bg-red-950/20 border border-red-500/20 dark:border-red-900/40 text-red-700 dark:text-red-350 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{dossierError}</span>
              </div>
            ) : dossierData ? (
              <div className="space-y-5">
                {/* Banner Info */}
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl">
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-md bg-slate-900">
                    {dossierData.profilePicture ? (
                      <img src={dossierData.profilePicture} alt={dossierData.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full ${getAvatarBgColor(dossierData.name)} flex items-center justify-center text-white text-xl font-extrabold`}>
                        {dossierData.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-title font-extrabold text-base text-slate-900 dark:text-white leading-tight truncate">
                      {dossierData.name}
                    </h4>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-1 font-mono tracking-wider truncate">
                      REF ID: <strong className="text-slate-650 dark:text-slate-300 select-all break-all">{dossierData.id}</strong>
                    </p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20">
                      {dossierData.role}
                    </span>
                  </div>
                </div>

                {/* Read-only Alert Warning box */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-550/15 dark:border-amber-500/15 text-amber-600 dark:text-amber-500 text-[10px] leading-relaxed flex items-start gap-3">
                  <Shield className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-wider">Read-Only Archive File</p>
                    <p className="mt-1 text-amber-700/80 dark:text-amber-500/70 leading-normal">
                      Security boundaries isolate core directory data from direct manipulation. Administrative profile adjustments must be executed directly by local client environments.
                    </p>
                  </div>
                </div>

                {/* Grid Attributes with Overflow Prevention */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl space-y-0.5 min-w-0">
                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Email Address</span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white break-all" title={dossierData.email}>
                      {dossierData.email}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl space-y-0.5 min-w-0">
                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Client Tenant</span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate" title={dossierData.organization}>
                      {dossierData.organization}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl space-y-0.5 min-w-0">
                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Class / Subject</span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {dossierData.class}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl space-y-0.5">
                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Enrollment Date</span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {new Date(dossierData.registrationDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl space-y-0.5">
                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Gender</span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {dossierData.gender}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/60 dark:border-[#161B26] rounded-2xl space-y-0.5">
                    <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date of Birth</span>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      {dossierData.dob}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className={`flex ${dossierData?.role === "Teacher" ? "justify-between" : "justify-end"} pt-4 border-t border-slate-200 dark:border-[#161B26]/60`}>
              {dossierData?.role === "Teacher" && (
                <button
                  onClick={() => {
                    navigate(`/questions?teacherId=${encodeURIComponent(dossierData.id)}`);
                    setDossierUserId(null);
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] hover:from-[#3f47d9] hover:to-[#6d28d9] text-white font-bold rounded-xl text-xs active:scale-[0.98] transition-all cursor-pointer font-title shadow-md shadow-indigo-500/10 uppercase tracking-wider"
                >
                  View Questions
                </button>
              )}
              <button
                onClick={() => setDossierUserId(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-250 dark:bg-[#121824] dark:hover:bg-[#151A26] text-slate-700 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
