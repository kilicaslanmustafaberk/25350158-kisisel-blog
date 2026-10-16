"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

import { ChevronIcon, CloseIcon } from "@/components/ui/icons";
import { ModalDialog } from "@/components/ui/modal-dialog";
import { imageDeliveryUrl } from "@/features/media/delivery-url";

type GalleryImage = { id: string; url: string; width: number | null; height: number | null; altText: string; caption: string | null };

/**
 * Existing grid, enhanced: every image is a real button that opens an accessible
 * lightbox (native modal dialog, Escape/backdrop close, ← → navigation, focus
 * returns to the thumbnail). No slider/carousel dependency.
 */
export function ProjectGallery({ images, projectTitle }: { images: GalleryImage[]; projectTitle: string }) {
  const baseId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const current = openIndex === null ? null : images[openIndex];
  const step = (delta: number) => setOpenIndex((index) => (index === null ? null : (index + delta + images.length) % images.length));

  return <>
    <ul className="gallery-grid">
      {images.map((image, index) => <li key={image.id}>
        <figure>
          <button type="button" className="gallery-open" onClick={() => setOpenIndex(index)} aria-label={`Görseli büyüt: ${image.altText}`}>
            <Image src={imageDeliveryUrl(image.url)} alt={image.altText} fill loading="lazy" sizes="(max-width: 768px) 100vw, 50vw" />
          </button>
          {image.caption && <figcaption>{image.caption}</figcaption>}
        </figure>
      </li>)}
    </ul>
    {current && <ModalDialog labelledBy={`${baseId}-title`} className="lightbox-dialog" onClose={() => setOpenIndex(null)} initialFocusRef={closeRef}>
      <div
        className="lightbox"
        onKeyDown={(event) => {
          if (images.length < 2) return;
          if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
          else if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
        }}
      >
        <header className="lightbox-header">
          <h2 id={`${baseId}-title`}>{projectTitle} — görsel {openIndex! + 1} / {images.length}</h2>
          <button ref={closeRef} type="button" className="icon-button" onClick={() => setOpenIndex(null)}><CloseIcon /><span className="sr-only">Kapat</span></button>
        </header>
        <div className="lightbox-image">
          <Image src={imageDeliveryUrl(current.url)} alt={current.altText} fill sizes="100vw" />
        </div>
        <footer className="lightbox-footer">
          <p aria-live="polite">{current.caption ?? current.altText}</p>
          {images.length > 1 && <div className="lightbox-controls">
            <button type="button" className="icon-button" onClick={() => step(-1)}><ChevronIcon className="flip" /><span className="sr-only">Önceki görsel</span></button>
            <button type="button" className="icon-button" onClick={() => step(1)}><ChevronIcon /><span className="sr-only">Sonraki görsel</span></button>
          </div>}
        </footer>
      </div>
    </ModalDialog>}
  </>;
}
