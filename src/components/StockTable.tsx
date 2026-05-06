"use client";

import { useState } from "react";
import type { ProductData, SizeData } from "@/types";
import SaleModal from "./SaleModal";

const US_SIZES = [
  "3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5",
  "9","9.5","10","10.5","11","11.5","12","12.5","13","13.5","14","15","16",
];

interface Props {
  products:           ProductData[];
  onEdit:             (product: ProductData) => void;
  onDelete:           (productId: number) => void;
  onToggleHidden:     (productId: number, hidden: boolean) => void;
  onToggleSizeHidden: (productId: number, sizeId: number, hidden: boolean) => void;
  onDeleteSize:       (productId: number, sizeId: number) => void;
  onEditSize:         (productId: number, sizeId: number, number: string, quantity: number) => Promise<void>;
  onSell:             (productId: number, sizeId: number, qty: number, price: number, buyer: string, note: string) => Promise<void>;
  onRevertSale:       (saleId: number) => Promise<void>;
}

// ── Eye icon ──────────────────────────────────────────────────────────────────
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ── Edit size modal ────────────────────────────────────────────────────────────
function SizeEditModal({ size, onConfirm, onClose }: {
  size: SizeData;
  onConfirm: (number: string, quantity: number) => void;
  onClose: () => void;
}) {
  const [num, setNum] = useState(size.number);
  const [qty, setQty] = useState(size.quantity);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="bg-[#111] border border-gucha-border rounded-2xl p-5 w-72 shadow-card animate-fade-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-black text-white">Editar talla</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>
        <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Número de talla</label>
        <select value={num} onChange={(e) => setNum(e.target.value)}
          className="w-full mb-3 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-gucha-subtle/60 transition-colors appearance-none cursor-pointer">
          {US_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Cantidad en stock</label>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors">−</button>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="flex-1 text-center bg-[#0d0d0d] border border-gucha-border rounded-xl py-2 text-white text-[16px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          <button onClick={() => setQty((q) => q + 1)}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors">+</button>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white transition-colors">Cancelar</button>
          <button onClick={() => onConfirm(num, qty)}
            className="flex-1 py-2 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-red-glow">Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StockTable({
  products, onEdit, onDelete, onToggleHidden,
  onToggleSizeHidden, onDeleteSize, onEditSize, onSell, onRevertSale,
}: Props) {
  const [saleTarget, setSaleTarget] = useState<{ size: SizeData; product: ProductData } | null>(null);
  const [editTarget, setEditTarget] = useState<{ size: SizeData; productId: number } | null>(null);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-20">📋</div>
        <p className="text-gucha-subtle text-[13px]">No hay productos</p>
      </div>
    );
  }

  // Flatten: one row per size
  type FlatRow = { product: ProductData; size: SizeData; isFirstOfProduct: boolean };
  const rows: FlatRow[] = products.flatMap((p) => {
    const sorted = [...p.sizes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
    return sorted.map((s, i) => ({ product: p, size: s, isFirstOfProduct: i === 0 }));
  });

  const grandRevenueList = products.reduce((acc, p) =>
    acc + (p.price ? p.sizes.reduce((a, s) => a + s.sold * p.price!, 0) : 0), 0);
  const grandRevenueReal = products.reduce((acc, p) =>
    acc + p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0), 0);

  return (
    <>
      <div className="space-y-4">

        {/* revenue banner */}
        {(grandRevenueList > 0 || grandRevenueReal > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gucha-green-dark/20 border border-gucha-green/20 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-gucha-muted tracking-widest uppercase mb-1">Ingresos de lista</p>
              <p className="text-[18px] font-black text-white">${grandRevenueList.toFixed(2)}</p>
              <p className="text-[9px] text-gucha-muted mt-0.5">precio original × vendidos</p>
            </div>
            <div className="bg-gucha-green-dark/30 border border-gucha-green/30 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-gucha-green-light tracking-widest uppercase mb-1">💰 Cobrado</p>
              <p className="text-[18px] font-black text-gucha-green-light">${grandRevenueReal.toFixed(2)}</p>
              <p className="text-[9px] text-gucha-muted mt-0.5">precio reportado al vender</p>
            </div>
          </div>
        )}

        {/* flat table */}
        <div className="bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gucha-border/60">
                  <th className="text-left px-4 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Marca</th>
                  <th className="text-left px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Modelo</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Talla</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Stock</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Vendidos</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Disp.</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Lista</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-green-light/70 tracking-widest uppercase">Cobrado</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Estado</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product: p, size: s, isFirstOfProduct }) => {
                  const avail       = s.quantity - s.sold;
                  const out         = avail <= 0;
                  const revList     = p.price ? s.sold * p.price : null;
                  const revReal     = s.revenue ?? 0;
                  const hasDiscount = revList !== null && revReal > 0 && revReal < revList;
                  const dimmed      = s.hidden || p.hidden;

                  return (
                    <tr key={s.id}
                      className={[
                        "transition-colors",
                        isFirstOfProduct ? "border-t-2 border-gucha-border/60" : "border-t border-gucha-border/20",
                        dimmed ? "opacity-40" : out ? "bg-gucha-red-dark/5 hover:bg-gucha-red-dark/10" : "hover:bg-white/[0.02]",
                      ].join(" ")}>

                      {/* Marca */}
                      <td className="px-4 py-2.5">
                        {(p.brand?.name || p.modelNum) ? (
                          <span className="text-[9px] font-bold text-gucha-red tracking-widest uppercase">
                            {p.brand?.name ?? p.modelNum}
                          </span>
                        ) : (
                          <span className="text-gucha-muted/40">—</span>
                        )}
                      </td>

                      {/* Modelo + acciones de producto */}
                      <td className="px-3 py-2.5 max-w-[180px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[12px] font-semibold truncate flex-1 ${p.hidden ? "line-through text-gucha-muted" : "text-white"}`}>
                            {p.name}
                          </span>
                          <div className="flex gap-0.5 flex-shrink-0">
                            <button onClick={() => onEdit(p)} title="Editar modelo"
                              className="w-5 h-5 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60 transition-colors text-[10px]">✎</button>
                            <button onClick={() => onToggleHidden(p.id, !p.hidden)} title={p.hidden ? "Mostrar" : "Ocultar"}
                              className={`w-5 h-5 flex items-center justify-center rounded-md border transition-colors ${p.hidden ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light" : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white"}`}>
                              <EyeIcon open={!p.hidden} />
                            </button>
                            <button onClick={() => onDelete(p.id)} title="Eliminar modelo"
                              className="w-5 h-5 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[9px]">✕</button>
                          </div>
                        </div>
                      </td>

                      {/* Talla */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold ${dimmed ? "line-through text-gucha-muted" : "text-white"}`}>
                          {s.number}
                        </span>
                      </td>

                      {/* Stock */}
                      <td className="px-3 py-2.5 text-center text-gucha-subtle font-semibold">{s.quantity}</td>

                      {/* Vendidos */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold ${s.sold > 0 ? "text-gucha-red-light" : "text-gucha-muted"}`}>{s.sold}</span>
                      </td>

                      {/* Disponibles */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-black text-[13px] ${out ? "text-gucha-red/60" : "text-gucha-green-light"}`}>{avail}</span>
                      </td>

                      {/* Lista */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold ${revList && hasDiscount ? "text-gucha-muted line-through" : "text-gucha-muted"}`}>
                          {revList ? `$${revList.toFixed(2)}` : "—"}
                        </span>
                      </td>

                      {/* Cobrado */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-bold ${revReal > 0 ? "text-gucha-green-light" : "text-gucha-muted/40"}`}>
                          {revReal > 0 ? `$${revReal.toFixed(2)}` : "—"}
                        </span>
                        {hasDiscount && <span className="ml-1 text-[8px] text-yellow-400">🏷</span>}
                      </td>

                      {/* Estado */}
                      <td className="px-3 py-2.5 text-center">
                        {s.hidden || p.hidden
                          ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-border text-gucha-muted border border-gucha-border uppercase tracking-wide">Oculta</span>
                          : out
                          ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-red-dark/50 text-gucha-red-light border border-gucha-red/20 uppercase tracking-wide">Agotado</span>
                          : <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-green-dark/60 text-gucha-green-light border border-gucha-green/20 uppercase tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block animate-pulse-soft" />
                              Disp.
                            </span>
                        }
                      </td>

                      {/* Acciones de talla */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setSaleTarget({ size: s, product: p })} title="Venta"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-green-light hover:border-gucha-green/40 transition-colors text-[10px]">$</button>
                          <button onClick={() => setEditTarget({ size: s, productId: p.id })} title="Editar talla"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60 transition-colors text-[11px]">✎</button>
                          <button onClick={() => onToggleSizeHidden(p.id, s.id, !s.hidden)} title={s.hidden ? "Mostrar talla" : "Ocultar talla"}
                            className={`w-6 h-6 flex items-center justify-center rounded-md border transition-colors ${s.hidden ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light" : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white"}`}>
                            <EyeIcon open={!s.hidden} />
                          </button>
                          <button onClick={() => onDeleteSize(p.id, s.id)} title="Eliminar talla"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[9px]">✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SaleModal ── */}
      {saleTarget && (
        <SaleModal
          sizeId={saleTarget.size.id}
          sizeNumber={saleTarget.size.number}
          available={saleTarget.size.quantity - saleTarget.size.sold}
          listPrice={saleTarget.product.price ?? undefined}
          onSell={async (qty, price, buyer, note) => {
            await onSell(saleTarget.product.id, saleTarget.size.id, qty, price, buyer, note);
            setSaleTarget(null);
          }}
          onRevert={onRevertSale}
          onClose={() => setSaleTarget(null)}
        />
      )}

      {/* ── SizeEditModal ── */}
      {editTarget && (
        <SizeEditModal
          size={editTarget.size}
          onConfirm={async (number, quantity) => {
            await onEditSize(editTarget.productId, editTarget.size.id, number, quantity);
            setEditTarget(null);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}
