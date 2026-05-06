"use client";

import { useEffect, useState } from "react";
import type { SaleRecord } from "@/types";

interface Props {
  sizeId:      number;
  sizeNumber:  string;
  available:   number;
  listPrice?:  number;
  onSell:      (qty: number, price: number, buyer: string, note: string) => Promise<void>;
  onRevert:    (saleId: number) => Promise<void>;
  onClose:     () => void;
}

type Mode = "sell" | "revert";

function fmt(date: string) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium", timeStyle: "short",
  }).format(new Date(date));
}

export default function SaleModal({ sizeId, sizeNumber, available, listPrice, onSell, onRevert, onClose }: Props) {
  const [mode,    setMode]    = useState<Mode>(available > 0 ? "sell" : "revert");
  const [qty,     setQty]     = useState(1);
  const [price,   setPrice]   = useState(listPrice ?? 0);
  const [buyer,   setBuyer]   = useState("");
  const [note,    setNote]    = useState("");
  const [saving,  setSaving]  = useState(false);

  // revert tab state
  const [sales,        setSales]        = useState<SaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [reverting,    setReverting]    = useState<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load sales when switching to revert tab
  useEffect(() => {
    if (mode !== "revert") return;
    setLoadingSales(true);
    fetch(`/api/sales?sizeId=${sizeId}`)
      .then((r) => r.json())
      .then((data) => setSales(Array.isArray(data) ? data : []))
      .finally(() => setLoadingSales(false));
  }, [mode, sizeId]);

  const maxQty      = available;
  const safeQty     = Math.max(1, Math.min(qty, maxQty));
  const safePrice   = Math.max(0, price);
  const total       = safeQty * safePrice;
  const hasDiscount = listPrice !== undefined && safePrice < listPrice;
  const discountPct = hasDiscount ? Math.round((1 - safePrice / listPrice!) * 100) : 0;

  async function handleSell() {
    if (saving || maxQty === 0) return;
    setSaving(true);
    await onSell(safeQty, safePrice, buyer.trim(), note.trim());
    setSaving(false);
  }

  async function handleRevert(saleId: number) {
    setReverting(saleId);
    await onRevert(saleId);
    setSales((prev) => prev.filter((s) => s.id !== saleId));
    setReverting(null);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="bg-[#111] border border-gucha-border rounded-2xl w-full max-w-sm shadow-card animate-fade-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gucha-border/60 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gucha-muted tracking-widest uppercase">Talla {sizeNumber}</p>
            <p className="text-[15px] font-black text-white">
              {mode === "sell" ? "Registrar venta" : "Historial de ventas"}
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>

        {/* tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5 mx-5 mt-4 flex-shrink-0">
          <button type="button" onClick={() => setMode("sell")} disabled={maxQty === 0}
            className={["flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all",
              mode === "sell" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            ].join(" ")}>
            Registrar
          </button>
          <button type="button" onClick={() => setMode("revert")}
            className={["flex-1 py-1.5 text-[11px] font-semibold rounded-lg transition-all",
              mode === "revert" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"
            ].join(" ")}>
            Revertir
          </button>
        </div>

        {/* ── SELL mode ── */}
        {mode === "sell" && (
          <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
            {maxQty === 0 ? (
              <p className="text-[12px] text-gucha-muted text-center py-6">No hay pares disponibles</p>
            ) : (
              <>
                {/* qty */}
                <div>
                  <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">
                    Pares vendidos <span className="text-gucha-subtle normal-case tracking-normal">(disponibles: {available})</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors">−</button>
                    <input type="number" min={1} max={maxQty} value={qty}
                      onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value), maxQty)))}
                      className="flex-1 text-center bg-[#0d0d0d] border border-gucha-border rounded-xl py-2 text-white text-[16px] font-bold outline-none focus:border-gucha-subtle/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <button onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors">+</button>
                  </div>
                </div>

                {/* price */}
                <div>
                  <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">
                    Precio por par {listPrice ? <span className="text-gucha-subtle normal-case tracking-normal">(lista: ${listPrice.toFixed(0)})</span> : ""}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gucha-muted font-bold">$</span>
                    <input type="number" min={0} step="0.01" value={price}
                      onChange={(e) => setPrice(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-7 bg-[#0d0d0d] border border-gucha-border rounded-xl py-2.5 text-white text-[14px] font-bold outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                  {hasDiscount && (
                    <p className="text-[10px] text-yellow-400 mt-1 font-semibold">🏷 Descuento del {discountPct}%</p>
                  )}
                </div>

                {/* buyer */}
                <div>
                  <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Cliente <span className="text-gucha-subtle normal-case tracking-normal">(opcional)</span></label>
                  <input type="text" placeholder="Nombre del comprador" value={buyer}
                    onChange={(e) => setBuyer(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors" />
                </div>

                {/* note */}
                <div>
                  <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Nota <span className="text-gucha-subtle normal-case tracking-normal">(opcional)</span></label>
                  <input type="text" placeholder="Ej: pago en efectivo" value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors" />
                </div>

                {/* total preview */}
                <div className="flex items-center justify-between bg-[#0d0d0d] border border-gucha-border rounded-xl px-4 py-2.5">
                  <span className="text-[11px] text-gucha-muted">{safeQty} par{safeQty > 1 ? "es" : ""} × ${safePrice.toFixed(2)}</span>
                  <span className="text-[16px] font-black text-gucha-green-light">+${total.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── REVERT mode ── */}
        {mode === "revert" && (
          <div className="px-5 py-4 overflow-y-auto flex-1">
            {loadingSales ? (
              <div className="flex items-center justify-center py-10 gap-2">
                <div className="w-5 h-5 border-2 border-gucha-border border-t-gucha-green-light rounded-full animate-spin" />
                <span className="text-[12px] text-gucha-muted">Cargando ventas…</span>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2 opacity-30">📭</p>
                <p className="text-[12px] text-gucha-muted">No hay ventas registradas para esta talla</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] text-gucha-muted tracking-widest uppercase mb-3">
                  {sales.length} venta{sales.length > 1 ? "s" : ""} — selecciona para revertir
                </p>
                {sales.map((sale) => (
                  <div key={sale.id}
                    className="flex items-center gap-3 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3 py-2.5 hover:border-gucha-border/80 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-bold text-gucha-muted">#{sale.id}</span>
                        <span className="text-[10px] font-black text-gucha-green-light">
                          ${(sale.quantity * sale.pricePerPair).toFixed(2)}
                        </span>
                        <span className="text-[9px] text-gucha-muted">
                          {sale.quantity} par{sale.quantity > 1 ? "es" : ""} · ${sale.pricePerPair.toFixed(2)}/par
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gucha-subtle truncate">
                          {sale.buyerName || <span className="italic text-gucha-muted">Sin nombre</span>}
                        </span>
                        <span className="text-[9px] text-gucha-muted/60 whitespace-nowrap">{fmt(sale.createdAt)}</span>
                      </div>
                      {sale.note && <p className="text-[9px] text-gucha-muted/60 mt-0.5 truncate">"{sale.note}"</p>}
                    </div>
                    <button
                      onClick={() => handleRevert(sale.id)}
                      disabled={reverting === sale.id}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-gucha-border text-gucha-muted text-[10px] font-semibold hover:text-gucha-red-light hover:border-gucha-red/40 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      {reverting === sale.id ? "…" : "Revertir"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* footer actions */}
        <div className="px-5 pb-5 pt-3 border-t border-gucha-border/60 flex-shrink-0">
          {mode === "sell" && maxQty > 0 && (
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={handleSell} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-red-glow">
                {saving ? "Registrando…" : "Confirmar venta"}
              </button>
            </div>
          )}
          {mode === "revert" && (
            <button onClick={onClose}
              className="w-full py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white transition-colors">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
