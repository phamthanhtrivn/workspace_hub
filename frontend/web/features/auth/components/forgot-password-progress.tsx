import { cn } from "@/lib/utils";
import { ForgotPasswordStep } from "../types/auth.constants";

const RECOVERY_STEPS = [
  {
    value: ForgotPasswordStep.EMAIL,
    label: "Email",
    description: "Enter the email linked to your account.",
  },
  {
    value: ForgotPasswordStep.OTP,
    label: "Verify code",
    description: "Enter the 6-digit code sent to your email.",
  },
  {
    value: ForgotPasswordStep.PASSWORD,
    label: "New password",
    description: "Choose a new password to secure your account.",
  },
] as const;

export function ForgotPasswordProgress({ step }: { step: ForgotPasswordStep }) {
  const currentIndex = RECOVERY_STEPS.findIndex(
    (candidate) => candidate.value === step,
  );
  return (
    <div className="space-y-4">
      <ol
        aria-label="Password recovery progress"
        className="mx-auto grid w-full max-w-xs grid-cols-3 pt-2"
      >
        {RECOVERY_STEPS.map(({ value, label }, index) => (
          <li
            key={value}
            aria-current={index === currentIndex ? "step" : undefined}
            className="relative flex min-w-0 flex-col items-center gap-3"
          >
            <span
              aria-hidden="true"
              data-state={index <= currentIndex ? "active" : "upcoming"}
              className={cn(
                "relative z-10 block size-3 rounded-full border-2 transition-colors motion-reduce:transition-none",
                index <= currentIndex
                  ? "border-primary bg-primary"
                  : "border-border bg-background",
                index === currentIndex &&
                  "ring-4 ring-ring/25 ring-offset-2 ring-offset-background",
              )}
            />
            {index < RECOVERY_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                data-state={index <= currentIndex ? "active" : "upcoming"}
                className={cn(
                  "absolute left-[calc(50%+0.875rem)] right-[calc(-50%+0.875rem)] top-[5px] h-0.5 rounded-full transition-colors motion-reduce:transition-none",
                  index <= currentIndex ? "bg-primary" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "text-center text-xs leading-5 sm:text-sm",
                index === currentIndex
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <span className="sr-only">
                Step {index + 1} of {RECOVERY_STEPS.length}:{" "}
              </span>
              {label}
            </span>
          </li>
        ))}
      </ol>
      <p
        aria-live="polite"
        className="text-center text-sm leading-6 text-muted-foreground"
      >
        {RECOVERY_STEPS[currentIndex].description}
      </p>
    </div>
  );
}
