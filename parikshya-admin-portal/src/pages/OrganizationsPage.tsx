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
  orgType?: "School" | "College";
  lmsEnabled?: boolean;
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
  const [brandingBannerText, setBrandingBannerText] = useState("Welcome to Parikshya Online Testing Portal");
  const [brandingColor, setBrandingColor] = useState("#4B52DC");
  const [orgType, setOrgType] = useState<"School" | "College">("School");
  const [lmsEnabled, setLmsEnabled] = useState(false);

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

      const response = await api.post("/questions/upload-image", formData, {
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
    setBrandingBannerText("Welcome to Parikshya Online Testing Portal");
    setBrandingColor("#4B52DC");
    setOrgType("School");
    setLmsEnabled(false);
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
        name: name.trim(),
        code: code.trim().toUpperCase(),
        logo,
        contactEmail: contactEmail.trim(),
        phone: phone.trim() ? `${countryCode} ${phone.trim()}` : "",
        address: address.trim(),
        status: "Active",
        brandingBannerText,
        brandingColor,
        orgType,
        lmsEnabled
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

  const toggleLms = async (orgId: string, currentLmsState: boolean) => {
    const nextLms = !currentLmsState;
    try {
      const response = await api.put(`/organizations/${orgId}`, { lmsEnabled: nextLms });
      if (response.data.success) {
        setOrganizations((prev) =>
          prev.map((org) => (org.id === orgId ? { ...org, lmsEnabled: nextLms } : org))
        );
      }
    } catch (err) {
      console.error("Error toggling LMS feature:", err);
      alert("Failed to update LMS feature setting.");
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
                  <th className="px-6 py-4 text-center">Type</th>
                  <th className="px-6 py-4 text-center">LMS Feature</th>
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
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        org.orgType === "College"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      }`}>
                        {org.orgType || "School"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleLms(org.id, Boolean(org.lmsEnabled))}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer transition ${
                          org.lmsEnabled
                            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25 hover:bg-teal-500/20"
                            : "bg-slate-500/10 text-slate-400 dark:text-slate-500 border-slate-500/20 hover:bg-slate-500/20"
                        }`}
                        title="Click to toggle LMS feature"
                      >
                        {org.lmsEnabled ? "LMS Active" : "Disabled"}
                      </button>
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
        <div className="tenant-v2-overlay">
          <div className="tenant-v2-modal animate-fade-in">
            <aside className="tenant-v2-side">
              <div className="tenant-v2-side-badge">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <span className="tenant-v2-kicker">New tenant</span>
                <h3>Launch a tenant workspace</h3>
                <p>
                  Add the organization identity, contact details, logo, and first visual branding in one flow.
                </p>
              </div>
              <div className="tenant-v2-checklist">
                <div><span>01</span><b>Identity</b><small>Name, code, and tenant type</small></div>
                <div><span>02</span><b>Contact</b><small>Email, phone, and address</small></div>
                <div><span>03</span><b>Branding</b><small>Logo, banner, and primary color</small></div>
              </div>
            </aside>

            <section className="tenant-v2-main">
              <button type="button" onClick={resetWizard} className="tenant-v2-close" aria-label="Close register tenant form">
                <X className="w-5 h-5" />
              </button>

              <header className="tenant-v2-header">
                <span>Tenant registration</span>
                <h2>Register organization</h2>
                <p>Create a ready-to-use environment for a school or college.</p>
              </header>

              {wizardError && (
                <div className="tenant-v2-error">
                  <ShieldAlert className="w-5 h-5" />
                  <span>{wizardError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="tenant-v2-form">
                <section className="tenant-v2-section">
                  <div className="tenant-v2-section-head">
                    <span>01</span>
                    <div>
                      <b>Organization identity</b>
                      <small>These details identify the tenant across the portal.</small>
                    </div>
                  </div>

                  <div className="tenant-v2-grid">
                    <label className="tenant-v2-field" htmlFor="tenant-name">
                      <span>Organization name <em>*</em></span>
                      <input
                        id="tenant-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </label>

                    <label className="tenant-v2-field" htmlFor="tenant-code">
                      <span>Organization code <em>*</em></span>
                      <input
                        id="tenant-code"
                        type="text"
                        required
                        maxLength={20}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                      />
                    </label>

                    <label className="tenant-v2-field full" htmlFor="tenant-type">
                      <span>Organization type <em>*</em></span>
                      <select
                        id="tenant-type"
                        value={orgType}
                        onChange={(e) => setOrgType(e.target.value as "School" | "College")}
                      >
                        <option value="School">School</option>
                        <option value="College">College</option>
                      </select>
                    </label>

                    <div className="tenant-v2-field full mt-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">Learning Management System (LMS)</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                            {orgType === "School"
                              ? "Allows school teachers to upload PDF notes and write text materials, and students to access course library."
                              : "Allows college teachers to upload documents, READMEs, HTML articles, and media resources for students."}
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                          <input
                            type="checkbox"
                            checked={lmsEnabled}
                            onChange={(e) => setLmsEnabled(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="tenant-v2-section">
                  <div className="tenant-v2-section-head">
                    <span>02</span>
                    <div>
                      <b>Contact profile</b>
                      <small>Primary administrator contact and registered address.</small>
                    </div>
                  </div>

                  <div className="tenant-v2-grid">
                    <label className="tenant-v2-field" htmlFor="tenant-email">
                      <span>Contact email <em>*</em></span>
                      <input
                        id="tenant-email"
                        type="email"
                        required
                        placeholder="admin@organization.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                      />
                    </label>

                    <label className="tenant-v2-field" htmlFor="tenant-phone">
                      <span>Phone number</span>
                      <div className="tenant-v2-phone-row">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          aria-label="Country code"
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
                          id="tenant-phone"
                          type="text"
                          inputMode="tel"
                          placeholder="98765 43210"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </label>

                    <label className="tenant-v2-field full" htmlFor="tenant-address">
                      <span>Registered address</span>
                      <textarea
                        id="tenant-address"
                        placeholder="Organization address"
                        rows={3}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section className="tenant-v2-section">
                  <div className="tenant-v2-section-head">
                    <span>03</span>
                    <div>
                      <b>Portal branding</b>
                      <small>Customize how this tenant appears after login.</small>
                    </div>
                  </div>

                  <div className="tenant-v2-logo-card">
                    <div className="tenant-v2-logo-preview">
                      {logo ? (
                        <img src={logo} alt="Logo Preview" />
                      ) : (
                        <Building className="w-6 h-6" />
                      )}
                    </div>
                    <div className="tenant-v2-logo-copy">
                      <b>Logo image</b>
                      <small>{logo ? "Logo selected for this tenant." : "Upload a square logo, under 5MB."}</small>
                    </div>
                    <div className="tenant-v2-logo-actions">
                      <label>
                        <ImageIcon className="w-4 h-4" />
                        <span>{uploadingLogo ? "Uploading..." : "Upload logo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                      </label>
                      {logo && (
                        <button type="button" onClick={() => setLogo("")}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="tenant-v2-field" htmlFor="tenant-banner">
                    <span>Welcome banner text</span>
                    <input
                      id="tenant-banner"
                      type="text"
                      placeholder="e.g. Welcome to Delhi Public School"
                      value={brandingBannerText}
                      onChange={(e) => setBrandingBannerText(e.target.value)}
                    />
                  </label>

                  <div className="tenant-v2-brand-card">
                    <div>
                      <b>Primary brand color</b>
                      <small>Used for highlights, buttons, and portal accents.</small>
                    </div>
                    <div className="tenant-v2-color-tools">
                      <div className="tenant-v2-presets">
                        {[
                          { hex: "#4B52DC", name: "Classic Indigo" },
                          { hex: "#10B981", name: "Emerald Green" },
                          { hex: "#F59E0B", name: "Amber Orange" },
                          { hex: "#EF4444", name: "Crimson Red" },
                          { hex: "#8B5CF6", name: "Violet Purple" },
                          { hex: "#06B6D4", name: "Cyan Teal" }
                        ].map((preset) => (
                          <button
                            key={preset.hex}
                            type="button"
                            onClick={() => setBrandingColor(preset.hex)}
                            title={preset.name}
                            className={brandingColor === preset.hex ? "active" : ""}
                            style={{ backgroundColor: preset.hex }}
                          />
                        ))}
                      </div>
                      <div className="tenant-v2-color-inputs">
                        <input
                          type="color"
                          value={brandingColor}
                          onChange={(e) => setBrandingColor(e.target.value)}
                          aria-label="Primary brand color"
                        />
                        <input
                          type="text"
                          maxLength={7}
                          value={brandingColor}
                          onChange={(e) => setBrandingColor(e.target.value)}
                          aria-label="Primary brand color hex code"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <footer className="tenant-v2-actions">
                  <button type="button" onClick={resetWizard}>
                    Cancel
                  </button>
                  <button type="submit" disabled={wizardLoading || uploadingLogo}>
                    {wizardLoading ? "Registering..." : "Register tenant"}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
