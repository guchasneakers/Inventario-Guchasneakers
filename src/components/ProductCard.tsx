"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductData } from "@/types";
import SizePill from "./SizePill";
import ImageLightbox from "./ImageLightbox";

interface Props {
  product:             ProductData;
  index:               number;
  isAdmin:             boolean;
  editMode?:           boolean;
  hideSoldSizes?:      boolean;
  onEdit:              (product: ProductData) => void;
  onDelete:            (productId: number) => void;
  onToggleHidden?:     (productId: number, hidden: boolean) => void;
  onToggleSizeHidden?: (productId: number, sizeId: number, hidden: boolean) => void;
  selectedSizes?:      number[];
  onSelectSize?:       (productId: number, sizeId: number) => void;
  adminSelectedSizes?: number[];
  onAdminSelectSize?:  (productId: number, sizeId: number) => void;
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

export default function ProductCard({
  product, index, isAdmin, editMode = false, hideSoldSizes = false, onEdit, onDelete,
  onToggleHidden, onToggleSizeHidden,
  selectedSizes = [], onSelectSize, adminSelectedSizes = [], onAdminSelectSize,
}: Props) {
  const [lightbox, setLightbox] = useState(false);

  // For client view: only visible sizes
  const visibleSizes = product.sizes.filter((s) => !s.hidden);
  // For admin view: all sizes sorted
  const allSizesSorted = [...product.sizes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

  const displaySizes = isAdmin ? visibleSizes : (hideSoldSizes ? visibleSizes.filter((s) => s.sold < s.quantity) : visibleSizes);
  const totalPairs   = visibleSizes.reduce((acc, s) => acc + s.quantity, 0);
  const soldPairs    = visibleSizes.reduce((acc, s) => acc + s.sold,     0);
  const available    = totalPairs - soldPairs;
  const isOut        = totalPairs > 0 && available === 0;
  const pct          = totalPairs > 0 ? Math.round((soldPairs / totalPairs) * 100) : 0;

  const hiddenSizes = product.sizes.filter((s) => s.hidden);

  return (
    <>
    <div
      className="relative bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden mb-3 shadow-card animate-fade-up"
      style={{ animationDelay: `${index * 60}ms`, opacity: product.hidden ? 0.45 : 1 }}
    >
      {/* status accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-[3px] ${
          product.hidden
            ? "bg-gucha-muted/30"
            : isOut
            ? "bg-gucha-red"
            : "bg-gradient-to-b from-gucha-green via-gucha-green to-gucha-green/20"
        }`}
      />

      <div className="pl-4 pr-4 pt-4 pb-3 ml-0.5">

        {/* top row — foto izquierda, texto derecha; baja si no hay espacio */}
        <div className="flex flex-wrap gap-3.5 items-start mb-3">

          {/* image */}
          <div
            onClick={() => product.imageUrl && setLightbox(true)}
            className={`relative w-[100px] h-[82px] bg-[#0d0d0d] rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gucha-border/50 group ${product.imageUrl ? "cursor-zoom-in" : ""}`}
          >
            {product.imageUrl ? (
              <>
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-lg">🔍</span>
                </div>
              </>
            ) : (
              <span className="text-2xl opacity-30">👟</span>
            )}
          </div>

          {/* info — se mueve debajo de la foto si el espacio es menor a 130px */}
          <div className="flex-1 min-w-[130px] pt-0.5">
            <div className="flex items-start justify-between mb-0.5">
              {(product.brand?.name || product.modelNum) ? (
                <span className="text-[9px] font-bold text-gucha-red tracking-[0.2em] uppercase">
                  {product.brand?.name ?? product.modelNum}
                </span>
              ) : <span />}

              {/* admin actions — solo en modo edición */}
              {isAdmin && editMode && (
                <div className="flex gap-1 -mt-0.5 -mr-0.5">
                  <button onClick={() => onEdit(product)} title="Editar producto"
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle transition-colors text-[11px]">
                    ✎
                  </button>
                  <button onClick={() => onToggleHidden?.(product.id, !product.hidden)}
                    title={product.hidden ? "Mostrar producto" : "Ocultar producto"}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg border transition-colors ${
                      product.hidden
                        ? "bg-gucha-dark border-gucha-green/40 text-gucha-green-light"
                        : "bg-gucha-dark border-gucha-border text-gucha-muted hover:text-white"
                    }`}>
                    <EyeIcon open={!product.hidden} />
                  </button>
                  <button onClick={() => onDelete(product.id)} title="Eliminar producto"
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[10px]">
                    ✕
                  </button>
                </div>
              )}
            </div>

            <p className={`text-[13px] font-semibold leading-snug mb-2 ${product.hidden ? "line-through text-gucha-muted" : "text-white"}`}>
              {product.name}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {product.price && (
                <span className="text-[12px] font-bold text-white/80">
                  ${product.price.toFixed(0)}
                </span>
              )}
              {product.hidden ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-border text-gucha-muted border border-gucha-border/60 tracking-wider uppercase">
                  Oculto
                </span>
              ) : isOut ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-red-dark/50 text-gucha-red-light border border-gucha-red/20 tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-gucha-red inline-block" />
                  Agotado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-gucha-green-dark/60 text-gucha-green-light border border-gucha-green/20 tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block animate-pulse-soft" />
                  {available} {available === 1 ? "par" : "pares"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* progress bar — vendidos solo visible para admin */}
        {totalPairs > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-gucha-muted tracking-widest">SIZES</span>
              {isAdmin && (
                <span className="text-[9px] text-gucha-muted">{soldPairs}/{totalPairs} vendidos</span>
              )}
            </div>
            <div className="h-[2px] bg-gucha-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gucha-red to-gucha-red/60 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── ADMIN size view ── */}
        {isAdmin ? (
          <div className="space-y-2">
            {/* Visible sizes */}
            {allSizesSorted.filter((s) => !s.hidden).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allSizesSorted.filter((s) => !s.hidden).map((size) => {
                  const isSold = size.sold >= size.quantity;
                  return editMode ? (
                    // Edit mode: split pill [number | 👁]
                    <div key={size.id}
                      className={`inline-flex items-stretch rounded-lg border text-[11px] overflow-hidden transition-all ${
                        isSold ? "border-gucha-red/30 bg-gucha-red-dark/20" : adminSelectedSizes.includes(size.id) ? "border-gucha-green/60 bg-gucha-green-dark/60" : "border-gucha-border bg-gucha-dark"
                      }`}>
                      <button onClick={() => !isSold && onAdminSelectSize?.(product.id, size.id)}
                        title={isSold ? `Size ${size.number} · agotada` : `Registrar venta size ${size.number}`}
                        className={`px-2.5 py-1.5 font-semibold transition-colors ${isSold ? "text-gucha-red/60 line-through cursor-default" : adminSelectedSizes.includes(size.id) ? "text-gucha-green-light" : "text-[#ccc] hover:text-white hover:bg-[#222] active:scale-95"}`}>
                        {size.number}
                      </button>
                      <button onClick={() => onToggleSizeHidden?.(product.id, size.id, true)}
                        title="Ocultar size"
                        className="px-1.5 flex items-center border-l border-gucha-border/40 text-gucha-muted/60 hover:text-gucha-red-light transition-colors">
                        <EyeIcon open={true} />
                      </button>
                    </div>
                  ) : (
                    // Normal mode: simple pill, click = select for bulk sale
                    <button key={size.id} onClick={() => !isSold && onAdminSelectSize?.(product.id, size.id)}
                      title={isSold ? `Size ${size.number} · agotada` : `Seleccionar size ${size.number}`}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                        isSold
                          ? "border-gucha-red/30 bg-gucha-red-dark/20 text-gucha-red/60 line-through cursor-default"
                          : adminSelectedSizes.includes(size.id)
                          ? "border-gucha-green/60 bg-gucha-green-dark/60 text-gucha-green-light"
                          : "border-gucha-border bg-gucha-dark text-[#ccc] hover:text-white hover:bg-[#222] active:scale-95"
                      }`}>
                      {size.number}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Hidden sizes — solo en modo edición */}
            {editMode && hiddenSizes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hiddenSizes
                  .sort((a, b) => parseFloat(a.number) - parseFloat(b.number))
                  .map((size) => (
                    <button key={size.id}
                      onClick={() => onToggleSizeHidden?.(product.id, size.id, false)}
                      title={`Size ${size.number} oculta · clic para mostrar`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gucha-border/30 text-gucha-muted/40 text-[11px] font-semibold line-through hover:text-gucha-green-light hover:border-gucha-green/30 transition-colors">
                      <EyeIcon open={false} />
                      {size.number}
                    </button>
                  ))}
              </div>
            )}

            {product.sizes.length === 0 && (
              <p className="text-[10px] text-gucha-muted italic">Sin sizes registradas</p>
            )}

            {product.sizes.length > 0 && (
              <p className="text-[9px] text-gucha-muted/50 tracking-wide">
                {editMode ? "Toca el número para vender · 👁 para ocultar" : "Toca un size para registrar venta"}
              </p>
            )}
          </div>
        ) : (
          /* ── CLIENT size view ── */
          <>
            {displaySizes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {[...displaySizes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number)).map((size) => (
                  <SizePill
                    key={size.id}
                    size={size}
                    isAdmin={false}
                    onToggle={() => {}}
                    selected={selectedSizes.includes(size.id)}
                    onSelect={(sizeId) => onSelectSize?.(product.id, sizeId)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gucha-muted italic">Sin sizes disponibles</p>
            )}

            {displaySizes.some((s) => s.sold < s.quantity) && (
              <p className="text-[9px] text-gucha-green-light/50 mt-2 tracking-wide">
                Toca los sizes que te interesan para ordenar
              </p>
            )}
          </>
        )}
      </div>
    </div>

    {lightbox && product.imageUrl && (
      <ImageLightbox
        src={product.imageUrl}
        alt={product.name}
        onClose={() => setLightbox(false)}
      />
    )}

    </>
  );
}
