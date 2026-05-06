"use client";

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
  { value: "default",    label: "Defecto" },
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

export default function FilterBar({ filters, onChange, brands, sizes, isAdmin }: Props) {
  function set(patch: Partial<Filters>) { onChange({ ...filters, ...patch }); }

  const hasActive =
    filters.brandId       !== null  ||
    filters.size          !== ""    ||
    filters.status        !== "all" ||
    filters.onlyAvailable           ||
    filters.priceMin      !== ""    ||
    filters.priceMax      !== ""    ||
    filters.sortBy        !== "default";

  return (
    <div className="mt-4 space-y-1">

      {/* ── Divider ── */}
      <div className="flex items-center gap-2 pb-1">
        <div className="flex-1 h-px bg-gucha-border/50" />
        <span className="text-[8px] font-black text-gucha-muted/50 tracking-[0.25em] uppercase">Filtros</span>
        <div className="flex-1 h-px bg-gucha-border/50" />
      </div>

      {/* ── Ordenar ── */}
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

      {/* ── Marca ── */}
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

      {/* ── Precio ── */}
      <div className="py-2">
        <p className={`${sectionLabel} mb-2`}>Rango de precio</p>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gucha-muted text-[11px] font-bold pointer-events-none">$</span>
            <input
              type="number" min={0} placeholder="Mín"
              value={filters.priceMin}
              onChange={(e) => set({ priceMin: e.target.value })}
              className="w-full pl-6 pr-2 py-2 bg-[#0d0d0d] border border-gucha-border rounded-xl text-[12px] text-white placeholder-gucha-muted/40 outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          <span className="text-gucha-muted/50 text-[11px] flex-shrink-0">—</span>
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gucha-muted text-[11px] font-bold pointer-events-none">$</span>
            <input
              type="number" min={0} placeholder="Máx"
              value={filters.priceMax}
              onChange={(e) => set({ priceMax: e.target.value })}
              className="w-full pl-6 pr-2 py-2 bg-[#0d0d0d] border border-gucha-border rounded-xl text-[12px] text-white placeholder-gucha-muted/40 outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          {(filters.priceMin !== "" || filters.priceMax !== "") && (
            <button type="button"
              onClick={() => set({ priceMin: "", priceMax: "" })}
              className="text-gucha-muted/50 hover:text-white transition-colors text-[12px] flex-shrink-0">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Talla ── */}
      {sizes.length > 0 && (
        <div className="py-2">
          <p className={`${sectionLabel} mb-2`}>Talla</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {sizes.map((s) => {
              const active = filters.size === s;
              return (
                <button key={s} type="button"
                  onClick={() => set({ size: active ? "" : s })}
                  className={`flex-shrink-0 w-9 h-8 rounded-lg text-[11px] font-bold border transition-all ${
                    active
                      ? "bg-gucha-dark border-gucha-subtle/70 text-white shadow-[0_0_8px_rgba(255,255,255,0.08)]"
                      : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/50"
                  }`}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Admin: Estado ── */}
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

      {/* ── Cliente: Solo disponibles ── */}
      {!isAdmin && (
        <div className="py-2">
          <button type="button"
            onClick={() => set({ onlyAvailable: !filters.onlyAvailable })}
            className={`flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${
              filters.onlyAvailable
                ? "bg-gucha-green-dark/40 border-gucha-green/40 text-gucha-green-light"
                : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/40"
            }`}>
            {/* Toggle pill */}
            <div className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
              filters.onlyAvailable ? "bg-gucha-green-light" : "bg-gucha-border"
            }`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all duration-200 ${
                filters.onlyAvailable ? "left-4" : "left-0.5"
              }`} />
            </div>
            Solo disponibles
          </button>
        </div>
      )}

      {/* ── Limpiar ── */}
      {hasActive && (
        <div className="pt-1">
          <button type="button"
            onClick={() => onChange(defaultFilters)}
            className="w-full text-center text-[10px] text-gucha-muted hover:text-white transition-colors py-1.5 rounded-xl border border-gucha-border/50 hover:border-gucha-subtle/40 bg-[#0d0d0d]">
            ✕ Limpiar filtros
          </button>
        </div>
      )}
    </div>
  );
}
