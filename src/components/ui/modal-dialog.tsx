"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

// Shared accessible modal for Phase 7 (command palette, terminal, gallery lightbox).
// Native <dialog>.showModal() makes the rest of the page inert; on top of that the
// component traps Tab, closes on Escape/backdrop, restores focus to the element
// that opened it and tells decorative canvases to pause while it is open.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

let openOverlays = 0;
function setOverlayOpen(open: boolean) {
  openOverlays = Math.max(0, openOverlays + (open ? 1 : -1));
  const root = document.documentElement;
  if (openOverlays > 0) root.dataset.overlay = "open";
  else delete root.dataset.overlay;
  window.dispatchEvent(new Event("site-overlay-change"));
}

type Props = {
  labelledBy: string;
  describedBy?: string;
  className?: string;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export function ModalDialog({ labelledBy, describedBy, className, onClose, initialFocusRef, children }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    (initialFocusRef?.current ?? dialog.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    setOverlayOpen(true);

    const requestClose = (event: Event) => { event.preventDefault(); onCloseRef.current(); };
    // `close` is dispatched asynchronously. A close queued by an earlier cleanup
    // (e.g. React StrictMode's mount → unmount → mount) can arrive after the
    // dialog was reopened, so only a close that left the dialog closed counts.
    const closed = () => { if (!dialog.open) onCloseRef.current(); };
    dialog.addEventListener("cancel", requestClose);
    dialog.addEventListener("close", closed);
    return () => {
      dialog.removeEventListener("cancel", requestClose);
      dialog.removeEventListener("close", closed);
      if (dialog.open) dialog.close();
      setOverlayOpen(false);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [initialFocusRef]);

  return <dialog
    ref={dialogRef}
    className={`modal-dialog ${className ?? ""}`}
    aria-labelledby={labelledBy}
    aria-describedby={describedBy}
    onClick={(event) => { if (event.target === event.currentTarget) onCloseRef.current(); }}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}
  >
    <div className="modal-surface">{children}</div>
  </dialog>;
}
