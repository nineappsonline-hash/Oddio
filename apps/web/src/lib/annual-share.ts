import type { ListeningDNA } from './data/annual-listening-dna';

export interface WrappedShareChoices {
  includeTopArtist: boolean;
  includeTopGenre: boolean;
}

export function annualShareText(
  report: ListeningDNA,
  locale: 'ar' | 'en',
  choices: WrappedShareChoices,
): string {
  if (!Number.isInteger(report.year) || report.year < 2020 || report.year > 2100)
    return '';
  if (report.qualifiedListens <= 0) return '';
  const ar = locale === 'ar';
  const number = (value: number) => new Intl.NumberFormat(ar ? 'ar-EG' : 'en-US').format(Math.max(0, value));
  const lines = [
    ar ? `حصادي الموسيقي على Oddio في ${report.year} 🎧` : `My ${report.year} Oddio Rewind 🎧`,
    ar
      ? `${number(report.qualifiedListens)} استماع مؤهل · ${number(report.tracks)} أغنية · ${number(report.artists)} فنان`
      : `${number(report.qualifiedListens)} qualified listens · ${number(report.tracks)} tracks · ${number(report.artists)} artists`,
  ];
  if (choices.includeTopArtist && report.topArtists[0]?.name) {
    lines.push(ar ? `أكثر فنان سمعته: ${report.topArtists[0].name}` : `Top artist: ${report.topArtists[0].name}`);
  }
  if (choices.includeTopGenre && report.genres[0]?.name) {
    lines.push(ar ? `النوع الأقرب لذوقي: ${report.genres[0].name}` : `Top genre: ${report.genres[0].name}`);
  }
  lines.push(ar ? 'الملخص بيعرض استماعات مؤهلة مسجلة فقط.' : 'Based on recorded qualified listens only.');
  return lines.join('\n');
}
