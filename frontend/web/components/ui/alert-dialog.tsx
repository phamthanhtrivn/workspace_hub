"use client";

import type { ComponentProps } from "react";
import { Dialog } from "./dialog";

export function AlertDialog(props: ComponentProps<typeof Dialog>) {
  return <Dialog {...props} modalRole="alertdialog" />;
}

export {
  DialogContent as AlertDialogContent,
  DialogDescription as AlertDialogDescription,
  DialogFooter as AlertDialogFooter,
  DialogHeader as AlertDialogHeader,
  DialogOverlay as AlertDialogOverlay,
  DialogPortal as AlertDialogPortal,
  DialogTitle as AlertDialogTitle,
  DialogTrigger as AlertDialogTrigger,
} from "@/components/ui/dialog";
