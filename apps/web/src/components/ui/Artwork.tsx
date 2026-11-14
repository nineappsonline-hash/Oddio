import { cn, initials } from '@/lib/utils';

export function Artwork({
  title,
  url,
  accent = '#9D5CFF',
  className,
  rounded = 'rounded-xl',
  animated = false,
}: {
  title: string;
  url?: string;
  accent?: string;
  className?: string;
  rounded?: string;
  animated?: boolean;
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
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-[-35%] opacity-60" style={{ background: 'conic-gradient(from 20deg, transparent, rgba(255,255,255,.13), transparent 30%, rgba(65,217,255,.35), transparent 60%, rgba(207,90,255,.4), transparent)' }} />
          <div className={cn('absolute h-[85%] w-[85%] rounded-full border border-white/20 shadow-[0_0_50px_rgba(127,69,255,.35)]', animated && 'motion-safe:animate-[spin_24s_linear_infinite]')} style={{ background: 'repeating-radial-gradient(circle, transparent 0 9%, rgba(255,255,255,.12) 9.3% 9.7%, transparent 10% 16%), conic-gradient(from 45deg, #100c27, #5730a6, #1ac8e5, #bc50ef, #100c27)' }} />
          <div className={cn('absolute h-[61%] w-[61%] rounded-full border border-white/25 opacity-80', animated && 'motion-safe:animate-[spin_14s_linear_infinite_reverse]')} style={{ background: 'conic-gradient(from 100deg, transparent 0 30%, rgba(255,255,255,.38) 37%, transparent 45% 70%, rgba(45,224,255,.45) 85%, transparent)' }} />
          <svg viewBox="0 0 200 200" className={cn('relative z-10 h-[68%] w-[68%] drop-shadow-[0_0_18px_rgba(120,210,255,.7)]', animated && 'motion-safe:animate-[pulse_3s_ease-in-out_infinite]')} fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="76" stroke="white" strokeOpacity=".35" strokeWidth="1.5" strokeDasharray="2 8" />
            <path d="M20 106 C40 106 40 64 60 64 S80 138 100 138 S120 76 140 76 S160 108 180 108" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
            <path d="M20 106 C40 106 40 64 60 64 S80 138 100 138 S120 76 140 76 S160 108 180 108" stroke="#55e6ff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
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
