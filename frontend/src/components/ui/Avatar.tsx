import { useState } from "react";

export default function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const [error, setError] = useState(false);
  const style = { width: size, height: size };
  return src && !error ? (
    <img
      src={src}
      alt={name}
      style={style}
      className="rounded-full object-cover border border-slate-200 shadow-sm"
      onError={() => setError(true)}
    />
  ) : (
    <span
      style={style}
      className="flex items-center justify-center rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 font-semibold text-white shadow-sm text-sm"
    >
      {name ? name[0]?.toUpperCase() : "S"}
    </span>
  );
}
