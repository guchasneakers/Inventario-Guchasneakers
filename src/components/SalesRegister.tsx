"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import type { SaleRecord } from "@/types";

interface Props {
  onRevert:          (saleId: number) => Promise<void>;
  onProductUpdated:  (sizeId: number, sold: number, revenue: number) => void;
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

// ── Logo base64 helper ────────────────────────────────────────────────────────
async function getLogoBase64(): Promise<string> {
  try {
    const res = await fetch(window.location.origin + "/logo.png");
    if (!res.ok) return "";
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch { return ""; }
}

// ── Invoice generator ─────────────────────────────────────────────────────────
async function generateSaleInvoice(sale: SaleRecord) {
  const logoBase64 = await getLogoBase64();
  const logoSrc    = logoBase64 || (window.location.origin + "/logo.png");
  const dateStr    = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date(sale.createdAt));
  const total      = sale.quantity * sale.pricePerPair;
  const productName  = sale.size?.product?.name ?? sale.customProduct ?? "Producto";
  const brand        = sale.size?.product?.brand?.name ?? sale.customBrand ?? "";
  const sizeNumber   = sale.size?.number ?? sale.customSize ?? "—";

  // WhatsApp text
  const waText = encodeURIComponent(
    `🛒 *Gucha Sneakers* — Venta #${sale.id}\n\n` +
    `${brand ? `👟 *${brand}* — ` : ""}${productName} (Size ${sizeNumber})\n` +
    `${sale.buyerName ? `👤 ${sale.buyerName}\n` : ""}` +
    `📦 x${sale.quantity} pares × $${sale.pricePerPair.toFixed(2)}\n\n` +
    `💰 *Total: $${total.toFixed(2)}*\n\n¡Gracias por tu compra! 🙏`
  );
  const waUrl = `https://wa.me/?text=${waText}`;

  const row = `<tr>
    <td>${brand ? `<div class="brand">${brand}</div>` : ""}${productName}</td>
    <td class="center">${sizeNumber}</td>
    <td class="center">${sale.quantity}</td>
    <td class="right">$${sale.pricePerPair.toFixed(2)}</td>
    <td class="right"><strong>$${total.toFixed(2)}</strong></td>
  </tr>`;

  const fileName = `factura-${sale.id}-gucha-sneakers.pdf`;
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Factura #${sale.id} · Gucha Sneakers</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#f5f5f5;color:#111;min-height:100vh}
    .toolbar{position:sticky;top:0;z-index:10;background:#111;padding:12px 24px;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
    .toolbar-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:bold;cursor:pointer;text-decoration:none;border:none;transition:opacity .15s}
    .toolbar-btn:disabled{opacity:.5;cursor:not-allowed}
    .btn-wa{background:#25D366;color:#fff}.btn-wa:hover:not(:disabled){opacity:.88}
    .btn-dl{background:#fff;color:#111}.btn-dl:hover:not(:disabled){opacity:.88}
    .invoice{background:#fff;max-width:720px;margin:32px auto;padding:48px;border-radius:12px;box-shadow:0 4px 32px rgba(0,0,0,.10)}
    header{text-align:center;padding-bottom:24px;border-bottom:3px solid #cc2222;margin-bottom:28px}
    header img{width:110px;height:auto;margin-bottom:10px}
    header h1{font-size:22px;font-weight:900;color:#cc2222;letter-spacing:.12em}
    header p{font-size:11px;color:#888;margin-top:3px}
    .meta{display:flex;justify-content:space-between;margin-bottom:24px;gap:20px}
    .meta-block{font-size:13px}.meta-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;font-weight:bold}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead tr{border-bottom:2px solid #cc2222;background:#fafafa}
    th{padding:10px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888}
    td{padding:12px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top}
    .brand{font-size:9px;color:#cc2222;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:2px}
    .center{text-align:center}.right{text-align:right}
    .total-row td{border-top:2px solid #cc2222;border-bottom:none;background:#fff9f9;padding:14px 12px}
    .total-label{font-size:12px;color:#555;text-align:right;font-weight:bold}
    .total-value{font-size:22px;font-weight:900;color:#cc2222;text-align:right}
    footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee}
    @media print{body{background:#fff}.toolbar{display:none}.invoice{margin:0;padding:32px;box-shadow:none;border-radius:0}}
  </style>
  </head><body>
  <div class="toolbar">
    <button class="toolbar-btn btn-wa" id="btn-wa" onclick="shareAsPdf()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span id="wa-label">Enviar por WhatsApp</span>
    </button>
    <button class="toolbar-btn btn-dl" id="btn-dl" onclick="downloadAsPdf()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <span id="dl-label">Descargar PDF</span>
    </button>
  </div>
  <div class="invoice" id="invoice">
    <header><img src="${logoSrc}" alt="Gucha Sneakers"/><h1>GUCHA SNEAKERS</h1><p>FREE SHIPPING ACROSS THE USA</p></header>
    <div class="meta">
      <div class="meta-block"><div class="meta-label">Comprador</div><div><strong>${sale.buyerName || "—"}</strong></div>${sale.note ? `<div style="font-size:12px;color:#777;margin-top:4px">${sale.note}</div>` : ""}</div>
      <div class="meta-block" style="text-align:right"><div class="meta-label">Venta #${sale.id} · Fecha</div><div>${dateStr}</div></div>
    </div>
    <table><thead><tr><th>Modelo</th><th class="center">Size</th><th class="center">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead>
    <tbody>${row}<tr class="total-row"><td colspan="4" class="total-label">Total</td><td class="total-value">$${total.toFixed(2)}</td></tr></tbody></table>
    <footer><p style="font-size:13px;font-weight:bold;color:#333">¡Gracias por tu compra!</p><p style="font-size:11px;color:#aaa;margin-top:4px">Gucha Sneakers · Envío gratis a todo USA</p></footer>
  </div>
  <script>
    async function buildPdfBlob() {
      const { jsPDF } = window.jspdf;
      const el = document.getElementById('invoice');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const imgW = W;
      const imgH = (canvas.height * W) / canvas.width;
      let y = 0;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(img, 'PNG', 0, y, imgW, imgH);
        remaining -= H;
        y -= H;
        if (remaining > 0) pdf.addPage();
      }
      return pdf.output('blob');
    }

    async function shareAsPdf() {
      const btn = document.getElementById('btn-wa');
      const lbl = document.getElementById('wa-label');
      btn.disabled = true; lbl.textContent = 'Generando…';
      try {
        const blob = await buildPdfBlob();
        const file = new File([blob], '${fileName}', { type: 'application/pdf' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Factura Gucha Sneakers' });
        } else {
          triggerDownload(blob);
        }
      } catch(e) { if (e.name !== 'AbortError') console.error(e); }
      finally { btn.disabled = false; lbl.textContent = 'Enviar por WhatsApp'; }
    }

    async function downloadAsPdf() {
      const btn = document.getElementById('btn-dl');
      const lbl = document.getElementById('dl-label');
      btn.disabled = true; lbl.textContent = 'Generando…';
      try {
        const blob = await buildPdfBlob();
        triggerDownload(blob);
      } catch(e) { console.error(e); }
      finally { btn.disabled = false; lbl.textContent = 'Descargar PDF'; }
    }

    function triggerDownload(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = '${fileName}';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  <\/script>
  </body></html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

// ── EditSaleModal ─────────────────────────────────────────────────────────────
interface EditSaleModalProps {
  sale: SaleRecord;
  onClose: () => void;
  onSaved: (updatedSale: SaleRecord, sizeId?: number, sold?: number, revenue?: number) => void;
}

function EditSaleModal({ sale, onClose, onSaved }: EditSaleModalProps) {
  const [quantity,     setQuantity]     = useState(sale.quantity);
  const [pricePerPair, setPricePerPair] = useState(sale.pricePerPair);
  const [buyerName,    setBuyerName]    = useState(sale.buyerName ?? "");
  const [note,         setNote]         = useState(sale.note ?? "");
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/sales/${sale.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, pricePerPair, buyerName, note }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Error al guardar");
        setSaving(false);
        return;
      }
      const updatedSale: SaleRecord = {
        ...sale,
        quantity,
        pricePerPair,
        buyerName: buyerName || null,
        note:      note      || null,
      };
      onSaved(updatedSale, data.updatedSize?.id, data.updatedSize?.sold, data.updatedSize?.revenue);
    } catch {
      setError("Error de red");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="bg-[#111] border border-gucha-border rounded-2xl w-full max-w-sm shadow-card animate-fade-up flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gucha-border/60">
          <div>
            <p className="text-[10px] text-gucha-muted tracking-widest uppercase">Editar venta</p>
            <p className="text-[14px] font-black text-white">#{sale.id}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>

        {/* body */}
        <div className="px-5 py-4 space-y-3">
          {/* Qty */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Cantidad</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity((v) => Math.max(1, v - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white hover:border-gucha-subtle/60 transition-colors">−</button>
              <input type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-16 text-center bg-gucha-dark border border-gucha-border rounded-lg py-1.5 text-white text-[14px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
              <button onClick={() => setQuantity((v) => v + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white hover:border-gucha-subtle/60 transition-colors">+</button>
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Precio por par</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gucha-muted text-[12px] font-bold">$</span>
              <input type="number" min={0} step="0.01" value={pricePerPair}
                onChange={(e) => setPricePerPair(Math.max(0, Number(e.target.value)))}
                className="w-full pl-7 bg-gucha-dark border border-gucha-border rounded-xl py-2 text-white text-[13px] font-bold outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
            </div>
          </div>

          {/* Buyer */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Comprador</label>
            <input type="text" placeholder="Nombre del comprador" value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full bg-gucha-dark border border-gucha-border rounded-xl px-3.5 py-2 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"/>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[9px] text-gucha-muted tracking-widest uppercase mb-1.5">Nota</label>
            <input type="text" placeholder="Nota opcional" value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-gucha-dark border border-gucha-border rounded-xl px-3.5 py-2 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"/>
          </div>

          {/* Total preview */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[9px] text-gucha-muted tracking-widest uppercase">Total nuevo</span>
            <span className="text-[18px] font-black text-gucha-green-light">${(quantity * pricePerPair).toFixed(2)}</span>
          </div>

          {error && <p className="text-[11px] text-gucha-red text-center">{error}</p>}
        </div>

        {/* footer */}
        <div className="px-5 pb-5 space-y-2">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-red-glow">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          <button onClick={onClose}
            className="w-full py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white transition-colors">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SalesRegister({ onRevert, onProductUpdated }: Props) {
  const [sales,     setSales]     = useState<SaleRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [reverting, setReverting] = useState<number | null>(null);
  const [search,    setSearch]    = useState("");
  const [editSale,  setEditSale]  = useState<SaleRecord | null>(null);

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

  function handleEditSaved(
    updatedSale: SaleRecord,
    sizeId?: number,
    sold?: number,
    revenue?: number,
  ) {
    setSales((prev) => prev.map((s) => s.id === updatedSale.id ? updatedSale : s));
    if (sizeId !== undefined && sold !== undefined && revenue !== undefined) {
      onProductUpdated(sizeId, sold, revenue);
    }
    setEditSale(null);
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
    ? byDate.filter((s) => {
        const q = search.toLowerCase();
        return (
          s.buyerName?.toLowerCase().includes(q) ||
          s.size?.product?.name?.toLowerCase().includes(q) ||
          s.customProduct?.toLowerCase().includes(q) ||
          s.customBrand?.toLowerCase().includes(q) ||
          String(s.id).includes(q)
        );
      })
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
    ["B8", "B9"].forEach((cell) => {
      if (wsResumen[cell]) wsResumen[cell].z = '"$"#,##0.00';
    });
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

    // ── Sheet 2: Detalle de ventas ───────────────────────────────────────
    const headers = ["#", "Fecha", "Marca", "Modelo", "Size", "Cliente", "Pares", "$/par", "Total", "Nota"];
    const rows = filtered.map((s) => [
      s.id,
      fmt(s.createdAt),
      s.size?.product?.brand?.name ?? s.customBrand   ?? "",
      s.size?.product?.name        ?? s.customProduct ?? "",
      s.size?.number               ?? s.customSize    ?? "",
      s.buyerName                  ?? "",
      s.quantity,
      s.pricePerPair,
      s.quantity * s.pricePerPair,
      s.note                       ?? "",
    ]);

    const totalsRow: (string | number)[] = [
      "", "TOTAL", "", "", "", "",
      totalPairs, "", totalRevenue, "",
    ];

    const wsDetalle = XLSX.utils.aoa_to_sheet([headers, ...rows, [], totalsRow]);
    wsDetalle["!cols"] = [
      { wch: 6  },
      { wch: 20 },
      { wch: 14 },
      { wch: 30 },
      { wch: 7  },
      { wch: 18 },
      { wch: 7  },
      { wch: 10 },
      { wch: 12 },
      { wch: 20 },
    ];
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
      const key   = s.size?.product?.name ?? s.customProduct ?? "Desconocido";
      const brand = s.size?.product?.brand?.name ?? s.customBrand ?? "";
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
    for (let r = 1; r <= topRows.length; r++) {
      const cellRef = `F${r + 1}`;
      if (wsTop[cellRef] && typeof wsTop[cellRef].v === "number") {
        wsTop[cellRef].z = '"$"#,##0.00';
      }
    }
    XLSX.utils.book_append_sheet(wb, wsTop, "Top Modelos");

    const fileName = `reporte-ventas-gucha-${label.replace(/[\s/→]+/g, "-").toLowerCase()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  return (
    <>
      {/* ── Edit modal ── */}
      {editSale && (
        <EditSaleModal
          sale={editSale}
          onClose={() => setEditSale(null)}
          onSaved={handleEditSaved}
        />
      )}

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
                        ) : sale.customProduct ? (
                          <div>
                            <div className="flex items-center gap-1 mb-0.5">
                              {sale.customBrand && (
                                <p className="text-[8px] font-bold text-gucha-red tracking-widest uppercase">{sale.customBrand}</p>
                              )}
                              <span className="text-[7px] font-bold text-gucha-muted/60 border border-gucha-border rounded px-1 uppercase tracking-wider">libre</span>
                            </div>
                            <p className="font-semibold text-white truncate">{sale.customProduct}</p>
                          </div>
                        ) : <span className="text-gucha-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-bold text-white">{sale.size?.number ?? sale.customSize ?? "—"}</span>
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
                          {/* Invoice */}
                          <button
                            onClick={() => generateSaleInvoice(sale)}
                            title="Ver/imprimir factura"
                            className="px-2.5 py-1 rounded-lg border border-gucha-border text-gucha-muted text-[9px] font-semibold hover:text-gucha-green-light hover:border-gucha-green/40 transition-colors whitespace-nowrap"
                          >
                            📄
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setEditSale(sale)}
                            title="Editar venta"
                            className="px-2.5 py-1 rounded-lg border border-gucha-border text-gucha-muted text-[9px] font-semibold hover:text-white hover:border-gucha-subtle/60 transition-colors whitespace-nowrap"
                          >
                            ✎
                          </button>
                          {/* Revert */}
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
    </>
  );
}
