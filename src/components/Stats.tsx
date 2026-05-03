"use client";

import type { Stats } from "@/types";

interface Props { stats: Stats }

export default function Stats({ stats }: Props) {
  const items = [
    { label: "MODELOS",  value: stats.totalProducts, accent: false },
    { label: "PARES",    value: stats.totalStock,    accent: true  },
    { label: "VENDIDOS", value: stats.totalSold,     accent: false },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      {items.map(({ label, value, accent }) => (
        <div
          key={label}
          className={`relative rounded-xl py-4 text-center overflow-hidden border transition-colors ${
            accent
              ? "bg-gradient-to-b from-[#1a0a0a] to-[#110505] border-gucha-red/30"
              : "bg-card-gradient border-gucha-border"
          }`}
        >
          {/* top accent bar */}
          {accent && (
            <div className="absolute top-0 inset-x-0 h-[2px] bg-red-gradient" />
          )}
          <div className="text-[9px] font-medium text-gucha-muted tracking-[0.25em] mb-1">
            {label}
          </div>
          <div className={`text-2xl font-black ${accent ? "text-white" : "text-white/90"}`}>
            {value}
          </div>
        </div>
      ))}
    </div>
  );
}
