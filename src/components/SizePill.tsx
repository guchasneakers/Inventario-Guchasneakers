"use client";

import { useState } from "react";
import type { SizeData } from "@/types";

interface Props {
  size: SizeData;
  onToggle: (sizeId: number, sold: number) => Promise<void>;
}

export default function SizePill({ size, onToggle }: Props) {
  const [loading, setLoading] = useState(false);
  const isSold = size.sold >= size.quantity;

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    await onToggle(size.id, isSold ? 0 : size.quantity);
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isSold ? "Marcar disponible" : "Marcar vendido"}
      className={[
        "relative text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-200 select-none",
        "active:scale-95",
        isSold
          ? "bg-gucha-red-dark/30 border-gucha-red/20 text-gucha-red/50 line-through"
          : "bg-gucha-dark border-gucha-border text-[#ccc] hover:border-gucha-subtle/60 hover:text-white hover:bg-[#222]",
        loading ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
    >
      {size.number}
      {size.quantity > 1 && !isSold && (
        <span className="ml-0.5 text-[9px] font-bold text-gucha-red">
          ×{size.quantity}
        </span>
      )}
      {isSold && (
        <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gucha-red/60 flex items-center justify-center">
          <span className="text-[6px] text-white font-bold">✓</span>
        </span>
      )}
    </button>
  );
}
