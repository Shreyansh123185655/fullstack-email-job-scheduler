import type { ButtonHTMLAttributes } from "react";

type Variant = "outline" | "solid" | "ghost";
const styles: Record<Variant, string> = {
  outline: "border border-brand-500 text-brand-600 hover:bg-brand-50",
  solid: "bg-brand-500 text-white hover:bg-brand-600",
  ghost: "text-slate-700 hover:bg-slate-100",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; loading?: boolean }

export default function Button({ variant = "outline", loading, className = "", children, disabled, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
