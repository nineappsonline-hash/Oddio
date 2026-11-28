type Language = 'ar' | 'en';
type Note = {
  title: string;
  summary: Record<Language, string>;
};

const mysteryNotes: Record<string, Note> = {
  '49cd43f4-509e-417f-84bc-81a845a21841': {
    title: 'الحرب اللي انتهت مرتين',
    summary: {
      ar: 'حكاية هيرو أونودا، الجندي الياباني اللي فضل مستخبي في جزيرة لوبانج بالفلبين بعد نهاية الحرب العالمية التانية. إزاي الخبر اللي كان ممكن يرجّعه لبيته بقى في نظره خدعة؟',
      en: 'The story of Hiroo Onoda, the Japanese soldier who stayed hidden on Lubang Island in the Philippines after World War II. Why did he see news of the war’s end as a trick?',
    },
  },
  '2a21189b-e1e5-47b1-a141-a6ef83a22606': {
    title: 'سفينة من غير طاقم',
    summary: {
      ar: 'البحّارة لقوا ماري سيليست في المحيط الأطلسي لسه بتعوم، لكن مفيش حد على متنها. من قارب النجاة المفقود لمضخة الميه، الحلقة بتتبع الأدلة اللي خلّت السفينة دي لغز بحري.',
      en: 'Sailors found the Mary Celeste afloat in the Atlantic with nobody aboard. From the missing lifeboat to a water pump, this episode follows the clues behind the maritime mystery.',
    },
  },
  'a01787b7-e549-4a25-b1cc-4d4f11569ebb': {
    title: 'مدينة من غير أسرار',
    summary: {
      ar: 'حكاية خيالية عن مدينة سكانها ما يقدروش يكدبوا، وما ينفعش يرفضوا الإجابة على سؤال مباشر. لما مكالمة في نص الليل تقلق دكتور آدم، التجربة بتطرح سؤال أصعب: هل الصراحة الإجبارية ممكن تدمر الثقة؟',
      en: 'A fictional mystery about a city where nobody can lie or refuse a direct question. After a late-night call unsettles Dr. Adam, the experiment raises a harder question: can forced honesty destroy trust?',
    },
  },
};

/** Curated fallback for these specific episodes in the published catalog. */
export function podcastEditorialNote(
  episode: { id: string; title: string },
  showSlug: string,
  locale: Language,
): string {
  if (showSlug !== 'show-mwky0f05') return '';
  const note = mysteryNotes[episode.id];
  return note?.title === episode.title.trim() ? note.summary[locale] : '';
}
