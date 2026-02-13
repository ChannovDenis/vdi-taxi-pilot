import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginScreen from "@/components/LoginScreen";
import OnboardingScreen from "@/components/OnboardingScreen";
import DashboardScreen from "@/components/DashboardScreen";
import SessionScreen from "@/components/SessionScreen";
import SessionEndScreen from "@/components/SessionEndScreen";
import AdminScreen from "@/components/AdminScreen";
import ProfileScreen from "@/components/ProfileScreen";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/session/:slotId" element={<SessionScreen />} />
          <Route path="/session/:slotId/end" element={<SessionEndScreen />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
