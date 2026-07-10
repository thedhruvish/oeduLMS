import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useConfirmStore } from "@/store/confirm-store";

export function GlobalConfirmDialog() {
  const { isOpen, options, onConfirm, onCancel } = useConfirmStore();

  if (!isOpen || !options) return null;

  return (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={options.title}
      desc={options.desc}
      confirmText={options.confirmText}
      cancelBtnText={options.cancelBtnText}
      destructive={options.destructive}
      className={options.className}
      disabled={options.disabled}
      isLoading={options.isLoading}
      handleConfirm={onConfirm}
    >
      {options.children}
    </ConfirmDialog>
  );
}
