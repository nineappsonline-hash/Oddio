export function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_-10%,rgba(30,24,70,0.55),transparent_65%)]" />
      <div className="ambient-grid absolute inset-0" />
      <div className="aurora-blob aurora-blob-a" />
      <div className="aurora-blob aurora-blob-b" />
      <div className="aurora-blob aurora-blob-c" />
      <div className="ambient-stars absolute inset-0" />
      <div className="ambient-noise absolute inset-0" />
    </div>
  );
}
