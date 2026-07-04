import React from "react";
import { AuthFormSplitScreen } from "./ui/login";
import { Sparkles } from "lucide-react";

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
    } catch (e) {
      throw new Error("Server returned an invalid response. Please ensure your backend server has been restarted.");
    }
    
    if (!res.ok) {
      throw new Error(result.error || "Authentication failed.");
    }
    
    if (isForgot) {
      return result; // return early, don't login automatically
    }
    
    onLogin(result.user);
  };

  return (
    <AuthFormSplitScreen
      logo={
        <img 
          src="/shore_logo.png" 
          alt="SHORE.ed" 
          className="h-14 w-auto object-contain -ml-3" 
        />
      }
      title="Welcome back!"
      description="Sign in by entering the information below"
      images={["/shore1.jpg", "/shore2.jpg", "/shore3.jpg"]}
      onSubmit={handleLogin}
      forgotPasswordHref="#"
      createAccountHref="#"
    />
  );
}
