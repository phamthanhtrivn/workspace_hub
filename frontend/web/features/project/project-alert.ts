import Swal from "sweetalert2";

type ProjectAlertIcon = "question" | "warning" | "error";

type ConfirmProjectActionOptions = {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: ProjectAlertIcon;
  destructive?: boolean;
};

export async function confirmProjectAction({
  title,
  text,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  icon = "question",
  destructive = false,
}: ConfirmProjectActionOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: destructive ? "#dc2626" : "#0052CC",
    cancelButtonColor: "#64748b",
    reverseButtons: true,
    focusCancel: destructive,
  });

  return result.isConfirmed;
}
