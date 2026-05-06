"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
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

  // ── Excel export ─────────────────────────────────────────────────────────
  function downloadExcel() {
    const label   = periodLabel();
    const today   = new Intl.DateTimeFormat("es", { dateStyle: "full" }).format(new Date());
    const wb      = XLSX.utils.book_new();

    // ── Sheet 1: Resumen ─────────────────────────────────────────────────
    const resumenData: (string | number)[][] = [
      ["GUCHA SNEAKERS — REPORTE DE VENTAS"],
      [`Período: ${label}`],
      [`Generado: ${today}`],
      [],
      ["RESUMEN", ""],
      ["Total de ventas",  filtered.length],
      ["Total de pares",   totalPairs],
      ["Total cobrado",    totalRevenue],
      ["Ticket promedio",  avgTicket],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen["!cols"] = [{ wch: 22 }, { wch: 18 }];
    // Format currency cells
    ["B8", "B9"].forEach((cell) => {
      if (wsResumen[cell]) wsResumen[cell].z = '"$"#,##0.00';
    });
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // ── Sheet 2: Detalle de ventas ───────────────────────────────────────
    const headers = ["#", "Fecha", "Marca", "Modelo", "Size", "Cliente", "Pares", "$/par", "Total", "Nota"];
    const rows = filtered.map((s) => [
      s.id,
      fmt(s.createdAt),
      s.size?.product?.brand?.name ?? "",
      s.size?.product?.name        ?? "",
      s.size?.number               ?? "",
      s.buyerName                  ?? "",
      s.quantity,
      s.pricePerPair,
      s.quantity * s.pricePerPair,
      s.note                       ?? "",
    ]);

    // Totals row
    const totalsRow: (string | number)[] = [
      "", "TOTAL", "", "", "", "",
      totalPairs, "", totalRevenue, "",
    ];

    const wsDetalle = XLSX.utils.aoa_to_sheet([headers, ...rows, [], totalsRow]);
    wsDetalle["!cols"] = [
      { wch: 6  }, // #
      { wch: 20 }, // Fecha
      { wch: 14 }, // Marca
      { wch: 30 }, // Modelo
      { wch: 7  }, // Talla
      { wch: 18 }, // Cliente
      { wch: 7  }, // Pares
      { wch: 10 }, // $/par
      { wch: 12 }, // Total
      { wch: 20 }, // Nota
    ];
    // Format $/par and Total columns as currency
    const range = XLSX.utils.decode_range(wsDetalle["!ref"] ?? "A1");
    for (let r = 1; r <= range.e.r; r++) {
      ["H", "I"].forEach((col) => {
        const cellRef = `${col}${r + 1}`;
        if (wsDetalle[cellRef] && typeof wsDetalle[cellRef].v === "number") {
          wsDetalle[cellRef].z = '"$"#,##0.00';
        }
      });
    }
    XLSX.utils.book_append_sheet(wb, wsDetalle, "Ventas");

    // ── Sheet 3: Top modelos ─────────────────────────────────────────────
    const modelMap = new Map<string, { name: string; brand: string; pairs: number; revenue: number; sales: number }>();
    filtered.forEach((s) => {
      const key   = s.size?.product?.name ?? "Desconocido";
      const brand = s.size?.product?.brand?.name ?? "";
      if (!modelMap.has(key)) modelMap.set(key, { name: key, brand, pairs: 0, revenue: 0, sales: 0 });
      const m = modelMap.get(key)!;
      m.pairs   += s.quantity;
      m.revenue += s.quantity * s.pricePerPair;
      m.sales   += 1;
    });
    const topModels = [...modelMap.values()].sort((a, b) => b.revenue - a.revenue);

    const topHeaders = ["#", "Modelo", "Marca", "Ventas", "Pares vendidos", "Total cobrado"];
    const topRows    = topModels.map((m, i) => [i + 1, m.name, m.brand, m.sales, m.pairs, m.revenue]);
    const wsTop      = XLSX.utils.aoa_to_sheet([topHeaders, ...topRows]);
    wsTop["!cols"]   = [
      { wch: 5  },
      { wch: 32 },
      { wch: 14 },
      { wch: 9  },
      { wch: 14 },
      { wch: 14 },
    ];
    // Format Total cobrado column
    for (let r = 1; r <= topRows.length; r++) {
      const cellRef = `F${r + 1}`;
      if (wsTop[cellRef] && typeof wsTop[cellRef].v === "number") {
        wsTop[cellRef].z = '"$"#,##0.00';
      }
    }
    XLSX.utils.book_append_sheet(wb, wsTop, "Top Modelos");

    // ── Download ─────────────────────────────────────────────────────────
    const fileName = `reporte-ventas-gucha-${label.replace(/[\s/→]+/g, "-").toLowerCase()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  function generateSaleInvoice(sale: SaleRecord) {
    const logoUrl = window.location.origin + "/logo.png";
    const dateStr = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date(sale.createdAt));
    const total   = sale.quantity * sale.pricePerPair;
    const productName = sale.size?.product?.name ?? "Producto";
    const brand = sale.size?.product?.brand?.name ?? "";
    const sizeNumber = sale.size?.number ?? "—";
    const row = `<tr>
      <td>${brand ? `<div class="brand">${brand}</div>` : ""}${productName}</td>
      <td class="center">${sizeNumber}</td>
      <td class="center">${sale.quantity}</td>
      <td class="right">$${sale.pricePerPair.toFixed(2)}</td>
      <td class="right"><strong>$${total.toFixed(2)}</strong></td>
    </tr>`;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Factura #${sale.id} · Gucha Sneakers</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:720px;margin:0 auto}header{text-align:center;padding-bottom:24px;border-bottom:3px solid #cc2222;margin-bottom:28px}header img{width:110px;height:auto;margin-bottom:10px}header h1{font-size:22px;font-weight:900;color:#cc2222;letter-spacing:.12em}header p{font-size:11px;color:#888;margin-top:3px}.meta{display:flex;justify-content:space-between;margin-bottom:24px;gap:20px}.meta-block{font-size:13px}.meta-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead tr{border-bottom:2px solid #cc2222;background:#fafafa}th{padding:10px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888}td{padding:12px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top}.brand{font-size:9px;color:#cc2222;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:2px}.center{text-align:center}.right{text-align:right}.total-row td{border-top:2px solid #cc2222;border-bottom:none;background:#fff9f9;padding:14px 12px}.total-label{font-size:12px;color:#555;text-align:right;font-weight:bold}.total-value{font-size:22px;font-weight:900;color:#cc2222;text-align:right}footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee}@media print{body{padding:20px}}</style>
    </head><body>
    <header><img src="${logoUrl}" alt="Gucha Sneakers"/><h1>GUCHA SNEAKERS</h1><p>FREE SHIPPING ACROSS THE USA</p></header>
    <div class="meta">
      <div class="meta-block"><div class="meta-label">Comprador</div><div><strong>${sale.buyerName || "—"}</strong></div>${sale.note ? `<div style="font-size:12px;color:#777;margin-top:4px">${sale.note}</div>` : ""}</div>
      <div class="meta-block" style="text-align:right"><div class="meta-label">Venta #${sale.id} · Fecha</div><div>${dateStr}</div></div>
    </div>
    <table><thead><tr><th>Modelo</th><th class="center">Size</th><th class="center">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead>
    <tbody>${row}<tr class="total-row"><td colspan="4" class="total-label">Total</td><td class="total-value">$${total.toFixed(2)}</td></tr></tbody></table>
    <footer><p style="font-size:13px;font-weight:bold;color:#333">¡Gracias por tu compra!</p><p style="font-size:11px;color:#aaa;margin-top:4px">Gucha Sneakers · Envío gratis a todo USA</p></footer>
    <script>window.onload=()=>{window.print();}<\/script></body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card-gradient border border-gucha-border rounded-xl px-4 py-3 text-center">
          <p className="text-[9px] text-gucha-muted tracking-widest uppercase mb-1">Ventas</p>
          <p className="text-[22px] font-black text-white">{filtered.length}</p>
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
          onClick={downloadExcel}
          disabled={filtered.length === 0}
          title={`Descargar reporte Excel · ${periodLabel()}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gucha-green-dark/40 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all whitespace-nowrap flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="hidden sm:inline">Descargar Excel</span>
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
                  <th className="text-center px-3 py-3 text-[9px] font-bold text-gucha-muted tracking-widest uppercase">Size</th>
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => generateSaleInvoice(sale)}
                          title="Generar factura"
                          className="px-2.5 py-1 rounded-lg border border-gucha-border text-gucha-muted text-[9px] font-semibold hover:text-gucha-green-light hover:border-gucha-green/40 transition-colors whitespace-nowrap"
                        >
                          📄
                        </button>
                        <button
                          onClick={() => handleRevert(sale)}
                          disabled={reverting === sale.id}
                          className="px-2.5 py-1 rounded-lg border border-gucha-border text-gucha-muted text-[9px] font-semibold hover:text-gucha-red-light hover:border-gucha-red/40 disabled:opacity-40 transition-colors whitespace-nowrap"
                        >
                          {reverting === sale.id ? "…" : "Revertir"}
                        </button>
                      </div>
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
