"use client";
import { useState } from "react";
import type { AdminSelectedSize, SaleLine } from "@/types";

interface Props {
  items:   AdminSelectedSize[];
  onSell:  (lines: SaleLine[]) => Promise<void>;
  onClose: () => void;
}

function generateInvoice(items: AdminSelectedSize[], lines: { qty: number; price: number }[], buyer: string, note: string) {
  const logoUrl = window.location.origin + "/logo.png";
  const dateStr = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date());
  const total   = lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  const rows = items.map((item, i) => `
    <tr>
      <td>${item.brand ? `<div class="brand">${item.brand}</div>` : ""}${item.productName}</td>
      <td class="center">${item.sizeNumber}</td>
      <td class="center">${lines[i].qty}</td>
      <td class="right">$${lines[i].price.toFixed(2)}</td>
      <td class="right"><strong>$${(lines[i].qty * lines[i].price).toFixed(2)}</strong></td>
    </tr>`).join("");
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Factura · Gucha Sneakers</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:720px;margin:0 auto}header{text-align:center;padding-bottom:24px;border-bottom:3px solid #cc2222;margin-bottom:28px}header img{width:110px;height:auto;margin-bottom:10px}header h1{font-size:22px;font-weight:900;color:#cc2222;letter-spacing:.12em}header p{font-size:11px;color:#888;margin-top:3px}.meta{display:flex;justify-content:space-between;margin-bottom:24px;gap:20px}.meta-block{font-size:13px}.meta-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;font-weight:bold}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead tr{border-bottom:2px solid #cc2222;background:#fafafa}th{padding:10px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888}td{padding:12px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top}.brand{font-size:9px;color:#cc2222;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:2px}.center{text-align:center}.right{text-align:right}.total-row td{border-top:2px solid #cc2222;border-bottom:none;background:#fff9f9;padding:14px 12px}.total-label{font-size:12px;color:#555;text-align:right;font-weight:bold}.total-value{font-size:22px;font-weight:900;color:#cc2222;text-align:right}footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee}@media print{body{padding:20px}}</style>
  </head><body>
  <header><img src="${logoUrl}" alt="Gucha Sneakers"/><h1>GUCHA SNEAKERS</h1><p>FREE SHIPPING ACROSS THE USA</p></header>
  <div class="meta"><div class="meta-block"><div class="meta-label">Comprador</div><div><strong>${buyer || "—"}</strong></div>${note ? `<div style="font-size:12px;color:#777;margin-top:4px">${note}</div>` : ""}</div>
  <div class="meta-block" style="text-align:right"><div class="meta-label">Fecha</div><div>${dateStr}</div></div></div>
  <table><thead><tr><th>Modelo</th><th class="center">Size</th><th class="center">Cant.</th><th class="right">Precio</th><th class="right">Subtotal</th></tr></thead>
  <tbody>${rows}<tr class="total-row"><td colspan="4" class="total-label">Total</td><td class="total-value">$${total.toFixed(2)}</td></tr></tbody></table>
  <footer><p style="font-size:13px;font-weight:bold;color:#333">¡Gracias por tu compra!</p><p style="font-size:11px;color:#aaa;margin-top:4px">Gucha Sneakers · Envío gratis a todo USA</p></footer>
  <script>window.onload=()=>{window.print();}<\/script></body></html>`;
  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export default function BulkSaleModal({ items, onSell, onClose }: Props) {
  const [qtys,   setQtys]   = useState<number[]>(items.map(() => 1));
  const [prices, setPrices] = useState<number[]>(items.map((i) => i.listPrice ?? 0));
  const [buyer,  setBuyer]  = useState("");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  const lines = items.map((item, i) => ({
    qty:   Math.max(1, Math.min(qtys[i] ?? 1, item.maxQty)),
    price: Math.max(0, prices[i] ?? 0),
  }));
  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);

  function updQty(i: number, v: number) {
    setQtys((prev) => { const n = [...prev]; n[i] = Math.max(1, Math.min(v, items[i].maxQty)); return n; });
  }
  function updPrice(i: number, v: number) {
    setPrices((prev) => { const n = [...prev]; n[i] = Math.max(0, v); return n; });
  }

  async function handleSell(withInvoice: boolean) {
    if (saving) return;
    setSaving(true);
    await onSell(items.map((item, i) => ({ productId: item.productId, sizeId: item.sizeId, qty: lines[i].qty, price: lines[i].price, buyer: buyer.trim(), note: note.trim() })));
    if (withInvoice) generateInvoice(items, lines, buyer.trim(), note.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }} onClick={onClose}>
      <div className="bg-[#111] border border-gucha-border rounded-2xl w-full max-w-md shadow-card animate-fade-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gucha-border/60 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gucha-muted tracking-widest uppercase">Venta</p>
            <p className="text-[15px] font-black text-white">Registrar venta
              <span className="ml-2 text-[11px] font-normal text-gucha-muted">({items.length} {items.length === 1 ? "item" : "items"})</span>
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>
        {/* items */}
        <div className="px-5 py-3 overflow-y-auto flex-1 space-y-3">
          {items.map((item, i) => (
            <div key={item.sizeId} className="bg-[#0d0d0d] border border-gucha-border rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  {item.brand && <p className="text-[8px] font-black text-gucha-red tracking-[0.2em] uppercase">{item.brand}</p>}
                  <p className="text-[12px] font-semibold text-white truncate">{item.productName}</p>
                </div>
                <span className="flex-shrink-0 px-2 py-0.5 bg-gucha-dark border border-gucha-border rounded-lg text-[11px] font-bold text-gucha-muted">
                  Size {item.sizeNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => updQty(i, (qtys[i] ?? 1) - 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white hover:border-gucha-subtle/60 transition-colors text-sm">−</button>
                  <input type="number" min={1} max={item.maxQty} value={qtys[i] ?? 1}
                    onChange={(e) => updQty(i, Number(e.target.value))}
                    className="w-10 text-center bg-gucha-dark border border-gucha-border rounded-lg py-1 text-white text-[13px] font-bold outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                  <button onClick={() => updQty(i, (qtys[i] ?? 1) + 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-white hover:border-gucha-subtle/60 transition-colors text-sm">+</button>
                  <span className="text-[9px] text-gucha-muted">/{item.maxQty}</span>
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gucha-muted text-[11px] font-bold">$</span>
                  <input type="number" min={0} step="0.01" value={prices[i] ?? 0}
                    onChange={(e) => updPrice(i, Number(e.target.value))}
                    className="w-full pl-5 bg-gucha-dark border border-gucha-border rounded-lg py-1.5 text-white text-[13px] font-bold outline-none focus:border-gucha-subtle/60 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"/>
                </div>
                <span className="text-[12px] font-black text-gucha-green-light flex-shrink-0">${(lines[i].qty * lines[i].price).toFixed(2)}</span>
              </div>
            </div>
          ))}
          <div className="space-y-2 pt-1">
            <input type="text" placeholder="Nombre del comprador (opcional)" value={buyer} onChange={(e) => setBuyer(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"/>
            <input type="text" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"/>
          </div>
        </div>
        {/* footer */}
        <div className="px-5 pb-5 pt-3 border-t border-gucha-border/60 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-gucha-muted tracking-widest uppercase">Total</span>
            <span className="text-[20px] font-black text-gucha-green-light">${total.toFixed(2)}</span>
          </div>
          <button onClick={() => handleSell(true)} disabled={saving}
            className="w-full py-2.5 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-red-glow flex items-center justify-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            {saving ? "Registrando…" : "Registrar y generar factura"}
          </button>
          <button onClick={() => handleSell(false)} disabled={saving}
            className="w-full py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white disabled:opacity-50 transition-colors">
            {saving ? "Registrando…" : "Solo registrar"}
          </button>
          <button onClick={onClose}
            className="w-full py-2 rounded-xl text-gucha-muted/60 text-[11px] hover:text-gucha-muted transition-colors">
            Cancelar y deseleccionar
          </button>
        </div>
      </div>
    </div>
  );
}
