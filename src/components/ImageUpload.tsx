"use client";

import { useRef, useState } from "react";

interface Props {
  currentUrl: string;
  onChange:   (url: string) => void;
}

type Tab = "upload" | "url";

export default function ImageUpload({ currentUrl, onChange }: Props) {
  const [tab,       setTab]       = useState<Tab>(currentUrl && !currentUrl.startsWith("blob:") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState(currentUrl);
  const [urlInput,  setUrlInput]  = useState(currentUrl);
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) { setError("Solo se aceptan imágenes"); return; }
    if (file.size > 5 * 1024 * 1024)     { setError("Máximo 5MB");               return; }

    setError("");
    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      const form = new FormData();
      form.append("file", file);
      const res  = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();

      if (res.ok) {
        onChange(data.url);
        setPreview(data.url);
        setUrlInput(data.url);
      } else {
        setError(data.error ?? "Error al subir imagen");
        setPreview(currentUrl);
      }
    } catch {
      setError("Error de red");
      setPreview(currentUrl);
    }
    setUploading(false);
  }

  function handleUrlChange(val: string) {
    setUrlInput(val);
    setPreview(val);
    onChange(val);
    setError("");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "upload", label: "Subir archivo" },
    { id: "url",    label: "Pegar enlace"  },
  ];

  return (
    <div className="space-y-2">
      {/* tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTab(t.id); setError(""); }}
            className={[
              "flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all duration-200",
              tab === t.id
                ? "bg-gucha-dark text-white"
                : "text-gucha-muted hover:text-white",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* upload tab */}
      {tab === "upload" && (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          className={[
            "relative h-32 rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden cursor-pointer",
            dragging
              ? "border-gucha-red/60 bg-gucha-red/5"
              : "border-gucha-border hover:border-gucha-subtle/50 bg-[#0d0d0d]",
          ].join(" ")}
        >
          {preview && !uploading && (
            <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {!preview && !uploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gucha-dark border border-gucha-border flex items-center justify-center text-lg">📷</div>
              <p className="text-[11px] text-gucha-muted text-center leading-snug">
                Arrastra una imagen<br />
                <span className="text-gucha-subtle">o toca para buscar</span>
              </p>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2">
              <div className="w-8 h-8 border-2 border-gucha-red/30 border-t-gucha-red rounded-full animate-spin" />
              <span className="text-[11px] text-white">Subiendo…</span>
            </div>
          )}
          {preview && !uploading && (
            <div className="absolute bottom-2 right-2">
              <span className="text-[9px] font-bold bg-black/70 text-gucha-subtle border border-gucha-border px-2 py-0.5 rounded-full">
                Cambiar
              </span>
            </div>
          )}
        </div>
      )}

      {/* url tab */}
      {tab === "url" && (
        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/60 outline-none focus:border-gucha-subtle/60 transition-colors"
          />
          {urlInput && (
            <div className="relative h-28 rounded-xl border border-gucha-border bg-[#0d0d0d] overflow-hidden">
              <img
                src={urlInput}
                alt="preview"
                className="w-full h-full object-cover"
                onError={() => setError("No se pudo cargar la imagen desde ese enlace")}
                onLoad={() => setError("")}
              />
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {error && <p className="text-[10px] text-gucha-red-light">{error}</p>}
    </div>
  );
}
