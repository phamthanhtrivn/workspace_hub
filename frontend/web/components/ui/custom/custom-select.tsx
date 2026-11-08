"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FieldFocusMode } from "../field-focus";

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
  sizeToOptions?: boolean;
  descriptionId?: string;
  focusMode?: FieldFocusMode;
  onOpenChange?: (open: boolean) => void;
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
  sizeToOptions = false,
  descriptionId,
  focusMode,
  onOpenChange,
}: CustomSelectProps<TValue>) {
  const options =
    suppliedOptions ??
    (optionsFromChildren(children) as CustomSelectOption<TValue>[]);
  const selectedOption = options.find((option) => option.value === value);
  const internalValue = value === "" ? INTERNAL_EMPTY_VALUE : value;
  const triggerClasses = cn(
    "h-9 cursor-pointer rounded-control border-input bg-background px-3 text-sm font-medium text-foreground hover:bg-accent",
    invalid && "border-destructive-outline",
    triggerClassName,
  );

  return (
    <div
      className={cn(
        "min-w-0",
        sizeToOptions &&
          "inline-grid w-fit max-w-full shrink-0 grid-cols-1 align-middle",
        className,
      )}
    >
      {sizeToOptions && (
        <span
          aria-hidden="true"
          data-slot="select-width-sizer"
          className={cn(
            "invisible col-start-1 row-start-1 flex items-center justify-between gap-2 border px-3 py-2",
            triggerClasses,
            "pointer-events-none h-auto min-h-9 w-auto min-w-0 whitespace-nowrap",
          )}
        >
          <span className="grid w-max min-w-0">
            {options.map((option) => (
              <span key={option.value} className="col-start-1 row-start-1">
                <OptionLabel option={option} truncate={false} />
              </span>
            ))}
            {(triggerLabel ?? placeholder) && (
              <span className="col-start-1 row-start-1">
                {triggerLabel ?? placeholder}
              </span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0" />
        </span>
      )}
      <Select
        value={internalValue}
        disabled={disabled}
        onOpenChange={onOpenChange}
        onValueChange={(nextValue) =>
          onChange(
            (nextValue === INTERNAL_EMPTY_VALUE ? "" : nextValue) as TValue,
          )
        }
      >
        <SelectTrigger
          focusMode={focusMode}
          id={id}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={descriptionId}
          className={cn(
            triggerClasses,
            sizeToOptions && "col-start-1 row-start-1 h-auto min-h-9",
          )}
        >
          <SelectValue placeholder={placeholder}>
            {triggerLabel ??
              (selectedOption ? (
                <OptionLabel
                  option={selectedOption}
                  truncate={!sizeToOptions}
                />
              ) : (
                placeholder
              ))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent
          className={cn("rounded-control border-border", contentClassName)}
        >
          {options.map((option) => {
            const itemValue =
              option.value === "" ? INTERNAL_EMPTY_VALUE : option.value;

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
    if (
      !React.isValidElement<{
        value?: string | number;
        disabled?: boolean;
        children?: React.ReactNode;
      }>(child)
    )
      return [];
    if (child.type === React.Fragment)
      return optionsFromChildren(child.props.children);
    if (child.type !== "option") return [];

    return [
      {
        value: String(child.props.value ?? child.props.children ?? ""),
        label: child.props.children,
        disabled: child.props.disabled,
      },
    ];
  });
}

function OptionLabel<TValue extends string>({
  option,
  truncate = true,
}: {
  option: CustomSelectOption<TValue>;
  truncate?: boolean;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {option.icon ? (
        <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
          {option.icon}
        </span>
      ) : null}
      <span
        className={
          truncate ? "truncate" : "whitespace-normal [overflow-wrap:anywhere]"
        }
      >
        {option.label}
      </span>
      {typeof option.count === "number" && option.count > 0 ? (
        <span className="ml-auto inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-muted px-1 text-xs font-semibold text-muted-foreground">
          {option.count > 99 ? "99+" : option.count}
        </span>
      ) : null}
    </span>
  );
}
