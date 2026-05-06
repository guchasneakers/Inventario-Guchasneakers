"use client";

import { useCallback, useEffect, useState } from "react";
import type { SaleRecord } from "@/types";

interface Props {
  onRevert: (saleId: number) => Promise<void>;
}

function fmt(date: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export default function SalesRegister({ onRevert }: Props) {
  const [sales,     setSales]     = useState<SaleRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [reverting, setReverting] = useState<number | null>(null);
  const [search,    setSearch]    = useState("");

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

  const filtered = search
    ? sales.filter((s) =>
        s.buyerName?.toLowerCase().includes(search.toLowerCase()) ||
        s.size?.product?.name.toLowerCase().includes(search.toLowerCase()) ||
        String(s.id).includes(search)
      )
    : sales;

  const totalRevenue = filtered.reduce((a, s) => a + s.quantity * s.pricePerPair, 0);
  const totalPairs   = filtered.reduce((a, s) => a + s.quantity, 0);

  return (
    <div className="space-y-4">

      {/* summary */}
      <div className="grid grid-cols-3 gap-3">
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
          <p className="text-[22px] font-black text-gucha-green-light">${totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      {/* search */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gucha-muted text-[12px]">🔍</span>
        <input
          type="text" placeholder="Buscar por cliente, modelo o #ID…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-[#0d0d0d] border border-gucha-border rounded-xl text-[12px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
        />
      </div>

      {/* table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <div className="w-5 h-5 border-2 border-gucha-border border-t-gucha-green-light rounded-full animate-spin" />
          <span className="text-[12px] text-gucha-muted">Cargando ventas…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4 opacity-20">📭</p>
          <p className="text-gucha-subtle text-[13px]">{search ? "Sin resultados" : "No hay ventas registradas"}</p>
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
                    Total ({filtered.length} ventas · {totalPairs} pares)
                  </td>
                  <td />
                  <td />
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
