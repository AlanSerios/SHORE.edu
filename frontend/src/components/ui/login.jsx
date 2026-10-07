import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "./button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "./form";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import {
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  KeyRound,
} from "lucide-react";

const formSchema = z.object({
  name: z.string().optional(),
  email: z.string()
    .min(3, { message: "Enter at least 3 characters." }),
  pin: z.string().optional(),
  password: z.string().optional(),
  confirmPassword: z.string().optional(),
  rememberMe: z.boolean().default(false).optional(),
  role: z.enum(["student", "volunteer"]).default("student").optional(),
});

export function evaluatePasswordSecurity(pass) {
  const p = pass || "";
  const hasMinLength = p.length >= 8;
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSpecial = /[^a-zA-Z0-9]/.test(p);

  const criteria = [
    { id: "length", label: "Min. 8 chars", met: hasMinLength },
    { id: "cases", label: "Upper & lowercase", met: hasUpper && hasLower },
    { id: "number", label: "Number (0-9)", met: hasNumber },
    { id: "special", label: "Special symbol", met: hasSpecial },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const isSecure = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  let label = "Too Short";
  let color = "bg-rose-500";
  let textColor = "text-rose-500";

  if (!p) {
    label = "None";
    color = "bg-muted";
    textColor = "text-muted-foreground";
  } else if (isSecure) {
    label = p.length >= 12 ? "Excellent" : "Strong";
    color = "bg-teal-500";
    textColor = "text-teal-600 dark:text-teal-400";
  } else if (metCount === 3) {
    label = "Good";
    color = "bg-emerald-500";
    textColor = "text-emerald-600 dark:text-emerald-400";
  } else if (metCount === 2) {
    label = "Fair";
    color = "bg-amber-500";
    textColor = "text-amber-600 dark:text-amber-400";
  } else {
    label = "Weak";
    color = "bg-rose-500";
    textColor = "text-rose-500";
  }

  return {
    hasMinLength,
    hasUpper,
    hasLower,
    hasUpperAndLower: hasUpper && hasLower,
    hasNumber,
    hasSpecial,
    criteria,
    metCount,
    isSecure,
    label,
    color,
    textColor,
    score: isSecure ? 4 : Math.min(3, metCount),
  };
}

function PasswordStrengthMeter({ security }) {
  if (!security) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      style={{ transformOrigin: "top" }}
      className="space-y-2 rounded-xl border border-border bg-slate-50/70 dark:bg-slate-900/50 p-2.5 sm:p-3"
    >
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">Password strength</span>
        <span className={`font-bold ${security.textColor}`}>{security.label}</span>
      </div>
      <div
        className="grid h-1.5 grid-cols-4 gap-1"
        role="progressbar"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={security.score}
      >
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`rounded-full transition-colors duration-200 ${
              security.score >= step ? security.color : "bg-border"
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5 text-xs">
        {security.criteria.map((crit) => (
          <div key={crit.id} className="flex items-center gap-1.5">
            {crit.met ? (
              <motion.span
                key="met"
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="inline-flex shrink-0"
              >
                <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
              </motion.span>
            ) : (
              <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded-full border border-border" />
            )}
            <span
              className={`transition-colors duration-150 ${
                crit.met ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
              }`}
            >
              {crit.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// 4-Digit Discrete Security PIN Input with Auto-Advance, Backspace Step-Back, Paste & Show/Hide Toggle
function PinInput({
  value = "",
  onChange,
  disabled = false,
  error = false,
  large = false,
  id,
  showToggle = true,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}) {
  const [showDigits, setShowDigits] = React.useState(false);
  const inputRefs = React.useRef([]);

  const shouldReduceMotion = useReducedMotion();

  const digits = React.useMemo(() => {
    const val = (value || "").replace(/\D/g, "").slice(0, 4);

    return [val[0] || "", val[1] || "", val[2] || "", val[3] || ""];
  }, [value]);

  const handleChange = (index, e) => {
    const rawVal = e.target.value.replace(/\D/g, "");

    if (!rawVal) {
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));

      return;
    }

    if (rawVal.length > 2) {
      const pasted = rawVal.slice(0, 4);
      onChange(pasted);
      const nextIdx = Math.min(pasted.length, 3);
      inputRefs.current[nextIdx]?.focus();

      return;
    }

    const char = rawVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join("");
    onChange(combined);

    if (index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const prevIdx = index - 1;
        const newDigits = [...digits];
        newDigits[prevIdx] = "";
        onChange(newDigits.join(""));
        inputRefs.current[prevIdx]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);

    if (pasted) {
      onChange(pasted);
      const nextIdx = Math.min(pasted.length - 1, 3);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-2">
      <motion.div
        animate={error && !shouldReduceMotion ? { x: [-3, 3, -2, 2, 0] } : { x: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full flex items-center justify-center gap-2.5 sm:gap-3 py-0.5"
        role="group"
        aria-label="4-digit security PIN"
      >
        {[0, 1, 2, 3].map((idx) => {
          const isFilled = Boolean(digits[idx]);

          return (
            <input
              key={idx}
              id={id ? `${id}-${idx + 1}` : undefined}
              ref={(el) => (inputRefs.current[idx] = el)}
              type={showDigits ? "text" : "password"}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={digits[idx]}
              onFocus={(e) => e.target.select()}
              onChange={(e) => handleChange(idx, e)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              disabled={disabled}
              aria-label={`Security PIN digit ${idx + 1}`}
              aria-describedby={ariaDescribedBy}
              aria-invalid={ariaInvalid}
              className={`${
                large ? "h-12 w-12 sm:h-13 sm:w-13 text-xl sm:text-2xl" : "h-10 w-10 sm:h-11 sm:w-11 text-lg"
              } text-center font-mono font-bold rounded-xl border-2 transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out active:scale-95 outline-none select-none ${
                disabled
                  ? "bg-muted/10 border-border text-muted-foreground opacity-60 cursor-not-allowed"
                  : "cursor-text"
              } ${
                error
                  ? "border-rose-500 bg-rose-50/80 text-rose-600 focus:ring-4 focus:ring-rose-500/15"
                  : isFilled
                  ? "border-primary bg-accentBlue text-primary shadow-xs scale-[1.02]"
                  : "border-border bg-card text-foreground hover:border-borderHover scale-100"
              } focus:border-primary focus:ring-4 focus:ring-primary/20 focus:bg-card`}
            />
          );
        })}
      </motion.div>
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowDigits(!showDigits)}
          className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors px-2 py-0.5 rounded-md hover:bg-muted/10 cursor-pointer select-none"
        >
          {showDigits ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide digits</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Show digits</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

function AnimatedHeightContainer({ children, className = "" }) {
  const containerRef = React.useRef(null);
  const [height, setHeight] = React.useState("auto");
  const shouldReduceMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) {
        const measuredHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;

        if (measuredHeight > 0) {
          setHeight(measuredHeight);
        }
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      animate={{ height }}
      transition={{
        duration: shouldReduceMotion ? 0 : 0.28,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`overflow-hidden relative w-full p-1 -m-1 ${className}`}
      style={{ boxSizing: "content-box", willChange: "height" }}
    >
      <div ref={containerRef} className="relative w-full">
        {children}
      </div>
    </motion.div>
  );
}

export function AuthFormSplitScreen({
  logo,
  images = [],
  onSubmit,
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isRegister, setIsRegister] = React.useState(false);
  const [registrationStep, setRegistrationStep] = React.useState(1);
  const [stepDirection, setStepDirection] = React.useState(1);
  const [isForgot, setIsForgot] = React.useState(false);
  const [forgotStep, setForgotStep] = React.useState(1);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [lockoutSeconds, setLockoutSeconds] = React.useState(0);
  const formElementRef = React.useRef(null);
  const registrationHeadingRef = React.useRef(null);
  const registrationFocusRef = React.useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Carousel timer
  React.useEffect(() => {
    if (images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [images.length]);

  // Shoulder-surfing protection: auto-conceal revealed password after 20 seconds
  React.useEffect(() => {
    if (!showPassword) return;
    const timer = setTimeout(() => setShowPassword(false), 20000);

    return () => clearTimeout(timer);
  }, [showPassword]);

  // Security Lockout interval countdown
  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;

    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      name: "",
      email: "",
      pin: "",
      password: "",
      confirmPassword: "",
      rememberMe: false,
      role: "student",
    },
  });

  // Remember Me: Load saved credentials on mount
  React.useEffect(() => {
    try {
      const isRemembered = localStorage.getItem('shore_remember_me') === 'true';
      const savedEmail = localStorage.getItem('shore_saved_email');

      if (isRemembered && savedEmail) {
        form.setValue("email", savedEmail);
        form.setValue("rememberMe", true);
      }
    } catch (e) {
      console.warn("Could not read remembered credentials:", e);
    }
  }, [form]);

  const watchPassword = form.watch("password") || "";
  const watchConfirmPassword = form.watch("confirmPassword") || "";
  const passwordSecurity = React.useMemo(() => evaluatePasswordSecurity(watchPassword), [watchPassword]);
  const passwordsMatch = watchPassword && watchConfirmPassword ? watchPassword === watchConfirmPassword : true;

  React.useEffect(() => {
    if (passwordsMatch && form.formState.errors.confirmPassword?.message === "Passwords do not match") {
      form.clearErrors("confirmPassword");
    }
  }, [passwordsMatch, form]);

  React.useEffect(() => {
    if (passwordSecurity.isSecure && form.formState.errors.password) {
      form.clearErrors("password");
    }
  }, [passwordSecurity.isSecure, form]);

  const watchPin = form.watch("pin") || "";

  React.useEffect(() => {
    if (watchPin.length === 4 && form.formState.errors.pin) {
      form.clearErrors("pin");
    }
  }, [watchPin, form]);

  React.useEffect(() => {
    if (!isRegister || !registrationFocusRef.current) return;

    const timer = setTimeout(() => {
      const field = registrationFocusRef.current;
      registrationFocusRef.current = null;

      if (field === "heading") registrationHeadingRef.current?.focus();
      else if (field === "pin") formElementRef.current?.querySelector('[aria-label="Security PIN digit 1"]')?.focus();
      else form.setFocus(field);
    }, 150);

    return () => clearTimeout(timer);
  }, [isRegister, registrationStep, form]);

  const handleRegistrationStep1Continue = async () => {
    form.clearErrors("root");
    const rawName = form.getValues("name")?.trim();
    const username = form.getValues("email")?.trim();

    if (!rawName) {
      form.setError("name", { type: "manual", message: "Enter your full name." });
    } else {
      form.setValue("name", rawName);
      form.clearErrors("name");
    }

    const usernameValid = /^[a-zA-Z0-9._-]{3,32}$/.test(username || "");

    if (!usernameValid) {
      form.setError("email", { type: "manual", message: "Username must be 3–32 letters, numbers, dots, or hyphens." });
    } else {
      form.setValue("email", username.toLowerCase());
      form.clearErrors("email");
    }

    if (!rawName || !usernameValid) {
      if (!rawName) form.setFocus("name");
      else form.setFocus("email");

      return;
    }

    setStepDirection(1);
    registrationFocusRef.current = "heading";
    setRegistrationStep(2);
  };

  const handleRegistrationStep2Continue = async () => {
    form.clearErrors(["password", "confirmPassword", "root"]);
    const password = form.getValues("password") || "";
    const confirmPassword = form.getValues("confirmPassword") || "";

    const security = evaluatePasswordSecurity(password);
    let hasError = false;

    if (!security.isSecure) {
      form.setError("password", {
        type: "manual",
        message: password ? "Password needs 8+ characters, uppercase, lowercase, number, and symbol." : "Create a password."
      });
      hasError = true;
    }

    if (!confirmPassword) {
      form.setError("confirmPassword", { type: "manual", message: "Confirm your password." });
      hasError = true;
    } else if (password !== confirmPassword) {
      form.setError("confirmPassword", { type: "manual", message: "Passwords do not match." });
      hasError = true;
    }

    if (hasError) {
      if (!security.isSecure) form.setFocus("password");
      else form.setFocus("confirmPassword");

      return;
    }

    setStepDirection(1);
    registrationFocusRef.current = "heading";
    setRegistrationStep(3);
  };

  const handleForgotStep1Continue = async () => {
    form.clearErrors(["email", "pin", "root"]);
    const rawEmail = (form.getValues("email") || "").trim();
    const pin = form.getValues("pin") || "";
    let hasError = false;

    if (!rawEmail) {
      form.setError("email", { type: "manual", message: "Enter your username." });
      hasError = true;
    } else if (rawEmail.length < 3) {
      form.setError("email", { type: "manual", message: "Enter at least 3 characters." });
      hasError = true;
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      form.setError("pin", { type: "manual", message: "Enter your 4-digit PIN." });
      hasError = true;
    }

    if (hasError) {
      if (!rawEmail || rawEmail.length < 3) form.setFocus("email");
      else {
        requestAnimationFrame(() => {
          formElementRef.current?.querySelector('[aria-label="Security PIN digit 1"]')?.focus();
        });
      }

      return;
    }

    setStepDirection(1);
    setForgotStep(2);
  };

  const handleFormSubmit = async (data) => {
    form.clearErrors();

    if (lockoutSeconds > 0) return;

    let hasValidationError = false;

    if (isRegister && !data.name?.trim()) {
      form.setError("name", { type: "manual", message: "Enter your full name." });
      hasValidationError = true;
    }

    if (!data.email?.trim()) {
      form.setError("email", { type: "manual", message: "Enter your username." });
      hasValidationError = true;
    }

    if (isRegister) {
      const security = evaluatePasswordSecurity(data.password);

      if (!security.isSecure) {
        form.setError("password", {
          type: "manual",
          message: data.password ? "Password needs 8+ characters, uppercase, lowercase, number, and symbol." : "Enter a password."
        });
        hasValidationError = true;
      }

      if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", { type: "manual", message: "Passwords do not match." });
        hasValidationError = true;
      }

      if (!data.pin || data.pin.length !== 4 || !/^\d{4}$/.test(data.pin)) {
        form.setError("pin", { type: "manual", message: "Enter a 4-digit PIN." });
        hasValidationError = true;
      }
    } else if (isForgot) {
      if (forgotStep === 1) {
        if (!data.pin || data.pin.length !== 4 || !/^\d{4}$/.test(data.pin)) {
          form.setError("pin", { type: "manual", message: "Enter your 4-digit PIN." });
          hasValidationError = true;
        }

        if (hasValidationError) {
          if (!data.email?.trim()) form.setFocus("email");
          else {
            requestAnimationFrame(() => {
              formElementRef.current?.querySelector('[aria-label="Security PIN digit 1"]')?.focus();
            });
          }

          return;
        }

        setStepDirection(1);
        setForgotStep(2);

        return;
      }

      // forgotStep === 2
      const security = evaluatePasswordSecurity(data.password);

      if (!security.isSecure) {
        form.setError("password", {
          type: "manual",
          message: data.password ? "Password needs 8+ characters, uppercase, lowercase, number, and symbol." : "Enter a password."
        });
        hasValidationError = true;
      }

      if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", { type: "manual", message: "Passwords do not match." });
        hasValidationError = true;
      }

      if (!data.pin || data.pin.length !== 4 || !/^\d{4}$/.test(data.pin)) {
        form.setError("pin", { type: "manual", message: "Enter your 4-digit PIN." });
        hasValidationError = true;
        setStepDirection(-1);
        setForgotStep(1);
      }
    } else if (!data.password) {
      form.setError("password", { type: "manual", message: "Enter your password." });
      hasValidationError = true;
    }

    if (hasValidationError) {
      const firstInvalid = ["name", "email", "password", "confirmPassword", "pin"]
        .find((field) => form.getFieldState(field).error);

      if (isRegister && ["name", "email"].includes(firstInvalid)) {
        registrationFocusRef.current = firstInvalid;
        setRegistrationStep(1);
      } else if (isRegister && ["password", "confirmPassword"].includes(firstInvalid)) {
        registrationFocusRef.current = firstInvalid;
        setRegistrationStep(2);
      } else if (isRegister && firstInvalid === "pin") {
        registrationFocusRef.current = "pin";
        setRegistrationStep(3);
      } else if (isForgot && ["email", "pin"].includes(firstInvalid)) {
        setStepDirection(-1);
        setForgotStep(1);
        requestAnimationFrame(() => {
          if (firstInvalid === "pin") formElementRef.current?.querySelector('[aria-label="Security PIN digit 1"]')?.focus();
          else form.setFocus(firstInvalid);
        });
      } else if (isForgot && ["password", "confirmPassword"].includes(firstInvalid)) {
        requestAnimationFrame(() => {
          form.setFocus(firstInvalid);
        });
      } else {
        requestAnimationFrame(() => {
          if (firstInvalid === "pin") formElementRef.current?.querySelector('[aria-label="Security PIN digit 1"]')?.focus();
          else if (firstInvalid) form.setFocus(firstInvalid);
        });
      }

      return;
    }

    setIsLoading(true);
    setSuccessMessage("");

    try {
      let finalEmail = data.email.trim();

      if (!finalEmail.includes("@")) {
        finalEmail = `${finalEmail}@shoreskwela.com`;
      }

      const authData = {
        ...data,
        email: finalEmail,
        new_password: isForgot ? data.password : undefined,
      };

      await onSubmit(authData, isRegister, isForgot);

      // Persist or clean up Remember Me
      try {
        if (data.rememberMe) {
          localStorage.setItem('shore_remember_me', 'true');
          localStorage.setItem('shore_saved_email', data.email.trim());
        } else {
          localStorage.removeItem('shore_remember_me');
          localStorage.removeItem('shore_saved_email');
        }
      } catch (err) {
        console.warn("Storage error for Remember Me:", err);
      }

      if (isForgot) {
        setSuccessMessage("Password reset. Sign in with your new password.");
        setIsForgot(false);
        setForgotStep(1);
        form.setValue("password", "");
        form.setValue("confirmPassword", "");
        form.setValue("pin", "");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      const msg = error.message || "Sign in failed.";

      if (isRegister && (error.code === "roster_name_mismatch" || /roster/i.test(msg))) {
        form.setError("name", { type: "manual", message: msg });
        registrationFocusRef.current = "name";
        setRegistrationStep(1);
      } else if (error.code === "account_not_found" || /no account/i.test(msg)) {
        form.setError("email", { type: "manual", message: msg });

        if (isRegister) {
          registrationFocusRef.current = "email";
          setRegistrationStep(1);
        } else {
          requestAnimationFrame(() => form.setFocus("email"));
        }
      } else if (error.code === "account_exists") {
        form.setError("email", { type: "manual", message: msg });

        if (isRegister) {
          registrationFocusRef.current = "email";
          setRegistrationStep(1);
        } else {
          requestAnimationFrame(() => form.setFocus("email"));
        }
      } else if (error.code === "invalid_password" || /password/i.test(msg)) {
        form.setError("password", { type: "manual", message: msg });

        if (isRegister) {
          registrationFocusRef.current = "password";
          setRegistrationStep(2);
        } else {
          requestAnimationFrame(() => form.setFocus("password"));
        }
      } else if (error.code === "invalid_pin" || /pin/i.test(msg)) {
        form.setError("pin", { type: "manual", message: msg });

        if (isRegister) {
          registrationFocusRef.current = "pin";
          setRegistrationStep(3);
        }
      } else {
        form.setError("root", { type: "manual", message: msg });
      }

      // Trigger security lock timer if brute-force lockout occurred
      if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("attempts") || error.retry_after) {
        const match = msg.match(/(\d+)\s*s/);
        const secs = error.retry_after || (match ? parseInt(match[1], 10) : 120);
        setLockoutSeconds(secs);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: shouldReduceMotion ? 0 : 8, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const stepVariants = {
    enter: (direction) => ({
      x: shouldReduceMotion ? 0 : direction > 0 ? 16 : -16,
      opacity: 0,
      filter: shouldReduceMotion ? "none" : "blur(2px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.24,
        ease: [0.16, 1, 0.3, 1],
      },
    },
    exit: (direction) => ({
      x: shouldReduceMotion ? 0 : direction > 0 ? -16 : 16,
      opacity: 0,
      filter: shouldReduceMotion ? "none" : "blur(2px)",
      transition: {
        duration: 0.18,
        ease: [0.16, 1, 0.3, 1],
      },
    }),
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col md:flex-row bg-background text-foreground overflow-x-hidden md:h-[100dvh] md:min-h-0 md:overflow-hidden">

      {/* Form panel */}
      <div className="flex-1 w-full md:w-1/2 min-h-[100dvh] md:h-full md:min-h-0 flex flex-col justify-center items-center p-3 sm:p-4 md:py-3.5 md:px-6 lg:py-5 lg:px-8 overflow-y-auto overscroll-contain">
        <div className="my-auto flex w-full flex-col justify-center max-w-[380px] py-1.5 sm:py-2">

          <div className="w-full bg-card border border-border/80 rounded-2xl sm:rounded-3xl shadow-sm p-3.5 sm:p-4.5 md:p-5">

            <div className={`${isRegister ? "mb-1.5" : "mb-2 sm:mb-2.5"} flex flex-col items-center text-center`}>
              {logo ? (
                <div className="mb-1 flex items-center justify-center">{logo}</div>
              ) : (
                <div className="mb-1 flex items-center justify-center gap-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-md shadow-primary/25 text-xs sm:text-sm">
                    S
                  </div>
                  <span className="text-base sm:text-lg font-black tracking-tight">SHORE<span className="text-primary">.ed</span></span>
                </div>
              )}
              <p className={`${isRegister ? "text-[11px] font-medium" : "text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider"} text-muted-foreground select-none`}>
                Student & Volunteer Portal
              </p>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3 sm:space-y-3.5"
            >
              <motion.div variants={itemVariants} className="text-center">
                <div className="relative min-h-[28px] sm:min-h-[32px] flex items-center justify-center">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.h1
                      key={isForgot ? `forgot-${forgotStep}` : isRegister ? `reg-${registrationStep}` : "login"}
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4, filter: shouldReduceMotion ? "none" : "blur(1px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 4, filter: shouldReduceMotion ? "none" : "blur(1px)" }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      ref={registrationHeadingRef}
                      tabIndex={isRegister || isForgot ? -1 : undefined}
                      className="text-lg sm:text-xl font-bold tracking-tight text-foreground"
                    >
                      {isForgot
                        ? (forgotStep === 1 ? "Verify Identity" : "Create New Password")
                        : isRegister
                        ? (registrationStep === 1
                            ? "Create your account"
                            : registrationStep === 2
                            ? "Create your password"
                            : "Emergency Security PIN")
                        : "Welcome Back"}
                    </motion.h1>
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false}>
                  {!isRegister && !isForgot && (
                    <motion.p
                      key="login-desc"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]"
                    >
                      Sign in to access attendance, scholarships, and progress tracker.
                    </motion.p>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {isForgot && (
                    <motion.div
                      key="forgot-step-progress"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden mt-1.5 space-y-1.5"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.p
                          key={`forgot-step-label-${forgotStep}`}
                          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 3 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="text-[11px] font-semibold text-muted-foreground"
                          aria-live="polite"
                        >
                          Step {forgotStep} of 2 · {forgotStep === 1 ? "Account & security PIN" : "New password"}
                        </motion.p>
                      </AnimatePresence>
                      <div className="w-full flex items-center gap-1.5 px-1" aria-hidden="true">
                        {[1, 2].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ease-out ${
                              step <= forgotStep ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"
                            }`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {isRegister && (
                    <motion.div
                      key="register-step-progress"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden mt-1.5 space-y-1.5"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.p
                          key={`step-label-${registrationStep}`}
                          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 3 }}
                          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                          className="text-[11px] font-semibold text-muted-foreground"
                          aria-live="polite"
                        >
                          Step {registrationStep} of 3 · {registrationStep === 1 ? "Your details" : registrationStep === 2 ? "Set password" : "Emergency PIN"}
                        </motion.p>
                      </AnimatePresence>
                      <div className="w-full flex items-center gap-1.5 px-1" aria-hidden="true">
                        {[1, 2, 3].map((step) => (
                          <div
                            key={step}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ease-out ${
                              step <= registrationStep ? "bg-primary" : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Security Lockout Banner */}
              {lockoutSeconds > 0 && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                    <span>Too many attempts.</span>
                  </div>
                  <span className="font-mono font-bold text-xs bg-amber-200/60 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                    {lockoutSeconds}s
                  </span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-semibold flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </motion.div>
              )}


              <Form {...form}>
                <form
                  ref={formElementRef}
                  noValidate
                  onSubmit={(event) => {
                    if (isRegister) {
                      if (registrationStep === 1) {
                        event.preventDefault();
                        void handleRegistrationStep1Continue();
                      } else if (registrationStep === 2) {
                        event.preventDefault();
                        void handleRegistrationStep2Continue();
                      } else {
                        void form.handleSubmit(handleFormSubmit)(event);
                      }
                    } else if (isForgot) {
                      if (forgotStep === 1) {
                        event.preventDefault();
                        void handleForgotStep1Continue();
                      } else {
                        void form.handleSubmit(handleFormSubmit)(event);
                      }
                    } else {
                      void form.handleSubmit(handleFormSubmit)(event);
                    }
                  }}
                  className="space-y-3 sm:space-y-3.5"
                >
                  {/* Dynamic Step Content with Auto-Animated Height */}
                  <AnimatedHeightContainer>
                    <AnimatePresence mode="popLayout" custom={stepDirection} initial={false}>
                      {isRegister ? (
                        <motion.div
                          key={`reg-step-${registrationStep}`}
                          custom={stepDirection}
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="w-full space-y-3 sm:space-y-3.5"
                        >
                        {registrationStep === 1 && (
                          <>
                            {/* Step 1: Account Type */}
                            <FormField
                              control={form.control}
                              name="role"
                              render={({ field }) => (
                                <fieldset className="space-y-1">
                                  <legend className="text-xs font-semibold text-foreground">Account type <span className="text-rose-600" aria-hidden="true">*</span></legend>
                                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-describedby="register-role-help">
                                    {[
                                      { value: "student", title: "Student" },
                                      { value: "volunteer", title: "Volunteer" },
                                    ].map((option) => (
                                      <label key={option.value} className={`relative flex min-h-[44px] cursor-pointer items-center rounded-xl border px-3 py-1.5 transition-[border-color,background-color] duration-150 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 ${field.value === option.value ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"}`}>
                                        <input
                                          type="radio"
                                          name={field.name}
                                          value={option.value}
                                          checked={field.value === option.value}
                                          onChange={() => field.onChange(option.value)}
                                          disabled={isLoading || lockoutSeconds > 0}
                                          className="sr-only"
                                        />
                                        <span className="min-w-0">
                                          <span className="block text-xs font-semibold text-foreground">{option.title}</span>
                                        </span>
                                        <span aria-hidden="true" className={`ml-auto h-3.5 w-3.5 shrink-0 rounded-full border transition-all duration-150 ${field.value === option.value ? "border-4 border-primary" : "border-muted-foreground/50"}`} />
                                      </label>
                                    ))}
                                  </div>
                                  <p id="register-role-help" className="text-[11px] leading-tight text-muted-foreground">Your name must match the SHORE {field.value === "volunteer" ? "volunteer" : "student"} roster.</p>
                                </fieldset>
                              )}
                            />

                            {/* Step 1: Full Name */}
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-xs font-semibold">Full name <span className="text-rose-600" aria-hidden="true">*</span></FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Juan Dela Cruz"
                                      {...field}
                                      autoComplete="name"
                                      autoCapitalize="words"
                                      required
                                      disabled={isLoading || lockoutSeconds > 0}
                                      className={`h-9.5 sm:h-10 text-xs sm:text-sm ${
                                        form.formState.errors.name ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/[0.02]" : ""
                                      }`}
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs pt-0.5" />
                                </FormItem>
                              )}
                            />

                            {/* Step 1: Account Username */}
                            <FormField
                              control={form.control}
                              name="email"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-xs font-semibold">Account username <span className="text-rose-600" aria-hidden="true">*</span></FormLabel>
                                  <FormControl>
                                    <div className="relative flex items-center">
                                      <Input
                                        placeholder="juandelacruz"
                                        {...field}
                                        autoComplete="username"
                                        autoCapitalize="none"
                                        spellCheck={false}
                                        maxLength={32}
                                        required
                                        disabled={isLoading || lockoutSeconds > 0}
                                        className={`h-9.5 sm:h-10 text-xs sm:text-sm pr-[135px] ${
                                          form.formState.errors.email ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/[0.02]" : ""
                                        }`}
                                      />
                                      <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none select-none">
                                        @shoreskwela.com
                                      </span>
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-xs leading-4">This will be your sign-in username.</FormDescription>
                                  <FormMessage className="text-xs pt-0.5" />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {registrationStep === 2 && (
                          <>
                            {/* Step 2: Password */}
                            <FormField
                              control={form.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-xs font-semibold">
                                    Password <span className="text-rose-600" aria-hidden="true">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a password"
                                        {...field}
                                        autoComplete="new-password"
                                        disabled={isLoading || lockoutSeconds > 0}
                                        className={`h-9.5 sm:h-10 pr-9 text-xs sm:text-sm ${
                                          form.formState.errors.password ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                      >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </FormControl>
                                  <FormMessage className="text-xs pt-0.5" />
                                </FormItem>
                              )}
                            />

                            {/* Real-time Password Security Rating & Checklist */}
                            <PasswordStrengthMeter security={passwordSecurity} />

                            {/* Confirm Password */}
                            <FormField
                              control={form.control}
                              name="confirmPassword"
                              render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <FormLabel className="text-xs font-semibold">
                                    Confirm password <span className="text-rose-600" aria-hidden="true">*</span>
                                  </FormLabel>
                                  <FormControl>
                                    <div className="relative">
                                      <Input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Repeat your password"
                                        {...field}
                                        autoComplete="new-password"
                                        disabled={isLoading || lockoutSeconds > 0}
                                        className={`h-9.5 sm:h-10 pr-9 text-xs sm:text-sm ${
                                          watchConfirmPassword && !passwordsMatch ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                      >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                      </button>
                                    </div>
                                  </FormControl>
                                  {watchConfirmPassword && passwordsMatch && (
                                    <p role="status" className="pt-0.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                      <Check className="w-3.5 h-3.5" /> Passwords match
                                    </p>
                                  )}
                                  {watchConfirmPassword && !passwordsMatch && !form.formState.errors.confirmPassword && (
                                    <p role="alert" className="pt-0.5 flex items-center gap-1.5 text-xs font-medium text-rose-500">
                                      Passwords do not match
                                    </p>
                                  )}
                                  <FormMessage className="text-xs pt-0.5" />
                                </FormItem>
                              )}
                            />
                          </>
                        )}

                        {registrationStep === 3 && (
                          <>
                            {/* Step 3: Emergency PIN Banner */}
                            <div className="rounded-xl border border-blue-200/80 bg-accentBlue/70 p-2.5 sm:p-3 text-xs flex items-start gap-2.5 shadow-2xs">
                              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-primary shrink-0 mt-0.5">
                                <KeyRound className="h-3.5 w-3.5" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="font-bold text-xs text-foreground">Why an Emergency PIN?</p>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                  Like an ATM backup code. Use this 4-digit PIN to unlock or reset your account if you forget your password.
                                </p>
                              </div>
                            </div>

                            {/* Step 3: 4-digit PIN */}
                            <FormField
                              control={form.control}
                              name="pin"
                              render={({ field }) => (
                                <FormItem className="space-y-2 text-center">
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <FormLabel className="text-xs font-semibold text-foreground">
                                      Create your 4-digit PIN <span className="text-rose-600" aria-hidden="true">*</span>
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">Pick 4 digits you will easily remember.</p>
                                  </div>
                                  <FormControl>
                                    <PinInput
                                      id="register-pin"
                                      value={field.value}
                                      onChange={field.onChange}
                                      disabled={isLoading || lockoutSeconds > 0}
                                      error={Boolean(form.formState.errors.pin)}
                                      large
                                    />
                                  </FormControl>
                                  <FormMessage className="text-xs pt-0.5 text-center justify-center" />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </motion.div>
                    ) : isForgot ? (
                      forgotStep === 1 ? (
                        <motion.div
                          key="forgot-step-1"
                          custom={stepDirection}
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="w-full space-y-3 sm:space-y-3.5"
                        >
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold">Account username</FormLabel>
                                <FormControl>
                                  <div className="relative flex items-center">
                                    <Input
                                      placeholder="juandelacruz"
                                      {...field}
                                      autoComplete="username"
                                      autoCapitalize="none"
                                      spellCheck={false}
                                      disabled={isLoading || lockoutSeconds > 0}
                                      className={`h-9.5 sm:h-10 text-xs sm:text-sm pr-[135px] ${
                                        form.formState.errors.email ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/[0.02]" : ""
                                      }`}
                                    />
                                    <span className="absolute right-3 text-xs text-muted-foreground pointer-events-none select-none">
                                      @shoreskwela.com
                                    </span>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs pt-0.5" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pin"
                            render={({ field }) => (
                              <FormItem className="space-y-2 text-center">
                                <div className="flex flex-col items-center justify-center gap-0.5">
                                  <FormLabel className="text-xs font-semibold text-foreground">
                                    4-digit security PIN
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">Enter the PIN you chose when creating your account.</p>
                                </div>
                                <FormControl>
                                  <PinInput
                                    id="reset-pin"
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isLoading || lockoutSeconds > 0}
                                    error={Boolean(form.formState.errors.pin)}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs pt-0.5 text-center justify-center" />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="forgot-step-2"
                          custom={stepDirection}
                          variants={stepVariants}
                          initial="enter"
                          animate="center"
                          exit="exit"
                          className="w-full space-y-3 sm:space-y-3.5"
                        >
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold">New Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="New password"
                                      {...field}
                                      autoComplete="new-password"
                                      disabled={isLoading || lockoutSeconds > 0}
                                      className={`h-9.5 sm:h-10 pr-9 text-xs sm:text-sm ${
                                        form.formState.errors.password ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                                      aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </FormControl>
                                <FormMessage className="text-xs pt-0.5" />
                              </FormItem>
                            )}
                          />

                          {/* Real-time Password Security Rating & Checklist for Reset */}
                          <PasswordStrengthMeter security={passwordSecurity} />

                          <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <FormLabel className="text-xs font-semibold">Confirm password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type={showConfirmPassword ? "text" : "password"}
                                      placeholder="Repeat your password"
                                      {...field}
                                      autoComplete="new-password"
                                      disabled={isLoading || lockoutSeconds > 0}
                                      className={`h-9.5 sm:h-10 pr-9 text-xs sm:text-sm ${
                                        watchConfirmPassword && !passwordsMatch ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                      className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    >
                                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </FormControl>
                                {watchConfirmPassword && passwordsMatch && (
                                  <p role="status" className="pt-0.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                    <Check className="w-3.5 h-3.5" /> Passwords match
                                  </p>
                                )}
                                {watchConfirmPassword && !passwordsMatch && !form.formState.errors.confirmPassword && (
                                  <p role="alert" className="pt-0.5 flex items-center gap-1.5 text-xs font-medium text-rose-500">
                                    Passwords do not match
                                  </p>
                                )}
                                <FormMessage className="text-xs pt-0.5" />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )
                    ) : (
                      <motion.div
                        key="login-step"
                        custom={stepDirection}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="w-full space-y-3 sm:space-y-3.5"
                      >
                        {/* Email / Username */}
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold">Email or username</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="email@example.com"
                                  {...field}
                                  autoComplete="username"
                                  autoCapitalize="none"
                                  spellCheck={false}
                                  disabled={isLoading || lockoutSeconds > 0}
                                  className={`h-9.5 sm:h-10 text-xs sm:text-sm ${
                                    form.formState.errors.email ? "border-rose-500 focus-visible:ring-rose-500 bg-rose-500/[0.02]" : ""
                                  }`}
                                />
                              </FormControl>
                              {form.formState.errors.email && (
                                <div className="flex items-center justify-between pt-0.5 gap-2">
                                  <FormMessage className="text-xs" />
                                  {form.formState.errors.email?.message?.toLowerCase().includes("no account") && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setStepDirection(1);
                                        setIsRegister(true);
                                        setRegistrationStep(1);
                                        setIsForgot(false);
                                        form.clearErrors();
                                      }}
                                      className="shrink-0 text-xs font-semibold text-primary hover:underline cursor-pointer"
                                    >
                                      Register now
                                    </button>
                                  )}
                                </div>
                              )}
                            </FormItem>
                          )}
                        />

                        {/* Password */}
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold">Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    {...field}
                                    autoComplete="current-password"
                                    disabled={isLoading || lockoutSeconds > 0}
                                    className={`h-9.5 sm:h-10 pr-9 text-xs sm:text-sm ${
                                      form.formState.errors.password ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                  >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage className="text-xs pt-0.5" />
                            </FormItem>
                          )}
                        />

                        {/* Remember Me / Forgot Password */}
                        <div className="flex items-center justify-between pt-1 pb-0.5 text-xs">
                          <FormField
                            control={form.control}
                            name="rememberMe"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0 cursor-pointer select-none">
                                <FormControl>
                                  <Checkbox
                                    id="remember-me"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isLoading || lockoutSeconds > 0}
                                  />
                                </FormControl>
                                <FormLabel
                                  htmlFor="remember-me"
                                  className="font-medium text-xs text-muted-foreground hover:text-foreground cursor-pointer m-0 leading-none select-none"
                                >
                                  Remember me
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setStepDirection(1);
                              setIsForgot(true);
                              setIsRegister(false);
                              form.clearErrors();
                            }}
                            className="text-xs font-semibold text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </AnimatedHeightContainer>

                  {/* Root Error Alert */}
                  {form.formState.errors.root && (
                    <motion.div
                      role="alert"
                      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        x: shouldReduceMotion ? 0 : [-3, 3, -2, 2, 0],
                      }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center justify-between gap-2 shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
                        <span className="truncate">{form.formState.errors.root.message}</span>
                      </div>
                      {(form.formState.errors.root.message.toLowerCase().includes("no account") || form.formState.errors.email?.message?.toLowerCase().includes("no account")) && !isRegister && (
                        <button
                          type="button"
                          onClick={() => {
                            setStepDirection(1);
                            setIsRegister(true);
                            setRegistrationStep(1);
                            setIsForgot(false);
                            form.clearErrors();
                          }}
                          className="shrink-0 text-[11px] font-bold text-rose-800 dark:text-rose-200 underline hover:no-underline cursor-pointer"
                        >
                          Register
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Navigation & Submit Buttons */}
                  <div className="pt-1 flex gap-2 items-center">
                    <AnimatePresence initial={false}>
                      {((isRegister && registrationStep > 1) || (isForgot && forgotStep > 1)) && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: "auto", opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden shrink-0"
                        >
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10 whitespace-nowrap rounded-xl px-4 text-xs sm:text-sm font-semibold border-border hover:bg-muted/10 text-foreground active:scale-[0.98] transition-transform duration-100 ease-out"
                            onClick={() => {
                              setStepDirection(-1);

                              if (isForgot) {
                                setForgotStep(forgotStep - 1);
                              } else {
                                registrationFocusRef.current = "heading";
                                setRegistrationStep(registrationStep - 1);
                              }
                            }}
                            disabled={isLoading}
                          >
                            Back
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      type="submit"
                      className="flex-1 h-10 sm:h-10.5 text-xs sm:text-sm font-bold shadow-sm rounded-xl active:scale-[0.98] transition-[background-color,transform,opacity] duration-200 ease-out touch-manipulation"
                      disabled={isLoading || lockoutSeconds > 0}
                    >
                      {isLoading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={
                            lockoutSeconds > 0
                              ? "locked"
                              : isForgot
                              ? `forgot-${forgotStep}`
                              : isRegister
                              ? `reg-${registrationStep}`
                              : "login"
                          }
                          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 2 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -2 }}
                          transition={{ duration: 0.12, ease: "easeOut" }}
                          className="inline-flex items-center justify-center truncate"
                        >
                          {lockoutSeconds > 0
                            ? `Locked (${lockoutSeconds}s)`
                            : isForgot
                            ? forgotStep === 1
                              ? "Continue to Password"
                              : "Reset Password"
                            : isRegister
                            ? registrationStep === 1
                              ? "Continue to Password"
                              : registrationStep === 2
                              ? "Continue to Emergency PIN"
                              : "Create account"
                            : "Sign In to Hub"}
                        </motion.span>
                      </AnimatePresence>
                    </Button>
                  </div>
                </form>
              </Form>

              <div className="text-center mt-3 sm:mt-3.5 text-xs text-muted-foreground flex flex-col gap-1">
                {!isForgot && (
                  <div>
                    {isRegister ? "Already have a SHORE account?" : "Don't have an account yet?"}{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setStepDirection(isRegister ? -1 : 1);
                        setIsRegister(!isRegister);
                        setRegistrationStep(1);
                        setIsForgot(false);
                        setForgotStep(1);
                        form.clearErrors();

                        if (!isRegister) registrationFocusRef.current = "heading";
                      }}
                      className="font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                    >
                      {isRegister ? "Sign in here" : "Register now"}
                    </button>
                  </div>
                )}
                <AnimatePresence initial={false}>
                  {isForgot && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setStepDirection(-1);
                          setIsForgot(false);
                          setForgotStep(1);
                          setIsRegister(false);
                          form.clearErrors();
                        }}
                        className="font-semibold text-muted-foreground hover:text-primary hover:underline bg-transparent border-none cursor-pointer"
                      >
                        ← Back to Sign In
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Right Panel: Image Carousel (Desktop view) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-black md:block">
        {images.map((src, index) => (
          <motion.img
            key={src}
            src={src}
            alt="SHORE Skwela"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "38% center" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: currentImageIndex === index ? 1 : 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </div>
    </div>
  );
}
