import * as React from "react";

import { cn } from "@/lib/utils";

interface MeetingFieldProps extends React.ComponentProps<"label"> {
  label: string;
  error?: string;
}

function MeetingField({
  label,
  error,
  className,
  children,
  ...props
}: MeetingFieldProps) {
  return (
    <label className={cn("block space-y-1.5", className)} {...props}>
      <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs font-semibold text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

export { MeetingField };
