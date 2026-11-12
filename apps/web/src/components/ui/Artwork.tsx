import { cn, initials } from '@/lib/utils';

export function Artwork({
  title,
  url,
  accent = '#9D5CFF',
  className,
  rounded = 'rounded-xl',
}: {
  title: string;
  url?: string;
  accent?: string;
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        'relative isolate flex items-center justify-center overflow-hidden border border-white/10 bg-surface',
        rounded,
        className,
      )}
      style={{
        backgroundImage: url
          ? `linear-gradient(135deg, rgba(9,9,18,0.05), rgba(9,9,18,0.55)), url(${url})`
          : `linear-gradient(135deg, ${accent} 0%, #2a1a4d 55%, #090912 100%)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {!url ? (
        <span className="select-none text-2xl font-black tracking-tight text-white/85 drop-shadow">
          {initials(title)}
        </span>
      ) : null}
      <span
        className="pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5), transparent 50%)',
        }}
      />
    </div>
  );
}

export function Avatar({
  name,
  accent = '#9D5CFF',
  className,
}: {
  name: string;
  accent?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-white/10 text-xs font-bold text-white',
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${accent}, #1f1f35)` }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
