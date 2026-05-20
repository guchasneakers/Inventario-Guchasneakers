"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import GuchaLogo    from "@/components/GuchaLogo";
import Stats        from "@/components/Stats";
import SearchBar    from "@/components/SearchBar";
import ProductCard  from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import LoginModal   from "@/components/LoginModal";
import StockTable       from "@/components/StockTable";
import MobileStockList  from "@/components/MobileStockList";
import SalesRegister    from "@/components/SalesRegister";
import FilterBar, { defaultFilters, type Filters } from "@/components/FilterBar";
import BulkSaleModal  from "@/components/BulkSaleModal";
import FreeSaleModal  from "@/components/FreeSaleModal";
import type { AdminSelectedSize, BrandData, ProductData, ProductFormData, SaleLine, Stats as StatsType } from "@/types";

function computeStats(products: ProductData[], brands: BrandData[]): StatsType {
  const visibleProducts = products.filter((p) => !p.hidden);
  return {
    totalProducts: products.length,
    totalStock:    visibleProducts.reduce((acc, p) =>
      acc + p.sizes.filter((sz) => !sz.hidden).reduce((s, sz) => s + Math.max(0, sz.quantity - sz.sold), 0), 0),
    totalSold:     products.reduce((acc, p) => acc + p.sizes.reduce((s, sz) => s + sz.sold, 0), 0),
    totalBrands:   brands.length,
  };
}

// ── Dynamic month ─────────────────────────────────────────────────────────────
function MonthTag({ twoLine = false }: { twoLine?: boolean }) {
  const month = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" })
    .format(new Date());
  const display = month.charAt(0).toUpperCase() + month.slice(1);

  if (twoLine) {
    return (
      <div className="flex flex-col leading-tight">
        <span className="text-[9px] font-bold tracking-[0.2em] text-gucha-muted uppercase">Inventario ·</span>
        <span className="text-[9px] font-bold tracking-[0.2em] text-gucha-muted uppercase whitespace-nowrap">{display}</span>
      </div>
    );
  }

  return (
    <span className="text-[11px] font-bold tracking-[0.2em] text-gucha-muted uppercase whitespace-nowrap">
      Inventario · {display}
    </span>
  );
}

