import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  Plus,
  Search,
  Eye,
  X,
  AlertCircle,
  ShieldAlert,
  Slash,
  ChevronsUpDown,
  Building,
  Image as ImageIcon,
} from "lucide-react";

interface OrgCounts {
  students: number;
  teachers: number;
  admins: number;
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
  counts: OrgCounts;
  adminName: string;
  adminEmail: string;
}

export const OrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // Wizard modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardLoading, setWizardLoading] = useState(false);

  // Wizard fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [logo, setLogo] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

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
        setLogo(response.data.image_url);
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

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/organizations");
      if (response.data.success) {
        setOrganizations(response.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching organizations:", err);
      setError("Unable to retrieve organizations directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const resetWizard = () => {
    setName("");
    setCode("");
    setLogo("");
    setUploadingLogo(false);
    setContactEmail("");
    setCountryCode("+91");
    setPhone("");
    setAddress("");
    setWizardError(null);
    setIsWizardOpen(false);
  };

  const validateStep1 = () => {
    if (!name.trim()) return "Organization Name is required.";
    if (!code.trim()) return "Organization Code is required.";
    if (!/^[a-zA-Z0-9]+$/.test(code)) return "Code must be alphanumeric with no spaces.";
    if (!contactEmail.trim()) return "Contact Email is required.";
    if (!/\S+@\S+\.\S+/.test(contactEmail)) return "Invalid contact email address.";
    return null;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError(null);

    const step1Err = validateStep1();
    if (step1Err) {
      setWizardError(step1Err);
      return;
    }

    setWizardLoading(true);
    try {
      const payload = {
        name,
        code,
        logo,
        contactEmail,
        phone: phone.trim() ? `${countryCode} ${phone.trim()}` : "",
        address,
        status: "Active",
      };

      const response = await api.post("/organizations", payload);
      if (response.data.success) {
        await fetchOrganizations();
        resetWizard();
      } else {
        setWizardError(response.data.message || "Failed to register organization.");
      }
    } catch (err: any) {
      console.error("Register organization error:", err);
      setWizardError(err.response?.data?.message || "Server error occurred during registration.");
    } finally {
      setWizardLoading(false);
    }
  };

  const toggleStatus = async (orgId: string, currentStatus: "Active" | "Inactive") => {
    const nextStatus = currentStatus === "Active" ? "Inactive" : "Active";
    try {
      const response = await api.put(`/organizations/${orgId}/status`, { status: nextStatus });
      if (response.data.success) {
        setOrganizations((prev) =>
          prev.map((org) => (org.id === orgId ? { ...org, status: nextStatus } : org))
        );
      }
    } catch (err) {
      console.error("Error toggling organization status:", err);
      alert("Failed to update organization status. Check backend connection.");
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch =
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.contactEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.adminName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "All" || org.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in relative text-slate-700 dark:text-slate-350">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">
            Manage Organizations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Configure tenant environments, custom security policies, and student boundaries
          </p>
        </div>
        <button
          onClick={() => setIsWizardOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] hover:from-[#3f47d9] hover:to-[#6d28d9] text-white font-extrabold rounded-xl shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all self-start sm:self-center text-xs cursor-pointer uppercase tracking-wider whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Register Tenant</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-5 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl flex flex-col md:flex-row items-center gap-4 shadow-sm backdrop-blur-md">
        <div className="relative w-full md:flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search by organization name, code, or administrator..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1422] border border-slate-350 dark:border-[#1C2434] text-slate-900 dark:text-white placeholder-slate-500 focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 outline-none transition-all text-xs font-semibold"
          />
        </div>
        <div className="relative w-full md:w-56 flex flex-col justify-center">
          <label className="absolute -top-2 left-3 px-1.5 bg-white dark:bg-[#0B0E14] text-[9px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest z-10">
            Filter Status
          </label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0F1422] border border-[#4B52DC]/75 dark:border-[#4B52DC]/60 hover:border-[#4B52DC] focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 outline-none appearance-none transition-all text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
            <ChevronsUpDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4B52DC] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Container */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-4">
          <div className="w-10 h-10 border-3 border-[#4B52DC] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider animate-pulse">
            Retrieving tenants directory...
          </p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 flex items-center gap-3 shadow-md">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      ) : filteredOrganizations.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] shadow-sm flex flex-col items-center justify-center space-y-4 backdrop-blur-md">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No matching tenant accounts discovered.</p>
        </div>
      ) : (
        <div className="bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-2xl overflow-hidden shadow-md backdrop-blur-md">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#161B26] text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest bg-slate-50/50 dark:bg-[#0f1422]/30">
                  <th className="px-6 py-4">Tenant Code</th>
                  <th className="px-6 py-4">Organization Profiling</th>
                  <th className="px-6 py-4">Primary Admin</th>
                  <th className="px-6 py-4 text-center">Students</th>
                  <th className="px-6 py-4 text-center">Teachers</th>
                  <th className="px-6 py-4">Enrolled Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40 dark:divide-[#161B26]/60">
                {filteredOrganizations.map((org) => (
                  <tr
                    key={org.id}
                    className="hover:bg-slate-100/40 dark:hover:bg-[#121824]/40 transition-colors text-xs text-slate-700 dark:text-slate-350"
                  >
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-500/10 text-[#4B52DC] dark:text-[#818CF8] text-[10px] font-mono tracking-wider font-bold uppercase border border-indigo-500/10">
                        {org.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={org.name}>
                        {org.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 truncate max-w-[200px]" title={org.contactEmail}>
                        {org.contactEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px]" title={org.adminName}>
                        {org.adminName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-450 mt-0.5 truncate max-w-[160px]" title={org.adminEmail}>
                        {org.adminEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-center text-slate-900 dark:text-white">
                      {org.counts.students.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-center text-slate-900 dark:text-white">
                      {org.counts.teachers.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-semibold">
                      {new Date(org.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                          org.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/organizations/${org.id}`}
                          className="p-2 rounded-xl border border-slate-200 dark:border-[#161B26] hover:bg-slate-100 dark:hover:bg-[#151A26] text-slate-500 dark:text-slate-400 hover:text-[#4B52DC] dark:hover:text-white transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => toggleStatus(org.id, org.status)}
                          className="p-2 rounded-xl border border-slate-200 dark:border-[#161B26] hover:bg-slate-100 dark:hover:bg-[#151A26] text-slate-500 dark:text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Toggle Active/Inactive"
                        >
                          <Slash className="w-4 h-4 transform rotate-90" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onboarding Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
          <div className="relative w-full max-w-2xl bg-[#0B0E14] border border-[#161B26] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 animate-fade-in hover:border-indigo-500/20 transition-colors duration-300">
            <button
              onClick={resetWizard}
              className="absolute top-6 right-6 p-1.5 rounded-xl text-slate-450 hover:text-white hover:bg-[#121824] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="font-title font-extrabold text-xl text-white">Register Organization</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Complete the onboarding profile to seed a new client environment.
                </p>
              </div>
            </div>

            {wizardError && (
              <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-900/40 text-red-200 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{wizardError}</span>
              </div>
            )}

            {/* Form: Profile Details */}
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Organization Name*"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#0F1422] border border-[#161B26] focus:border-[#4B52DC] text-white placeholder-slate-600 outline-none text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Unique Code*"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#0F1422] border border-[#161B26] focus:border-[#4B52DC] text-white placeholder-slate-600 outline-none text-xs font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <input
                    type="email"
                    placeholder="Contact Email*"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#0F1422] border border-[#161B26] focus:border-[#4B52DC] text-white placeholder-slate-600 outline-none text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="px-3 py-3 rounded-2xl bg-[#0F1422] border border-[#161B26] focus:border-[#4B52DC] text-white outline-none text-xs font-semibold cursor-pointer"
                    >
                      <option value="+91">IN (+91)</option>
                      <option value="+1">US (+1)</option>
                      <option value="+44">UK (+44)</option>
                      <option value="+61">AU (+61)</option>
                      <option value="+977">NP (+977)</option>
                      <option value="+880">BD (+880)</option>
                      <option value="+971">AE (+971)</option>
                      <option value="+65">SG (+65)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Phone Number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-2xl bg-[#0F1422] border border-[#161B26] focus:border-[#4B52DC] text-white placeholder-slate-600 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Logo Image Upload */}
              <div className="rounded-2xl bg-[#0F1422] border border-[#161B26] px-4 py-3 focus-within:border-[#4B52DC] transition-all flex items-center justify-between gap-3 relative">
                <div className="flex-1 min-w-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Logo Image (Optional)
                  </label>
                  <div className="flex items-center gap-3 mt-1.5">
                    {logo ? (
                      <div className="w-8 h-8 rounded bg-[#0B0E14] border border-[#161B26] overflow-hidden flex items-center justify-center shrink-0">
                        <img src={logo} alt="Logo Preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded bg-[#151A26] flex items-center justify-center shrink-0 text-slate-500">
                        <Building className="w-4 h-4" />
                      </div>
                    )}
                    <label className="flex items-center gap-1.5 px-3 py-1 bg-[#121824] hover:bg-[#151A26] border border-[#161B26] text-slate-300 font-title text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm">
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
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo("")}
                        className="font-title text-[11px] font-bold text-red-500 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-slate-500 font-title text-[11px] font-semibold max-w-[40%] text-right truncate">
                  {logo ? "Logo Selected" : "No image selected"}
                </div>
              </div>

              <div className="space-y-1">
                <textarea
                  placeholder="Address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#0F1422] border border-[#161B26] focus:border-[#4B52DC] text-white placeholder-slate-600 outline-none text-xs font-semibold resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#161B26]/60">
                <button
                  type="button"
                  onClick={resetWizard}
                  className="px-5 py-2.5 text-slate-450 hover:text-white text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wizardLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#4B52DC] to-[#7C3AED] hover:from-[#3f47d9] hover:to-[#6d28d9] text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all text-xs disabled:opacity-50 uppercase tracking-wider"
                >
                  {wizardLoading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
