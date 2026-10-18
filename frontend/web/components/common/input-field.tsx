import React from "react";

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
}: any) {
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
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm outline-none"
        />

        {rightIcon && (
          <button
            type="button"
            onClick={onRightClick}
            aria-label={type === "password" ? "Show password" : "Hide password"}
            className="text-muted-foreground hover:text-muted-foreground transition cursor-pointer"
          >
            {rightIcon}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive-content">{error}</p>}
    </div>
  );
});

export default InputField;
