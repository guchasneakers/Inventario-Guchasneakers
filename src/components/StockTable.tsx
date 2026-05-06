"use client";

import { useMemo, useState } from "react";
import type { ProductData, SizeData } from "@/types";

const US_SIZES = [
  "3.5","4","4.5","5","5.5","6","6.5","7","7.5","8","8.5",
  "9","9.5","10","10.5","11","11.5","12","12.5","13","13.5","14","15","16",
];

type StatusFilter = "all" | "available" | "soldout" | "hidden";

interface Props {
  products:             ProductData[];
  editMode?:            boolean;
  onEdit:               (product: ProductData) => void;
  onDelete:             (productId: number) => void;
  onToggleHidden:       (productId: number, hidden: boolean) => void;
  onToggleSizeHidden:   (productId: number, sizeId: number, hidden: boolean) => void;
  onDeleteSize:         (productId: number, sizeId: number) => void;
  onEditSize:           (productId: number, sizeId: number, number: string, quantity: number) => Promise<void>;
  onSell:               (productId: number, sizeId: number, qty: number, price: number, buyer: string, note: string) => Promise<void>;
  onRevertSale:         (saleId: number) => Promise<void>;
  adminSelectedSizes?:  number[];
  onAdminSelectSize?:   (productId: number, sizeId: number) => void;
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

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "Todos"    },
  { value: "available", label: "Disp."    },
  { value: "soldout",   label: "Agotados" },
  { value: "hidden",    label: "Ocultos"  },
];

