import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const title = (url.searchParams.get('title') ?? 'Project AI Music').slice(0, 120);
  const subtitle = (
    url.searchParams.get('subtitle') ?? 'AI music, curated by humans.'
  ).slice(0, 160);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px',
        backgroundColor: '#090912',
        backgroundImage:
          'radial-gradient(900px 600px at 10% 0%, rgba(157,92,255,0.5), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(65,217,255,0.28), transparent 60%)',
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
            background: 'linear-gradient(135deg,#9D5CFF,#41D9FF)',
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
          AI Music
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05 }}>{title}</div>
        <div style={{ marginTop: 20, fontSize: 28, color: '#A8A8BA', maxWidth: 900 }}>
          {subtitle}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          color: '#A8A8BA',
          fontSize: 20,
        }}
      >
        <span>AI-generated · Human-reviewed</span>
        <span>projectaimusic.example</span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
