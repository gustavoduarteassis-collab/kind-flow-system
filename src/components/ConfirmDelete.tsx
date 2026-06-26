import { ReactNode, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  /** The trigger element. Click opens the confirmation modal. */
  children: ReactNode;
  /** Name of the item being deleted (shown in bold). */
  itemName?: string;
  /** Optional extra description below the default warning. */
  description?: string;
  /** Action label, default "Excluir". */
  confirmLabel?: string;
  /** Called only after the user confirms. */
  onConfirm: () => void | Promise<void>;
  /** Optional title override. */
  title?: string;
};

/**
 * Reusable confirmation modal for destructive actions.
 * Wraps any trigger (typically the trash button) and only fires onConfirm
 * after explicit user confirmation. Never deletes immediately.
 */
export function ConfirmDelete({
  children,
  itemName,
  description,
  confirmLabel = "Excluir",
  onConfirm,
  title = "Tem certeza que deseja excluir?",
}: Props) {
  const [open, setOpen] = useState(false);
  const handleConfirm = async () => {
    await onConfirm();
    setOpen(false);
  };
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {itemName ? (
              <>
                Você está prestes a excluir <strong className="text-foreground">{itemName}</strong>.{" "}
              </>
            ) : null}
            {description || "Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
