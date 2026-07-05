import { create } from "zustand";
import { AuthResponse, User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

const storedToken = localStorage.getItem("parikshya_token");
const storedUser = localStorage.getItem("parikshya_user");
const devToken = import.meta.env.VITE_DEV_AUTH_TOKEN as string | undefined;
const initialToken = storedToken ?? devToken ?? null;
const devUser: User = { name: "Alex Wando", role: "Admin" };

const readStoredUser = (): User | null => {
  if (!storedUser) return null;

  try {
    const parsed = JSON.parse(storedUser) as User;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    localStorage.removeItem("parikshya_user");
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: readStoredUser() ?? (initialToken ? devUser : null),
  setAuth: ({ token, user }) => {
    localStorage.setItem("parikshya_token", token);
    localStorage.setItem("parikshya_user", JSON.stringify(user));
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem("parikshya_token");
    localStorage.removeItem("parikshya_user");
    set({ token: null, user: null });
  },
}));
