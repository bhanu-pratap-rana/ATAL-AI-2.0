/**
 * useAdminManagement Custom Hook
 * Extracted from admin/manage/page.tsx to manage admin account management state and handlers
 * Handles user deletion and admin account creation with auth checking
 */

import { useState, useEffect, useCallback } from "react";
import { deleteUserByEmail } from "@/app/actions/admin-delete";
import { createAdminUser } from "@/app/actions/admin-auth";
import { createClient } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { FORM_TIMING } from "@/lib/constants/ui-timings";

type Step = "delete" | "create";
type AuthStatus = "checking" | "authorized" | "unauthorized";

export interface UseAdminManagementReturn {
  // Auth & UI State
  authStatus: AuthStatus;
  step: Step;
  showPassword: boolean;
  isLoading: boolean;
  completed: boolean;

  // Form State
  email: string;
  password: string;
  confirmPassword: string;
  message: {
    type: "success" | "error";
    text: string;
  } | null;

  // State Setters
  setStep: (step: Step) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setConfirmPassword: (password: string) => void;
  setShowPassword: (show: boolean) => void;
  setCompleted: (completed: boolean) => void;

  // Handlers
  handleDeleteUser: () => Promise<void>;
  handleCreateAdmin: () => Promise<void>;
}

/**
 * Validate email for deletion
 */
function validateEmailForDeletion(
  emailValue: string,
): { valid: true } | { valid: false; error: string } {
  if (!emailValue.trim()) {
    return { valid: false, error: "Please enter an email address" };
  }
  return { valid: true };
}

/**
 * Confirm deletion with user
 */
function confirmDeletion(emailValue: string): boolean {
  return globalThis.confirm(
    `Are you sure you want to DELETE the user ${emailValue}?\n\nThis action cannot be undone!`,
  );
}

/**
 * Validate admin creation form
 */
function validateAdminForm(
  emailValue: string,
  passwordValue: string,
  confirmPasswordValue: string,
): { valid: true } | { valid: false; error: string } {
  if (!emailValue.trim()) {
    return { valid: false, error: "Please enter an email address" };
  }
  if (!passwordValue) {
    return { valid: false, error: "Please enter a password" };
  }
  if (passwordValue.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters" };
  }
  if (passwordValue !== confirmPasswordValue) {
    return { valid: false, error: "Passwords do not match" };
  }
  return { valid: true };
}

export function useAdminManagement(): UseAdminManagementReturn {
  // Auth & UI state
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [step, setStep] = useState<Step>("delete");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Form state
  const [email, setEmail] = useState("atal.app.ai@gmail.com");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Check if user is super admin on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setAuthStatus("unauthorized");
          return;
        }

        const role = user.app_metadata?.role;
        if (role === "super_admin") {
          setAuthStatus("authorized");
        } else {
          setAuthStatus("unauthorized");
        }
      } catch {
        setAuthStatus("unauthorized");
      }
    }
    checkAuth();
  }, []);

  /**
   * Handle successful deletion
   */
  const handleDeletionSuccess = useCallback(() => {
    setMessage({
      type: "success",
      text: `✓ User deleted! You can now create a new admin account.`,
    });
    toast.success("User deleted successfully");
    setTimeout(() => {
      setStep("create");
      setMessage(null);
    }, FORM_TIMING.nextStepsDelay);
  }, []);

  /**
   * Handle deletion error
   */
  const handleDeletionError = useCallback((error: string) => {
    setMessage({ type: "error", text: error });
    toast.error(error);
  }, []);

  /**
   * Handle successful admin creation
   */
  const handleAdminCreationSuccess = useCallback((emailValue: string) => {
    setMessage({
      type: "success",
      text: `✓ Admin account created!\n\nEmail: ${emailValue}\n\nTip: Use a password manager to securely store your credentials. Login at /admin/login`,
    });
    toast.success(`Admin account created for ${emailValue}`);
    setCompleted(true);
    setPassword("");
    setConfirmPassword("");
  }, []);

  /**
   * Handle admin creation error
   */
  const handleAdminCreationError = useCallback((error: string) => {
    setMessage({ type: "error", text: error });
    toast.error(error);
  }, []);

  /**
   * Delete user by email
   */
  const handleDeleteUser = useCallback(async () => {
    const emailValidation = validateEmailForDeletion(email);
    if (!emailValidation.valid) {
      setMessage({ type: "error", text: emailValidation.error });
      return;
    }

    if (!confirmDeletion(email)) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await deleteUserByEmail(email.trim().toLowerCase());
      if (result.success) {
        handleDeletionSuccess();
      } else {
        handleDeletionError(result.error || "Failed to delete user");
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      handleDeletionError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [email, handleDeletionSuccess, handleDeletionError]);

  /**
   * Create admin user
   */
  const handleCreateAdmin = useCallback(async () => {
    const validation = validateAdminForm(email, password, confirmPassword);
    if (!validation.valid) {
      setMessage({ type: "error", text: validation.error });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await createAdminUser(
        email.trim().toLowerCase(),
        password,
      );
      if (result.success) {
        handleAdminCreationSuccess(email);
      } else {
        handleAdminCreationError(
          result.error || "Failed to create admin account",
        );
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "An unexpected error occurred";
      handleAdminCreationError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, confirmPassword, handleAdminCreationSuccess, handleAdminCreationError]);

  return {
    // Auth & UI state
    authStatus,
    step,
    showPassword,
    isLoading,
    completed,

    // Form state
    email,
    password,
    confirmPassword,
    message,

    // State setters
    setStep,
    setEmail,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    setCompleted,

    // Handlers
    handleDeleteUser,
    handleCreateAdmin,
  };
}
