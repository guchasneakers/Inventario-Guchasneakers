"use client";

import type { BrandData } from "@/types";

export interface Filters {
  brandId:       number | null;
  size:          string;
  status:        "all" | "available" | "soldout" | "hidden";
  onlyAvailable: boolean;
}

export const defaultFilters: Filters = {
  brandId: null, size: "", status: "all", onlyAvailable: false,
};

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos"    },
  { value: "available", label: "Disp."    },
  { value: "soldout",   label: "Agotados" },
  { value: "hidden",    label: "Ocultos"  },
] as const;

interface Props {
  filters:  Filters;
  onChange: (f: Filters) => void;
  brands:   BrandData[];
  sizes:    string[];
  isAdmin:  boolean;
}

export default function FilterBar({ filters, onChange, brands, sizes, isAdmin }: Props) {
  function set(patch: Partial<Filters>) { onChange({ ...filters, ...patch }); }

  const hasActive =
    filters.brandId !== null ||
    filters.size    !== ""   ||
    filters.status  !== "all" ||
    filters.onlyAvailable;

  return (
    <div className="space-y-3 mt-3">

      {/* ── Marca ── */}
      {brands.length > 0 && (
        <div>
          <p className="text-[9px] font-bold text-gucha-muted tracking-widest uppercase mb-1.5">Marca</p>
          <div className="flex flex-wrap gap-1">
            {brands.map((b) => {
              const active = filters.brandId === b.id;
              return (
                <button key={b.id} type="button"
                  onClick={() => set({ brandId: active ? null : b.id })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
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

      {/* ── Talla ── */}
      {sizes.length > 0 && (
        <div>
          <p className="text-[9px] font-bold text-gucha-muted tracking-widest uppercase mb-1.5">Talla</p>
          <div className="flex flex-wrap gap-1">
            {sizes.map((s) => {
              const active = filters.size === s;
              return (
                <button key={s} type="button"
                  onClick={() => set({ size: active ? "" : s })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    active
                      ? "bg-gucha-dark border-gucha-subtle/60 text-white"
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
        <div>
          <p className="text-[9px] font-bold text-gucha-muted tracking-widest uppercase mb-1.5">Estado</p>
          <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button key={value} type="button"
                onClick={() => set({ status: value })}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  filters.status === value
                    ? "bg-gucha-dark text-white"
                    : "text-gucha-muted hover:text-white"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Cliente: Solo disponibles ── */}
      {!isAdmin && (
        <button type="button"
          onClick={() => set({ onlyAvailable: !filters.onlyAvailable })}
          className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
            filters.onlyAvailable
              ? "bg-gucha-green-dark/40 border-gucha-green/40 text-gucha-green-light"
              : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white"
          }`}>
          <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            filters.onlyAvailable
              ? "bg-gucha-green-light border-gucha-green-light"
              : "border-gucha-muted/60"
          }`}>
            {filters.onlyAvailable && (
              <svg viewBox="0 0 10 8" className="w-2 h-2 fill-black">
                <path d="M1 4l3 3 5-6" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          Solo disponibles
        </button>
      )}

      {/* ── Limpiar ── */}
      {hasActive && (
        <button type="button"
          onClick={() => onChange(defaultFilters)}
          className="w-full text-center text-[10px] text-gucha-muted hover:text-white transition-colors underline underline-offset-2">
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
