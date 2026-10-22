"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import InputField from "@/components/common/input-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-dialog p-6">
        <DialogHeader className="p-0 space-y-1">
          <DialogTitle className="text-section-title font-semibold text-foreground">
            Confirm sign out
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground font-medium">
            Enter your password to confirm this action.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleConfirm();
          }}
          className="mt-4 space-y-4"
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
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-control px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || !password.trim()}
              className="flex items-center gap-2 rounded-control bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default RevokeSessionModal;
