export default function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const style = { width: size, height: size };
  return src
    ? <img src={src} alt={name} style={style} className="rounded-full object-cover" />
    : <span style={style} className="flex items-center justify-center rounded-full bg-brand-500 font-medium text-white">{name[0]?.toUpperCase()}</span>;
}
