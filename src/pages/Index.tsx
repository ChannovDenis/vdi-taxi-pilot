import { useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import DashboardScreen from "@/components/DashboardScreen";
import SessionScreen from "@/components/SessionScreen";
import SessionEndScreen from "@/components/SessionEndScreen";
import AdminScreen from "@/components/AdminScreen";

type Screen = "login" | "dashboard" | "session" | "sessionEnd" | "admin";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("login");
  const [activeSlot, setActiveSlot] = useState("Perplexity Max #1");

  const handleBook = (slotName: string) => {
    setActiveSlot(slotName);
    setScreen("session");
  };

  switch (screen) {
    case "login":
      return <LoginScreen onLogin={() => setScreen("dashboard")} />;
    case "dashboard":
      return (
        <DashboardScreen
          onBook={handleBook}
          onAdmin={() => setScreen("admin")}
          onLogout={() => setScreen("login")}
        />
      );
    case "session":
      return <SessionScreen slotName={activeSlot} onEnd={() => setScreen("sessionEnd")} />;
    case "sessionEnd":
      return <SessionEndScreen slotName={activeSlot} onBack={() => setScreen("dashboard")} />;
    case "admin":
      return <AdminScreen onBack={() => setScreen("dashboard")} />;
  }
};

export default Index;
