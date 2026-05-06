"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandData } from "@/types";

interface BrandWithCount extends BrandData {
  _count: { products: number };
}

interface Props {
  onBrandsChange?: () => void;
}

export default function BrandManager({ onBrandsChange }: Props) {
  const [brands,   setBrands]   = useState<BrandWithCount[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [newName,  setNewName]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [editId,   setEditId]   = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error,    setError]    = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res  = await fetch("/api/brands");
    const data = await res.json();
    setBrands(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!newName.trim() || saving) return;
    setSaving(true); setError("");
    const res = await fetch("/api/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName("");
      await load();
      onBrandsChange?.();
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al crear");
    }
    setSaving(false);
  }

  async function handleEdit(id: number) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/brands/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (res.ok) {
      setEditId(null);
      await load();
      onBrandsChange?.();
    }
  }

  async function handleDelete(id: number, productCount: number) {
    if (productCount > 0 && !confirm(`Esta marca tiene ${productCount} producto(s). ¿Eliminar de todas formas?`)) return;
    if (productCount === 0 && !confirm("¿Eliminar esta marca?")) return;
    await fetch(`/api/brands/${id}`, { method: "DELETE" });
    await load();
    onBrandsChange?.();
  }

  return (
    <div className="space-y-4">

      {/* add */}
      <div className="bg-card-gradient border border-gucha-border rounded-2xl p-4">
        <p className="text-[9px] font-bold text-gucha-muted tracking-widest uppercase mb-3">Nueva marca</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ej: Nike, Adidas, Jordan…"
            value={newName}
            onChange={(e) => { setNewName(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 bg-[#0d0d0d] border border-gucha-border rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-gucha-muted/50 outline-none focus:border-gucha-subtle/60 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim() || saving}
            className="px-4 py-2.5 bg-red-gradient text-white text-[12px] font-bold rounded-xl hover:opacity-90 active:scale-95 disabled:opacity-40 transition-all shadow-red-glow whitespace-nowrap"
          >
            {saving ? "…" : "+ Agregar"}
          </button>
        </div>
        {error && <p className="text-[11px] text-gucha-red-light mt-2">{error}</p>}
      </div>

      {/* list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2">
          <div className="w-5 h-5 border-2 border-gucha-border border-t-gucha-green-light rounded-full animate-spin" />
          <span className="text-[12px] text-gucha-muted">Cargando marcas…</span>
        </div>
      ) : brands.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3 opacity-20">🏷</p>
          <p className="text-gucha-subtle text-[13px]">No hay marcas configuradas</p>
          <p className="text-gucha-muted text-[11px] mt-1">Agrega una arriba para empezar</p>
        </div>
      ) : (
        <div className="bg-card-gradient border border-gucha-border rounded-2xl overflow-hidden">
          {brands.map((brand, i) => (
            <div
              key={brand.id}
              className={`flex items-center gap-3 px-4 py-3 ${i < brands.length - 1 ? "border-b border-gucha-border/30" : ""} hover:bg-white/[0.02] transition-colors`}
            >
              {editId === brand.id ? (
                <>
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleEdit(brand.id);
                      if (e.key === "Escape") setEditId(null);
                    }}
                    className="flex-1 bg-[#0d0d0d] border border-gucha-subtle/40 rounded-lg px-3 py-1.5 text-[13px] text-white outline-none"
                  />
                  <button onClick={() => handleEdit(brand.id)}
                    className="px-3 py-1.5 rounded-lg bg-gucha-green-dark/60 border border-gucha-green/30 text-gucha-green-light text-[11px] font-bold hover:bg-gucha-green/20 transition-colors whitespace-nowrap">
                    Guardar
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="px-3 py-1.5 rounded-lg border border-gucha-border text-gucha-muted text-[11px] hover:text-white transition-colors">
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-white">{brand.name}</p>
                    <p className="text-[10px] text-gucha-muted">
                      {brand._count.products} {brand._count.products === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                  <button
                    onClick={() => { setEditId(brand.id); setEditName(brand.name); }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-white hover:border-gucha-subtle/60 transition-colors text-[11px]"
                  >✎</button>
                  <button
                    onClick={() => handleDelete(brand.id, brand._count.products)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gucha-dark border border-gucha-border text-gucha-muted hover:text-gucha-red-light hover:border-gucha-red/40 transition-colors text-[10px]"
                  >✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
