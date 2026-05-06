"use client";

import { useState } from "react";
import type { CartItem } from "@/types";

interface Props {
  items:      CartItem[];
  onRemove:   (index: number) => void;
  onCheckout: (buyer: string, note: string) => Promise<void>;
  onClose:    () => void;
}

function generateInvoice(items: CartItem[], buyer: string, note: string) {
  const logoUrl = window.location.origin + "/logo.png";
  const dateStr = new Intl.DateTimeFormat("es", { dateStyle: "long" }).format(new Date());
  const total   = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  const rows = items.map((item) => `
    <tr>
      <td>
        ${item.brand ? `<div class="brand">${item.brand}</div>` : ""}
        ${item.productName}
      </td>
      <td class="center">${item.sizeNumber}</td>
      <td class="center">${item.qty}</td>
      <td class="right">$${item.price.toFixed(2)}</td>
      <td class="right"><strong>$${(item.qty * item.price).toFixed(2)}</strong></td>
    </tr>
  `).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura · Gucha Sneakers</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;background:#fff;color:#111;padding:40px;max-width:720px;margin:0 auto}
    header{text-align:center;padding-bottom:24px;border-bottom:3px solid #cc2222;margin-bottom:28px}
    header img{width:110px;height:auto;margin-bottom:10px}
    header h1{font-size:22px;font-weight:900;color:#cc2222;letter-spacing:.12em}
    header p{font-size:11px;color:#888;margin-top:3px;letter-spacing:.05em}
    .meta{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:20px}
    .meta-block{font-size:13px}
    .meta-label{font-size:9px;color:#999;text-transform:uppercase;letter-spacing:.15em;margin-bottom:4px;font-weight:bold}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    thead tr{border-bottom:2px solid #cc2222;background:#fafafa}
    th{padding:10px 12px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.12em;color:#888}
    td{padding:12px;font-size:13px;border-bottom:1px solid #eee;vertical-align:top}
    .brand{font-size:9px;color:#cc2222;font-weight:900;letter-spacing:.15em;text-transform:uppercase;margin-bottom:2px}
    .center{text-align:center}
    .right{text-align:right}
    .total-row td{border-top:2px solid #cc2222;border-bottom:none;background:#fff9f9;padding:14px 12px}
    .total-label{font-size:12px;color:#555;text-align:right;font-weight:bold}
    .total-value{font-size:22px;font-weight:900;color:#cc2222;text-align:right}
    footer{text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #eee}
    footer p{font-size:11px;color:#aaa;margin-top:4px}
    @media print{body{padding:20px}button{display:none}}
  </style>
</head>
<body>
  <header>
    <img src="${logoUrl}" alt="Gucha Sneakers" />
    <h1>GUCHA SNEAKERS</h1>
    <p>FREE SHIPPING ACROSS THE USA</p>
  </header>

  <div class="meta">
    <div class="meta-block">
      <div class="meta-label">Comprador</div>
      <div><strong>${buyer || "—"}</strong></div>
      ${note ? `<div style="font-size:12px;color:#777;margin-top:4px">${note}</div>` : ""}
    </div>
    <div class="meta-block" style="text-align:right">
      <div class="meta-label">Fecha</div>
      <div>${dateStr}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Modelo</th>
        <th class="center">Talla</th>
        <th class="center">Cant.</th>
        <th class="right">Precio</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="4" class="total-label">Total</td>
        <td class="total-value">$${total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <footer>
    <p style="font-size:13px;font-weight:bold;color:#333">¡Gracias por tu compra!</p>
    <p>Gucha Sneakers · Envío gratis a todo USA</p>
  </footer>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

export default function CartModal({ items, onRemove, onCheckout, onClose }: Props) {
  const [buyer,  setBuyer]  = useState("");
  const [note,   setNote]   = useState("");
  const [saving, setSaving] = useState(false);

  const total = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  async function handleCheckout(withInvoice: boolean) {
    if (saving || items.length === 0) return;
    setSaving(true);
    await onCheckout(buyer.trim(), note.trim());
    if (withInvoice) generateInvoice(items, buyer.trim(), note.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}>
      <div className="bg-[#111] border border-gucha-border rounded-2xl w-full max-w-sm shadow-card animate-fade-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gucha-border/60 flex-shrink-0">
          <div>
            <p className="text-[10px] text-gucha-muted tracking-widest uppercase">Orden</p>
            <p className="text-[15px] font-black text-white">Carrito
              <span className="ml-2 text-[11px] font-normal text-gucha-muted">({items.length} {items.length === 1 ? "item" : "items"})</span>
            </p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>

        {/* items list */}
        <div className="px-5 py-3 overflow-y-auto flex-1 space-y-2">
          {items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2 opacity-20">🛒</p>
              <p className="text-[12px] text-gucha-muted">El carrito está vacío</p>
            </div>
          ) : items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3 py-2.5">
              <div className="flex-1 min-w-0">
                {item.brand && (
                  <p className="text-[8px] font-black text-gucha-red tracking-[0.2em] uppercase">{item.brand}</p>
                )}
                <p className="text-[12px] font-semibold text-white leading-snug truncate">{item.productName}</p>
                <p className="text-[10px] text-gucha-muted mt-0.5">
                  Talla {item.sizeNumber} · {item.qty} par{item.qty > 1 ? "es" : ""} · ${item.price.toFixed(2)}/par
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-[13px] font-black text-gucha-green-light">${(item.qty * item.price).toFixed(2)}</p>
                <button onClick={() => onRemove(i)}
                  className="text-[9px] text-gucha-muted/50 hover:text-gucha-red-light transition-colors mt-0.5">
                  quitar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* buyer + note */}
        {items.length > 0 && (
          <div className="px-5 pb-3 space-y-2.5 border-t border-gucha-border/40 pt-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-gucha-muted tracking-widest uppercase">Total</span>
              <span className="text-[20px] font-black text-gucha-green-light">${total.toFixed(2)}</span>
            </div>
            <input type="text" placeholder="Nombre del comprador (opcional)" value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors" />
            <input type="text" placeholder="Nota (opcional)" value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors" />
          </div>
        )}

        {/* footer */}
        <div className="px-5 pb-5 pt-2 flex-shrink-0">
          {items.length > 0 ? (
            <div className="flex flex-col gap-2">
              <button onClick={() => handleCheckout(true)} disabled={saving}
                className="w-full py-2.5 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all shadow-red-glow flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                {saving ? "Registrando…" : "Registrar y generar factura"}
              </button>
              <button onClick={() => handleCheckout(false)} disabled={saving}
                className="w-full py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white disabled:opacity-50 transition-colors">
                {saving ? "Registrando…" : "Solo registrar"}
              </button>
            </div>
          ) : (
            <button onClick={onClose}
              className="w-full py-2 rounded-xl border border-gucha-border text-gucha-muted text-[12px] font-semibold hover:text-white transition-colors">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
