'use client';

import { useMemo } from 'react';
import { createTranslator } from '@/i18n/dictionaries';
import { useLocalePath } from '@/lib/use-locale-path';

export function useT() {
  const { locale } = useLocalePath();
  return useMemo(() => createTranslator(locale), [locale]);
}

export function useLocale() {
  return useLocalePath().locale;
}
