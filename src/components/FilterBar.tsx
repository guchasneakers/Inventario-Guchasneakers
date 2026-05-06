"use client";

import { useState } from "react";
import type { BrandData } from "@/types";

export interface Filters {
  brandId:       number | null;
  size:          string;
  status:        "all" | "available" | "soldout" | "hidden";
  onlyAvailable: boolean;
  priceMin:      string;
  priceMax:      string;
  sortBy:        "default" | "price-asc" | "price-desc";
}

export const defaultFilters: Filters = {
  brandId: null, size: "", status: "all", onlyAvailable: false,
  priceMin: "", priceMax: "", sortBy: "default",
};

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos"    },
  { value: "available", label: "Disp."    },
  { value: "soldout",   label: "Agotados" },
  { value: "hidden",    label: "Ocultos"  },
] as const;

const SORT_OPTIONS = [
  { value: "default",    label: "Defecto"  },
  { value: "price-asc",  label: "↑ Precio" },
  { value: "price-desc", label: "↓ Precio" },
] as const;

interface Props {
  filters:  Filters;
  onChange: (f: Filters) => void;
  brands:   BrandData[];
  sizes:    string[];
  isAdmin:  boolean;
}

const sectionLabel = "text-[9px] font-black text-gucha-muted tracking-[0.22em] uppercase";
const segmented    = "flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5";
const segBtn       = (active: boolean) =>
  `flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
    active ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"
  }`;

// How many filters are currently active (for badge count)
function countActive(f: Filters) {
  let n = 0;
  if (f.brandId !== null)       n++;
  if (f.size !== "")            n++;
  if (f.status !== "all")       n++;
  if (f.onlyAvailable)          n++;
  if (f.sortBy !== "default")   n++;
  return n;
}

export default function FilterBar({ filters, onChange, brands, sizes, isAdmin }: Props) {
  const [open, setOpen] = useState(false);

  function set(patch: Partial<Filters>) { onChange({ ...filters, ...patch }); }

  const hasActive = countActive(filters) > 0;
  const activeCount = countActive(filters);

  return (
    <div className="mt-4">

      {/* ── Toggle header ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all ${
          hasActive
            ? "bg-gucha-red-dark/20 border-gucha-red/30 text-white"
            : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/40"
        }`}
      >
        <div className="flex items-center gap-2">
          {/* funnel icon */}
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current flex-shrink-0">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="text-[11px] font-semibold">Filtros</span>
          {activeCount > 0 && (
            <span className="text-[9px] font-black bg-gucha-red text-white px-1.5 py-0.5 rounded-full leading-none">
              {activeCount}
            </span>
          )}
        </div>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* ── Collapsible body ── */}
      {open && (
        <div className="mt-2 space-y-1 animate-fade-up">

          {/* Ordenar */}
          <div className="py-2">
            <p className={`${sectionLabel} mb-2`}>Ordenar</p>
            <div className={segmented}>
              {SORT_OPTIONS.map(({ value, label }) => (
                <button key={value} type="button"
                  onClick={() => set({ sortBy: value as Filters["sortBy"] })}
                  className={segBtn(filters.sortBy === value)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Marca */}
          {brands.length > 0 && (
            <div className="py-2">
              <p className={`${sectionLabel} mb-2`}>Marca</p>
              <div className="flex flex-wrap gap-1.5">
                {brands.map((b) => {
                  const active = filters.brandId === b.id;
                  return (
                    <button key={b.id} type="button"
                      onClick={() => set({ brandId: active ? null : b.id })}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${
                        active
                          ? "bg-gucha-red-dark/60 border-gucha-red/50 text-gucha-red-light"
                          : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/50"
                      }`}>
                      {b.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size */}
          {sizes.length > 0 && (
            <div className="py-2">
              <p className={`${sectionLabel} mb-2`}>Size</p>
              <div className="relative">
                <select
                  value={filters.size}
                  onChange={(e) => set({ size: e.target.value })}
                  className={`w-full appearance-none px-3.5 py-2.5 rounded-xl border text-[12px] font-semibold transition-all outline-none cursor-pointer ${
                    filters.size !== ""
                      ? "bg-gucha-dark border-gucha-subtle/70 text-white"
                      : "bg-[#0d0d0d] border-gucha-border text-gucha-muted"
                  }`}
                  style={{ backgroundImage: "none" }}
                >
                  <option value="">Todas las sizes</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {/* chevron icon */}
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gucha-muted">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Admin: Estado */}
          {isAdmin && (
            <div className="py-2">
              <p className={`${sectionLabel} mb-2`}>Estado</p>
              <div className={segmented}>
                {STATUS_OPTIONS.map(({ value, label }) => (
                  <button key={value} type="button"
                    onClick={() => set({ status: value })}
                    className={segBtn(filters.status === value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cliente: Solo disponibles + Limpiar */}
          {!isAdmin && (
            <div className="py-2 flex items-center gap-2">
              <button type="button"
                onClick={() => set({ onlyAvailable: !filters.onlyAvailable })}
                className={`flex items-center gap-3 flex-1 px-3.5 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
                  filters.onlyAvailable
                    ? "bg-gucha-green-dark/40 border-gucha-green/40 text-gucha-green-light"
                    : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/40"
                }`}>
                <div className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                  filters.onlyAvailable ? "bg-gucha-green-light" : "bg-gucha-border"
                }`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${
                    filters.onlyAvailable ? "left-4" : "left-0.5"
                  }`} />
                </div>
                Solo disponibles
              </button>

              {hasActive && (
                <button type="button"
                  onClick={() => onChange(defaultFilters)}
                  className="flex-shrink-0 px-3 py-2.5 rounded-xl border border-gucha-border/50 hover:border-gucha-subtle/40 bg-[#0d0d0d] text-[10px] text-gucha-muted hover:text-white transition-colors whitespace-nowrap">
                  ✕ Limpiar
                </button>
              )}
            </div>
          )}

          {/* Admin: Limpiar */}
          {isAdmin && hasActive && (
            <div className="pt-1">
              <button type="button"
                onClick={() => onChange(defaultFilters)}
                className="w-full text-center text-[10px] text-gucha-muted hover:text-white transition-colors py-1.5 rounded-xl border border-gucha-border/50 hover:border-gucha-subtle/40 bg-[#0d0d0d]">
                ✕ Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
