"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductData, ProductFormData, SizeFormEntry } from "@/types";

interface Props {
  product: ProductData | null;
  onClose: () => void;
  onSave:  (data: ProductFormData, id?: number) => Promise<void>;
}

const empty: ProductFormData = {
  modelNum: "", name: "", description: "", price: "", imageUrl: "", sizes: [],
};

const labelCls = "block text-[9px] font-bold text-gucha-muted tracking-[0.2em] uppercase mb-1.5";
const inputCls =
  "w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/60 outline-none focus:border-gucha-subtle/60 transition-colors duration-200";

export default function ProductModal({ product, onClose, onSave }: Props) {
  const [form,    setForm]    = useState<ProductFormData>(empty);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [newSize, setNewSize] = useState<SizeFormEntry>({ number: "", quantity: 1 });
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (product) {
      setForm({
        modelNum:    product.modelNum,
        name:        product.name,
        description: product.description ?? "",
        price:       product.price != null ? String(product.price) : "",
        imageUrl:    product.imageUrl ?? "",
        sizes:       product.sizes.map((s) => ({ number: s.number, quantity: s.quantity })),
      });
    } else {
      setForm(empty);
    }
    setError("");
    setTimeout(() => firstInputRef.current?.focus(), 100);
  }, [product]);

  function setField<K extends keyof ProductFormData>(k: K, v: ProductFormData[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function addSize() {
    if (!newSize.number.trim()) return;
    setForm((f) => ({ ...f, sizes: [...f.sizes, { ...newSize }] }));
    setNewSize({ number: "", quantity: 1 });
  }

  function removeSize(i: number) {
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) }));
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
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111] border border-gucha-border rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-card animate-fade-up">

        {/* header */}
        <div className="sticky top-0 z-10 bg-[#111] flex items-center justify-between px-6 pt-6 pb-4 border-b border-gucha-border-2">
          <div>
            <h2 className="text-[15px] font-black text-white tracking-[0.1em]">
              {product ? "EDITAR" : "NUEVO PRODUCTO"}
            </h2>
            {product && (
              <p className="text-[10px] text-gucha-muted mt-0.5 tracking-wide">
                {product.modelNum || product.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* model num */}
          <div>
            <label className={labelCls}>Número de modelo</label>
            <input
              ref={firstInputRef}
              placeholder="Ej: MODELO #05"
              value={form.modelNum}
              onChange={(e) => setField("modelNum", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* name */}
          <div>
            <label className={labelCls}>Nombre *</label>
            <input
              placeholder="Ej: Air Jordan 5 Retro Fire Red"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* description */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              placeholder="Descripción del modelo..."
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* price + image */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Precio (USD)</label>
              <input
                type="number" placeholder="220"
                value={form.price}
                onChange={(e) => setField("price", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>URL de imagen</label>
              <input
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setField("imageUrl", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* sizes section */}
          <div>
            <label className={labelCls}>Tallas</label>

            {/* pills preview */}
            {form.sizes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3 p-3 bg-[#0d0d0d] rounded-xl border border-gucha-border">
                {form.sizes.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 bg-gucha-dark border border-gucha-border rounded-lg pl-2.5 pr-1.5 py-1"
                  >
                    <span className="text-[11px] text-white font-semibold">
                      {s.number}
                      {s.quantity > 1 && (
                        <span className="text-[9px] text-gucha-red ml-0.5">×{s.quantity}</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSize(i)}
                      className="w-4 h-4 flex items-center justify-center rounded-full bg-gucha-border hover:bg-gucha-red/30 text-gucha-muted hover:text-gucha-red-light text-[9px] transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* add size row */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Talla (7, 8.5…)"
                value={newSize.number}
                onChange={(e) => setNewSize((s) => ({ ...s, number: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
                className={`${inputCls} flex-1`}
              />
              <input
                type="number" min={1} max={99}
                value={newSize.quantity}
                onChange={(e) => setNewSize((s) => ({ ...s, quantity: Number(e.target.value) }))}
                title="Cantidad"
                className={`${inputCls} w-16 text-center`}
              />
              <button
                type="button"
                onClick={addSize}
                className="w-11 h-[42px] flex items-center justify-center bg-gucha-dark border border-gucha-border rounded-xl text-white text-xl hover:border-gucha-subtle hover:text-gucha-green-light transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-[9px] text-gucha-muted mt-1.5 tracking-wide">
              Escribe el número → ajusta cantidad → presiona +
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-gucha-red-dark/30 border border-gucha-red/20 rounded-xl px-3 py-2">
              <span className="text-gucha-red text-sm">!</span>
              <p className="text-[12px] text-gucha-red-light">{error}</p>
            </div>
          )}

          {/* actions */}
          <div className="flex gap-3 pt-1 pb-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle rounded-xl py-2.5 text-[12px] font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-gradient text-white rounded-xl py-2.5 text-[12px] font-bold tracking-wide transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {saving ? "Guardando…" : product ? "Guardar cambios" : "Agregar producto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