// ── Descarga inventario completo en Excel ─────────────────────────────────────
function downloadInventoryExcel(products: ProductData[]) {
  const wb   = XLSX.utils.book_new();
  const curr = '"$"#,##0.00';

  // Hoja 1: Detalle por size
  const h1 = ["Marca", "Modelo", "Precio", "Size", "Stock", "Vendidos", "Disponibles", "Cobrado"];
  const r1: (string | number)[][] = [h1];
  products.forEach((p) => {
    const brand = p.brand?.name ?? "Sin marca";
    [...p.sizes]
      .sort((a, b) => parseFloat(a.number) - parseFloat(b.number))
      .forEach((s) => {
        r1.push([brand, p.name, p.price ?? 0, s.number, s.quantity, s.sold, s.quantity - s.sold, s.revenue ?? 0]);
      });
  });
  const ws1 = XLSX.utils.aoa_to_sheet(r1);
  ws1["!cols"] = [{ wch: 14 }, { wch: 36 }, { wch: 9 }, { wch: 6 }, { wch: 7 }, { wch: 9 }, { wch: 12 }, { wch: 12 }];
  for (let i = 1; i < r1.length; i++) {
    const pc = XLSX.utils.encode_cell({ r: i, c: 2 });
    const rc = XLSX.utils.encode_cell({ r: i, c: 7 });
    if (ws1[pc]) ws1[pc].z = curr;
    if (ws1[rc]) ws1[rc].z = curr;
  }
  XLSX.utils.book_append_sheet(wb, ws1, "Inventario");

  // Hoja 2: Resumen por marca
  const brandMap = new Map<string, { ids: Set<number>; stock: number; vendidos: number; cobrado: number }>();
  products.forEach((p) => {
    const key = p.brand?.name ?? "Sin marca";
    if (!brandMap.has(key)) brandMap.set(key, { ids: new Set(), stock: 0, vendidos: 0, cobrado: 0 });
    const b = brandMap.get(key)!;
    b.ids.add(p.id);
    p.sizes.forEach((s) => { b.stock += s.quantity; b.vendidos += s.sold; b.cobrado += s.revenue ?? 0; });
  });
  const h2 = ["Marca", "Modelos", "Stock Total", "Vendidos", "Disponibles", "Cobrado"];
  const r2: (string | number)[][] = [h2];
  [...brandMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([name, d]) => r2.push([name, d.ids.size, d.stock, d.vendidos, d.stock - d.vendidos, d.cobrado]));
  const ws2 = XLSX.utils.aoa_to_sheet(r2);
  ws2["!cols"] = [{ wch: 14 }, { wch: 9 }, { wch: 12 }, { wch: 9 }, { wch: 12 }, { wch: 12 }];
  for (let i = 1; i < r2.length; i++) {
    const c = XLSX.utils.encode_cell({ r: i, c: 5 });
    if (ws2[c]) ws2[c].z = curr;
  }
  XLSX.utils.book_append_sheet(wb, ws2, "Por Marca");

  XLSX.writeFile(wb, `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [products,    setProducts]    = useState<ProductData[]>([]);
  const [viewMode,      setViewMode]      = useState<"inventory" | "sales">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("gucha_viewMode") as "inventory" | "sales") ?? "inventory"
      : "inventory"
  );
  const [inventoryView, setInventoryView] = useState<"cards" | "table">("cards");
  const [brands,        setBrands]        = useState<BrandData[]>([]);
  const [filters,     setFilters]     = useState<Filters>(defaultFilters);
  const [search,      setSearch]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [isAdmin,     setIsAdmin]     = useState(false);
  const [editMode,    setEditMode]    = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editProduct, setEditProduct] = useState<ProductData | null>(null);
  const [toast,          setToast]          = useState("");
  const [adminSelection, setAdminSelection] = useState<Record<number, AdminSelectedSize>>({});
  const [adminSaleOpen,  setAdminSaleOpen]  = useState(false);
  const [freeSaleOpen,      setFreeSaleOpen]      = useState(false);
  const [salesRefreshKey,   setSalesRefreshKey]   = useState(0);
  const [salesEditMode,     setSalesEditMode]     = useState(false);

  // { sizeId → { productName, sizeNumber } }
  const [selection, setSelection] = useState<Record<number, { productName: string; sizeNumber: string }>>({});

  function handleSelectSize(productId: number, sizeId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const size = product.sizes.find((s) => s.id === sizeId);
    if (!size) return;
    setSelection((prev) => {
      if (prev[sizeId]) {
        const next = { ...prev };
        delete next[sizeId];
        return next;
      }
      return { ...prev, [sizeId]: { productName: product.name, sizeNumber: size.number } };
    });
  }

  const selectionEntries = Object.values(selection);
  const hasSelection = selectionEntries.length > 0;

  function buildWaUrl() {
    const lines = selectionEntries.map((e) => `• ${e.productName} – Size ${e.sizeNumber}`);
    const msg = `Hola! Quisiera información sobre:\n${lines.join("\n")}`;
    return `https://wa.me/13478180549?text=${encodeURIComponent(msg)}`;
  }

  function handleBrandCreated(brand: BrandData) {
    setBrands((prev) => [...prev, brand].sort((a, b) => a.name.localeCompare(b.name)));
  }

  const fetchBrands = useCallback(async () => {
    const res  = await fetch("/api/brands");
    const data = await res.json();
    setBrands(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setIsAdmin(d.isAdmin ?? false));
    fetchBrands();
  }, [fetchBrands]);

  const fetchProducts = useCallback(async (q = "") => {
    const res  = await fetch(`/api/products${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { localStorage.setItem("gucha_viewMode", viewMode); }, [viewMode]);

  useEffect(() => { fetchProducts().finally(() => setLoading(false)); }, [fetchProducts]);
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 280);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.reload();
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

  async function handleToggleHidden(productId: number, hidden: boolean) {
    await fetch(`/api/products/${productId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    setProducts((prev) =>
      prev.map((p) => p.id === productId ? { ...p, hidden } : p)
    );
    showToast(hidden ? "Producto ocultado" : "Producto visible");
  }

  async function handleToggleSizeHidden(productId: number, sizeId: number, hidden: boolean) {
    await fetch(`/api/products/${productId}/sizes/${sizeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    setProducts((prev) =>
      prev.map((p) => p.id !== productId ? p : {
        ...p,
        sizes: p.sizes.map((s) => s.id === sizeId ? { ...s, hidden } : s),
      })
    );
    showToast(hidden ? "Size ocultado" : "Size visible");
  }

  async function handleDeleteSize(productId: number, sizeId: number) {
    if (!confirm("¿Eliminar este size?")) return;
    await fetch(`/api/products/${productId}/sizes/${sizeId}`, { method: "DELETE" });
    setProducts((prev) =>
      prev.map((p) => p.id !== productId ? p : {
        ...p,
        sizes: p.sizes.filter((s) => s.id !== sizeId),
      })
    );
    showToast("Size eliminado");
  }

  async function handleAddSize(productId: number, number: string, quantity: number) {
    const res  = await fetch(`/api/products/${productId}/sizes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, quantity }),
    });
    const size = await res.json();
    setProducts((prev) =>
      prev.map((p) => p.id !== productId ? p : { ...p, sizes: [...p.sizes, size] })
    );
    showToast("Size agregado");
  }

  async function handleEditSize(productId: number, sizeId: number, number: string, quantity: number) {
    const res  = await fetch(`/api/products/${productId}/sizes/${sizeId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, quantity }),
    });
    const size = await res.json();
    setProducts((prev) =>
      prev.map((p) => p.id !== productId ? p : {
        ...p, sizes: p.sizes.map((s) => s.id === sizeId ? { ...s, ...size } : s),
      })
    );
    showToast("Size actualizado");
  }

  async function handleSale(productId: number, sizeId: number, qty: number, price: number, buyer: string, note: string) {
    const res  = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sizeId, quantity: qty, pricePerPair: price, buyerName: buyer, note }),
    });
    const data = await res.json();
    if (data.updatedSize) {
      const { id: uid, sold, revenue } = data.updatedSize;
      setProducts((prev) =>
        prev.map((p) => p.id !== productId ? p : {
          ...p, sizes: p.sizes.map((s) => s.id === uid ? { ...s, sold, revenue } : s),
        })
      );
    }
    showToast("Venta registrada ✓");
  }

  async function handleRevertSale(saleId: number) {
    const res  = await fetch(`/api/sales/${saleId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.updatedSize) {
      const { id: uid, sold, revenue } = data.updatedSize;
      setProducts((prev) =>
        prev.map((p) => {
          if (!p.sizes.some((s) => s.id === uid)) return p;
          return { ...p, sizes: p.sizes.map((s) => s.id === uid ? { ...s, sold, revenue } : s) };
        })
      );
    }
    showToast("Venta revertida");
  }

  function handleSaleEdited(sizeId: number, sold: number, revenue: number) {
    setProducts((prev) =>
      prev.map((p) => {
        if (!p.sizes.some((s) => s.id === sizeId)) return p;
        return { ...p, sizes: p.sizes.map((s) => s.id === sizeId ? { ...s, sold, revenue } : s) };
      })
    );
  }

  function handleAdminSelectSize(productId: number, sizeId: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const size = product.sizes.find((s) => s.id === sizeId);
    if (!size || size.sold >= size.quantity) return;
    setAdminSelection((prev) => {
      if (prev[sizeId]) { const n = { ...prev }; delete n[sizeId]; return n; }
      return { ...prev, [sizeId]: { productId, productName: product.name, brand: product.brand?.name ?? null, sizeId, sizeNumber: size.number, maxQty: size.quantity - size.sold, listPrice: product.price } };
    });
  }

  async function handleFreeSale(
    product: string, size: string,
    qty: number, price: number, buyer: string, note: string, imageUrl: string,
  ) {
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: qty, pricePerPair: price,
        buyerName: buyer || null, note: note || null,
        customProduct: product, customSize: size,
        customImageUrl: imageUrl || null,
      }),
    });
    setFreeSaleOpen(false);
    setSalesRefreshKey((k) => k + 1);
    showToast("Venta libre registrada ✓");
  }

  async function handleAdminBulkSale(lines: SaleLine[]) {
    for (const line of lines) {
      await handleSale(line.productId, line.sizeId, line.qty, line.price, line.buyer, line.note);
    }
    setAdminSelection({});
  }

  function openAdd()                { setEditProduct(null); setModalOpen(true); }
  function openEdit(p: ProductData) { setEditProduct(p);    setModalOpen(true); }

  // ── Tallas únicas para el filtro ─────────────────────────────────────────
  const uniqueSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s.number)));
    return [...set].sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [products]);

  // ── Productos filtrados + ordenados ──────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      // Marca
      if (filters.brandId !== null && p.brandId !== filters.brandId) return false;

      // Talla
      if (filters.size) {
        const match = isAdmin
          ? p.sizes.some((s) => s.number === filters.size)
          : p.sizes.some((s) => s.number === filters.size && !s.hidden && s.sold < s.quantity);
        if (!match) return false;
      }

      // Precio mín/máx
      if (filters.priceMin !== "" && p.price !== null) {
        if (p.price < parseFloat(filters.priceMin)) return false;
      }
      if (filters.priceMax !== "" && p.price !== null) {
        if (p.price > parseFloat(filters.priceMax)) return false;
      }

      // Admin: Estado
      if (isAdmin) {
        if (filters.status === "available") {
          if (!p.sizes.some((s) => !s.hidden && s.sold < s.quantity)) return false;
        } else if (filters.status === "soldout") {
          const visible = p.sizes.filter((s) => !s.hidden);
          if (visible.length === 0 || visible.some((s) => s.sold < s.quantity)) return false;
        } else if (filters.status === "hidden") {
          if (!p.hidden) return false;
        }
      }

      // Cliente: Solo disponibles
      if (!isAdmin && filters.onlyAvailable) {
        if (!p.sizes.some((s) => !s.hidden && s.sold < s.quantity)) return false;
      }

      return true;
    });

    // Ordenar
    if (filters.sortBy === "price-asc") {
      result = [...result].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    } else if (filters.sortBy === "price-desc") {
      result = [...result].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    }

    return result;
  }, [products, filters, isAdmin]);

  const stats = computeStats(products, brands);

  const waSvg = (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );

  // ── Sidebar content (shared between mobile header & desktop sidebar) ──────
  const adminButton = isAdmin ? (
    <button onClick={handleLogout}
      className="flex items-center gap-1.5 text-[9px] font-bold text-gucha-muted hover:text-gucha-red-light border border-gucha-border rounded-full px-2.5 py-1 transition-colors whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gucha-green-light inline-block" />
      Admin · Salir
    </button>
  ) : (
    <button onClick={() => setShowLogin(true)}
      className="text-[9px] font-bold text-gucha-muted hover:text-white border border-gucha-border rounded-full px-2.5 py-1 transition-colors whitespace-nowrap">
      Admin
    </button>
  );

  const sidebarContent = (
    <>
      {/* Desktop: logo centrado */}
      <div className="hidden md:block">
        <GuchaLogo />
      </div>

      {/* Mobile: header compacto en una sola fila */}
      <div className="flex md:hidden items-center gap-3 mt-3 mb-4">
        <img src="/logo.png" alt="Gucha Sneakers" className="w-20 h-auto drop-shadow-[0_0_8px_rgba(204,34,34,0.5)]" />
        <div className="flex-1 min-w-0">
          <MonthTag twoLine />
        </div>
        {adminButton}
      </div>

      {/* Desktop: mes + botón admin centrados */}
      <div className="hidden md:flex flex-col items-center gap-2 mb-5">
        <MonthTag />
        {adminButton}
      </div>

      <Stats stats={stats} isAdmin={isAdmin} />
      <SearchBar value={search} onChange={setSearch} />
      <FilterBar
        filters={filters}
        onChange={setFilters}
        brands={brands}
        sizes={uniqueSizes}
        isAdmin={isAdmin}
      />
      {/* WhatsApp — solo desktop sidebar, solo cliente */}
      {!isAdmin && (hasSelection ? (
        <a
          href={buildWaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center justify-center gap-2 mt-3 w-full bg-[#128c47] hover:bg-[#25d366] active:scale-95 text-white text-[12px] font-bold py-2.5 rounded-xl shadow-[0_4px_16px_rgba(18,140,71,0.4)] transition-all"
        >
          {waSvg}
          Ordena ahora
          <span className="ml-1 bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {selectionEntries.length}
          </span>
        </a>
      ) : (
        <div className="hidden md:flex items-center justify-center gap-2 mt-3 w-full bg-[#128c47]/30 border border-gucha-green/10 text-gucha-muted text-[12px] font-bold py-2.5 rounded-xl cursor-default select-none">
          {waSvg}
          Selecciona sizes
        </div>
      ))}
    </>
  );

  const footerContent = (
    <div className="flex flex-col items-center gap-1.5 py-6">
      <img src="/logo.png" alt="Gucha Sneakers" className="w-20 h-auto opacity-70" />
      <span className="text-[9px] font-bold text-gucha-green-light bg-gucha-green-dark/50 border border-gucha-green/20 px-3 py-1 rounded-full tracking-widest">
        ENVÍO GRATIS A TODO USA
      </span>
    </div>
  );

  // ── Product grid ──────────────────────────────────────────────────────────
  const hasActiveFilters = filters.brandId !== null || filters.size !== "" || filters.status !== "all" || filters.onlyAvailable;
  const isInventory = viewMode === "inventory";

  const productGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {loading && [...Array(4)].map((_, i) => (
        <div key={i} className="bg-card-gradient border border-gucha-border rounded-2xl h-44 animate-pulse-soft" />
      ))}

      {!loading && filteredProducts.length === 0 && (
        <div className="col-span-2 text-center py-16">
          <div className="text-5xl mb-4 opacity-20">👟</div>
          <p className="text-gucha-subtle text-[13px] mb-1 font-medium">
            {search || hasActiveFilters ? "Sin resultados" : "Inventario vacío"}
          </p>
          <p className="text-gucha-muted text-[11px] mb-5">
            {search ? `No se encontró "${search}"` : hasActiveFilters ? "Prueba otros filtros" : "Agrega tu primer modelo para empezar"}
          </p>
          {!search && !hasActiveFilters && isAdmin && (
            <button onClick={openAdd}
              className="text-[11px] font-bold text-gucha-green-light border border-gucha-green/30 bg-gucha-green-dark/40 rounded-xl px-5 py-2.5 hover:bg-gucha-green/20 transition-colors">
              + Nuevo producto
            </button>
          )}
        </div>
      )}

      {filteredProducts.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          index={i}
          isAdmin={isAdmin}
          editMode={editMode}
          hideSoldSizes={!isAdmin && filters.onlyAvailable}
          onEdit={openEdit}
          onDelete={handleDelete}
          onToggleHidden={isAdmin ? handleToggleHidden : undefined}
          onToggleSizeHidden={isAdmin ? handleToggleSizeHidden : undefined}
          selectedSizes={product.sizes.filter((s) => selection[s.id]).map((s) => s.id)}
          onSelectSize={!isAdmin ? handleSelectSize : undefined}
          adminSelectedSizes={isAdmin ? Object.keys(adminSelection).map(Number) : []}
          onAdminSelectSize={isAdmin ? handleAdminSelectSize : undefined}
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

          {/* ── Top bar: sección activa ── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-red-gradient rounded-full" />
              <h1 className="text-[13px] font-black text-white tracking-[0.2em]">
                {viewMode === "sales" ? "REGISTRO DE VENTAS" : search ? "RESULTADOS" : "INVENTARIO"}
              </h1>
              {!loading && isInventory && (
                <span className="text-[11px] text-gucha-muted">
                  ({filteredProducts.length}{filteredProducts.length !== products.length ? `/${products.length}` : ""} {filteredProducts.length === 1 ? "modelo" : "modelos"})
                </span>
              )}
            </div>

            {/* Navegación principal admin */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                {/* Edit mode toggle — solo en inventario */}
                {isInventory && (
                  <button
                    onClick={() => setEditMode((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      editMode
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                        : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {editMode ? "Editando" : "Editar"}
                  </button>
                )}
                <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
                  <button
                    onClick={() => setViewMode("inventory")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${isInventory ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
                  >
                    Inventario
                  </button>
                  <button
                    onClick={() => setViewMode("sales")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${viewMode === "sales" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
                  >
                    📋 Ventas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Ventas ── */}
          {viewMode === "sales" && (
            <>
              {isAdmin && (
                <div className="flex items-center justify-end gap-2 mb-4">
                  <button
                    onClick={() => setSalesEditMode((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                      salesEditMode
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                        : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    {salesEditMode ? "Editando" : "Editar"}
                  </button>
                  <button
                    onClick={() => setFreeSaleOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-gradient text-white text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-red-glow"
                  >
                    + Venta libre
                  </button>
                </div>
              )}
              <SalesRegister onRevert={handleRevertSale} onProductUpdated={handleSaleEdited} refreshTrigger={salesRefreshKey} editMode={salesEditMode} />
            </>
          )}

          {/* ── Inventario ── */}
          {isInventory && (
            <>
              {/* Sub-toggle cards/tabla + descargar + botón agregar */}
              {isAdmin && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
                    <button
                      onClick={() => setInventoryView("cards")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${inventoryView === "cards" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
                    >
                      ▦ Tarjetas
                    </button>
                    <button
                      onClick={() => setInventoryView("table")}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${inventoryView === "table" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
                    >
                      ≡ Tabla
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadInventoryExcel(products)}
                      title="Descargar inventario en Excel"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gucha-green-dark/40 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 transition-all whitespace-nowrap"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Descargar Excel
                    </button>
                    {editMode && (
                      <button onClick={openAdd}
                        className="flex items-center gap-2 bg-red-gradient text-white text-[12px] font-bold px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-red-glow">
                        + Agregar producto
                      </button>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && inventoryView === "table"
                ? <StockTable
                    products={filteredProducts}
                    editMode={editMode}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onToggleHidden={handleToggleHidden}
                    onToggleSizeHidden={handleToggleSizeHidden}
                    onDeleteSize={handleDeleteSize}
                    onEditSize={handleEditSize}
                    onSell={handleSale}
                    onRevertSale={handleRevertSale}
                    adminSelectedSizes={Object.keys(adminSelection).map(Number)}
                    onAdminSelectSize={handleAdminSelectSize}
                  />
                : productGrid}
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
          MOBILE layout (< md): single column
          ════════════════════════════════════════ */}
      <div className="md:hidden max-w-md mx-auto px-5 py-4 pb-28">
        {sidebarContent}

        {/* ── Separador ── */}
        <div className="mt-5 mb-4 border-t border-gucha-border-2" />

        {/* ── Admin nav (mobile) ── */}
        {isAdmin && (
          <div className="flex items-center mb-3">
            <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("inventory")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${isInventory ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
              >
                Inventario
              </button>
              <button
                onClick={() => setViewMode("sales")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${viewMode === "sales" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
              >
                📋 Ventas
              </button>
            </div>
          </div>
        )}

        {/* ── Ventas (mobile) ── */}
        {viewMode === "sales" && (
          <>
            {isAdmin && (
              <div className="flex items-center justify-end gap-2 mb-3">
                <button
                  onClick={() => setSalesEditMode((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    salesEditMode
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                      : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {salesEditMode ? "Editando" : "Editar"}
                </button>
                <button
                  onClick={() => setFreeSaleOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-gradient text-white text-[11px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-red-glow"
                >
                  + Venta libre
                </button>
              </div>
            )}
            <SalesRegister onRevert={handleRevertSale} onProductUpdated={handleSaleEdited} refreshTrigger={salesRefreshKey} editMode={salesEditMode} />
          </>
        )}

        {/* ── Inventario (mobile) ── */}
        {isInventory && (
          <>
            {/* Cards / Tabla toggle + Editar (admin only) */}
            {isAdmin && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="flex rounded-xl overflow-hidden border border-gucha-border bg-[#0d0d0d] p-0.5 gap-0.5">
                  <button
                    onClick={() => setInventoryView("cards")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${inventoryView === "cards" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
                  >
                    ▦ Tarjetas
                  </button>
                  <button
                    onClick={() => setInventoryView("table")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${inventoryView === "table" ? "bg-gucha-dark text-white" : "text-gucha-muted hover:text-white"}`}
                  >
                    ≡ Tabla
                  </button>
                </div>
                {/* Edit mode toggle */}
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
                    editMode
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                      : "bg-[#0d0d0d] border-gucha-border text-gucha-muted hover:text-white"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  {editMode ? "Editando" : "Editar"}
                </button>
                <button
                  onClick={() => downloadInventoryExcel(products)}
                  title="Descargar inventario en Excel"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gucha-green-dark/40 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 transition-all whitespace-nowrap"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Descargar Excel
                </button>
                {!loading && (
                  <span className="text-[11px] text-gucha-muted ml-auto">
                    {filteredProducts.length}{filteredProducts.length !== products.length ? `/${products.length}` : ""} modelos
                  </span>
                )}
              </div>
            )}

            {/* Client section header */}
            {!isAdmin && (
              <div className="flex items-center gap-2 mb-3">
                <div className="w-[3px] h-4 bg-red-gradient rounded-full" />
                <span className="text-[10px] font-bold text-gucha-subtle tracking-[0.25em]">
                  {search ? "RESULTADOS" : "COLECCIÓN"}
                </span>
                {!loading && (
                  <span className="text-[9px] text-gucha-muted">
                    ({filteredProducts.length}{filteredProducts.length !== products.length ? `/${products.length}` : ""})
                  </span>
                )}
              </div>
            )}

            {/* Table or Cards */}
            {isAdmin && inventoryView === "table" ? (
              <MobileStockList
                products={filteredProducts}
                editMode={editMode}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggleHidden={handleToggleHidden}
                onToggleSizeHidden={handleToggleSizeHidden}
                onDeleteSize={handleDeleteSize}
                onEditSize={handleEditSize}
                onSell={handleSale}
                onRevertSale={handleRevertSale}
              />
            ) : (
              productGrid
            )}
          </>
        )}

        {!loading && products.length > 0 && viewMode === "inventory" && inventoryView === "cards" && (
          <div className="border-t border-gucha-border-2 mt-4">
            {footerContent}
          </div>
        )}
      </div>

      {/* ── FAB WhatsApp — solo mobile, solo cliente ─── */}
      {!isAdmin && (hasSelection ? (
        <a
          href={buildWaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="md:hidden fixed bottom-6 right-5 z-50 flex items-center gap-2 bg-[#128c47] hover:bg-[#25d366] active:scale-95 text-white text-[12px] font-bold px-4 py-3 rounded-2xl shadow-[0_4px_20px_rgba(18,140,71,0.5)] transition-all"
        >
          {waSvg}
          Ordena ahora
          <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {selectionEntries.length}
          </span>
        </a>
      ) : (
        <div className="md:hidden fixed bottom-6 right-5 z-50 flex items-center gap-2 bg-[#128c47]/30 border border-gucha-green/20 text-gucha-muted text-[12px] font-bold px-4 py-3 rounded-2xl">
          {waSvg}
          Ordena ahora
        </div>
      ))}

      {/* ── FAB mobile — solo admin en modo edición ─── */}
      {isAdmin && editMode && isInventory && (
        <button onClick={openAdd}
          className="md:hidden fixed bottom-24 right-5 w-14 h-14 bg-red-gradient rounded-2xl shadow-red-glow flex items-center justify-center text-white text-2xl hover:opacity-90 active:scale-95 transition-all z-40">
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
          brands={brands}
          onBrandCreated={handleBrandCreated}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
      {adminSaleOpen && Object.keys(adminSelection).length > 0 && (
        <BulkSaleModal
          items={Object.values(adminSelection)}
          onSell={handleAdminBulkSale}
          onClose={() => { setAdminSaleOpen(false); setAdminSelection({}); }}
        />
      )}
      {freeSaleOpen && isAdmin && (
        <FreeSaleModal
          onSell={handleFreeSale}
          onClose={() => setFreeSaleOpen(false)}
        />
      )}

      {/* ── Floating admin "Registrar venta" bar ── */}
      {isAdmin && isInventory && Object.keys(adminSelection).length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-[#111] border border-gucha-red/40 rounded-2xl shadow-red-glow animate-fade-up">
          <span className="text-[12px] font-semibold text-gucha-muted">
            {Object.keys(adminSelection).length} {Object.keys(adminSelection).length === 1 ? "size" : "sizes"} seleccionados
          </span>
          <button onClick={() => setAdminSaleOpen(true)}
            className="px-4 py-2 rounded-xl bg-red-gradient text-white text-[12px] font-bold hover:opacity-90 active:scale-95 transition-all shadow-red-glow">
            Registrar venta
          </button>
          <button onClick={() => setAdminSelection({})}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gucha-border text-gucha-muted hover:text-white transition-colors text-[11px]">✕</button>
        </div>
      )}
    </main>
  );
}
