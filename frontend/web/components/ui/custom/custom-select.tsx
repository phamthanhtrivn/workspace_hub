"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface CustomSelectOption<TValue extends string = string> {
  value: TValue;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface CustomSelectProps<TValue extends string = string> {
  id?: string;
  value: TValue;
  options?: CustomSelectOption<TValue>[];
  children?: React.ReactNode;
  onChange: (value: TValue) => void;
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  triggerLabel?: React.ReactNode;
  descriptionId?: string;
}

const INTERNAL_EMPTY_VALUE = "__CUSTOM_SELECT_EMPTY__";

export function CustomSelect<TValue extends string = string>({
  id,
  value,
  options: suppliedOptions,
  children,
  onChange,
  ariaLabel,
  placeholder,
  disabled,
  invalid,
  className,
  triggerClassName,
  contentClassName,
  triggerLabel,
  descriptionId,
}: CustomSelectProps<TValue>) {
  const options = suppliedOptions ?? optionsFromChildren(children) as CustomSelectOption<TValue>[];
  const selectedOption = options.find((option) => option.value === value);
  const internalValue = value === "" ? INTERNAL_EMPTY_VALUE : value;

  return (
    <div className={cn("min-w-0", className)}>
      <Select
        value={internalValue}
        disabled={disabled}
        onValueChange={(nextValue) =>
          onChange((nextValue === INTERNAL_EMPTY_VALUE ? "" : nextValue) as TValue)
        }
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={descriptionId}
          className={cn(
            "h-9 cursor-pointer rounded-control border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-accent data-[state=open]:ring-2 data-[state=open]:ring-ring",
            invalid && "border-destructive-outline ring-2 ring-destructive-outline/15",
            triggerClassName,
          )}
        >
          <SelectValue placeholder={placeholder}>
            {triggerLabel ?? (selectedOption ? <OptionLabel option={selectedOption} /> : placeholder)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className={cn("rounded-control border-border", contentClassName)}>
          {options.map((option) => {
            const itemValue = option.value === "" ? INTERNAL_EMPTY_VALUE : option.value;
            return (
              <SelectItem
                key={itemValue}
                value={itemValue}
                disabled={option.disabled}
                className="min-h-9 rounded-md font-medium"
              >
                <OptionLabel option={option} />
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/** Compatibility for existing option declarations; only shared Select renders DOM. */
function optionsFromChildren(children: React.ReactNode): CustomSelectOption[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ value?: string | number; disabled?: boolean; children?: React.ReactNode }>(child)) return [];
    if (child.type === React.Fragment) return optionsFromChildren(child.props.children);
    if (child.type !== "option") return [];
    return [{ value: String(child.props.value ?? child.props.children ?? ""), label: child.props.children, disabled: child.props.disabled }];
  });
}

function OptionLabel<TValue extends string>({
  option,
}: {
  option: CustomSelectOption<TValue>;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.icon ? (
        <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
          {option.icon}
        </span>
      ) : null}
      <span className="truncate">{option.label}</span>
      {typeof option.count === "number" && option.count > 0 ? (
        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-muted px-1 text-xs font-semibold text-muted-foreground">
          {option.count > 99 ? "99+" : option.count}
        </span>
      ) : null}
    </span>
  );
}
