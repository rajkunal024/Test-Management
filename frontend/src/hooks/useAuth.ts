import { useMutation } from "@tanstack/react-query";
import { loginStudent, loginTeacher, loginAdmin } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { LoginRequest } from "../types";

export const useLogin = () => {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginRequest) => {
      if (payload.role === "Student") {
        return loginStudent(payload);
      }
      if (payload.role === "Teacher") {
        return loginTeacher(payload);
      }
      if (payload.role === "Admin") {
        return loginAdmin(payload);
      }
      return loginStudent(payload);
    },
    onSuccess: (auth) => setAuth(auth),
  });
};
