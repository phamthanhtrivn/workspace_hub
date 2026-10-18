"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";


interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
}

const PasswordInput = React.memo(function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete = id.includes("current") ? "current-password" : "new-password",
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1 w-full">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          autoComplete={autoComplete}
          required
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-10 w-full rounded-control [@media(pointer:coarse)]:pr-16 border bg-card px-3 pr-10 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground focus-visible:ring-2",
            error
              ? "border-destructive-outline focus-visible:ring-ring"
              : "border-input focus-visible:border-primary focus-visible:ring-ring",
          )}
        />
        <Button variant="unstyled"
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition cursor-pointer"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-destructive-content">{error}</p>}
    </div>
  );
});

export default PasswordInput;
