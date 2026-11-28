import React from "react";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { FIELD_FOCUS_CONTAINER_CLASS_NAME } from "@/components/ui/field-focus";
import { cn } from "@/lib/utils";

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
  className,
  disabled,
  "aria-invalid": ariaInvalid,
  ...inputProps
}: InputFieldProps) {
  const isInvalid = Boolean(error) || ariaInvalid === true || ariaInvalid === "true";
  return (
    <div className="space-y-1">
      <div
        data-invalid={isInvalid || undefined}
        className={`${FIELD_FOCUS_CONTAINER_CLASS_NAME} flex h-12 items-center gap-3 border px-4 transition ${
          variant === "auth" ? "rounded-2xl bg-background/80" : "rounded-control bg-background"
        } ${
          isInvalid
            ? "border-destructive-outline bg-destructive-soft/40"
            : "border-input hover:border-input"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}

        <Input unstyled
          {...inputProps}
          focusMode="container"
          disabled={disabled}
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          aria-invalid={isInvalid || undefined}
          aria-describedby={[inputProps["aria-describedby"], error && id ? `${id}-error` : undefined].filter(Boolean).join(" ") || undefined}
          className={cn("h-full min-w-0 flex-1 bg-transparent text-sm outline-none", className)}
        />

        {rightIcon && (
          <IconButton variant="unstyled"
            type="button"
            disabled={disabled}
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
