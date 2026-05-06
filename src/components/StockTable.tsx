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
function SizeEditModal({
  size, onConfirm, onClose,
}: {
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
        <select
          value={num}
          onChange={(e) => setNum(e.target.value)}
          className="w-full mb-3 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none focus:border-gucha-subtle/60 transition-colors appearance-none cursor-pointer"
        >
          {US_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Cantidad en stock</label>
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white text-lg hover:border-gucha-subtle/60 transition-colors">−</button>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="flex-1 text-center bg-[#0d0d0d] border border-gucha-border rounded-xl py-2 text-white text-[16px] font-bold outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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

// ── Add size inline row ────────────────────────────────────────────────────────
function AddSizeRow({ onAdd, existingSizes = [] }: { onAdd: (number: string, quantity: number) => void; existingSizes?: string[] }) {
  const [num, setNum] = useState("");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  const available = US_SIZES.filter((s) => !existingSizes.includes(s));

  async function handleAdd() {
    if (!num || saving) return;
    setSaving(true);
    await onAdd(num, qty);
    setNum(""); setQty(1); setSaving(false);
  }

  return (
    <tr className="border-t border-gucha-border/60 bg-white/[0.015]">
      <td colSpan={8} className="px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gucha-muted tracking-widest uppercase whitespace-nowrap">+ Talla</span>
          <select
            value={num}
            onChange={(e) => setNum(e.target.value)}
            className="flex-1 bg-[#0d0d0d] border border-gucha-border rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-gucha-subtle/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Talla…</option>
            {available.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            type="number" min={1} value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            title="Cantidad"
            className="w-14 bg-[#0d0d0d] border border-gucha-border rounded-lg px-2 py-1.5 text-[11px] text-white text-center outline-none focus:border-gucha-subtle/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button onClick={handleAdd} disabled={!num || saving}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gucha-green-dark/60 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap">
            {saving ? "…" : "Agregar"}
          </button>
        </div>
      </td>
    </tr>
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

  const grandRevenueList = products.reduce((acc, p) => {
    if (!p.price) return acc;
    return acc + p.sizes.reduce((a, s) => a + s.sold * p.price!, 0);
  }, 0);
  const grandRevenueReal = products.reduce((acc, p) =>
    acc + p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0), 0
  );

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

        {products.map((product) => {
          const totalPairs  = product.sizes.reduce((a, s) => a + s.quantity, 0);
          const soldPairs   = product.sizes.reduce((a, s) => a + s.sold, 0);
          const available   = totalPairs - soldPairs;
          const pct         = totalPairs > 0 ? Math.round((soldPairs / totalPairs) * 100) : 0;
          const isOut       = totalPairs > 0 && available === 0;
          const revenueList = product.price ? soldPairs * product.price : null;
          const revenueReal = product.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0);

          const sorted = [...product.sizes].sort(
            (a, b) => parseFloat(a.number) - parseFloat(b.number)
          );

          return (
            <div key={product.id}
              className={`border rounded-2xl overflow-hidden transition-all ${
                product.hidden ? "bg-[#0d0d0d] border-gucha-border/30 opacity-60" : "bg-card-gradient border-gucha-border"
              }`}>

              {/* ── Product header ── */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gucha-border/60">
                <div className={`w-[3px] h-8 rounded-full flex-shrink-0 ${
                  product.hidden ? "bg-gucha-muted" : isOut ? "bg-gucha-red" : "bg-gradient-to-b from-gucha-green to-gucha-green/20"
                }`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(product.brand?.name || product.modelNum) && (
                      <span className="text-[9px] font-bold text-gucha-red tracking-[0.2em] uppercase">
                        {product.brand?.name ?? product.modelNum}
                      </span>
                    )}
                    <span className={`text-[13px] font-bold truncate ${product.hidden ? "text-gucha-muted line-through" : "text-white"}`}>
                      {product.name}
                    </span>
                    {product.hidden && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-border text-gucha-muted border border-gucha-border tracking-wider uppercase">Oculto</span>
                    )}
                  </div>
                  {totalPairs > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-[2px] bg-gucha-border rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-gucha-red to-gucha-red/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-gucha-muted whitespace-nowrap">{soldPairs}/{totalPairs} vendidos</span>
                    </div>
                  )}
                </div>

                {/* price */}
                {product.price && (
                  <div className="hidden sm:flex flex-shrink-0 mr-2">
                    <span className="text-[11px] font-bold text-white/60">${product.price.toFixed(0)} / par</span>
                  </div>
                )}

                {/* status */}
                <div className="flex-shrink-0">
                  {isOut
                    ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-red-dark/50 text-gucha-red-light border border-gucha-red/20 tracking-wider uppercase">Agotado</span>
                    : <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-green-dark/60 text-gucha-green-light border border-gucha-green/20 tracking-wider uppercase">{available} disp.</span>
                  }
                </div>

                {/* product actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(product)} title="Editar producto"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60 transition-colors text-[11px]">
                    ✎
                  </button>
                  <button onClick={() => onToggleHidden(product.id, !product.hidden)}
                    title={product.hidden ? "Mostrar producto" : "Ocultar producto"}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${
                      product.hidden
                        ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light hover:border-gucha-green"
                        : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60"
                    }`}>
                    <EyeIcon open={!product.hidden} />
                  </button>
                  <button onClick={() => onDelete(product.id)} title="Eliminar producto"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[10px]">
                    ✕
                  </button>
                </div>
              </div>

              {/* ── Sizes table ── */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-gucha-border/40">
                      <th className="text-left px-4 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Talla</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Stock</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Vendidos</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Disponibles</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Precio lista</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-green-light/70 tracking-widest uppercase">Cobrado</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Estado</th>
                      <th className="text-center px-3 py-2 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((size) => {
                      const sizeAvailable = size.quantity - size.sold;
                      const sizeOut       = sizeAvailable <= 0;
                      const sizeRevList   = product.price ? size.sold * product.price : null;
                      const sizeRevReal   = size.revenue ?? 0;
                      const hasDiscount   = sizeRevList !== null && sizeRevReal > 0 && sizeRevReal < sizeRevList;

                      return (
                        <tr key={size.id}
                          className={`border-b border-gucha-border/20 last:border-0 transition-colors ${
                            size.hidden ? "opacity-40" : sizeOut ? "bg-gucha-red-dark/10" : "hover:bg-white/[0.02]"
                          }`}>
                          <td className="px-4 py-2.5">
                            <span className={`font-bold ${size.hidden || sizeOut ? "text-gucha-muted line-through" : "text-white"}`}>
                              {size.number}
                            </span>
                            {size.hidden && <span className="ml-1.5 text-[8px] text-gucha-muted">(oculta)</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center text-gucha-subtle font-semibold">{size.quantity}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${size.sold > 0 ? "text-gucha-red-light" : "text-gucha-muted"}`}>{size.sold}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-black text-[13px] ${sizeOut ? "text-gucha-red/60" : "text-gucha-green-light"}`}>{sizeAvailable}</span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${sizeRevList ? (hasDiscount ? "text-gucha-muted line-through" : "text-gucha-muted") : "text-gucha-muted/40"}`}>
                              {sizeRevList ? `$${sizeRevList.toFixed(2)}` : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`font-bold ${sizeRevReal > 0 ? "text-gucha-green-light" : "text-gucha-muted/40"}`}>
                              {sizeRevReal > 0 ? `$${sizeRevReal.toFixed(2)}` : "—"}
                            </span>
                            {hasDiscount && <span className="ml-1 text-[8px] text-yellow-400 font-bold">🏷</span>}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {size.hidden
                              ? <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-border text-gucha-muted border border-gucha-border uppercase tracking-wide">Oculta</span>
                              : sizeOut
                              ? <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-red-dark/50 text-gucha-red-light border border-gucha-red/20 uppercase tracking-wide">Agotado</span>
                              : <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-green-dark/60 text-gucha-green-light border border-gucha-green/20 uppercase tracking-wide">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block animate-pulse-soft" />
                                  Disponible
                                </span>
                            }
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-center gap-1">
                              {/* venta */}
                              <button
                                onClick={() => setSaleTarget({ size, product })}
                                title="Registrar / revertir venta"
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-green-light hover:border-gucha-green/40 transition-colors text-[10px]"
                              >$</button>
                              {/* editar */}
                              <button
                                onClick={() => setEditTarget({ size, productId: product.id })}
                                title="Editar talla"
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60 transition-colors text-[11px]"
                              >✎</button>
                              {/* ocultar */}
                              <button
                                onClick={() => onToggleSizeHidden(product.id, size.id, !size.hidden)}
                                title={size.hidden ? "Mostrar talla" : "Ocultar talla"}
                                className={`w-6 h-6 flex items-center justify-center rounded-md border transition-colors ${
                                  size.hidden
                                    ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light hover:border-gucha-green"
                                    : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60"
                                }`}
                              ><EyeIcon open={!size.hidden} /></button>
                              {/* eliminar */}
                              <button
                                onClick={() => onDeleteSize(product.id, size.id)}
                                title="Eliminar talla"
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[9px]"
                              >✕</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* subtotal + add size row */}
                  {((revenueList !== null && revenueList > 0) || revenueReal > 0) && (
                    <tfoot>
                      <tr className="border-t border-gucha-border/60 bg-white/[0.02]">
                        <td colSpan={3} className="px-4 py-2 text-[9px] text-gucha-muted tracking-widest uppercase">Subtotal</td>
                        <td />
                        <td className="px-3 py-2 text-center font-bold text-gucha-muted">
                          {revenueList ? `$${revenueList.toFixed(2)}` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center font-black text-gucha-green-light">
                          {revenueReal > 0 ? `$${revenueReal.toFixed(2)}` : "—"}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}

                </table>
              </div>
            </div>
          );
        })}
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
