"use client";

import { useMemo, useState } from "react";
import type { ProductData, SizeData } from "@/types";
import SaleModal from "./SaleModal";

const US_SIZES = [
  "3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5",
  "9","9.5","10","10.5","11","11.5","12","12.5","13","13.5","14","15","16",
];

type StatusFilter = "all" | "available" | "soldout" | "hidden";

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

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "Todos"    },
  { value: "available", label: "Disp."    },
  { value: "soldout",   label: "Agotados" },
  { value: "hidden",    label: "Ocultos"  },
];

export default function StockTable({
  products, onEdit, onDelete, onToggleHidden,
  onToggleSizeHidden, onDeleteSize, onEditSize, onSell, onRevertSale,
}: Props) {
  const [selectedSizes, setSelectedSizes] = useState<Record<number, number>>({});
  const [saleTarget,    setSaleTarget]    = useState<{ size: SizeData; product: ProductData } | null>(null);
  const [editTarget,    setEditTarget]    = useState<{ size: SizeData; productId: number } | null>(null);

  // ── Table-local filters ───────────────────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [statusFilt, setStatusFilt] = useState<StatusFilter>("all");
  const [sizeFilt,   setSizeFilt]   = useState("");

  function toggleSize(productId: number, sizeId: number) {
    setSelectedSizes((prev) => {
      if (prev[productId] === sizeId) {
        const next = { ...prev }; delete next[productId]; return next;
      }
      return { ...prev, [productId]: sizeId };
    });
  }

  // ── Collect all sizes present in products (for filter pills) ─────────────
  const allSizeNumbers = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s.number)));
    return US_SIZES.filter((s) => set.has(s));
  }, [products]);

  // ── Apply filters ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      // search
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !(p.brand?.name.toLowerCase().includes(search.toLowerCase()))) return false;

      // size filter
      if (sizeFilt && !p.sizes.some((s) => s.number === sizeFilt)) return false;

      // status filter
      if (statusFilt === "hidden")    return p.hidden || p.sizes.some((s) => s.hidden);
      if (statusFilt === "available") {
        if (p.hidden) return false;
        return p.sizes.some((s) => !s.hidden && s.sold < s.quantity);
      }
      if (statusFilt === "soldout") {
        if (p.hidden) return false;
        const visible = p.sizes.filter((s) => !s.hidden);
        return visible.length > 0 && visible.every((s) => s.sold >= s.quantity);
      }
      return true;
    });
  }, [products, search, statusFilt, sizeFilt]);

  const hasFilters = search !== "" || statusFilt !== "all" || sizeFilt !== "";

  // ── Group by brand ────────────────────────────────────────────────────────
  const groups = useMemo(() => {
    const brandMap = new Map<string, { label: string; products: ProductData[] }>();
    filtered.forEach((p) => {
      const key   = p.brand?.name ?? "__sin_marca__";
      const label = p.brand?.name ?? "Sin marca";
      if (!brandMap.has(key)) brandMap.set(key, { label, products: [] });
      brandMap.get(key)!.products.push(p);
    });
    return [...brandMap.entries()].sort(([a], [b]) =>
      a === "__sin_marca__" ? 1 : b === "__sin_marca__" ? -1 : a.localeCompare(b)
    );
  }, [filtered]);

  // ── Revenue totals ────────────────────────────────────────────────────────
  const grandList = products.reduce((acc, p) =>
    acc + (p.price ? p.sizes.reduce((a, s) => a + s.sold * p.price!, 0) : 0), 0);
  const grandReal = products.reduce((acc, p) =>
    acc + p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0), 0);

  return (
    <>
      <div className="space-y-4">

        {/* revenue banner */}
        {(grandList > 0 || grandReal > 0) && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gucha-green-dark/20 border border-gucha-green/20 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-gucha-muted tracking-widest uppercase mb-1">Ingresos de lista</p>
              <p className="text-[18px] font-black text-white">${grandList.toFixed(2)}</p>
              <p className="text-[9px] text-gucha-muted mt-0.5">precio original × vendidos</p>
            </div>
            <div className="bg-gucha-green-dark/30 border border-gucha-green/30 rounded-xl px-4 py-3">
              <p className="text-[9px] font-bold text-gucha-green-light tracking-widest uppercase mb-1">💰 Cobrado</p>
              <p className="text-[18px] font-black text-gucha-green-light">${grandReal.toFixed(2)}</p>
              <p className="text-[9px] text-gucha-muted mt-0.5">precio reportado al vender</p>
            </div>
          </div>
        )}

        {/* ── Inline filters ── */}
        <div className="bg-card-gradient border border-gucha-border rounded-2xl px-4 py-3 space-y-3">

          {/* search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gucha-muted text-[11px]">🔍</span>
            <input
              type="text" placeholder="Buscar modelo o marca…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-[#0d0d0d] border border-gucha-border rounded-xl text-[12px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* status tabs */}
            <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
              {STATUS_TABS.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => setStatusFilt(value)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                    statusFilt === value ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* size pills — horizontal scroll on mobile */}
            {allSizeNumbers.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                {allSizeNumbers.map((s) => (
                  <button key={s} type="button"
                    onClick={() => setSizeFilt(sizeFilt === s ? "" : s)}
                    className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      sizeFilt === s
                        ? "bg-gucha-dark border-gucha-subtle/60 text-white"
                        : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/50"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* clear */}
            {hasFilters && (
              <button type="button"
                onClick={() => { setSearch(""); setStatusFilt("all"); setSizeFilt(""); }}
                className="text-[10px] text-gucha-muted hover:text-white transition-colors underline underline-offset-2 whitespace-nowrap">
                Limpiar
              </button>
            )}
          </div>

          {hasFilters && (
            <p className="text-[9px] text-gucha-muted">
              Mostrando <span className="text-white font-bold">{filtered.length}</span> de {products.length} modelos
            </p>
          )}
        </div>

        {/* table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-20">🔍</div>
            <p className="text-gucha-subtle text-[13px]">Sin resultados</p>
            <button onClick={() => { setSearch(""); setStatusFilt("all"); setSizeFilt(""); }}
              className="mt-3 text-[11px] text-gucha-muted hover:text-white underline underline-offset-2 transition-colors">
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-gucha-border/60">
                    <th className="text-left px-4 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase min-w-[200px]">Modelo</th>
                    <th className="text-left px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Tallas · Estado</th>
                    <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Stock</th>
                    <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Vendidos</th>
                    <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Disp.</th>
                    <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Lista</th>
                    <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-green-light/70 tracking-widest uppercase">Cobrado</th>
                    <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Acciones</th>
                  </tr>
                </thead>

                {groups.map(([key, { label, products: groupProducts }]) => {
                  const groupList = groupProducts.reduce((acc, p) =>
                    acc + (p.price ? p.sizes.reduce((a, s) => a + s.sold * p.price!, 0) : 0), 0);
                  const groupReal = groupProducts.reduce((acc, p) =>
                    acc + p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0), 0);

                  return (
                    <tbody key={key}>
                      {/* Brand header row */}
                      <tr className="border-t-2 border-gucha-border/60 bg-white/[0.03]">
                        <td colSpan={8} className="px-4 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-gucha-red tracking-[0.2em] uppercase">
                                {label}
                              </span>
                              <span className="text-[9px] text-gucha-muted">
                                {groupProducts.length} {groupProducts.length === 1 ? "modelo" : "modelos"}
                              </span>
                            </div>
                            {(groupList > 0 || groupReal > 0) && (
                              <div className="flex items-center gap-3">
                                {groupList > 0 && (
                                  <span className="text-[10px] text-gucha-muted">
                                    Lista <span className="font-bold text-white">${groupList.toFixed(0)}</span>
                                  </span>
                                )}
                                {groupReal > 0 && (
                                  <span className="text-[10px] text-gucha-muted">
                                    Cobrado <span className="font-bold text-gucha-green-light">${groupReal.toFixed(0)}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Model rows */}
                      {groupProducts.map((p) => {
                        const selId   = selectedSizes[p.id];
                        const selSize = p.sizes.find((s) => s.id === selId) ?? null;
                        const sorted  = [...p.sizes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

                        // Stats: selected size or aggregates
                        const stock   = selSize ? selSize.quantity : p.sizes.reduce((a, s) => a + s.quantity, 0);
                        const sold    = selSize ? selSize.sold     : p.sizes.reduce((a, s) => a + s.sold, 0);
                        const avail   = stock - sold;
                        const revList = p.price ? (selSize ? selSize.sold * p.price : sold * p.price) : null;
                        const revReal = selSize
                          ? (selSize.revenue ?? 0)
                          : p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0);
                        const hasDiscount = revList !== null && revReal > 0 && revReal < revList;
                        const isOut   = p.sizes.filter((s) => !s.hidden).every((s) => s.sold >= s.quantity);
                        const selOut  = selSize ? selSize.sold >= selSize.quantity : isOut;

                        return (
                          <tr key={p.id}
                            className={`border-t border-gucha-border/20 transition-colors ${p.hidden ? "opacity-40" : "hover:bg-white/[0.02]"}`}>

                            {/* Modelo + product actions */}
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-1.5">
                                <span className={`text-[12px] font-semibold leading-snug flex-1 ${p.hidden ? "line-through text-gucha-muted" : "text-white"}`}>
                                  {p.name}
                                </span>
                                <div className="flex gap-0.5 flex-shrink-0 mt-0.5">
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

                            {/* Size chips with status indicator */}
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-1">
                                {sorted.map((s) => {
                                  const isSel  = selId === s.id;
                                  const sOut   = s.sold >= s.quantity;
                                  const avDisp = s.quantity - s.sold;

                                  // Determine chip appearance + status dot
                                  let chipCls: string;
                                  let dot: React.ReactNode = null;

                                  if (isSel) {
                                    chipCls = "bg-white text-black border-white";
                                    dot = null; // selected state dominates
                                  } else if (s.hidden) {
                                    chipCls = "bg-transparent border-gucha-border/30 text-gucha-muted/40 line-through";
                                    dot = <span className="w-1 h-1 rounded-full bg-gucha-muted/40 flex-shrink-0" title="Oculta" />;
                                  } else if (sOut) {
                                    chipCls = "bg-gucha-red-dark/30 border-gucha-red/40 text-gucha-red-light";
                                    dot = <span className="w-1.5 h-1.5 rounded-full bg-gucha-red flex-shrink-0" title="Agotado" />;
                                  } else {
                                    chipCls = "bg-[#0d0d0d] border-gucha-border text-gucha-subtle hover:text-white hover:border-gucha-subtle/60";
                                    dot = <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light flex-shrink-0" title={`${avDisp} disp.`} />;
                                  }

                                  return (
                                    <button key={s.id} onClick={() => toggleSize(p.id, s.id)}
                                      title={s.hidden ? `Talla ${s.number} · oculta` : sOut ? `Talla ${s.number} · agotada` : `Talla ${s.number} · ${avDisp} disp.`}
                                      className={[
                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                                        chipCls,
                                      ].join(" ")}>
                                      {!isSel && dot}
                                      {s.number}
                                    </button>
                                  );
                                })}
                              </div>
                              {selId && (
                                <p className="text-[9px] text-gucha-muted/60 mt-1">
                                  talla {selSize?.number} · clic para deseleccionar
                                </p>
                              )}
                            </td>

                            {/* Stats */}
                            <td className="px-3 py-3 text-center font-semibold text-gucha-subtle">{stock}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-bold ${sold > 0 ? "text-gucha-red-light" : "text-gucha-muted"}`}>{sold}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-black text-[13px] ${selOut ? "text-gucha-red/60" : "text-gucha-green-light"}`}>{avail}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-bold text-gucha-muted">
                                {revList ? `$${revList.toFixed(2)}` : "—"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-bold ${revReal > 0 ? "text-gucha-green-light" : "text-gucha-muted/40"}`}>
                                {revReal > 0 ? `$${revReal.toFixed(2)}` : "—"}
                              </span>
                              {hasDiscount && <span className="ml-1 text-[8px] text-yellow-400">🏷</span>}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-3">
                              {selSize ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => setSaleTarget({ size: selSize, product: p })} title="Registrar venta"
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-green-light hover:border-gucha-green/40 transition-colors text-[10px]">$</button>
                                  <button onClick={() => setEditTarget({ size: selSize, productId: p.id })} title="Editar talla"
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60 transition-colors text-[11px]">✎</button>
                                  <button onClick={() => onToggleSizeHidden(p.id, selSize.id, !selSize.hidden)} title={selSize.hidden ? "Mostrar talla" : "Ocultar talla"}
                                    className={`w-6 h-6 flex items-center justify-center rounded-md border transition-colors ${selSize.hidden ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light" : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white"}`}>
                                    <EyeIcon open={!selSize.hidden} />
                                  </button>
                                  <button onClick={() => onDeleteSize(p.id, selSize.id)} title="Eliminar talla"
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[9px]">✕</button>
                                </div>
                              ) : (
                                <p className="text-[9px] text-gucha-muted/40 text-center">← selecciona</p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          </div>
        )}
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
