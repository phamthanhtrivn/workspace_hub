import { cn } from "@/lib/utils";
import { EMAIL_VERIFICATION_STEP, type EmailVerificationStep } from "../types/email-verification.constants";

const VERIFICATION_STEPS = [
  { value: EMAIL_VERIFICATION_STEP.EMAIL, label: "Email", description: "Enter the email address linked to your account." },
  { value: EMAIL_VERIFICATION_STEP.CODE, label: "Verify code", description: "Enter your 6-digit code to verify your email." },
] as const;

export function EmailVerificationProgress({ step }: { step: EmailVerificationStep }) {
  const currentIndex = VERIFICATION_STEPS.findIndex(candidate => candidate.value === step);
  return (
    <div className="space-y-4">
      <ol aria-label="Email verification progress" className="mx-auto grid w-full max-w-xs grid-cols-2 pt-2">
        {VERIFICATION_STEPS.map(({ value, label }, index) => (
          <li key={value} aria-current={index === currentIndex ? "step" : undefined}
            className="relative flex min-w-0 flex-col items-center gap-3">
            <span aria-hidden="true" className={cn(
              "relative z-10 block size-3 rounded-full border-2 transition-colors motion-reduce:transition-none",
              index <= currentIndex ? "border-primary bg-primary" : "border-border bg-background",
              index === currentIndex && "ring-4 ring-ring/25 ring-offset-2 ring-offset-background",
            )} />
            {index < VERIFICATION_STEPS.length - 1 && (
              <span aria-hidden="true" className={cn(
                "absolute left-[calc(50%+0.875rem)] right-[calc(-50%+0.875rem)] top-[5px] h-0.5 rounded-full transition-colors motion-reduce:transition-none",
                index <= currentIndex ? "bg-primary" : "bg-border",
              )} />
            )}
            <span className={cn("text-center text-xs leading-5 sm:text-sm", index === currentIndex ? "font-semibold text-foreground" : "text-muted-foreground")}>
              <span className="sr-only">Step {index + 1} of {VERIFICATION_STEPS.length}: </span>{label}
            </span>
          </li>
        ))}
      </ol>
      <p aria-live="polite" className="text-center text-sm leading-6 text-muted-foreground">
        {VERIFICATION_STEPS[currentIndex].description}
      </p>
    </div>
  );
}
