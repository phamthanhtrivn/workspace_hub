import * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.ComponentProps<"table"> {
  containerClassName?: string;
  containerRef?: React.Ref<HTMLDivElement>;
  unstyled?: boolean;
}

function Table({ className, containerClassName, containerRef, unstyled = false, ...props }: TableProps) {
  if (unstyled) return <table data-slot="table" className={className} {...props} />;
  return (
    <div ref={containerRef} data-slot="table-container" className={cn("relative w-full overflow-x-auto", containerClassName)}>
      <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({ className, unstyled = false, ...props }: React.ComponentProps<"thead"> & { unstyled?: boolean }) {
  return <thead data-slot="table-header" className={cn(!unstyled && "[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, unstyled = false, ...props }: React.ComponentProps<"tbody"> & { unstyled?: boolean }) {
  return <tbody data-slot="table-body" className={cn(!unstyled && "[&_tr:last-child]:border-b-0", className)} {...props} />;
}

function TableFooter({ className, unstyled = false, ...props }: React.ComponentProps<"tfoot"> & { unstyled?: boolean }) {
  return <tfoot data-slot="table-footer" className={cn(!unstyled && "border-t bg-muted font-medium [&>tr]:last:border-b-0", className)} {...props} />;
}

function TableRow({ className, unstyled = false, ...props }: React.ComponentProps<"tr"> & { unstyled?: boolean }) {
  return <tr data-slot="table-row" className={cn(!unstyled && "border-b transition-colors hover:bg-muted data-[state=selected]:bg-muted", className)} {...props} />;
}

function TableHead({ className, unstyled = false, ...props }: React.ComponentProps<"th"> & { unstyled?: boolean }) {
  return <th data-slot="table-head" className={cn(!unstyled && "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground", className)} {...props} />;
}

function TableCell({ className, unstyled = false, ...props }: React.ComponentProps<"td"> & { unstyled?: boolean }) {
  return <td data-slot="table-cell" className={cn(!unstyled && "p-2 align-middle whitespace-nowrap", className)} {...props} />;
}

function TableCaption({ className, unstyled = false, ...props }: React.ComponentProps<"caption"> & { unstyled?: boolean }) {
  return <caption data-slot="table-caption" className={cn(!unstyled && "mt-4 text-sm text-muted-foreground", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption };
