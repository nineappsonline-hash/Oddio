'use client';

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Check, Copy, Facebook, Instagram, MessageCircle, Share2, X } from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { Button } from '@/components/ui/Button';
import { canonicalOddioShareUrl } from '@/lib/share-url';

export function ShareButton({
  title,
  label = 'Share',
  url,
}: {
  title: string;
  label?: string;
  url?: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Prefer a content-specific address over the current page, especially
  // when the full-screen player is open on an unrelated route.
  const shareUrl = () => canonicalOddioShareUrl(url, window.location.href);

  useEffect(() => {
    if (open) {
      root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [open]);

  function handleMenuKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? (index + 1 + items.length) % items.length
            : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector('button')?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  async function copyLink() {
    const target = shareUrl();
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      toast('Link copied to clipboard', 'success');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast(target, 'info');
    }
  }

  function openShare(target: 'facebook' | 'x' | 'whatsapp') {
    const link = encodeURIComponent(shareUrl());
    const destination =
      target === 'facebook'
        ? `https://www.facebook.com/sharer/sharer.php?u=${link}`
        : target === 'whatsapp'
          ? `https://api.whatsapp.com/send?text=${encodeURIComponent(`🎧 ${title}\n\n${shareUrl()}`)}`
          : `https://twitter.com/intent/tweet?url=${link}&text=${encodeURIComponent(title)}`;
    window.open(destination, '_blank', 'noopener,noreferrer');
    setOpen(false);
  }

  async function instagram() {
    // Instagram has no supported web URL endpoint for prefilled link posts.
    // Native share sheets on supported devices can offer Instagram directly.
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl() });
        setOpen(false);
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await copyLink();
    toast(
      'Paste the copied link into your Instagram bio or a Story link sticker.',
      'info',
    );
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setOpen(false);
  }

  return (
    <div ref={root} className="relative inline-flex">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" />
        {label}
      </Button>
      {open ? (
        <div
          role="menu"
          aria-label="Share options"
          onKeyDown={handleMenuKeys}
          className="absolute bottom-full end-0 z-[100] mb-2 w-56 overflow-hidden rounded-2xl border border-[#665078] bg-[#211a2b] p-1.5 text-sm text-white shadow-[0_15px_45px_rgba(0,0,0,0.55)]"
        >
          <button
            type="button"
            role="menuitem"
            onClick={copyLink}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/10"
          >
            {copied ? (
              <Check size={18} className="text-emerald-400" />
            ) : (
              <Copy size={18} className="text-[#cba8ec]" />
            )}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openShare('facebook')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/10"
          >
            <Facebook size={18} className="text-[#88b5ff]" /> Facebook
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openShare('whatsapp')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/10"
          >
            <MessageCircle size={18} className="text-[#25D366]" /> WhatsApp
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={instagram}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/10"
          >
            <Instagram size={18} className="text-[#f2a0d1]" /> Instagram
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => openShare('x')}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start hover:bg-white/10"
          >
            <X size={18} className="text-white" /> X
          </button>
        </div>
      ) : null}
    </div>
  );
}
