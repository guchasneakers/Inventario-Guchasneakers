"use client";

import { useMemo, useState } from "react";
import type { ProductData, SizeData } from "@/types";
import SaleModal from "./SaleModal";

const US_SIZES = [
  "3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5",
  "9","9.5","10","10.5","11","11.5","12","12.5","13","13.5","14","15","16",
];

interface Props {
  products:           ProductData[];
  editMode?:          boolean;
  onEdit:             (product: ProductData) => void;
  onDelete:           (productId: number) => void;
  onToggleHidden:     (productId: number, hidden: boolean) => void;
  onToggleSizeHidden: (productId: number, sizeId: number, hidden: boolean) => void;
  onDeleteSize:       (productId: number, sizeId: number) => void;
  onEditSize:         (productId: number, sizeId: number, number: string, quantity: number) => Promise<void>;
  onSell:             (productId: number, sizeId: number, qty: number, price: number, buyer: string, note: string) => Promise<void>;
  onRevertSale:       (saleId: number) => Promise<void>;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-3 h-3 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SizeEditModal({ size, onConfirm, onClose }: {
  size: SizeData;
  onConfirm: (number: string, quantity: number) => void;
  onClose: () => void;
}) {
  const [num, setNum] = useState(size.number);
  const [qty, setQty] = useState(size.quantity);
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="bg-[#111] border border-gucha-border rounded-2xl p-5 w-72 shadow-card animate-fade-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[14px] font-black text-white">Editar talla</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>
        <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Número de talla</label>
        <select value={num} onChange={(e) => setNum(e.target.value)}
          className="w-full mb-3 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white outline-none appearance-none cursor-pointer">
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

export default function MobileStockList({
  products, editMode = false, onEdit, onDelete, onToggleHidden,
  onToggleSizeHidden, onDeleteSize, onEditSize, onSell, onRevertSale,
}: Props) {
  const [selectedSizes, setSelectedSizes] = useState<Record<number, number>>({});
  const [saleTarget,    setSaleTarget]    = useState<{ size: SizeData; product: ProductData } | null>(null);
  const [editTarget,    setEditTarget]    = useState<{ size: SizeData; productId: number } | null>(null);

  function toggleSize(productId: number, sizeId: number) {
    setSelectedSizes((prev) => {
      if (prev[productId] === sizeId) {
        const next = { ...prev }; delete next[productId]; return next;
      }
      return { ...prev, [productId]: sizeId };
    });
  }

  // Group by brand
  const groups = useMemo(() => {
    const brandMap = new Map<string, { label: string; products: ProductData[] }>();
    products.forEach((p) => {
      const key   = p.brand?.name ?? "__sin_marca__";
      const label = p.brand?.name ?? "Sin marca";
      if (!brandMap.has(key)) brandMap.set(key, { label, products: [] });
      brandMap.get(key)!.products.push(p);
    });
    return [...brandMap.entries()].sort(([a], [b]) =>
      a === "__sin_marca__" ? 1 : b === "__sin_marca__" ? -1 : a.localeCompare(b)
    );
  }, [products]);

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4 opacity-20">📋</div>
        <p className="text-gucha-subtle text-[13px]">No hay productos</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {groups.map(([key, { label, products: groupProducts }]) => (
          <div key={key} className="bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden">

            {/* Brand header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gucha-border/40 bg-white/[0.02]">
              <span className="text-[10px] font-black text-gucha-red tracking-[0.2em] uppercase">{label}</span>
              <span className="text-[9px] text-gucha-muted">
                {groupProducts.length} {groupProducts.length === 1 ? "modelo" : "modelos"}
              </span>
            </div>

            {/* Product rows */}
            <div className="divide-y divide-gucha-border/20">
              {groupProducts.map((p) => {
                const selId   = selectedSizes[p.id];
                const selSize = p.sizes.find((s) => s.id === selId) ?? null;
                const sorted  = [...p.sizes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

                // Stats
                const stock  = selSize ? selSize.quantity : p.sizes.reduce((a, s) => a + s.quantity, 0);
                const sold   = selSize ? selSize.sold     : p.sizes.reduce((a, s) => a + s.sold, 0);
                const avail  = stock - sold;
                const isOut  = p.sizes.filter((s) => !s.hidden).every((s) => s.sold >= s.quantity);
                const selOut = selSize ? selSize.sold >= selSize.quantity : isOut;
                const revenue = selSize
                  ? (selSize.revenue ?? 0)
                  : p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0);

                return (
                  <div key={p.id} className={`px-4 py-3 space-y-2.5 ${p.hidden ? "opacity-40" : ""}`}>

                    {/* Row 1: Name + product actions */}
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-[12px] font-semibold leading-snug flex-1 ${p.hidden ? "line-through text-gucha-muted" : "text-white"}`}>
                        {p.name}
                      </p>
                      {editMode && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => onEdit(p)} title="Editar"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[10px]">✎</button>
                          <button onClick={() => onToggleHidden(p.id, !p.hidden)} title={p.hidden ? "Mostrar" : "Ocultar"}
                            className={`w-6 h-6 flex items-center justify-center rounded-md border transition-colors ${p.hidden ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light" : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white"}`}>
                            <EyeIcon open={!p.hidden} />
                          </button>
                          <button onClick={() => onDelete(p.id)} title="Eliminar"
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[9px]">✕</button>
                        </div>
                      )}
                    </div>

                    {/* Row 2: Size chips */}
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                      {sorted.map((s) => {
                        const isSel = selId === s.id;
                        const sOut  = s.sold >= s.quantity;
                        const avDisp = s.quantity - s.sold;

                        let chipCls: string;
                        let dot: React.ReactNode = null;

                        if (isSel) {
                          chipCls = "bg-white text-black border-white";
                        } else if (s.hidden) {
                          chipCls = "bg-transparent border-gucha-border/30 text-gucha-muted/40 line-through";
                          dot = <span className="w-1 h-1 rounded-full bg-gucha-muted/40 flex-shrink-0" />;
                        } else if (sOut) {
                          chipCls = "bg-gucha-red-dark/30 border-gucha-red/40 text-gucha-red-light";
                          dot = <span className="w-1.5 h-1.5 rounded-full bg-gucha-red flex-shrink-0" />;
                        } else {
                          chipCls = "bg-[#0d0d0d] border-gucha-border text-gucha-subtle";
                          dot = <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light flex-shrink-0" title={`${avDisp} disp.`} />;
                        }

                        return (
                          <button key={s.id}
                            onClick={() => toggleSize(p.id, s.id)}
                            title={s.hidden ? `T${s.number} oculta` : sOut ? `T${s.number} agotada` : `T${s.number} · ${avDisp} disp.`}
                            className={[
                              "flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95",
                              chipCls,
                            ].join(" ")}>
                            {!isSel && dot}
                            {s.number}
                          </button>
                        );
                      })}
                    </div>

                    {/* Row 3: Stats bar */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-gucha-border/50 rounded-lg px-2.5 py-1">
                        <span className="text-[9px] text-gucha-muted uppercase tracking-wide">Stock</span>
                        <span className="text-[12px] font-black text-gucha-subtle">{stock}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-gucha-border/50 rounded-lg px-2.5 py-1">
                        <span className="text-[9px] text-gucha-muted uppercase tracking-wide">Vendidos</span>
                        <span className={`text-[12px] font-black ${sold > 0 ? "text-gucha-red-light" : "text-gucha-muted"}`}>{sold}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-gucha-border/50 rounded-lg px-2.5 py-1">
                        <span className="text-[9px] text-gucha-muted uppercase tracking-wide">Disp.</span>
                        <span className={`text-[12px] font-black ${selOut ? "text-gucha-red/70" : "text-gucha-green-light"}`}>{avail}</span>
                      </div>
                      {p.price && (
                        <div className="flex items-center gap-1.5 bg-[#0d0d0d] border border-gucha-border/50 rounded-lg px-2.5 py-1">
                          <span className="text-[9px] text-gucha-muted uppercase tracking-wide">$</span>
                          <span className="text-[12px] font-black text-gucha-muted">{p.price.toFixed(0)}</span>
                        </div>
                      )}
                      {revenue > 0 && (
                        <div className="flex items-center gap-1.5 bg-gucha-green-dark/30 border border-gucha-green/20 rounded-lg px-2.5 py-1">
                          <span className="text-[9px] text-gucha-green-light/70 uppercase tracking-wide">💰</span>
                          <span className="text-[12px] font-black text-gucha-green-light">${revenue.toFixed(0)}</span>
                        </div>
                      )}
                    </div>

                    {/* Row 4: Size actions (only when a size is selected) */}
                    {selSize ? (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[9px] text-gucha-muted flex-shrink-0">T{selSize.number}:</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => setSaleTarget({ size: selSize, product: p })}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gucha-green-dark/40 border border-gucha-green/30 text-gucha-green-light text-[10px] font-bold active:scale-95 transition-all">
                            $ Vender
                          </button>
                          {editMode && (
                            <>
                              <button onClick={() => setEditTarget({ size: selSize, productId: p.id })}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✎</button>
                              <button onClick={() => onToggleSizeHidden(p.id, selSize.id, !selSize.hidden)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-colors ${selSize.hidden ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light" : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white"}`}>
                                <EyeIcon open={!selSize.hidden} />
                              </button>
                              <button onClick={() => onDeleteSize(p.id, selSize.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[9px]">✕</button>
                            </>
                          )}
                        </div>
                        <button onClick={() => toggleSize(p.id, selId)}
                          className="ml-auto text-[9px] text-gucha-muted/50 hover:text-gucha-muted transition-colors">
                          deselect
                        </button>
                      </div>
                    ) : (
                      sorted.length > 0 && (
                        <p className="text-[9px] text-gucha-muted/40">Toca una talla para ver acciones</p>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

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
