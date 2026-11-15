import type { Locale } from '@ai-music/contracts';

type Editorial = { en: string; ar: string };

/**
 * Human-reviewed descriptions of music styles and moods, not claims about
 * individual uploaded songs. Only real, active catalog records are displayed.
 */
const genreIntro: Record<string, Editorial> = {
  'arabic-pop': {
    en: 'Arabic pop blends contemporary pop songwriting with melodies, language and musical influences from across the Arab world. Browse tracks tagged Arabic Pop, then discover their creators and other releases.',
    ar: 'البوب العربي بيجمع بين أسلوب الأغاني المعاصرة وألحان وكلمات وتأثيرات موسيقية من العالم العربي. تصفح الأغاني المصنفة بوب عربي واكتشف الفنانين وإصداراتهم.',
  },
  shaabi: {
    en: 'Shaabi is closely associated with Egyptian popular music, drawing on expressive vocals, local rhythms and everyday storytelling. Explore the songs in Oddio’s Shaabi collection.',
    ar: 'الموسيقى الشعبية مرتبطة بثقافة الأغنية المصرية، بإيقاعات مميزة وأداء مباشر وحكايات من الحياة اليومية. اكتشف الأغاني المصنفة شعبي على Oddio.',
  },
  mahraganat: {
    en: 'Mahraganat grew out of Egypt’s street-music scene, with electronic beats, energetic vocals and bold rhythmic patterns. Hear releases categorized as Mahraganat on Oddio.',
    ar: 'المهرجانات من الأصوات المرتبطة بالمشهد الموسيقي المصري المعاصر، وبتتميز بإيقاعات إلكترونية وطاقة عالية وأداء غنائي مباشر. اسمع الأغاني المصنفة مهرجانات على Oddio.',
  },
  tarab: {
    en: 'Tarab describes an expressive tradition of Arabic vocal music built around melody, emotion and attentive listening. Browse Oddio’s Tarab-tagged releases and their artists.',
    ar: 'الطرب مرتبط بتقاليد الغناء العربي اللي بتركز على جمال اللحن والتعبير والإحساس. استكشف الأعمال المصنفة طرب والفنانين اللي بيقدموها على Oddio.',
  },
  khaliji: {
    en: 'Khaleeji music draws from musical traditions around the Arabian Gulf and often highlights distinctive regional rhythms and vocal styles. Explore releases classified as Khaleeji.',
    ar: 'الموسيقى الخليجية مستوحاة من تقاليد موسيقية في منطقة الخليج العربي، وليها إيقاعات وأساليب غناء مميزة. تصفح الأغاني الخليجية الموجودة على Oddio.',
  },
  dabke: {
    en: 'Dabke music is connected to a traditional Levantine line dance, recognizable for driving rhythms and communal energy. Discover Oddio tracks tagged Dabke.',
    ar: 'الدبكة من التراث الشامي ومرتبطة بالرقص الجماعي والإيقاع القوي. اكتشف الأعمال الموسيقية المصنفة دبكة على Oddio.',
  },
  'hiphop': {
    en: 'Hip-hop is rooted in rhythmic delivery, expressive lyricism and beat-driven production. Discover artists and original AI-generated releases categorized as hip-hop.',
    ar: 'الهيب هوب بيعتمد على الإيقاع وأسلوب إلقاء الكلمات والإنتاج الموسيقي القائم على الـBeats. اكتشف أغاني وفنانين هيب هوب على Oddio.',
  },
  rap: {
    en: 'Rap focuses on the rhythmic flow of spoken or sung lyrics over beats. Browse Oddio’s Rap collection to explore different voices, tracks and production styles.',
    ar: 'الراب بيعتمد على إلقاء الكلمات بإيقاع وتدفق مميز فوق موسيقى الـBeats. اكتشف أصوات وأساليب وإصدارات الراب على Oddio.',
  },
  pop: {
    en: 'Pop music spans catchy melodies, concise arrangements and a wide range of modern production styles. Explore original AI-music releases grouped under Pop on Oddio.',
    ar: 'البوب معروف بالألحان القريبة من المستمع والتوزيع العصري، وبيضم أساليب موسيقية مختلفة. استكشف إصدارات البوب على Oddio.',
  },
  electronic: {
    en: 'Electronic music uses synthesizers, digital production and rhythmic experimentation across many styles. Browse Oddio’s Electronic tracks and follow their creators.',
    ar: 'الموسيقى الإلكترونية بتعتمد على الآلات والأصوات الرقمية والتجريب في الإيقاع والتوزيع. تصفح الأغاني الإلكترونية والفنانين على Oddio.',
  },
  'deep-house': {
    en: 'Deep house is a branch of house music known for steady dance rhythms, warm harmonies and atmospheric production. Explore tracks in this category on Oddio.',
    ar: 'الديب هاوس فرع من موسيقى الهاوس، وبيتميز بإيقاع رقص ثابت وهارموني دافئ وأجواء موسيقية هادية نسبيًا. اكتشف الأعمال المصنفة Deep House على Oddio.',
  },
  lofi: {
    en: 'Lo-fi music often uses soft textures, mellow grooves and deliberately imperfect production aesthetics. Explore laid-back original releases tagged Lo-fi on Oddio.',
    ar: 'اللو فاي غالبًا بيعتمد على أصوات ناعمة وإيقاعات هادية ولمسات إنتاج بسيطة مقصودة. اكتشف الأغاني المصنفة Lo-fi على Oddio.',
  },
  ambient: {
    en: 'Ambient music emphasizes atmosphere, texture and gradual musical changes, often without a prominent beat. Find original ambient tracks and artists on Oddio.',
    ar: 'موسيقى الأمبيانت بتركز على الأجواء والطبقات الصوتية والتغيّرات الهادية، وأحيانًا من غير إيقاع واضح. استكشف أعمال Ambient على Oddio.',
  },
  rock: {
    en: 'Rock covers music shaped by guitars, bass, drums and expressive performance, from melodic songs to heavier sounds. Hear Oddio’s Rock-tagged releases.',
    ar: 'الروك بيضم أصوات موسيقية بتعتمد على الجيتار والباص والدرامز، من الأغاني اللحنية للأصوات الأقوى. اسمع أعمال الروك على Oddio.',
  },
  'rnb': {
    en: 'R&B brings together soulful vocals, rhythmic grooves and contemporary production. Discover original songs categorized as R&B on Oddio.',
    ar: 'الـR&B بيجمع بين الأداء الغنائي التعبيري والإيقاع والتوزيع الموسيقي المعاصر. اكتشف الأغاني المصنفة R&B على Oddio.',
  },
};

