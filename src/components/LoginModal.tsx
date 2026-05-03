"use client";

import { useRef, useState } from "react";

interface Props {
  onSuccess: () => void;
  onClose:   () => void;
}

export default function LoginModal({ onSuccess, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ password }),
    });

    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Contraseña incorrecta");
      setPassword("");
      inputRef.current?.focus();
    }
    setLoading(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#111] border border-gucha-border rounded-3xl w-full max-w-xs p-6 animate-fade-up shadow-card">
        {/* icon */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gucha-red/10 border border-gucha-red/20 flex items-center justify-center text-xl">
            🔐
          </div>
        </div>

        <h2 className="text-center text-[15px] font-black text-white tracking-[0.1em] mb-1">
          ACCESO ADMIN
        </h2>
        <p className="text-center text-[11px] text-gucha-muted mb-5">
          Ingresa la contraseña para editar el inventario
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoFocus
            className="w-full bg-[#0d0d0d] border border-gucha-border rounded-xl px-4 py-3 text-[14px] text-white placeholder-gucha-muted outline-none focus:border-gucha-subtle/60 transition-colors text-center tracking-widest"
          />

          {error && (
            <p className="text-center text-[11px] text-gucha-red-light">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-red-gradient text-white rounded-xl py-3 text-[13px] font-bold tracking-wide hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? "Verificando…" : "Entrar"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-gucha-muted text-[12px] py-1 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}
