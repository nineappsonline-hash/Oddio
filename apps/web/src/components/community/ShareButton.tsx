'use client';

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  Facebook,
  Instagram,
  MessageCircle,
  Share2,
  X,
} from 'lucide-react';
import { useToast } from '@/components/providers/ToastProvider';
import { Artwork } from '@/components/ui/Artwork';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/i18n/use-translator';
import { canonicalOddioShareUrl } from '@/lib/share-url';
import type { CatalogTrack } from '@/lib/data/queries';
import { StoryClipComposer } from '@/components/community/StoryClipComposer';
import styles from './ShareButton.module.css';

export function ShareButton({
  title,
  label = 'Share',
  url,
  storyTrack,
  iconOnly = false,
}: {
  title: string;
  label?: string;
  url?: string;
  storyTrack?: CatalogTrack;
  iconOnly?: boolean;
}) {
  const ar = useLocale() === 'ar';
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState('');
  const [storyOpen, setStoryOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const manualInput = useRef<HTMLInputElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();

  const shareUrl = () => canonicalOddioShareUrl(url, window.location.href);
  function dismiss(restoreFocus = true) {
    setOpen(false);
    setManualLink('');
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  }

  useLayoutEffect(() => {
    if (!open) return;
    function position() {
      const root = panel.current;
      const anchor = trigger.current?.getBoundingClientRect();
      if (!root || !anchor || window.matchMedia('(max-width: 640px)').matches) return;
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      const idealX = ar ? anchor.left : anchor.right - width;
      const below = anchor.bottom + 9;
      const above = anchor.top - height - 9;
      const idealY = below + height <= innerHeight - 12 || above < 12 ? below : above;
      root.style.setProperty(
        '--share-x',
        `${Math.max(12, Math.min(idealX, innerWidth - width - 12))}px`,
      );
      root.style.setProperty(
        '--share-y',
        `${Math.max(12, Math.min(idealY, innerHeight - height - 12))}px`,
      );
    }
    position();
    const observer = new ResizeObserver(position);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    panel.current
      ?.querySelector<HTMLElement>('[role="menuitem"]')
      ?.focus({ preventScroll: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open, ar]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !trigger.current?.contains(target)) {
        setOpen(false);
        setManualLink('');
      }
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => () => clearTimeout(copyTimer.current), []);
  useLayoutEffect(() => {
    if (manualLink) {
      manualInput.current?.focus();
      manualInput.current?.select();
    }
  }, [manualLink]);

  function handleKeys(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
      return;
    }
    if (event.key === 'Tab' && !manualLink) {
      event.stopPropagation();
      dismiss();
      return;
    }
    if (
      !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(
        event.key,
      ) ||
      event.target === manualInput.current
    )
      return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'),
    );
    if (!items.length) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const forward =
      event.key === 'ArrowDown' || event.key === (ar ? 'ArrowLeft' : 'ArrowRight');
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : index < 0
            ? 0
            : (index + (forward ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  async function copyLink() {
    const target = shareUrl();
    try {
      await navigator.clipboard.writeText(target);
      setManualLink('');
      setCopied(true);
      toast(ar ? 'الرابط اتنسخ' : 'Link copied to clipboard', 'success');
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2200);
      return true;
    } catch {
      setManualLink(target);
      return false;
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
    dismiss();
  }

  async function instagram() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url: shareUrl() });
        dismiss();
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    if (!(await copyLink())) return;
    toast(
      ar
        ? 'الصق الرابط في ملصق Link على الستوري.'
        : 'Paste the link into a Story Link sticker.',
      'info',
    );
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    dismiss();
  }

  const closeStory = () => {
    setStoryOpen(false);
    trigger.current?.focus({ preventScroll: true });
  };
  const channels = [
    { key: 'whatsapp' as const, name: 'WhatsApp', Icon: MessageCircle },
    { key: 'facebook' as const, name: 'Facebook', Icon: Facebook },
    { key: 'x' as const, name: 'X', Icon: X },
  ];
  const displayLabel = ar && label === 'Share' ? 'شارك' : label;

  return (
    <div className="relative inline-flex">
      <Button
        ref={trigger}
        type="button"
        variant="outline"
        size="sm"
        className={
          iconOnly ? 'h-10 w-10 !min-w-0 !p-0 justify-center rounded-full' : undefined
        }
        aria-label={displayLabel}
        title={displayLabel}
        onClick={() => (open ? dismiss() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        <Share2 className="h-4 w-4" />
        {!iconOnly ? displayLabel : null}
      </Button>
      {open
        ? createPortal(
            <>
              <div className={styles.backdrop} aria-hidden="true" />
              <div
                ref={panel}
                className={styles.panel}
                dir={ar ? 'rtl' : 'ltr'}
                onKeyDown={handleKeys}
              >
                <header className={styles.header}>
                  <Artwork
                    title={title}
                    url={storyTrack?.artwork.url || '/oddio-gradient-play-logo.png'}
                    className={styles.artwork}
                    rounded=""
                    sizes="44px"
                  />
                  <div className={styles.heading}>
                    <p>{ar ? 'مشاركة من Oddio' : 'SHARE FROM ODDIO'}</p>
                    <strong dir="auto">{title}</strong>
                  </div>
                  <button
                    type="button"
                    className={styles.close}
                    aria-label={ar ? 'إغلاق المشاركة' : 'Close share menu'}
                    onClick={() => dismiss()}
                  >
                    <X size={18} />
                  </button>
                </header>
                <div
                  id={menuId}
                  role="menu"
                  aria-label={ar ? 'اختيارات المشاركة' : 'Share options'}
                  className={styles.menu}
                >
                  {storyTrack ? (
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      className={styles.hero}
                      onClick={() => {
                        dismiss();
                        setStoryOpen(true);
                      }}
                    >
                      <span className={styles.storyIcon}>
                        <Instagram size={21} />
                      </span>
                      <span className={styles.heroCopy}>
                        <strong>Instagram Story</strong>
                        <small>
                          {ar
                            ? 'جهّز فيديو قصير من المقطع'
                            : 'Create an audio clip to share'}
                        </small>
                      </span>
                      <ChevronRight size={18} className={styles.direction} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={copyLink}
                    className={styles.copy}
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    <span>
                      {copied
                        ? ar
                          ? 'الرابط اتنسخ'
                          : 'Copied!'
                        : ar
                          ? 'انسخ الرابط'
                          : 'Copy link'}
                    </span>
                    <span className={styles.domain}>oddio.online</span>
                  </button>
                  <div
                    role="group"
                    aria-label={ar ? 'شارك على' : 'Share to'}
                    className={styles.channels}
                  >
                    {channels.map(({ key, name, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        role="menuitem"
                        tabIndex={-1}
                        data-channel={key}
                        onClick={() => openShare(key)}
                      >
                        <Icon size={18} />
                        <span>{name}</span>
                      </button>
                    ))}
                    {!storyTrack ? (
                      <button
                        type="button"
                        tabIndex={-1}
                        role="menuitem"
                        data-channel="instagram"
                        onClick={instagram}
                      >
                        <Instagram size={18} />
                        <span>Instagram</span>
                      </button>
                    ) : null}
                  </div>
                </div>
                {manualLink ? (
                  <div className={styles.manual}>
                    <label htmlFor={`${menuId}-manual`}>
                      {ar ? 'انسخ الرابط يدويًا' : 'Copy the link manually'}
                    </label>
                    <input
                      ref={manualInput}
                      id={`${menuId}-manual`}
                      value={manualLink}
                      readOnly
                      dir="ltr"
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </div>
                ) : null}
                <p className={styles.foot}>
                  <ArrowUpRight size={13} />
                  {ar
                    ? 'اختار المكان اللي تحب تشارك فيه'
                    : 'Choose where you want to share'}
                </p>
              </div>
            </>,
            document.body,
          )
        : null}
      {storyOpen && storyTrack ? (
        <StoryClipComposer track={storyTrack} onClose={closeStory} />
      ) : null}
    </div>
  );
}
