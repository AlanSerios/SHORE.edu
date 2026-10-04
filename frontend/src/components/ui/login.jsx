import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";
import { Checkbox } from "./checkbox";
import { Loader2, Eye, EyeOff, Check, ShieldCheck, AlertCircle, KeyRound } from "lucide-react";

// Validation schema for the form
const formSchema = z.object({
  name: z.string().optional(),
  email: z.string()
    .min(3, { message: "Account name/email must be at least 3 characters." }),
  pin: z.string().optional(),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string().optional(),
  rememberMe: z.boolean().default(false).optional(),
  role: z.enum(["student", "volunteer"]).default("student").optional(),
});

function calculatePasswordStrength(pass) {
  if (!pass) return { score: 0, label: "None", color: "bg-muted", textColor: "text-muted" };
  let score = 0;
  if (pass.length >= 6) score += 1;
  if (pass.length >= 8) score += 1;
  if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) score += 1;
  if (/[^a-zA-Z0-9]/.test(pass) || (/[A-Z]/.test(pass) && /[a-z]/.test(pass) && pass.length >= 10)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: "Weak", color: "bg-rose-500", textColor: "text-rose-500" };
    case 2:
      return { score: 2, label: "Fair", color: "bg-amber-500", textColor: "text-amber-500" };
    case 3:
      return { score: 3, label: "Good", color: "bg-emerald-500", textColor: "text-emerald-500" };
    case 4:
      return { score: 4, label: "Strong", color: "bg-teal-500", textColor: "text-teal-500" };
    default:
      return { score: 0, label: "Too Short", color: "bg-rose-400", textColor: "text-rose-400" };
  }
}

