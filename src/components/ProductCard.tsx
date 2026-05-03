"use client";

import Image from "next/image";
import type { ProductData } from "@/types";
import SizePill from "./SizePill";

interface Props {
  product:      ProductData;
  index:        number;
  isAdmin:      boolean;
  onToggleSize: (productId: number, sizeId: number, sold: number) => Promise<void>;
  onEdit:       (product: ProductData) => void;
  onDelete:     (productId: number) => void;
}

export default function ProductCard({ product, index, isAdmin, onToggleSize, onEdit, onDelete }: Props) {
  const totalPairs = product.sizes.reduce((acc, s) => acc + s.quantity, 0);
  const soldPairs  = product.sizes.reduce((acc, s) => acc + s.sold,     0);
  const available  = totalPairs - soldPairs;
  const isOut      = totalPairs > 0 && available === 0;
  const pct        = totalPairs > 0 ? Math.round((soldPairs / totalPairs) * 100) : 0;

  return (
    <div
      className="relative bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden mb-3 shadow-card animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* status accent bar */}
      <div
        className={`absolute left-0 top-0 h-full w-[3px] ${
          isOut
            ? "bg-gucha-red"
            : "bg-gradient-to-b from-gucha-green via-gucha-green to-gucha-green/20"
        }`}
      />

      <div className="pl-4 pr-4 pt-4 pb-3 ml-0.5">

        {/* top row */}
        <div className="flex gap-3.5 items-start mb-3">

          {/* image */}
          <div className="relative w-[100px] h-[82px] bg-[#0d0d0d] rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-gucha-border/50">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-2xl opacity-30">👟</span>
            )}
          </div>

          {/* info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between mb-0.5">
              {product.modelNum ? (
                <span className="text-[9px] font-bold text-gucha-red tracking-[0.2em] uppercase">
                  {product.modelNum}
                </span>
              ) : <span />}

              {/* admin actions */}
              {isAdmin && (
                <div className="flex gap-1 -mt-0.5 -mr-0.5">
                  <button
                    onClick={() => onEdit(product)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle transition-colors text-[11px]"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onDelete(product.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <p className="text-[13px] font-semibold text-white leading-snug mb-2 pr-1">
              {product.name}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {product.price && (
                <span className="text-[12px] font-bold text-white/80">
                  ${product.price.toFixed(0)}
                </span>
              )}
              {isOut ? (
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

        {/* progress bar */}
        {totalPairs > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] text-gucha-muted tracking-widest">TALLAS</span>
              <span className="text-[9px] text-gucha-muted">{soldPairs}/{totalPairs} vendidos</span>
            </div>
            <div className="h-[2px] bg-gucha-border rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gucha-red to-gucha-red/60 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* size pills */}
        {product.sizes.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {product.sizes.map((size) => (
              <SizePill
                key={size.id}
                size={size}
                isAdmin={isAdmin}
                onToggle={(sizeId, sold) => onToggleSize(product.id, sizeId, sold)}
              />
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-gucha-muted italic">Sin tallas registradas</p>
        )}

        {/* admin hint */}
        {isAdmin && product.sizes.length > 0 && (
          <p className="text-[9px] text-gucha-muted/50 mt-2 tracking-wide">
            Toca las tallas para marcar vendido
          </p>
        )}
      </div>
    </div>
  );
}
