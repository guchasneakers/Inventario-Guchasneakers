"use client";

import { useEffect, useRef, useState } from "react";
import type { BrandData, ProductData, ProductFormData } from "@/types";
import ImageUpload from "./ImageUpload";

interface Props {
  product:         ProductData | null;
  brands:          BrandData[];
  onBrandCreated:  (brand: BrandData) => void;
  onClose:         () => void;
  onSave:          (data: ProductFormData, id?: number) => Promise<void>;
}

const empty: ProductFormData = {
  brandId: "", name: "", description: "", price: "", imageUrl: "", sizes: [],
};

const labelCls = "block text-[9px] font-bold text-gucha-muted tracking-[0.2em] uppercase mb-1.5";
const inputCls = "w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/60 outline-none focus:border-gucha-subtle/60 transition-colors duration-200";

const US_SIZES = [
  "3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5",
  "9","9.5","10","10.5","11","11.5","12","12.5","13","13.5","14","15","16",
];

export default function ProductModal({ product, brands, onBrandCreated, onClose, onSave }: Props) {
  const [form,          setForm]          = useState<ProductFormData>(empty);
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [addingBrand,   setAddingBrand]   = useState(false);
  const [newBrandName,  setNewBrandName]  = useState("");
  const [brandSaving,   setBrandSaving]   = useState(false);
  const [brandError,    setBrandError]    = useState("");
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(product ? {
      brandId:     product.brandId != null ? String(product.brandId) : "",
      name:        product.name,
      description: product.description ?? "",
      price:       product.price != null ? String(product.price) : "",
      imageUrl:    product.imageUrl ?? "",
      sizes:       product.sizes.map((s) => ({ number: s.number, quantity: s.quantity })),
    } : empty);
    setError("");
    setTimeout(() => firstInputRef.current?.focus(), 80);
  }, [product]);

  function setField<K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleCreateBrand() {
    if (!newBrandName.trim() || brandSaving) return;
    setBrandSaving(true); setBrandError("");
    const res  = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBrandName.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      onBrandCreated(data);
      setField("brandId", String(data.id));
      setNewBrandName("");
      setAddingBrand(false);
    } else {
      setBrandError(data.error ?? "Error al crear");
    }
    setBrandSaving(false);
  }

  function toggleSize(num: string) {
    setForm((f) => {
      const exists = f.sizes.some((s) => s.number === num);
      if (exists) return { ...f, sizes: f.sizes.filter((s) => s.number !== num) };
      return { ...f, sizes: [...f.sizes, { number: num, quantity: 1 }] };
    });
  }

  function adjustQty(num: string, delta: number) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s) =>
        s.number === num ? { ...s, quantity: Math.max(1, s.quantity + delta) } : s
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true); setError("");
    try {
      await onSave(form, product?.id);
      onClose();
    } catch {
      setError("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111] border border-gucha-border rounded-3xl w-full max-w-md max-h-[94vh] overflow-y-auto shadow-card animate-fade-up">

        {/* header */}
        <div className="sticky top-0 z-10 bg-[#111] flex items-center justify-between px-6 pt-5 pb-4 border-b border-gucha-border-2">
          <div>
            <h2 className="text-[15px] font-black text-white tracking-[0.08em]">
              {product ? "EDITAR PRODUCTO" : "NUEVO PRODUCTO"}
            </h2>
            {product && (
              <p className="text-[10px] text-gucha-muted mt-0.5">{product.modelNum || product.name}</p>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* image upload */}
          <div>
            <label className={labelCls}>Imagen del producto</label>
            <ImageUpload
              currentUrl={form.imageUrl}
              onChange={(url) => setField("imageUrl", url)}
            />
          </div>

          {/* brand */}
          <div>
            <label className={labelCls}>Marca</label>
            <div className="flex flex-wrap gap-1.5">
              {brands.map((b) => {
                const selected = form.brandId === String(b.id);
                return (
                  <button key={b.id} type="button"
                    onClick={() => setField("brandId", selected ? "" : String(b.id))}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-bold transition-all border ${
                      selected
                        ? "bg-gucha-red-dark/60 border-gucha-red/50 text-gucha-red-light"
                        : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/50"
                    }`}>
                    {b.name}
                  </button>
                );
              })}

              {/* Inline nueva marca */}
              {addingBrand ? (
                <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Nombre de la marca…"
                    value={newBrandName}
                    onChange={(e) => { setNewBrandName(e.target.value); setBrandError(""); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleCreateBrand(); }
                      if (e.key === "Escape") { setAddingBrand(false); setNewBrandName(""); }
                    }}
                    className="flex-1 bg-[#0d0d0d] border border-gucha-subtle/40 rounded-xl px-3 py-1.5 text-[12px] text-white outline-none focus:border-gucha-subtle/60 transition-colors"
                  />
                  <button type="button" onClick={handleCreateBrand} disabled={!newBrandName.trim() || brandSaving}
                    className="px-2.5 py-1.5 rounded-lg bg-gucha-green-dark/60 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 disabled:opacity-40 transition-colors whitespace-nowrap">
                    {brandSaving ? "…" : "✓"}
                  </button>
                  <button type="button" onClick={() => { setAddingBrand(false); setNewBrandName(""); setBrandError(""); }}
                    className="px-2 py-1.5 rounded-lg border border-gucha-border text-gucha-muted text-[11px] hover:text-white transition-colors">
                    ✕
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingBrand(true)}
                  className="px-3 py-1.5 rounded-xl text-[12px] font-bold border border-dashed border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/50 transition-all">
                  + Nueva
                </button>
              )}
            </div>
            {brandError && <p className="text-[11px] text-gucha-red-light mt-1.5">{brandError}</p>}
          </div>

          {/* name */}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input placeholder="Ej: Air Jordan 5 Retro Fire Red"
              value={form.name} onChange={(e) => setField("name", e.target.value)}
              className={inputCls} />
          </div>

          {/* description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea placeholder="Descripción del modelo…"
              value={form.description} onChange={(e) => setField("description", e.target.value)}
              rows={2} className={`${inputCls} resize-none`} />
          </div>

          {/* price */}
          <div>
            <label className={labelCls}>Precio (USD)</label>
            <input type="number" placeholder="220"
              value={form.price} onChange={(e) => setField("price", e.target.value)}
              className={inputCls} />
          </div>

          {/* sizes */}
          <div>
            <label className={labelCls}>Tallas</label>

            {/* Added sizes with qty steppers */}
            {form.sizes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5 p-3 bg-[#0d0d0d] rounded-xl border border-gucha-border">
                {[...form.sizes]
                  .sort((a, b) => parseFloat(a.number) - parseFloat(b.number))
                  .map((s) => (
                    <div key={s.number} className="flex items-center gap-0.5 bg-gucha-dark border border-gucha-green/30 rounded-lg pl-2 pr-1 py-1">
                      <span className="text-[11px] text-white font-bold w-7 text-center">{s.number}</span>
                      <button type="button" onClick={() => adjustQty(s.number, -1)}
                        className="w-5 h-5 flex items-center justify-center text-gucha-muted hover:text-white text-xs transition-colors">−</button>
                      <span className="text-[11px] text-gucha-red font-bold w-4 text-center">{s.quantity}</span>
                      <button type="button" onClick={() => adjustQty(s.number, +1)}
                        className="w-5 h-5 flex items-center justify-center text-gucha-muted hover:text-white text-xs transition-colors">+</button>
                      <button type="button" onClick={() => toggleSize(s.number)}
                        className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-gucha-red/30 text-gucha-muted hover:text-gucha-red-light text-[9px] transition-colors ml-0.5">✕</button>
                    </div>
                  ))}
              </div>
            )}

            {/* US size picker */}
            <div className="flex flex-wrap gap-1.5 p-3 bg-[#0d0d0d] rounded-xl border border-gucha-border">
              {US_SIZES.map((size) => {
                const added = form.sizes.some((s) => s.number === size);
                return (
                  <button key={size} type="button" onClick={() => toggleSize(size)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                      added
                        ? "bg-gucha-green-dark/60 border border-gucha-green/40 text-gucha-green-light"
                        : "bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/50"
                    }`}>
                    {size}
                  </button>
                );
              })}
            </div>
            <p className="text-[9px] text-gucha-muted mt-1.5 tracking-wide">
              Toca para agregar/quitar · ajusta cantidad con − +
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-gucha-red-dark/30 border border-gucha-red/20 rounded-xl px-3 py-2">
              <span className="text-gucha-red">!</span>
              <p className="text-[12px] text-gucha-red-light">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1 pb-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle rounded-xl py-2.5 text-[12px] font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-red-gradient text-white rounded-xl py-2.5 text-[12px] font-bold tracking-wide hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? "Guardando…" : product ? "Guardar cambios" : "Agregar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
