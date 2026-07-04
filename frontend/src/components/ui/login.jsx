"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
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
import { Loader2, Eye, EyeOff } from "lucide-react";

// Validation schema for the form
const formSchema = z.object({
  name: z.string().optional(),
  email: z.string()
    .min(3, { message: "Account name/email must be at least 3 characters." }),
  pin: z.string().optional(),
  password: z
    .string()
    .min(4, { message: "Password must be at least 4 characters." }),
  rememberMe: z.boolean().default(false).optional(),
  role: z.enum(["student", "volunteer"]).default("student").optional(),
});

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
      rememberMe: false,
      role: "student",
    },
  });

  const handleFormSubmit = async (data) => {
    if (isRegister && !data.name) {
       form.setError("name", { type: "manual", message: "Full name is required for registration" });
       return;
    }
    if ((isRegister || isForgot) && (!data.pin || data.pin.length !== 4)) {
       form.setError("pin", { type: "manual", message: "A 4-digit PIN is required." });
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
      
      const result = await onSubmit(authData, isRegister, isForgot);
      if (isForgot) {
         setSuccessMessage("Password reset successful! You can now sign in.");
         setIsForgot(false);
         form.setValue("password", "");
         form.setValue("pin", "");
      }
    } catch (error) {
      console.error("Submission failed:", error);
      form.setError("root", { type: "manual", message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col md:flex-row">
      {/* Left Panel: Form */}
      <div className="flex w-full flex-col items-center justify-center bg-background p-8 md:w-1/2 relative z-10">
        <div className="w-full max-w-md">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-6"
          >
            <motion.div variants={itemVariants} className="text-left flex flex-col items-start">
              {logo && (
                <div className="mb-2">
                  {logo}
                </div>
              )}
              <h1 className="text-3xl font-bold tracking-tight">
                {isForgot ? "Reset Password" : (isRegister ? "Create an account" : "Welcome back!")}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {isForgot ? "Enter your 4-digit PIN to reset your password" : (isRegister ? "Sign up to track your progress" : "Sign in by entering the information below")}
              </p>
            </motion.div>

            {successMessage && (
              <motion.div variants={itemVariants} className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-md text-sm font-medium">
                {successMessage}
              </motion.div>
            )}

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleFormSubmit)}
                className="space-y-4"
              >
                {isRegister && !isForgot && (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name (as it appears in tracker)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Juan Dela Cruz"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
                {isRegister && !isForgot && (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <FormControl>
                            <select
                              {...field}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={isLoading}
                            >
                              <option value="student">Student</option>
                              <option value="volunteer">Volunteer</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{(isRegister || isForgot) ? "Preferred Account Name" : "Email Address"}</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <Input
                              placeholder={(isRegister || isForgot) ? "josedelacruz" : "email@example.com"}
                              {...field}
                              disabled={isLoading}
                              className={(isRegister || isForgot) ? "pr-[140px]" : ""}
                            />
                            {(isRegister || isForgot) && (
                              <span className="absolute right-3 text-muted-foreground pointer-events-none text-sm select-none">
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

                {(isRegister || isForgot) && (
                  <motion.div variants={itemVariants}>
                    <FormField
                      control={form.control}
                      name="pin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>4-Digit Security PIN</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              maxLength={4}
                              placeholder="1234"
                              {...field}
                              disabled={isLoading}
                              className="font-mono tracking-widest text-center"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

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
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {!isRegister && !isForgot && (
                  <motion.div
                    variants={itemVariants}
                    className="flex items-center justify-between"
                  >
                    <FormField
                      control={form.control}
                      name="rememberMe"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormLabel className="font-normal m-0 leading-none">
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
                      className="text-sm font-medium text-primary hover:underline bg-transparent border-none cursor-pointer"
                    >
                      Forgotten Password
                    </button>
                  </motion.div>
                )}

                {form.formState.errors.root && (
                  <p className="text-sm font-medium text-destructive mt-2">
                    {form.formState.errors.root.message}
                  </p>
                )}

                <motion.div variants={itemVariants} className="pt-2">
                  <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isForgot ? "Reset Password" : (isRegister ? "Sign Up" : "Sign In")}
                  </Button>
                </motion.div>
              </form>
            </Form>

            <motion.div
              variants={itemVariants}
              className="px-8 text-center text-sm text-muted-foreground mt-4 flex flex-col gap-2"
            >
              <div>
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setIsForgot(false);
                    form.clearErrors();
                  }}
                  className="font-semibold text-primary hover:underline bg-transparent border-none cursor-pointer"
                >
                  {isRegister ? "Sign in here" : "Create one here"}
                </button>
                .
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
                    Back to Sign In
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent mix-blend-multiply z-10" />
      </div>
    </div>
  );
}
