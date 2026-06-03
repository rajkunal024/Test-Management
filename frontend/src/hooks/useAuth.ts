import { useMutation } from "@tanstack/react-query";
import { login } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { LoginRequest } from "../types";

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginRequest) => login(payload),
    onSuccess: (auth) => setAuth(auth),
  });
};
