import { useState } from "react";
import { LoginScreen } from "./LoginScreen";
import { RegisterScreen } from "./RegisterScreen";
import { ForgotPasswordScreen } from "./ForgotPasswordScreen";

type Screen = "login" | "register" | "forgot";

export function AuthStack({ onSkip }: { onSkip?: () => void }) {
  const [screen, setScreen] = useState<Screen>("login");

  if (screen === "register") {
    return <RegisterScreen onGoLogin={() => setScreen("login")} onSkip={onSkip} />;
  }
  if (screen === "forgot") {
    return <ForgotPasswordScreen onBack={() => setScreen("login")} />;
  }
  return (
    <LoginScreen
      onGoRegister={() => setScreen("register")}
      onGoForgot={() => setScreen("forgot")}
      onSkip={onSkip}
    />
  );
}
