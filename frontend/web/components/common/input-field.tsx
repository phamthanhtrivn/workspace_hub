import React from "react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";

interface InputFieldProps extends React.ComponentProps<typeof Input> {
  icon?: React.ComponentType<{ className?: string }>;
  error?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "auth";
}

const InputField = React.memo(function InputField({
  id,
  type,
  icon: Icon,
  placeholder,
  error,
  value,
  onChange,
  rightIcon,
  onRightClick,
  variant = "default",
  ...inputProps
}: InputFieldProps) {
  return (
    <div className="space-y-1">
      <div
        className={`flex h-12 items-center gap-3 border px-4 transition ${
          variant === "auth" ? "rounded-2xl bg-background/80" : "rounded-control bg-background"
        } ${
          error
            ? "border-destructive-outline bg-destructive-soft/40"
            : "border-input hover:border-input focus-within:border-primary"
        }`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}

        <Input unstyled
          {...inputProps}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={[inputProps["aria-describedby"], error && id ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined}
          className="h-full w-full bg-transparent text-sm outline-none"
        />

        {rightIcon && (
          <IconButton variant="unstyled"
            type="button"
            onClick={onRightClick}
            label={type === "password" ? "Show password" : "Hide password"}
            showTooltip={false}
            className="text-muted-foreground hover:text-muted-foreground transition cursor-pointer"
          >
            {rightIcon}
          </IconButton>
        )}
      </div>

      {error && <p id={id ? `${id}-error` : undefined} className="text-xs text-destructive-content">{error}</p>}
    </div>
  );
});

export default InputField;
