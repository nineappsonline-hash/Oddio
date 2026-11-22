import Link from 'next/link';
import Image from 'next/image';

export function Logo({ locale, compact = false }: { locale: string; compact?: boolean }) {
  return (
    <Link
      prefetch={false}
      href={`/${locale}`}
      className="group/logo inline-flex items-center gap-3"
      aria-label="Oddio"
    >
      <Image
        src="/oddio-gradient-play-logo.png"
        alt="Oddio"
        width={198}
        height={66}
        className={
          compact
            ? 'h-10 w-[120px] object-contain object-left'
            : 'h-[58px] w-[188px] object-contain object-left'
        }
        priority
      />
    </Link>
  );
}
