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
  'be01daec-0527-433e-86da-8b3e453160a7': {
    showSlug: 'show-mwjp231e',
    title: 'هل ممكن تكون حياتك كلها مجرد وهم',
    summary: {
      ar: 'الحلقة بتشرح فرضية المحاكاة عند نيك بوستروم: لو العالم حوالينا برنامج متطور، نقدر نعرف من جوّاه؟ وبتسأل لو اكتشفنا كده، هل ده يغيّر معنى الحب والذكريات اللي عشناها؟',
      en: 'This episode explores Nick Bostrom’s simulation hypothesis. Could we tell from inside if our world were a computer simulation? And would that change what our memories and relationships mean?',
    },
  },
  'c2b4cc22-0b92-4b99-9b97-0ac711c0bea1': {
    showSlug: 'show-mwjp231e',
    title: 'هل النجاح محتاج موهبة ولا حظ',
    summary: {
      ar: 'ليه ممكن اتنين يبذلوا نفس المجهود ويوصلوا لنتايج مختلفة؟ الحلقة بتفصل بين الموهبة والاجتهاد والحظ، وبين إنك تبقى جاهز للفرصة وإن الفرصة تيجي لك أصلًا.',
      en: 'Why can two people put in the same effort and get different results? This episode looks at talent, hard work and luck, and the difference between being ready for an opportunity and actually getting one.',
    },
  },
  'abe36723-d7e0-4ec7-a151-5ff2574f51c8': {
    showSlug: 'show-mwjp231e',
    title: 'إنت حر... بس على مزاج مين',
    summary: {
      ar: 'مين من حقه يقولك إن حريتك لازم تقف هنا؟ من مبدأ الضرر عند جون ستيوارت ميل، الحلقة بتسأل إمتى المجتمع من حقه يتدخل، وإيه الفرق بين إن اختيارك يضايق حد وإنه يأذيه.',
      en: 'Who gets to decide where your freedom ends? Starting with John Stuart Mill’s harm principle, this episode asks when society should intervene and how to tell the difference between offending someone and harming them.',
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
