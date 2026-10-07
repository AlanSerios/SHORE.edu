import React from "react";
import { AuthFormSplitScreen } from "./ui/login";

export default function LoginPage({ onLogin }) {
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
    
    if (result.token) {
      localStorage.setItem('shore_token', result.token);
    }

    onLogin(result.user, result.token);
  };

  return (
    <AuthFormSplitScreen
      logo={
        <img 
          src="/shore_logo.png" 
          alt="SHORE.ed" 
          className="h-7 sm:h-8 w-auto object-contain mx-auto" 
        />
      }
      images={["/SHORE5.png"]}
      onSubmit={handleLogin}
    />
  );
}
