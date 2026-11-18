import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

/**
 * Social crawlers should only contact oddio.online. Fetch approved public
 * artwork server-side, then inline it into a normal PNG response.
 * Disallow arbitrary origins to avoid turning the OG endpoint into an SSRF proxy.
 */
async function loadPublicCover(input: string | null): Promise<string | null> {
  if (!input) return null;
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    const trusted = [
      'oddio.online', 'r2.dev', 'supabase.co', 'supabase.in',
      'unsplash.com', 'cloudinary.com', 'imgix.net',
      'cloudfront.net', 'vercel-storage.com', 'githubusercontent.com',
    ].some((domain) => host === domain || host.endsWith(`.${domain}`));
    if (url.protocol !== 'https:' || !trusted || url.username || url.password) return null;
    const response = await fetch(url.toString(), {
      headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8' },
      signal: AbortSignal.timeout(6000),
      cache: 'force-cache',
      redirect: 'error',
    });
    if (!response.ok) return null;
    const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/avif'].includes(mime)) return null;
    if (Number(response.headers.get('content-length') ?? 0) > 5_000_000) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 5_000_000) return null;
    return `data:${mime};base64,${bytes.toString('base64')}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get('title') ?? 'Oddio').slice(0, 120);
  const subtitle = (
    url.searchParams.get('subtitle') ?? 'Music and podcasts on Oddio.'
  ).slice(0, 160);
  const cover = await loadPublicCover(url.searchParams.get('cover'));
  // ImageResponse's default Latin font cannot reliably shape Arabic script.
  // The original artwork already carries the Arabic cover design; the textual
  // OG title/description stay in Arabic outside the image.
  const graphicTitle = /[\u0600-\u06FF]/.test(title) ? 'ODDIO PODCASTS' : title;


  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        backgroundColor: '#0a0b0d',
        backgroundImage:
          'radial-gradient(900px 600px at 10% 0%, rgba(95,95,95,0.35), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(80,80,80,0.22), transparent 60%)',
        color: '#F5F5FA',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg,#bcbcbc,#343434)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 900,
          }}
        >
          ♪
        </div>
        <div style={{ fontSize: 22, letterSpacing: 6, textTransform: 'uppercase' }}>
          ODDIO
        </div>
      </div>
      {cover ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', gap: 48, marginTop: 22, marginBottom: 22 }}>
          {/* ImageResponse requires a regular img to embed fetched image bytes. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} width={438} height={438} alt="" style={{ width: 438, height: 438, borderRadius: 28, objectFit: 'cover', border: '2px solid rgba(255,255,255,.2)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 26, letterSpacing: 3, color: '#cbcbcb', marginBottom: 18 }}>LISTEN ON ODDIO</div>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}>{graphicTitle.slice(0, 80)}</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05 }}>{graphicTitle}</div>
          <div style={{ marginTop: 20, fontSize: 28, color: '#A8A8BA', maxWidth: 900 }}>
            {subtitle}
          </div>
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#A8A8BA',
          fontSize: 20,
        }}
      >
        <span>Music · Podcasts</span>
        <span>oddio.online</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
  );
}
