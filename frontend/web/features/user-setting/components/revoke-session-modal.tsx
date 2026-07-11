"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import InputField from "@/components/common/input-field";

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
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setErrorMsg("");
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!password.trim()) {
      setErrorMsg("Vui lòng nhập mật khẩu.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onConfirm(password);
      // Let the parent close it on success
    } catch (error: any) {
      setErrorMsg(error?.response?.data?.message || "Đăng xuất thất bại. Vui lòng kiểm tra lại mật khẩu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
        <h4 className="text-lg font-black text-slate-800 mb-2">Xác nhận đăng xuất</h4>
        <p className="text-sm text-slate-500 mb-4 font-medium">
          Vui lòng nhập mật khẩu của bạn để xác nhận hành động này.
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
            placeholder="Nhập mật khẩu..."
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            error={errorMsg}
            rightIcon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            onRightClick={() => setShowPassword(!showPassword)}
          />

          <div className="mt-6 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !password.trim()}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Xác nhận
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

export default RevokeSessionModal;
