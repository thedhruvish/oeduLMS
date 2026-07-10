import { cn } from "@oedulms/ui/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@oedulms/ui/components/alert-dialog";
import { Button } from "@oedulms/ui/components/button";
import { Spinner } from "@oedulms/ui/components/spinner";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  disabled?: boolean;
  desc: React.JSX.Element | string;
  cancelBtnText?: string;
  confirmText?: React.ReactNode;
  destructive?: boolean;
  handleConfirm: () => void;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const {
    title,
    desc,
    children,
    className,
    confirmText,
    cancelBtnText,
    destructive,
    isLoading,
    disabled = false,
    handleConfirm,
    ...actions
  } = props;

  const isInteractionDisabled = disabled || isLoading;

  return (
    <AlertDialog {...actions}>
      <AlertDialogContent className={cn(className && className)}>
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{desc}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isInteractionDisabled}>
            {cancelBtnText ?? "Cancel"}
          </AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isInteractionDisabled}
          >
            {isLoading && <Spinner data-icon="inline-start" aria-hidden="true" />}
            {confirmText ?? "Continue"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
