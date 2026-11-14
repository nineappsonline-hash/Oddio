'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileAudio2, ImageIcon } from 'lucide-react';

type Props = {
  kind: 'audio' | 'image';
  file: File | null;
  onFile: (file: File | null) => void;
  locale: 'ar' | 'en';
  required?: boolean;
};

const audioTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/x-flac',
  'audio/aiff',
  'audio/x-aiff',
];
const imageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function FileDropzone({ kind, file, onFile, locale, required }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const isAudio = kind === 'audio';
  const maxBytes = (isAudio ? 25 : 5) * 1024 * 1024;
  const accept = isAudio
    ? '.mp3,audio/mpeg'
    : 'image/png,image/jpeg,image/webp,image/gif';
  const allowed = isAudio ? ['audio/mpeg', 'audio/mp3'] : imageTypes;

  function choose(candidate: File | null) {
    setDragging(false);
    if (!candidate) return;
    const ext = candidate.name.split('.').pop()?.toLowerCase() ?? '';
    const extensionAllowed = isAudio
      ? ['mp3'].includes(ext)
      : ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext);
    if (!extensionAllowed || (candidate.type && !allowed.includes(candidate.type))) {
      setError(locale === 'ar' ? 'صيغة الملف غير مدعومة' : 'Unsupported file format');
      return;
    }
    if (candidate.size > maxBytes || candidate.size === 0) {
      setError(
        locale === 'ar'
          ? `حجم الملف لازم يكون أقل من ${isAudio ? 25 : 5} ميجابايت`
          : `File must be under ${isAudio ? 100 : 5} MB`,
      );
      return;
    }
    setError('');
    onFile(candidate);
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={isAudio ? 'Audio file' : 'Artwork image'}
        required={required && !file}
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={
          isAudio ? 'Drop audio or browse files' : 'Drop artwork or browse files'
        }
        onClick={() => input.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            input.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (!event.currentTarget.contains(event.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          choose(event.dataTransfer.files?.[0] ?? null);
        }}
        className={`cursor-pointer rounded-2xl border-2 px-5 py-8 text-center transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${dragging ? 'scale-[1.01] border-primary bg-primary/20' : file ? 'border-emerald-400/70 bg-emerald-400/[0.09] shadow-[0_0_24px_rgba(52,211,153,0.09)]' : 'border-dashed border-white/20 bg-white/[0.03] hover:border-primary/70'}`}
      >
        <div aria-hidden="true" className="mb-3 flex justify-center">{file ? <CheckCircle2 className="h-11 w-11 text-emerald-400" /> : isAudio ? <FileAudio2 className="h-11 w-11 text-violet-300" /> : <ImageIcon className="h-11 w-11 text-violet-300" />}</div>
        {file && <p role="status" className="mb-2 text-sm font-extrabold text-emerald-300">{locale === 'ar' ? '✓ تم اختيار الملف بنجاح' : '✓ File selected successfully'}</p>}
        <p className={`break-all font-semibold ${file ? 'text-white' : 'text-ink'}`}>
          {file
            ? file.name
            : locale === 'ar'
              ? 'اسحب الملف هنا أو اضغط للاختيار'
              : 'Drag & drop here, or click to browse'}
        </p>
        <p className="mt-1 text-xs text-muted">
          {isAudio
            ? 'MP3 · max 25 MB'
            : 'PNG, JPEG, WEBP, GIF · max 5 MB'}
        </p>
        {file && (
          <p className="mt-2 text-xs font-semibold text-emerald-300">
            {(file.size / 1024 / 1024).toFixed(2)} MB ·{' '}
            {locale === 'ar' ? 'اضغط للتغيير' : 'Click to replace'}
          </p>
        )}
      </div>
      {file && (
        <button
          type="button"
          className="mt-2 text-xs text-muted underline hover:text-ink"
          onClick={() => {
            onFile(null);
            if (input.current) input.current.value = '';
          }}
        >
          {locale === 'ar' ? 'إزالة الملف' : 'Remove file'}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
