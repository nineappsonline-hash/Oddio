'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { cn, initials } from '@/lib/utils';

export function Artwork({
  title,
  url,
  className,
  rounded = 'rounded-xl',
  animated = false,
  priority = false,
  sizes = '(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 280px',
}: {
  title: string;
  url?: string;
  accent?: string;
  className?: string;
  rounded?: string;
  animated?: boolean;
  priority?: boolean;
  sizes?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const showCover = Boolean(url && failedUrl !== url);
  const markFailed = useCallback(() => {
    if (url) setFailedUrl(url);
  }, [url]);
  const checkCachedCover = useCallback(
    (image: HTMLImageElement | null) => {
      // A failed image can finish before this client component hydrates.
      if (image?.complete && image.currentSrc && image.naturalWidth === 0) markFailed();
    },
    [markFailed],
  );
  const localSource = Boolean(url && url.startsWith('/') && !url.startsWith('//'));
  const cloudinarySource = Boolean(url && /^https:\/\/res\.cloudinary\.com\//i.test(url));
  const optimizedCloudinary =
    cloudinarySource && url?.includes('/image/upload/')
      ? url.replace('/image/upload/', '/image/upload/f_auto,q_auto:good,w_800/')
      : url;
  const cloudinarySet =
    cloudinarySource && url?.includes('/image/upload/')
      ? [160, 320, 480, 800]
          .map(
            (width) =>
              `${url.replace('/image/upload/', `/image/upload/f_auto,q_auto:good,w_${width}/`)} ${width}w`,
          )
          .join(', ')
      : undefined;
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
        backgroundImage: showCover
          ? 'linear-gradient(135deg, #17112e, #090912)'
          : 'linear-gradient(150deg, #202b2e, #131617 72%)',
      }}
    >
      {showCover ? (
        <>
          {localSource ? (
            <Image
              key={url}
              ref={checkCachedCover}
              onError={markFailed}
              src={url!}
              alt=""
              fill
              sizes={sizes}
              quality={72}
              priority={priority}
              draggable={false}
              className="object-cover"
            />
          ) : (
            // Preserve signed/external artist artwork URLs without routing
            // private hosts through the public Next.js image proxy.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              ref={checkCachedCover}
              onError={markFailed}
              src={optimizedCloudinary}
              srcSet={cloudinarySet}
              sizes={cloudinarySet ? sizes : undefined}
              alt=""
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#090912]/5 to-[#090912]/55"
          />
        </>
      ) : null}
      {!showCover ? (
        <div
          aria-hidden="true"
          data-oddio-artwork-fallback
          className="pointer-events-none absolute inset-x-[14%] inset-y-[24%]"
        >
          <Image
            src="/oddio-gradient-play-logo.png"
            alt=""
            fill
            sizes={sizes}
            quality={75}
            priority={priority}
            draggable={false}
            className={cn(
              'object-contain',
              animated && 'motion-safe:animate-[pulse_5s_ease-in-out_infinite]',
            )}
          />
        </div>
      ) : (
        <span
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-overlay"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.5), transparent 50%)',
          }}
        />
      )}
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