const moodIntro: Record<string, Editorial> = {
  calm: {
    en: 'Looking for a calmer listening session? Explore songs categorized with a calm mood on Oddio and find tracks that match a slower pace.',
    ar: 'لو عاوز تسمع حاجة هادية، اكتشف الأغاني المصنفة بمود هادئ على Oddio واختار اللي يناسب لحظتك.',
  },
  chill: {
    en: 'The Chill mood gathers music labeled for a laid-back listening atmosphere. Browse releases and explore other songs by the artists you enjoy.',
    ar: 'مود الاسترخاء بيجمع أغاني متصنفة لأجواء هادية ومريحة. اسمع الأعمال المتاحة واكتشف باقي أغاني الفنانين اللي عجبتك.',
  },
  energetic: {
    en: 'Explore music tagged Energetic when you want a more lively listening session. Browse the available tracks and find a sound that fits your pace.',
    ar: 'لو محتاج طاقة وحركة، اكتشف الأغاني المصنفة بمود حيوي واختار من الإصدارات المتاحة على Oddio.',
  },
  focused: {
    en: 'Browse tracks tagged Focused for a listening session built around concentration. Different tracks suit different people, so sample a few before settling into a flow.',
    ar: 'استكشف الأغاني المصنفة بمود تركيز لو عاوز موسيقى ترافقك أثناء شغل أو مذاكرة. جرّب أكتر من أغنية واختار المناسب ليك.',
  },
  dreamy: {
    en: 'The Dreamy mood highlights songs categorized with an atmospheric, floating feeling. Explore tracks and artists whose sounds match that mood.',
    ar: 'مود حالم بيجمع أغاني متصنفة بأجواء حالمة وناعمة. استكشف الأصوات والفنانين واختار اللي يعجبك.',
  },
  nostalgic: {
    en: 'Nostalgic tracks aim for the feeling of looking back. Explore Oddio songs categorized with this mood and find a sound that brings memories to mind.',
    ar: 'مود الحنين مرتبط بإحساس الذكريات والرجوع للماضي. اكتشف الأغاني المصنفة بالمود ده على Oddio.',
  },
  romantic: {
    en: 'Find songs tagged Romantic, from gentle arrangements to expressive vocals. Discover tracks and artists for a personal listening moment.',
    ar: 'استكشف الأغاني المصنفة رومانسية، من التوزيعات الهادية للأداء الغنائي المليان إحساس، واختار اللي يناسبك.',
  },
  nocturnal: {
    en: 'Music tagged Nocturnal is grouped around late-night listening moods. Discover tracks for quiet evenings and after-dark listening.',
    ar: 'مود ليلي مخصص للأغاني اللي بتناسب أجواء الليل والسهر. اسمع الأصوات المتاحة واكتشف فنانين جدد.',
  },
};

/** Only return editorial text when it provides a specific useful explanation. */
export function categoryEditorial(
  kind: 'genre' | 'mood',
  slug: string,
  locale: Locale,
): string | null {
  const entry = kind === 'genre' ? genreIntro[slug] : moodIntro[slug];
  return entry?.[locale] ?? null;
}
