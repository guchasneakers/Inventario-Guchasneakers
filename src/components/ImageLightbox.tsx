"use client";

import { useEffect } from "react";

interface Props {
  src:   string;
  alt:   string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: Props) {
  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-up"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      {/* close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors z-10"
      >
        ✕
      </button>

      {/* image */}
      <div
        className="relative max-w-lg w-full max-h-[80vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain rounded-2xl max-h-[80vh] shadow-card"
          style={{ maxHeight: "80vh" }}
        />
        {/* name label */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl px-4 py-3">
          <p className="text-[12px] font-semibold text-white text-center">{alt}</p>
        </div>
      </div>
    </div>
  );
}
