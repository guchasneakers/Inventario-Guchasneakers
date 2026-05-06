"use client";

import { useCallback, useEffect, useState } from "react";
import type { SaleRecord } from "@/types";

interface Props {
  onRevert: (saleId: number) => Promise<void>;
}

type DateMode = "all" | "this-month" | "last-month" | "custom";

function fmt(date: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

function fmtShort(date: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "short" }).format(new Date(date));
}

const DATE_TABS: { value: DateMode; label: string }[] = [
  { value: "all",        label: "Todo"       },
  { value: "this-month", label: "Este mes"   },
  { value: "last-month", label: "Mes ant."   },
  { value: "custom",     label: "Rango"      },
];

export default function SalesRegister({ onRevert }: Props) {
  const [sales,     setSales]     = useState<SaleRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [reverting, setReverting] = useState<number | null>(null);
  const [search,    setSearch]    = useState("");

  // ── Date filter ──────────────────────────────────────────────────────────
  const [dateMode, setDateMode] = useState<DateMode>("this-month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/sales");
    const data = await res.json();
    setSales(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevert(sale: SaleRecord) {
    if (!confirm(`¿Revertir la venta #${sale.id}?`)) return;
    setReverting(sale.id);
    await onRevert(sale.id);
    setSales((prev) => prev.filter((s) => s.id !== sale.id));
    setReverting(null);
  }

  // ── Period label ─────────────────────────────────────────────────────────
  function periodLabel(): string {
    const now = new Date();
    const esMonth = (d: Date) =>
      new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(d);
    if (dateMode === "all")        return "Todas las ventas";
    if (dateMode === "this-month") return esMonth(now);
    if (dateMode === "last-month") return esMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    if (dateFrom && dateTo)  return `${fmtShort(dateFrom)} → ${fmtShort(dateTo)}`;
    if (dateFrom)            return `Desde ${fmtShort(dateFrom)}`;
    if (dateTo)              return `Hasta ${fmtShort(dateTo)}`;
    return "Rango personalizado";
  }

  // ── Date filtering ───────────────────────────────────────────────────────
  function filterByDate(list: SaleRecord[]): SaleRecord[] {
    const now = new Date();
    if (dateMode === "all") return list;

    if (dateMode === "this-month") {
      return list.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }
    if (dateMode === "last-month") {
      const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return list.filter((s) => {
        const d = new Date(s.createdAt);
        return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
      });
    }
    if (dateMode === "custom") {
      return list.filter((s) => {
        const d = new Date(s.createdAt);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo   && d > new Date(dateTo + "T23:59:59")) return false;
        return true;
      });
    }
    return list;
  }

  // ── Apply both filters ───────────────────────────────────────────────────
  const byDate   = filterByDate(sales);
  const filtered = search
    ? byDate.filter((s) =>
        s.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
        s.size?.product?.name.toLowerCase().includes(search.toLowerCase()) ||
        String(s.id).includes(search)
      )
    : byDate;

  const totalRevenue = filtered.reduce((a, s) => a + s.quantity * s.pricePerPair, 0);
  const totalPairs   = filtered.reduce((a, s) => a + s.quantity, 0);
  const avgTicket    = filtered.length > 0 ? totalRevenue / filtered.length : 0;

  // ── CSV export ───────────────────────────────────────────────────────────
  function downloadCSV() {
    const label = periodLabel();

    // Top models ranking
    const modelMap = new Map<string, { name: string; brand: string; pairs: number; revenue: number }>();
    filtered.forEach((s) => {
      const name  = s.size?.product?.name ?? "Desconocido";
      const brand = s.size?.product?.brand?.name ?? "";
      if (!modelMap.has(name)) modelMap.set(name, { name, brand, pairs: 0, revenue: 0 });
      const m = modelMap.get(name)!;
      m.pairs   += s.quantity;
      m.revenue += s.quantity * s.pricePerPair;
    });
    const topModels = [...modelMap.values()].sort((a, b) => b.revenue - a.revenue);

    const rows: (string | number)[][] = [
      ["GUCHA SNEAKERS · REPORTE DE VENTAS"],
      [`Período: ${label}`],
      [`Generado: ${new Intl.DateTimeFormat("es", { dateStyle: "full" }).format(new Date())}`],
      [],
      ["── RESUMEN ──"],
      ["Total de ventas",  filtered.length],
      ["Total de pares",   totalPairs],
      ["Total cobrado",    `$${totalRevenue.toFixed(2)}`],
      ["Ticket promedio",  `$${avgTicket.toFixed(2)}`],
      [],
      ["── DETALLE DE VENTAS ──"],
      ["#", "Fecha", "Marca", "Modelo", "Talla", "Cliente", "Pares", "Precio/par", "Total", "Nota"],
      ...filtered.map((s) => [
        `#${s.id}`,
        fmt(s.createdAt),
        s.size?.product?.brand?.name ?? "",
        s.size?.product?.name        ?? "",
        s.size?.number               ?? "",
        s.buyerName                  ?? "",
        s.quantity,
        `$${s.pricePerPair.toFixed(2)}`,
        `$${(s.quantity * s.pricePerPair).toFixed(2)}`,
        s.note ?? "",
      ]),
      [],
      ["── TOP MODELOS ──"],
      ["Modelo", "Marca", "Pares vendidos", "Total cobrado"],
      ...topModels.map((m) => [m.name, m.brand, m.pairs, `$${m.revenue.toFixed(2)}`]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ventas-gucha-${label.replace(/[\s/→]+/g, "-").toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">

      {/* ── Period selector ── */}
      <div className="bg-card-gradient border border-gucha-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black text-gucha-muted tracking-[0.22em] uppercase">Período</p>
          <span className="text-[10px] text-gucha-muted italic">{periodLabel()}</span>
        </div>

        {/* Quick tabs */}
        <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
          {DATE_TABS.map(({ value, label }) => (
            <button key={value} type="button"
              onClick={() => setDateMode(value)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                dateMode === value ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {dateMode === "custom" && (
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-gucha-subtle/60 transition-colors [color-scheme:dark]" />
            <span className="text-gucha-muted/50 text-[11px] flex-shrink-0">→</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3 py-2 text-[12px] text-white outline-none focus:border-gucha-subtle/60 transition-colors [color-scheme:dark]" />
            {(dateFrom || dateTo) && (
              <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="text-gucha-muted/50 hover:text-white transition-colors text-[12px] flex-shrink-0">✕</button>
            )}
          </div>
        )}
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card-gradient border border-gucha-border rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] text-gucha-muted tracking-widest uppercase mb-1">Ventas</p>
          <p className="text-[22px] font-black text-white">{filtered.length}</p>
        </div>
        <div className="bg-card-gradient border border-gucha-border rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] text-gucha-muted tracking-widest uppercase mb-1">Pares</p>
          <p className="text-[22px] font-black text-white">{totalPairs}</p>
        </div>
        <div className="bg-gucha-green-dark/30 border border-gucha-green/30 rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] text-gucha-green-light/70 tracking-widest uppercase mb-1">💰 Cobrado</p>
          <p className="text-[20px] font-black text-gucha-green-light">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-card-gradient border border-gucha-border rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] text-gucha-muted tracking-widest uppercase mb-1">Promedio</p>
          <p className="text-[20px] font-black text-gucha-subtle">${avgTicket.toFixed(0)}</p>
        </div>
      </div>

      {/* ── Search + Download ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gucha-muted text-[12px]">🔍</span>
          <input
            type="text" placeholder="Buscar por cliente, modelo o #ID…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d0d] border border-gucha-border rounded-xl text-[12px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
          />
        </div>
        <button
          onClick={downloadCSV}
          disabled={filtered.length === 0}
          title={`Descargar reporte · ${periodLabel()}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gucha-green-dark/40 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">Descargar CSV</span>
        </button>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <div className="w-5 h-5 border-2 border-gucha-border border-t-gucha-green-light rounded-full animate-spin" />
          <span className="text-[12px] text-gucha-muted">Cargando ventas…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4 opacity-20">📭</p>
          <p className="text-gucha-subtle text-[13px]">
            {search ? "Sin resultados para esa búsqueda" : "No hay ventas en este período"}
          </p>
        </div>
      ) : (
        <div className="bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gucha-border/60">
                  <th className="text-left px-4 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">#</th>
                  <th className="text-left px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Fecha</th>
                  <th className="text-left px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Modelo</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Talla</th>
                  <th className="text-left px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Cliente</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Pares</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">$/par</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-green-light/70 tracking-widest uppercase">Total</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Nota</th>
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sale) => (
                  <tr key={sale.id} className="border-b border-gucha-border/20 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold text-gucha-muted">#{sale.id}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gucha-subtle">{fmt(sale.createdAt)}</td>
                    <td className="px-3 py-3 max-w-[160px]">
                      {sale.size?.product ? (
                        <div>
                          {(sale.size.product.brand?.name || sale.size.product.modelNum) && (
                            <p className="text-[8px] font-bold text-gucha-red tracking-widest uppercase">
                              {sale.size.product.brand?.name ?? sale.size.product.modelNum}
                            </p>
                          )}
                          <p className="font-semibold text-white truncate">{sale.size.product.name}</p>
                        </div>
                      ) : <span className="text-gucha-muted">—</span>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-bold text-white">{sale.size?.number ?? "—"}</span>
                    </td>
                    <td className="px-3 py-3 max-w-[120px]">
                      <span className={`${sale.buyerName ? "text-white" : "text-gucha-muted italic"} truncate block`}>
                        {sale.buyerName || "Sin nombre"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-gucha-subtle">{sale.quantity}</td>
                    <td className="px-3 py-3 text-center text-gucha-subtle">${sale.pricePerPair.toFixed(2)}</td>
                    <td className="px-3 py-3 text-center">
                      <span className="font-black text-gucha-green-light">${(sale.quantity * sale.pricePerPair).toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-3 max-w-[100px]">
                      <span className="text-gucha-muted truncate block">{sale.note || "—"}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        onClick={() => handleRevert(sale)}
                        disabled={reverting === sale.id}
                        className="px-2.5 py-1 rounded-lg border border-gucha-border text-gucha-muted text-[9px] font-semibold hover:text-gucha-red-light hover:border-gucha-red/40 disabled:opacity-40 transition-colors whitespace-nowrap"
                      >
                        {reverting === sale.id ? "…" : "Revertir"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gucha-border/60 bg-white/[0.02]">
                  <td colSpan={5} className="px-4 py-2.5 text-[9px] text-gucha-muted tracking-widest uppercase">
                    {filtered.length} venta{filtered.length !== 1 ? "s" : ""} · {totalPairs} par{totalPairs !== 1 ? "es" : ""}
                  </td>
                  <td /><td />
                  <td className="px-3 py-2.5 text-center font-black text-gucha-green-light">${totalRevenue.toFixed(2)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
