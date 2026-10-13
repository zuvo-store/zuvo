"use client";

import { useRef, useState } from "react";

/**
 * Wraps a server-action form: intercepts submit, asks Yes/No in a proper
 * modal, and only submits when the user confirms. Prevents accidental taps.
 */
export default function ConfirmForm({
  action,
  title,
  message,
  confirmLabel = "Yes",
  danger = false,
  children,
  className,
}: {
  action: string | ((formData: FormData) => void | Promise<void>);
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);

  return (
    <>
      <form
        ref={formRef}
        action={action}
        className={className}
        onSubmit={(e) => {
          if (confirmed.current) return; // user already said yes — let it through
          e.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </form>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
          role="alertdialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-zinc-900">{title}</h3>
            <p className="mt-2 text-sm text-zinc-600">{message}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border-2 border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmed.current = true;
                  setOpen(false);
                  formRef.current?.requestSubmit();
                }}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow transition ${
                  danger
                    ? "bg-red-500 shadow-red-500/25 hover:bg-red-600"
                    : "bg-orange-500 shadow-orange-500/25 hover:bg-orange-600"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
