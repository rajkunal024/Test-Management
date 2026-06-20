import React, { useRef } from "react";
import { useAuthStore } from "../store/authStore";
import { User, Mail, ShieldAlert, KeyRound, Clock, Laptop, Camera } from "lucide-react";

export const ProfilePage: React.FC = () => {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        localStorage.setItem("parikshya_admin_profile_picture", base64String);
        
        // Update Zustand auth store
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.setState({
            user: {
              ...currentUser,
              profilePicture: base64String
            }
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in text-slate-700 dark:text-slate-350">
      {/* Page Header */}
      <div>
        <h1 className="font-title font-extrabold text-2xl text-slate-900 dark:text-white tracking-tight">Profile Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 font-medium">
          Review your administrator account parameters and token keys.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Card: Summary */}
        <div className="p-6 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-3xl shadow-md text-center flex flex-col items-center justify-center space-y-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-24 h-24 rounded-full bg-indigo-500/5 blur-xl pointer-events-none" />
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div 
            onClick={handleAvatarClick}
            className="w-20 h-20 rounded-full flex items-center justify-center text-white border border-indigo-100/10 shadow-lg relative group cursor-pointer overflow-hidden bg-gradient-to-tr from-[#4B52DC] to-[#7C3AED]"
            title="Click to upload profile picture"
          >
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-350" />
            ) : (
              <span className="font-extrabold text-3xl select-none">PA</span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Camera className="w-6 h-6 text-white" />
            </div>
          </div>

          <div>
            <h3 className="font-title font-extrabold text-lg text-slate-950 dark:text-white leading-tight">
              {user?.name || "Parikshya Admin"}
            </h3>
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-[#4B52DC] dark:text-[#818CF8] text-[9px] font-extrabold uppercase tracking-wider mt-2 border border-indigo-500/10">
              {user?.role || "PARIKSHYA_ADMIN"}
            </span>
          </div>
        </div>

        {/* Right Card: Fields */}
        <div className="p-6 md:p-8 bg-white/60 dark:bg-[#0B0E14]/65 border border-slate-200/50 dark:border-[#161B26] rounded-3xl shadow-md md:col-span-2 space-y-6 backdrop-blur-md">
          <div className="space-y-4">
            <h3 className="font-title font-bold text-sm text-slate-950 dark:text-white pb-3 border-b border-slate-200/35 dark:border-[#161B26]/60 uppercase tracking-wider">
              Account Attributes
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-2xl space-y-1">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Admin Name
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                  {user?.name || "Parikshya Admin User"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-2xl space-y-1 min-w-0">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> Login Email
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white pt-1 font-mono break-all">
                  {user?.email || "admin@parikshya.com"}
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-2xl space-y-1">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" /> Authority Expiry
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                  24 hours (Renewable JWT)
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#0F1422] border border-slate-200/20 dark:border-[#161B26] rounded-2xl space-y-1">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Laptop className="w-3.5 h-3.5 text-indigo-500" /> Access Boundary
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                  Global Write / Database Read
                </p>
              </div>
            </div>
          </div>

          {/* Credentials Warning */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-500 text-xs leading-relaxed">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold flex items-center gap-1.5 uppercase tracking-wide">
                <KeyRound className="w-4 h-4 text-amber-500" /> Password Management
              </p>
              <p className="mt-1 opacity-90 text-[10px] leading-relaxed">
                To guarantee cluster security isolation, direct administrative credential updates are blocked on standard web consoles.
                Please interface with the server seeds console or DB parameters to update Parikshya Admin hashes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
