'use client';

import { useEffect, useState } from 'react';

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallOddio({ locale }: { locale: 'ar' | 'en' }) {
  const ar = locale === 'ar';
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    setInstalled(window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    const onInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const result = await deferred.userChoice;
      setFeedback(result.outcome === 'accepted'
        ? (ar ? 'تم قبول التثبيت.' : 'Installation accepted.')
        : (ar ? 'ممكن تثبته في أي وقت.' : 'You can install it later.'));
      setDeferred(null);
    } catch {
      setFeedback(ar ? 'التثبيت مش متاح في المتصفح ده.' : 'Installation is unavailable in this browser.');
    }
  }

  return (
    <section className="space-y-5 rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-cyan-500/5 p-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">ODDIO ON YOUR PHONE</p>
        <h2 className="mt-2 text-2xl font-extrabold">
          {ar ? 'خلي Oddio على شاشة الموبايل' : 'Put Oddio on your home screen'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {ar
            ? 'ثبّت نسخة الويب بنفس تصميم الموقع، من غير متجر تطبيقات. التشغيل الصوتي محتاج إنترنت حاليًا.'
            : 'Install the same Oddio website design without an app store. Streaming currently needs internet access.'}
        </p>
      </div>
      {installed ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
          {ar ? 'Oddio شغال بالفعل كتطبيق على جهازك.' : 'Oddio is already running as an installed app.'}
        </p>
      ) : deferred ? (
        <button type="button" onClick={() => void install()}
          className="min-h-12 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-700 px-6 text-sm font-bold text-white">
          {ar ? 'تثبيت Oddio' : 'Install Oddio'}
        </button>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-sm leading-7">
          {ios
            ? (ar
                ? 'على iPhone أو iPad: افتح الموقع في Safari، اضغط مشاركة، واختار Add to Home Screen.'
                : 'On iPhone or iPad: open Oddio in Safari, tap Share, then Add to Home Screen.')
            : (ar
                ? 'على Android: افتح Oddio في Chrome، اضغط قائمة المتصفح، واختار Install app أو Add to Home screen (لو الخيار متاح).'
                : 'On Android: open Oddio in Chrome, open the browser menu, then choose Install app or Add to Home screen (when available).')}
        </div>
      )}
      {feedback ? <p role="status" className="text-xs text-muted">{feedback}</p> : null}
      <p className="text-xs text-muted">
        {ar
          ? 'دي نسخة PWA. النسخ الأصلية على Google Play وApp Store والخدمات الخاصة بيها مراحل منفصلة.'
          : 'This is a PWA, not a native App Store/Google Play package. Native builds remain separate work.'}
      </p>
    </section>
  );
}
