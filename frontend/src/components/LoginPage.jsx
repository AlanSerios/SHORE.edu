import React from "react";
import { AuthFormSplitScreen } from "./ui/login";

export default function LoginPage({ onLogin, pendingStudentOnboarding }) {
  const handleLogin = async (data, isRegister, isForgot = false) => {

    const endpoint = isForgot 
      ? "/api/users/reset-password" 
      : (isRegister ? "/api/users/register" : "/api/users/login");
      
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    
    let result;

    try {
      const text = await res.text();
      result = JSON.parse(text);
    } catch {
      throw new Error("Could not connect to server.");
    }
    
    if (!res.ok) {
      throw Object.assign(new Error(result.error || "Sign in failed."), { code: result.code, on_roster: result.on_roster });
    }
    
    if (isForgot) {
      return result; // return early, don't login automatically
    }
    
    if (isRegister) {
      return result;
    }

    await onLogin(result.user, result.token);
  };

  return (
    <AuthFormSplitScreen
      logo={
        <img 
          src="/shore_logo-264.webp"
          alt="SHORE.ed" 
          width="264"
          height="98"
          className="h-7 sm:h-8 w-auto object-contain mx-auto" 
        />
      }
      images={["/shore5.webp"]}
      onSubmit={handleLogin}
      onRegistrationComplete={onLogin}
      pendingStudentOnboarding={pendingStudentOnboarding}
    />
  );
}