export function AuthFormSplitScreen({
  logo,
  images = [],
  onSubmit,
}) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isRegister, setIsRegister] = React.useState(false);
  const [isForgot, setIsForgot] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  React.useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  const form = useForm({
    resolver: zodResolver(formSchema),
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

  const watchPassword = form.watch("password") || "";
  const watchConfirmPassword = form.watch("confirmPassword") || "";
  const strength = React.useMemo(() => calculatePasswordStrength(watchPassword), [watchPassword]);

  const hasMinLength = watchPassword.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(watchPassword);
  const hasNumber = /[0-9]/.test(watchPassword);
  const passwordsMatch = watchPassword && watchConfirmPassword ? watchPassword === watchConfirmPassword : true;

  const handleFormSubmit = async (data) => {
    form.clearErrors();

    if (isRegister && !data.name?.trim()) {
      form.setError("name", { type: "manual", message: "Full name is required for registration." });
      return;
    }

    if ((isRegister || isForgot) && (!data.pin || data.pin.length !== 4)) {
      form.setError("pin", { type: "manual", message: "A 4-digit security PIN is required." });
      return;
    }

    if (isRegister || isForgot) {
      if (data.password.length < 6) {
        form.setError("password", { type: "manual", message: "Password must be at least 6 characters." });
        return;
      }
      if (data.password !== data.confirmPassword) {
        form.setError("confirmPassword", { type: "manual", message: "Passwords do not match." });
        return;
      }
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
      if (isForgot) {
        setSuccessMessage("Password reset successful! You can now sign in with your new password.");
        setIsForgot(false);
        form.setValue("password", "");
        form.setValue("confirmPassword", "");
        form.setValue("pin", "");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      form.setError("root", { type: "manual", message: error.message || "Authentication request failed." });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col md:flex-row bg-background text-foreground">
      {/* Left Panel: Form */}
      <div className="flex w-full flex-col justify-center p-6 md:w-1/2 md:p-12 lg:p-16">
        <div className="mx-auto w-full max-w-md">
          {/* Logo Header */}
          <div className="mb-6 flex items-center gap-3">
            {logo ? (
              logo
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black shadow-md shadow-primary/25">
                  S
                </div>
                <span className="text-xl font-black tracking-tight">SHORE<span className="text-primary">.ed</span></span>
              </div>
            )}
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-5"
          >
            <motion.div variants={itemVariants}>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {isForgot 
                  ? "Reset Your Password" 
                  : isRegister 
                  ? "Create Your Account" 
                  : "Welcome Back"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isForgot
                  ? "Verify your 4-digit PIN to set a new password."
                  : isRegister
                  ? "Join the SHORE Skwela Student & Volunteer Hub."
                  : "Sign in to access attendance, scholarships, and progress tracker."}
              </p>
            </motion.div>

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs sm:text-sm font-semibold flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className="space-y-4"
              >
                {/* Full Name for Registration */}
                {isRegister && (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Juan Dela Cruz"
                              {...field}
                              disabled={isLoading}
                              className="h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* Account / Email */}
                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{(isRegister || isForgot) ? "Account Username" : "Email or Username"}</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Input
                              placeholder={(isRegister || isForgot) ? "juandelacruz" : "email@example.com"}
                              {...field}
                              disabled={isLoading}
                              className={`h-11 ${(isRegister || isForgot) ? "pr-[145px]" : ""}`}
                            />
                            {(isRegister || isForgot) && (
                              <span className="absolute right-3 text-muted-foreground font-mono text-xs pointer-events-none select-none bg-muted/30 px-1.5 py-0.5 rounded">
                                @shoreskwela.com
                              </span>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* 4-Digit Security PIN */}
                {(isRegister || isForgot) && (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>4-Digit Security PIN</FormLabel>
                            <span className="text-[11px] text-muted-foreground">Used for password recovery</span>
                          </div>
                          <FormControl>
                            <div className="relative flex items-center">
                              <KeyRound className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                              <Input
                                type="password"
                                maxLength={4}
                                placeholder="••••"
                                {...field}
                                disabled={isLoading}
                                className="h-11 pl-9 font-mono tracking-widest text-center text-base"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* Password Field */}
                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isForgot ? "New Password" : "Password"}</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••••••"
                              {...field}
                              disabled={isLoading}
                              className="h-11 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                              tabIndex={-1}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Real-time Password Strength Meter for Register & Forgot */}
                  {(isRegister || isForgot) && watchPassword.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Strength:</span>
                        <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 h-1.5">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`rounded-full transition-colors duration-300 ${
                              strength.score >= step ? strength.color : "bg-muted/40"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Criteria Checklist */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {hasMinLength ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                          )}
                          <span className={hasMinLength ? "text-foreground font-medium" : ""}>Min. 6 chars</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasLetter && hasNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40 shrink-0" />
                          )}
                          <span className={hasLetter && hasNumber ? "text-foreground font-medium" : ""}>Letters & numbers</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Confirm Password Field (for Register and Forgot) */}
                {(isRegister || isForgot) && (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="••••••••••••"
                                {...field}
                                disabled={isLoading}
                                className={`h-11 pr-10 ${
                                  watchConfirmPassword && !passwordsMatch ? "border-rose-500 focus-visible:ring-rose-500" : ""
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                                tabIndex={-1}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          {watchConfirmPassword && !passwordsMatch && (
                            <p className="text-[11px] font-medium text-rose-500 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Passwords do not match
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* Remember Me / Forgot Password links */}
                {!isRegister && !isForgot && (
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between pt-1"
                  >
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-xs text-muted-foreground cursor-pointer m-0 leading-none select-none">
                            Remember Me
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgot(true);
                        setIsRegister(false);
                        form.clearErrors();
                      }}
                      className="text-xs font-semibold text-primary hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Forgotten Password?
                    </button>
                  </motion.div>
                )}

                {form.formState.errors.root && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-semibold flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{form.formState.errors.root.message}</span>
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-sm font-bold shadow-md shadow-primary/25 active:scale-[0.99] transition-all" 
                    disabled={isLoading}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isForgot ? "Reset Password" : (isRegister ? "Complete Registration" : "Sign In to Hub")}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <motion.div
              variants={itemVariants}
              className="text-center text-xs text-muted-foreground mt-4 flex flex-col gap-2"
            >
              <div>
                {isRegister ? "Already have a SHORE account?" : "Don't have an account yet?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setIsForgot(false);
                    form.clearErrors();
                  }}
                  className="font-bold text-primary hover:underline bg-transparent border-none cursor-pointer"
                >
                  {isRegister ? "Sign in here" : "Register now"}
                </button>
              </div>
              {isForgot && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgot(false);
                      setIsRegister(false);
                      form.clearErrors();
                    }}
                    className="font-semibold text-muted-foreground hover:text-primary hover:underline bg-transparent border-none cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel: Image Carousel */}
      <div className="relative hidden w-1/2 md:block overflow-hidden bg-black">
        {images.map((src, index) => (
          <motion.img
            key={src}
            src={src}
            alt="SHORE Skwela"
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: currentImageIndex === index ? 1 : 0 }}
            transition={{ duration: 1 }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-10" />
        <div className="absolute bottom-10 left-10 right-10 z-20 text-white space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> SHORE Skwela Hub
          </div>
          <h2 className="text-2xl font-black tracking-tight leading-tight">
            Empowering students with scholarships, attendance passes, and tracking.
          </h2>
        </div>
      </div>
    </div>
  );
}
