"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GuchaLogo    from "@/components/GuchaLogo";
import Stats        from "@/components/Stats";
import SearchBar    from "@/components/SearchBar";
import ProductCard  from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import LoginModal   from "@/components/LoginModal";
import type { ProductData, ProductFormData, Stats as StatsType } from "@/types";

function computeStats(products: ProductData[]): StatsType {
  return {
    totalProducts: products.length,
    totalStock:    products.reduce((acc, p) => acc + p.sizes.reduce((s, sz) => s + sz.quantity - sz.sold, 0), 0),
    totalSold:     products.reduce((acc, p) => acc + p.sizes.reduce((s, sz) => s + sz.sold, 0), 0),
  };
}

// ── Editable month ───────────────────────────────────────────────────────────
function MonthTag({ isAdmin }: { isAdmin: boolean }) {
  const [month,    setMonth]    = useState("…");
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState("");
  const [saving,   setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/month")
      .then((r) => r.json())
      .then((d) => setMonth(d.value ?? "Mayo 2026"));
  }, []);

  function startEdit() {
    if (!isAdmin) return;
    setDraft(month);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 50);
  }

  async function save() {
    if (!draft.trim() || draft === month) { setEditing(false); return; }
    setSaving(true);
    const res = await fetch("/api/settings/month", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: draft.trim() }),
    });
    const data = await res.json();
    setMonth(data.value);
    setEditing(false);
    setSaving(false);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        disabled={saving}
        className="text-[9px] font-bold tracking-[0.3em] text-gucha-red bg-transparent border-b border-gucha-red/40 outline-none w-28 uppercase"
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      title={isAdmin ? "Clic para editar mes" : undefined}
      className={`text-[9px] font-bold tracking-[0.3em] text-gucha-muted uppercase ${isAdmin ? "cursor-pointer hover:text-gucha-red transition-colors" : ""}`}
    >
      Inventario · {month}
      {isAdmin && <span className="ml-1 opacity-40">✎</span>}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [products,    setProducts]    = useState<ProductData[]>([]);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editProduct, setEditProduct] = useState<ProductData | null>(null);
  const [toast,       setToast]       = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(d.isAdmin ?? false));
  }, []);

  const fetchProducts = useCallback(async (q = "") => {
    const res  = await fetch(`/api/products${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    const data: ProductData[] = await res.json();
    setProducts(data);
  }, []);

  useEffect(() => { fetchProducts().finally(() => setLoading(false)); }, [fetchProducts]);
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 280);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false); showToast("Sesión cerrada");
  }

  async function handleSave(data: ProductFormData, id?: number) {
    if (id) {
      await fetch(`/api/products/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      showToast("Producto actualizado");
    } else {
      await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      showToast("Producto agregado");
    }
    await fetchProducts(search);
  }

  async function handleDelete(productId: number) {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`/api/products/${productId}`, { method: "DELETE" });
    showToast("Producto eliminado");
    await fetchProducts(search);
  }

  async function handleToggleSize(productId: number, sizeId: number, sold: number) {
    await fetch(`/api/products/${productId}/sizes/${sizeId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sold }),
    });
    setProducts((prev) =>
      prev.map((p) => p.id !== productId ? p : {
        ...p, sizes: p.sizes.map((s) => s.id === sizeId ? { ...s, sold } : s),
      })
    );
  }

  function openAdd()                { setEditProduct(null); setModalOpen(true); }
  function openEdit(p: ProductData) { setEditProduct(p);    setModalOpen(true); }

  const stats = computeStats(products);

  // ── Sidebar content (shared between mobile header & desktop sidebar) ──────
  const sidebarContent = (
    <>
      <GuchaLogo />
      <div className="flex items-center justify-between mb-5">
        <MonthTag isAdmin={isAdmin} />
        {isAdmin ? (
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-[9px] font-bold text-gucha-muted hover:text-gucha-red-light border border-gucha-border rounded-full px-2.5 py-1 transition-colors">
            <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block" />
            Admin · Salir
          </button>
        ) : (
          <button onClick={() => setShowLogin(true)}
            className="text-[9px] font-bold text-gucha-muted hover:text-white border border-gucha-border rounded-full px-2.5 py-1 transition-colors">
            Admin
          </button>
        )}
      </div>
      <Stats stats={stats} />
      <SearchBar value={search} onChange={setSearch} />
    </>
  );

  const footerContent = (
    <div className="flex flex-col items-center gap-1.5 py-6">
      <img src="/logo.png" alt="Gucha Sneakers" className="w-20 h-auto opacity-70" />
      <span className="text-[11px] text-gucha-muted">(347) 818-0549</span>
      <span className="text-[9px] font-bold text-gucha-green-light bg-gucha-green-dark/50 border border-gucha-green/20 px-3 py-1 rounded-full tracking-widest">
        ENVÍO GRATIS A TODO USA
      </span>
    </div>
  );

  // ── Product grid ──────────────────────────────────────────────────────────
  const productGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {loading && [...Array(4)].map((_, i) => (
        <div key={i} className="bg-card-gradient border border-gucha-border rounded-2xl h-44 animate-pulse-soft" />
      ))}

      {!loading && products.length === 0 && (
        <div className="col-span-2 text-center py-16">
          <div className="text-5xl mb-4 opacity-20">👟</div>
          <p className="text-gucha-subtle text-[13px] mb-1 font-medium">
            {search ? "Sin resultados" : "Inventario vacío"}
          </p>
          <p className="text-gucha-muted text-[11px] mb-5">
            {search ? `No se encontró "${search}"` : "Agrega tu primer modelo para empezar"}
          </p>
          {!search && isAdmin && (
            <button onClick={openAdd}
              className="text-[11px] font-bold text-gucha-green-light border border-gucha-green/30 bg-gucha-green-dark/40 rounded-xl px-5 py-2.5 hover:bg-gucha-green/20 transition-colors">
              + Nuevo producto
            </button>
          )}
        </div>
      )}

      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          index={i}
          isAdmin={isAdmin}
          onToggleSize={handleToggleSize}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );

  return (
    <main className="min-h-screen bg-black">

      {/* ════════════════════════════════════════
          DESKTOP layout (md+): sidebar + main
          ════════════════════════════════════════ */}
      <div className="hidden md:flex min-h-screen max-w-7xl mx-auto">

        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-gucha-border-2 px-6 py-4 flex flex-col">
          <div className="flex-1">
            {sidebarContent}
          </div>
          <div className="border-t border-gucha-border-2">
            {footerContent}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* top bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-red-gradient rounded-full" />
              <h1 className="text-[13px] font-black text-white tracking-[0.2em]">
                {search ? "RESULTADOS" : "COLECCIÓN ACTUAL"}
              </h1>
              {!loading && (
                <span className="text-[11px] text-gucha-muted">
                  ({products.length} {products.length === 1 ? "modelo" : "modelos"})
                </span>
              )}
            </div>
            {isAdmin && (
              <button onClick={openAdd}
                className="flex items-center gap-2 bg-red-gradient text-white text-[12px] font-bold px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-red-glow">
                + Agregar producto
              </button>
            )}
          </div>

          {productGrid}
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE layout (< md): single column
          ════════════════════════════════════════ */}
      <div className="md:hidden max-w-md mx-auto px-5 py-4 pb-28">
        {sidebarContent}

        {/* section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 bg-red-gradient rounded-full" />
            <span className="text-[10px] font-bold text-gucha-subtle tracking-[0.25em]">
              {search ? "RESULTADOS" : "COLECCIÓN"}
            </span>
            {!loading && <span className="text-[9px] text-gucha-muted">({products.length})</span>}
          </div>
          {isAdmin && (
            <button onClick={openAdd}
              className="flex items-center gap-1 text-[10px] font-bold text-gucha-green-light bg-gucha-green-dark/50 border border-gucha-green/20 rounded-lg px-3 py-1.5 hover:bg-gucha-green/20 transition-colors">
              <span className="text-sm">+</span> Agregar
            </button>
          )}
        </div>

        {productGrid}

        {!loading && products.length > 0 && (
          <div className="border-t border-gucha-border-2 mt-4">
            {footerContent}
          </div>
        )}
      </div>

      {/* ── FAB mobile — solo admin ─── */}
      {isAdmin && (
        <button onClick={openAdd}
          className="md:hidden fixed bottom-6 right-5 w-14 h-14 bg-red-gradient rounded-2xl shadow-red-glow flex items-center justify-center text-white text-2xl hover:opacity-90 active:scale-95 transition-all z-40">
          +
        </button>
      )}

      {/* ── Toast ─────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="bg-gucha-card-2 border border-gucha-border text-white text-[12px] font-medium px-4 py-2.5 rounded-xl shadow-card flex items-center gap-2 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light" />
            {toast}
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────── */}
      {showLogin && (
        <LoginModal
          onSuccess={() => { setIsAdmin(true); showToast("Bienvenido, admin"); }}
          onClose={() => setShowLogin(false)}
        />
      )}
      {modalOpen && isAdmin && (
        <ProductModal
          product={editProduct}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
