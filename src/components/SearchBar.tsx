"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative mb-5 group">
      <div className="absolute inset-0 rounded-2xl bg-gucha-red/0 group-focus-within:bg-gucha-red/5 transition-colors duration-300 pointer-events-none" />
      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-gucha-muted group-focus-within:text-gucha-subtle w-4 h-4 transition-colors"
        fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Buscar modelo..."
        className="w-full bg-gucha-card-2 border border-gucha-border rounded-2xl pl-11 pr-10 py-3 text-[13px] text-white placeholder-gucha-muted outline-none focus:border-gucha-subtle/50 transition-all duration-200"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gucha-border text-gucha-muted hover:bg-gucha-dark hover:text-white text-[10px] transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}
