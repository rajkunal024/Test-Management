import { create } from "zustand";
import { AuthResponse, User } from "../types";

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (auth: AuthResponse) => void;
  clearAuth: () => void;
}

const storedToken = localStorage.getItem("preproute_token");
const storedUser = localStorage.getItem("preproute_user");
const devToken = import.meta.env.VITE_DEV_AUTH_TOKEN as string | undefined;
const initialToken = storedToken ?? devToken ?? null;
const devUser: User = { name: "Alex Wando", role: "Admin" };

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  user: storedUser ? (JSON.parse(storedUser) as User) : initialToken ? devUser : null,
  setAuth: ({ token, user }) => {
    localStorage.setItem("preproute_token", token);
    localStorage.setItem("preproute_user", JSON.stringify(user));
    set({ token, user });
  },
  clearAuth: () => {
    localStorage.removeItem("preproute_token");
    localStorage.removeItem("preproute_user");
    set({ token: null, user: null });
  },
}));