export default function StockTable({
  products, editMode = false, onEdit, onDelete, onToggleHidden,
  adminSelectedSizes = [], onAdminSelectSize,
}: Props) {

  // ── Table-local filters ───────────────────────────────────────────────────
  const [search,     setSearch]     = useState("");
  const [statusFilt, setStatusFilt] = useState<StatusFilter>("all");
  const [sizeFilt,   setSizeFilt]   = useState("");
  const [brandFilt,  setBrandFilt]  = useState("");

  // ── Collect brands and sizes present in products (for filters) ──────────
  const allBrands = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.brand) map.set(p.brand.name, p.brand.name);
    });
    return [...map.keys()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const allSizeNumbers = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s.number)));
    return US_SIZES.filter((s) => set.has(s));
  }, [products]);

  // ── Apply filters ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
          !(p.brand?.name.toLowerCase().includes(search.toLowerCase()))) return false;
      if (brandFilt && (p.brand?.name ?? "") !== brandFilt) return false;
      if (sizeFilt && !p.sizes.some((s) => s.number === sizeFilt)) return false;
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
  }, [products, search, statusFilt, sizeFilt, brandFilt]);

  const hasFilters = search !== "" || statusFilt !== "all" || sizeFilt !== "" || brandFilt !== "";

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

        {/* Row 1: search full width */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gucha-muted text-[11px]">🔍</span>
          <input
            type="text" placeholder="Buscar modelo o marca…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#0d0d0d] border border-gucha-border rounded-xl text-[12px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
          />
        </div>

        {/* Row 2: all filters in one line */}
        <div className="flex flex-wrap items-end gap-4">

          {/* Estado */}
          <div>
            <p className="text-[8px] font-black text-gucha-muted tracking-[0.2em] uppercase mb-1.5">Estado</p>
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
          </div>

          {/* Marca dropdown */}
          {allBrands.length > 0 && (
            <div>
              <p className="text-[8px] font-black text-gucha-muted tracking-[0.2em] uppercase mb-1.5">Marca</p>
              <div className="relative">
                <select
                  value={brandFilt}
                  onChange={(e) => setBrandFilt(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-xl border text-[11px] font-semibold transition-all outline-none cursor-pointer ${
                    brandFilt !== ""
                      ? "bg-gucha-dark border-gucha-subtle/70 text-white"
                      : "bg-[#0d0d0d] border-gucha-border text-gucha-muted"
                  }`}
                  style={{ backgroundImage: "none" }}
                >
                  <option value="">Todas</option>
                  {allBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gucha-muted">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Size dropdown */}
          {allSizeNumbers.length > 0 && (
            <div>
              <p className="text-[8px] font-black text-gucha-muted tracking-[0.2em] uppercase mb-1.5">Size</p>
              <div className="relative">
                <select
                  value={sizeFilt}
                  onChange={(e) => setSizeFilt(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-xl border text-[11px] font-semibold transition-all outline-none cursor-pointer ${
                    sizeFilt !== ""
                      ? "bg-gucha-dark border-gucha-subtle/70 text-white"
                      : "bg-[#0d0d0d] border-gucha-border text-gucha-muted"
                  }`}
                  style={{ backgroundImage: "none" }}
                >
                  <option value="">Todos</option>
                  {allSizeNumbers.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gucha-muted">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3 h-3">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Limpiar */}
          {hasFilters && (
            <button type="button"
              onClick={() => { setSearch(""); setStatusFilt("all"); setSizeFilt(""); setBrandFilt(""); }}
              className="mb-0.5 text-[10px] text-gucha-muted hover:text-white transition-colors underline underline-offset-2 whitespace-nowrap">
              ✕ Limpiar
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
                  <th className="text-left px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Sizes · Estado</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Stock</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Vendidos</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Disp.</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Lista</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-green-light/70 tracking-widest uppercase">Cobrado</th>
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
                      <td colSpan={7} className="px-4 py-2">
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
                      const sorted  = [...p.sizes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

                      // Stats: always aggregates
                      const stock   = p.sizes.reduce((a, s) => a + s.quantity, 0);
                      const sold    = p.sizes.reduce((a, s) => a + s.sold, 0);
                      const avail   = stock - sold;
                      const revList = p.price ? sold * p.price : null;
                      const revReal = p.sizes.reduce((a, s) => a + (s.revenue ?? 0), 0);
                      const hasDiscount = revList !== null && revReal > 0 && revReal < revList;
                      const isOut   = p.sizes.filter((s) => !s.hidden).length > 0 &&
                                      p.sizes.filter((s) => !s.hidden).every((s) => s.sold >= s.quantity);

                      return (
                        <tr key={p.id}
                          className={`border-t border-gucha-border/20 transition-colors ${p.hidden ? "opacity-40" : "hover:bg-white/[0.02]"}`}>

                          {/* Modelo + product actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-1.5">
                              <span className={`text-[12px] font-semibold leading-snug flex-1 ${p.hidden ? "line-through text-gucha-muted" : "text-white"}`}>
                                {p.name}
                              </span>
                              {editMode && (
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
                              )}
                            </div>
                          </td>

                          {/* Size chips */}
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1">
                              {sorted.map((s) => {
                                const sOut   = s.sold >= s.quantity;
                                const avDisp = s.quantity - s.sold;
                                const isGlobalSel = adminSelectedSizes.includes(s.id);

                                let chipCls: string;
                                let dot: React.ReactNode = null;

                                if (isGlobalSel) {
                                  chipCls = "bg-gucha-green-dark/60 border-gucha-green/60 text-gucha-green-light scale-105 shadow-[0_0_6px_rgba(159,225,203,0.25)]";
                                } else if (s.hidden) {
                                  chipCls = "bg-transparent border-gucha-border/30 text-gucha-muted/40 line-through cursor-default";
                                  dot = <span className="w-1 h-1 rounded-full bg-gucha-muted/40 flex-shrink-0" title="Oculta" />;
                                } else if (sOut) {
                                  chipCls = "bg-gucha-red-dark/30 border-gucha-red/40 text-gucha-red-light cursor-default";
                                  dot = <span className="w-1.5 h-1.5 rounded-full bg-gucha-red flex-shrink-0" title="Agotado" />;
                                } else {
                                  chipCls = "bg-[#0d0d0d] border-gucha-border text-gucha-subtle hover:text-white hover:border-gucha-subtle/60 cursor-pointer";
                                  dot = <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light flex-shrink-0" title={`${avDisp} disp.`} />;
                                }

                                return (
                                  <button key={s.id}
                                    onClick={() => {
                                      if (!s.hidden && !sOut) onAdminSelectSize?.(p.id, s.id);
                                    }}
                                    title={s.hidden ? `Size ${s.number} · oculta` : sOut ? `Size ${s.number} · agotada` : `Size ${s.number} · ${avDisp} disp. · clic para seleccionar`}
                                    className={[
                                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all",
                                      chipCls,
                                    ].join(" ")}>
                                    {!isGlobalSel && dot}
                                    {s.number}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Stats */}
                          <td className="px-3 py-3 text-center font-semibold text-gucha-subtle">{stock}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold ${sold > 0 ? "text-gucha-red-light" : "text-gucha-muted"}`}>{sold}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-black text-[13px] ${isOut ? "text-gucha-red/60" : "text-gucha-green-light"}`}>{avail}</span>
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
  );
}
