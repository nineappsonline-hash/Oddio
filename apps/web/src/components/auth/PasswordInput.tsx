'use client';

import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { Locale } from '@ai-music/contracts';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { locale: Locale };

export function PasswordInput({ locale, className = '', ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`input w-full !pe-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={
          visible
            ? locale === 'ar'
              ? 'إخفاء كلمة المرور'
              : 'Hide password'
            : locale === 'ar'
              ? 'إظهار كلمة المرور'
              : 'Show password'
        }
        title={
          visible
            ? locale === 'ar'
              ? 'إخفاء كلمة المرور'
              : 'Hide password'
            : locale === 'ar'
              ? 'إظهار كلمة المرور'
              : 'Show password'
        }
        aria-pressed={visible}
        className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {visible ? (
          <EyeOff size={19} aria-hidden="true" />
        ) : (
          <Eye size={19} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
