type Language = 'ar' | 'en';
type Note = {
  showSlug?: string;
  title: string;
  summary: Record<Language, string>;
};

const editorialNotes: Record<string, Note> = {
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
  'b6ddb8f8-51c4-4562-92e1-57a5f47add24': {
    showSlug: 'show-mwjp231e',
    title: 'هل لازم تسامح عشان تتعافى',
    summary: {
      ar: 'لما حد أذاك يرجع يطلب السماح، هل التعافي يتوقف على إنك تسامحه؟ الحلقة بتفرّق بين تجاوز الأذى، والغفران، وإنك تختار ترجع العلاقة من جديد.',
      en: 'When someone who hurt you asks for forgiveness, does healing depend on forgiving them? The episode separates moving on, forgiving someone and choosing to restore the relationship.',
    },
  },
  '3df44323-dac5-422f-83ce-56bd1267b9ca': {
    showSlug: 'show-mwjp231e',
    title: 'مين كتبلك السيناريو',
    summary: {
      ar: 'إزاي تعرف إن الحياة اللي بتسعى ليها اختيارك إنت، مش سيناريو اتكتب لك من الناس حواليك؟ الحلقة بتسأل عن الفرق بين إنك تنجح في دور متوقَّع منك وإنك تعيش حياة اخترتها.',
      en: 'How can you tell if the life you are working toward is your own choice or a script shaped by other people? This episode explores the gap between succeeding in an expected role and choosing a life for yourself.',
    },
  },
};

/** Curated fallback for these specific episodes in the published catalog. */
export function podcastEditorialNote(
  episode: { id: string; title: string },
  showSlug: string,
  locale: Language,
): string {
  const note = editorialNotes[episode.id];
  return note &&
    (note.showSlug ?? 'show-mwky0f05') === showSlug &&
    note.title === episode.title.trim().replace(/[؟?]+$/, '')
    ? note.summary[locale]
    : '';
}
