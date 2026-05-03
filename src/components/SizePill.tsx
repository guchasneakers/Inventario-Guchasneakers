"use client";

import { useState } from "react";
import type { SizeData } from "@/types";

interface Props {
  size:       SizeData;
  isAdmin:    boolean;
  onToggle:   (sizeId: number, sold: number) => Promise<void>;
  selected?:  boolean;
  onSelect?:  (sizeId: number) => void;
}

export default function SizePill({ size, isAdmin, onToggle, selected = false, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const isSold = size.sold >= size.quantity;

  async function handleClick() {
    if (loading) return;
    if (isAdmin) {
      setLoading(true);
      await onToggle(size.id, isSold ? 0 : size.quantity);
      setLoading(false);
    } else if (!isSold && onSelect) {
      onSelect(size.id);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading || (!isAdmin && isSold)}
      title={
        isAdmin && isSold  ? "Marcar disponible"
        : isAdmin          ? "Marcar vendido"
        : isSold           ? "Agotado"
        : selected         ? "Quitar selección"
        :                    "Seleccionar talla"
      }
      className={[
        "relative text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 select-none",
        isSold
          ? "bg-gucha-red-dark/30 border-gucha-red/20 text-gucha-red/50 line-through cursor-default"
          : selected
          ? "bg-gucha-green-dark/60 border-gucha-green/60 text-gucha-green-light scale-105 shadow-[0_0_8px_rgba(159,225,203,0.3)] cursor-pointer active:scale-95"
          : "bg-gucha-dark border-gucha-border text-[#ccc]",
        !isSold && isAdmin && !selected ? "hover:border-gucha-subtle/60 hover:text-white hover:bg-[#222] active:scale-95 cursor-pointer" : "",
        !isSold && isAdmin && isSold    ? "hover:border-gucha-green/30 cursor-pointer active:scale-95" : "",
        !isSold && !isAdmin && !selected ? "hover:border-gucha-green/40 hover:text-white cursor-pointer active:scale-95" : "",
        loading ? "opacity-40" : "",
      ].join(" ")}
    >
      {size.number}
      {size.quantity > 1 && !isSold && (
        <span className="ml-0.5 text-[9px] font-bold text-gucha-red">×{size.quantity}</span>
      )}
      {isSold && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gucha-red/60 flex items-center justify-center">
          <span className="text-[6px] text-white font-bold">✓</span>
        </span>
      )}
      {selected && !isSold && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gucha-green flex items-center justify-center">
          <span className="text-[6px] text-white font-bold">✓</span>
        </span>
      )}
    </button>
  );
}
