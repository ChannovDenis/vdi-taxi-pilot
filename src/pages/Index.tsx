import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import DashboardScreen from "@/components/DashboardScreen";
import SessionScreen from "@/components/SessionScreen";
import SessionEndScreen from "@/components/SessionEndScreen";
import AdminScreen from "@/components/AdminScreen";
import ProfileScreen from "@/components/ProfileScreen";
import OnboardingScreen from "@/components/OnboardingScreen";

type Screen = "login" | "onboarding" | "dashboard" | "session" | "sessionEnd" | "admin" | "profile";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("login");
  const [activeSlot, setActiveSlot] = useState("Perplexity Max #1");
  const [firstLogin, setFirstLogin] = useState(true);

  const handleLogin = () => {
    if (firstLogin) {
      setScreen("onboarding");
    } else {
      setScreen("dashboard");
    }
  };

  const handleOnboardingComplete = () => {
    setFirstLogin(false);
    setScreen("dashboard");
  };

  const handleBook = (slotName: string) => {
    setActiveSlot(slotName);
    setScreen("session");
  };

  switch (screen) {
    case "login":
      return <LoginScreen onLogin={handleLogin} />;
    case "onboarding":
      return <OnboardingScreen onComplete={handleOnboardingComplete} />;
    case "dashboard":
      return (
        <DashboardScreen
          onBook={handleBook}
          onAdmin={() => setScreen("admin")}
          onLogout={() => setScreen("login")}
          onProfile={() => setScreen("profile")}
        />
      );
    case "session":
      return <SessionScreen slotName={activeSlot} onEnd={() => setScreen("sessionEnd")} />;
    case "sessionEnd":
      return <SessionEndScreen slotName={activeSlot} onBack={() => setScreen("dashboard")} />;
    case "admin":
      return <AdminScreen onBack={() => setScreen("dashboard")} />;
    case "profile":
      return <ProfileScreen onBack={() => setScreen("dashboard")} />;
  }
};

export default Index;
