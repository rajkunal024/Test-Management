import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CreateEditTestPage } from "./pages/CreateEditTestPage";
import { AddQuestionsPage } from "./pages/AddQuestionsPage";
import { PreviewPublishPage } from "./pages/PreviewPublishPage";
import { AttemptTestPage } from "./pages/AttemptTestPage";
import { TestResultPage } from "./pages/TestResultPage";
import { MonitorTestPage } from "./pages/MonitorTestPage";

export const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route element={<ProtectedRoute />}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/tests/create" element={<CreateEditTestPage />} />
      <Route path="/tests/:id/edit" element={<CreateEditTestPage />} />
      <Route path="/tests/:id/questions" element={<AddQuestionsPage />} />
      <Route path="/tests/:id/preview" element={<PreviewPublishPage />} />
      <Route path="/tests/:id/monitor" element={<MonitorTestPage />} />
      <Route path="/tests/:id/attempt" element={<AttemptTestPage />} />
      <Route path="/tests/:id/result" element={<TestResultPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);
