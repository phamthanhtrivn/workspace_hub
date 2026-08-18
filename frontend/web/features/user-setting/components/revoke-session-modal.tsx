"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import InputField from "@/components/common/input-field";
import { getUserSettingErrorMessage } from "../utils/user-setting-error";

interface RevokeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
}

const RevokeSessionModal = React.memo(function RevokeSessionModal({
  isOpen,
  onClose,
  onConfirm,
}: RevokeSessionModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMessage("");
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!password.trim()) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onConfirm(password);
    } catch (error: unknown) {
      setErrorMessage(
        getUserSettingErrorMessage(
          error,
          "Sign out failed. Please check your password and try again.",
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
        <h4 className="text-lg font-black text-slate-800 mb-2">
          Confirm sign out
        </h4>
        <p className="text-sm text-slate-500 mb-4 font-medium">
          Enter your password to confirm this action.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
          className="space-y-4"
        >
          <InputField
            id="password"
            type={showPassword ? "text" : "password"}
            icon={Lock}
            placeholder="Enter your password..."
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
            error={errorMessage}
            rightIcon={
              showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
            onRightClick={() => setShowPassword((prev) => !prev)}
          />

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default RevokeSessionModal;
