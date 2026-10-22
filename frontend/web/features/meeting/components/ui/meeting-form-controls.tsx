"use client";

import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CustomSelect,
  type CustomSelectOption,
} from "@/components/ui/custom/custom-select";
import { cn } from "@/lib/utils";

type MeetingControlSize = "sm" | "md" | "lg";
type MeetingButtonTone =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

const meetingButtonVariant = {
  primary: "default", secondary: "secondary", outline: "outline", ghost: "ghost", danger: "destructive-soft",
} as const;
const meetingButtonSize = { sm: "sm", md: "default", lg: "lg" } as const;

interface MeetingButtonProps
  extends Omit<ComponentProps<typeof Button>, "variant" | "size"> {
  tone?: MeetingButtonTone;
  controlSize?: MeetingControlSize;
}

export function MeetingButton({
  tone = "primary",
  controlSize = "md",
  className,
  ...props
}: MeetingButtonProps) {
  return (
    <Button
      variant={meetingButtonVariant[tone]}
      size={meetingButtonSize[controlSize]}
      className={className}
      {...props}
    />
  );
}

interface MeetingInputProps extends ComponentProps<typeof Input> {
  icon?: LucideIcon;
  invalid?: boolean;
  containerClassName?: string;
}

export function MeetingInput({
  icon: Icon,
  invalid,
  className,
  containerClassName,
  ...props
}: MeetingInputProps) {
  if (!Icon) {
    return (
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-10",
          className,
        )}
        {...props}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex h-10 min-w-0 items-center gap-2 rounded-control border border-input bg-background px-3 transition-colors duration-150 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring",
        invalid && "border-destructive-outline focus-within:ring-ring",
        containerClassName,
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <Input
        aria-invalid={invalid || undefined}
        className={cn(
          "h-auto min-w-0 flex-1 border-0 bg-transparent px-0 py-0 font-normal shadow-none focus-visible:ring-0",
          className,
        )}
        {...props}
      />
    </span>
  );
}

interface MeetingTextareaProps extends ComponentProps<typeof Textarea> {
  invalid?: boolean;
}

export function MeetingTextarea({
  invalid,
  className,
  ...props
}: MeetingTextareaProps) {
  return (
    <Textarea
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-24 font-normal",
        className,
      )}
      {...props}
    />
  );
}

interface MeetingSelectProps<TValue extends string = string> {
  id?: string;
  value: TValue;
  options: CustomSelectOption<TValue>[];
  onChange: (value: TValue) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
}

export function MeetingSelect<TValue extends string = string>({
  triggerClassName,
  contentClassName,
  ...props
}: MeetingSelectProps<TValue>) {
  return (
    <CustomSelect
      triggerClassName={cn(
        "h-10 font-normal",
        triggerClassName,
      )}
      contentClassName={contentClassName}
      {...props}
    />
  );
}

