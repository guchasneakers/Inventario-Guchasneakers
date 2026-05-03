"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function HomePage() {
  const [products,      setProducts]      = useState<ProductData[]>([]);
  const [search,        setSearch]        = useState("");
  const [loading,       setLoading]       = useState(true);
  const [isAdmin,       setIsAdmin]       = useState(false);
  const [showLogin,     setShowLogin]     = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editProduct,   setEditProduct]   = useState<ProductData | null>(null);
  const [toast,         setToast]         = useState("");

  // Check admin session on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.isAdmin ?? false));
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    showToast("Sesión cerrada");
  }

  async function handleSave(data: ProductFormData, id?: number) {
    if (id) {
      await fetch(`/api/products/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      showToast("Producto actualizado");
    } else {
      await fetch("/api/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
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
      prev.map((p) =>
        p.id !== productId ? p : {
          ...p,
          sizes: p.sizes.map((s) => s.id === sizeId ? { ...s, sold } : s),
        }
      )
    );
  }

  function openAdd()                { setEditProduct(null); setModalOpen(true); }
  function openEdit(p: ProductData) { setEditProduct(p);    setModalOpen(true); }

  const stats = computeStats(products);

  return (
    <main className="min-h-screen bg-black pb-24">
      <div className="max-w-md mx-auto">

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="px-5">
          <GuchaLogo />

          {/* tagline + admin bar */}
          <div className="flex items-center justify-between -mt-2 mb-6">
            <p className="text-[9px] font-bold text-gucha-muted tracking-[0.4em] uppercase">
              Inventario · Mayo 2026
            </p>
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-[9px] font-bold text-gucha-muted hover:text-gucha-red-light border border-gucha-border rounded-full px-3 py-1 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block" />
                Admin · Salir
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-[9px] font-bold text-gucha-muted hover:text-white border border-gucha-border rounded-full px-3 py-1 transition-colors tracking-wide"
              >
                Admin
              </button>
            )}
          </div>

          {/* stats */}
          <Stats stats={stats} />

          {/* search */}
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* ── SECTION HEADER ──────────────────────────── */}
        <div className="flex items-center justify-between px-5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-4 bg-red-gradient rounded-full" />
            <span className="text-[10px] font-bold text-gucha-subtle tracking-[0.25em]">
              {search ? "RESULTADOS" : "COLECCIÓN"}
            </span>
            {!loading && (
              <span className="text-[9px] text-gucha-muted">({products.length})</span>
            )}
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 text-[10px] font-bold text-gucha-green-light bg-gucha-green-dark/50 border border-gucha-green/20 rounded-lg px-3 py-1.5 hover:bg-gucha-green/20 transition-colors tracking-wide"
            >
              <span className="text-sm leading-none">+</span> Agregar
            </button>
          )}
        </div>

        {/* ── PRODUCT LIST ────────────────────────────── */}
        <div className="px-5">
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card-gradient border border-gucha-border rounded-2xl h-40 animate-pulse-soft" />
              ))}
            </div>
          )}

          {!loading && products.length === 0 && (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-20">👟</div>
              <p className="text-gucha-subtle text-[13px] mb-1 font-medium">
                {search ? "Sin resultados" : "Inventario vacío"}
              </p>
              <p className="text-gucha-muted text-[11px] mb-6">
                {search ? `No se encontró "${search}"` : "El inventario está vacío por el momento"}
              </p>
              {!search && isAdmin && (
                <button
                  onClick={openAdd}
                  className="text-[11px] font-bold text-gucha-green-light border border-gucha-green/30 bg-gucha-green-dark/40 rounded-xl px-5 py-2.5 hover:bg-gucha-green/20 transition-colors"
                >
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

        {/* ── FOOTER ──────────────────────────────────── */}
        {!loading && products.length > 0 && (
          <footer className="px-5 mt-6 pt-5 border-t border-gucha-border-2">
            <div className="flex flex-col items-center gap-1.5">
              <img src="/logo.png" alt="Gucha Sneakers" className="w-24 h-auto opacity-80" />
              <span className="text-[11px] text-gucha-muted">(347) 818-0549</span>
              <span className="mt-1 text-[9px] font-bold text-gucha-green-light bg-gucha-green-dark/50 border border-gucha-green/20 px-3 py-1 rounded-full tracking-widest">
                ENVÍO GRATIS A TODO USA
              </span>
            </div>
          </footer>
        )}
      </div>

      {/* ── FAB — solo admin ────────────────────────── */}
      {isAdmin && (
        <button
          onClick={openAdd}
          className="fixed bottom-6 right-5 w-14 h-14 bg-red-gradient rounded-2xl shadow-red-glow flex items-center justify-center text-white text-2xl font-light hover:opacity-90 active:scale-95 transition-all z-40"
          title="Agregar producto"
        >
          +
        </button>
      )}

      {/* ── TOAST ───────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
          <div className="bg-gucha-card-2 border border-gucha-border text-white text-[12px] font-medium px-4 py-2.5 rounded-xl shadow-card flex items-center gap-2 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block" />
            {toast}
          </div>
        </div>
      )}

      {/* ── MODALS ──────────────────────────────────── */}
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
