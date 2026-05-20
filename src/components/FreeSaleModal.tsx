"use client";

import { useEffect, useState } from "react";

interface Props {
  onSell:  (product: string, size: string, qty: number, price: number, buyer: string, note: string) => Promise<void>;
  onClose: () => void;
}

export default function FreeSaleModal({ onSell, onClose }: Props) {
  const [product, setProduct] = useState("");
  const [size,    setSize]    = useState("");
  const [qty,     setQty]     = useState(1);
  const [price,   setPrice]   = useState(0);
  const [buyer,   setBuyer]   = useState("");
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const safeQty   = Math.max(1, qty);
  const safePrice = Math.max(0, price);
  const total     = safeQty * safePrice;
  const canSell   = product.trim().length > 0 && size.trim().length > 0;

  async function handleSell() {
    if (saving || !canSell) return;
    setSaving(true);
    setError("");
    try {
      await onSell(product.trim(), size.trim(), safeQty, safePrice, buyer.trim(), note.trim());
    } catch {
      setError("Error al registrar la venta");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#111] border border-gucha-border rounded-2xl w-full max-w-sm shadow-card animate-fade-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gucha-border/60 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gucha-muted tracking-widest uppercase">Fuera de inventario</p>
            <p className="text-[15px] font-black text-white">Venta libre</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]"
          >✕</button>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">

          {/* product name */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">
              Modelo <span className="text-gucha-red normal-case tracking-normal">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Air Force 1 Low"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
            />
          </div>

          {/* size */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">
              Size <span className="text-gucha-red normal-case tracking-normal">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: 10"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
            />
          </div>

          {/* qty */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Pares vendidos</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors"
              >−</button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="flex-1 text-center bg-[#0d0d0d] border border-gucha-border rounded-xl py-2 text-white text-[16px] font-bold outline-none focus:border-gucha-subtle/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={() => setQty((q) => q + 1)}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors"
              >+</button>
            </div>
          </div>

          {/* price */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Precio por par</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gucha-muted font-bold">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                className="w-full pl-7 bg-[#0d0d0d] border border-gucha-border rounded-xl py-2.5 text-white text-[14px] font-bold outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* buyer */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">
              Cliente <span className="text-gucha-subtle normal-case tracking-normal">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Nombre del comprador"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
            />
          </div>

          {/* note */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">
              Nota <span className="text-gucha-subtle normal-case tracking-normal">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ej: pago en efectivo"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
            />
          </div>

          {/* total preview */}
          <div className="flex items-center justify-between bg-[#0d0d0d] border border-gucha-border rounded-xl px-4 py-2.5">
            <span className="text-[11px] text-gucha-muted">{safeQty} par{safeQty > 1 ? "es" : ""} × ${safePrice.toFixed(2)}</span>
            <span className="text-[16px] font-black text-gucha-green-light">+${total.toFixed(2)}</span>
          </div>

          {error && <p className="text-[11px] text-gucha-red text-center">{error}</p>}
        </div>

        {/* footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gucha-border/60 flex-shrink-0 flex flex-col gap-2">
          <button
            onClick={handleSell}
            disabled={saving || !canSell}
            className="w-full py-2.5 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-red-glow"
          >
            {saving ? "Registrando…" : "Confirmar venta"}
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
