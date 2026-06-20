import { create } from "zustand";

interface User {
  id: string;
  email: string;
  role: string;
  name: string;
  profilePicture?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, rememberMe?: boolean) => void;
  clearAuth: () => void;
  checkAuth: () => void;
}

const decodeToken = (token: string): User | null => {
  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    if (payload.exp * 1000 < Date.now()) {
      return null;
    }

    if (payload.role !== "PARIKSHYA_ADMIN") {
      return null;
    }

    const localProfilePic = localStorage.getItem("parikshya_admin_profile_picture") || undefined;

    return {
      id: payload.id,
      email: payload.userId,
      role: payload.role,
      name: "Parikshya Admin User",
      profilePicture: localProfilePic,
    };
  } catch (e) {
    return null;
  }
};

const getStoredToken = () => {
  return localStorage.getItem("parikshya_admin_token") || sessionStorage.getItem("parikshya_admin_token");
};

export const useAuthStore = create<AuthState>((set) => ({
  token: getStoredToken(),
  user: null,
  setAuth: (token: string, rememberMe = false) => {
    if (rememberMe) {
      localStorage.setItem("parikshya_admin_token", token);
    } else {
      sessionStorage.setItem("parikshya_admin_token", token);
    }
    const user = decodeToken(token);
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem("parikshya_admin_token");
    sessionStorage.removeItem("parikshya_admin_token");
    set({ token: null, user: null });
  },
  checkAuth: () => {
    const token = getStoredToken();
    if (token) {
      const user = decodeToken(token);
      if (user) {
        set({ token, user });
      } else {
        localStorage.removeItem("parikshya_admin_token");
        sessionStorage.removeItem("parikshya_admin_token");
        set({ token: null, user: null });
      }
    }
  },
}));
