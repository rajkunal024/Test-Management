import React, { useState } from "react";
import {
  Clock,
  ShieldCheck,
  HardDrive,
  AlertOctagon,
  Save,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  // Config state
  const [sessionTimeout, setSessionTimeout] = useState(
    Number(localStorage.getItem("settings_sessionTimeout")) || 30
  );
  const [auditLogging, setAuditLogging] = useState(
    localStorage.getItem("settings_auditLogging") !== "false"
  );
  const [maxUploadSize, setMaxUploadSize] = useState(
    Number(localStorage.getItem("settings_maxUploadSize")) || 10
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    localStorage.getItem("settings_maintenanceMode") === "true"
  );

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setSuccess(false);

    // Save to local storage
    localStorage.setItem("settings_sessionTimeout", String(sessionTimeout));
    localStorage.setItem("settings_auditLogging", String(auditLogging));
    localStorage.setItem("settings_maxUploadSize", String(maxUploadSize));
    localStorage.setItem("settings_maintenanceMode", String(maintenanceMode));

    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    }, 800);
  };

  const handleReset = () => {
    setSessionTimeout(30);
    setAuditLogging(true);
    setMaxUploadSize(10);
    setMaintenanceMode(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in text-slate-700 dark:text-slate-350">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-title font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">Platform Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
            Configure administrative timeouts, server logs, and maintenance overrides.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-slate-100 dark:bg-[#121824] hover:bg-slate-200 dark:hover:bg-[#151A26] border border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-[#4B52DC] hover:bg-[#3f47d9] text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 uppercase tracking-wider"
          >
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Saving...</span>
              </>
            ) : success ? (
              <>
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-450" />
                <span>Saved Settings</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 md:p-8 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-3xl shadow-md space-y-6 backdrop-blur-md">
        {/* Session Timeout setting */}
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-slate-200/40 dark:border-[#161B26]/60">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <Clock className="w-4.5 h-4.5 text-indigo-500" />
              Inactivity Session Timeout
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-450 leading-normal max-w-md">
              Automatically logout Parikshya Admin profiles after specific idle periods in the console.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(Math.max(5, Number(e.target.value)))}
              className="w-20 px-3 py-2 bg-slate-50 dark:bg-[#0F1422] border border-slate-200 dark:border-[#161B26] rounded-xl text-center text-slate-900 dark:text-white outline-none focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 text-xs font-bold"
              min={5}
            />
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">mins</span>
          </div>
        </div>

        {/* Audit logging */}
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-slate-200/40 dark:border-[#161B26]/60">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-4.5 h-4.5 text-indigo-500" />
              Audit Trail Logging
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-455 leading-normal max-w-md">
              Record write events, metadata adjustments, and boundary policy switches to global audits.
            </p>
          </div>
          <button
            onClick={() => setAuditLogging(!auditLogging)}
            className={`rounded-full transition-colors relative cursor-pointer outline-none focus:outline-none shrink-0 ${
              auditLogging ? "bg-[#4B52DC]" : "bg-slate-300 dark:bg-slate-800"
            }`}
            style={{ width: "44px", height: "24px" }}
          >
            <span
              className={`block rounded-full bg-white shadow transform transition-transform duration-200 absolute top-0.5 left-0.5 ${
                auditLogging ? "translate-x-5" : "translate-x-0"
              }`}
              style={{ width: "20px", height: "20px" }}
            />
          </button>
        </div>

        {/* Attachment limit sizes */}
        <div className="flex items-start justify-between gap-6 pb-6 border-b border-slate-200/40 dark:border-[#161B26]/60">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <HardDrive className="w-4.5 h-4.5 text-indigo-500" />
              Max Client Logo Size
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-455 leading-normal max-w-md">
              Define the maximum payload boundary for base64 logo image files.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="number"
              value={maxUploadSize}
              onChange={(e) => setMaxUploadSize(Math.max(1, Number(e.target.value)))}
              className="w-20 px-3 py-2 bg-slate-50 dark:bg-[#0F1422] border border-slate-200 dark:border-[#161B26] rounded-xl text-center text-slate-900 dark:text-white outline-none focus:border-[#4B52DC] focus:ring-1 focus:ring-[#4B52DC]/20 text-xs font-bold"
              min={1}
            />
            <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">MB</span>
          </div>
        </div>

        {/* Maintenance mode */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase tracking-wide">
              <AlertOctagon className="w-4.5 h-4.5 text-indigo-500" />
              Maintenance Lock Mode
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-455 leading-normal max-w-md">
              Temporarily restrict client access for student tests and teacher portals. Only global administrators can login.
            </p>
          </div>
          <button
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            className={`rounded-full transition-colors relative cursor-pointer outline-none focus:outline-none shrink-0 ${
              maintenanceMode ? "bg-red-600" : "bg-slate-300 dark:bg-slate-800"
            }`}
            style={{ width: "44px", height: "24px" }}
          >
            <span
              className={`block rounded-full bg-white shadow transform transition-transform duration-200 absolute top-0.5 left-0.5 ${
                maintenanceMode ? "translate-x-5" : "translate-x-0"
              }`}
              style={{ width: "20px", height: "20px" }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
