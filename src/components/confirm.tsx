"use client";

import { Modal } from "@/components/ui";
import { AlertTriangle } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (value: boolean) => void;
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback(
    (options: { title?: string; message: string; confirmLabel?: string; danger?: boolean }) =>
      new Promise<boolean>((resolve) => {
        setState({
          title: options.title ?? "تأیید عملیات",
          message: options.message,
          confirmLabel: options.confirmLabel ?? "حذف",
          danger: options.danger ?? true,
          resolve,
        });
      }),
    [],
  );

  function close(result: boolean) {
    if (state) state.resolve(result);
    setState(null);
  }

  const dialog: ReactNode = (
    <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title ?? ""} size="sm">
      {state ? (
        <div className="confirm-body">
          <div className={`confirm-icon ${state.danger ? "danger" : ""}`}>
            <AlertTriangle size={26} />
          </div>
          <p className="confirm-message">{state.message}</p>
          <div className="confirm-actions">
            <button className="button button-ghost" onClick={() => close(false)} type="button">
              انصراف
            </button>
            <button
              className={`button ${state.danger ? "button-danger" : "button-primary"}`}
              onClick={() => close(true)}
              type="button"
              autoFocus
            >
              {state.confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );

  return { confirm, confirmDialog: dialog };
}
