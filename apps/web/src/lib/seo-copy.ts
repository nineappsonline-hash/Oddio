import type { Locale } from '@ai-music/contracts';

/**
 * Search-oriented copy for public and utility route types.
 * Each description describes a real Oddio feature and avoids keyword stuffing.
 * Noindex continues to be controlled by the individual page.
 */
type SeoPage = { title: string; description: string };
type SeoCopies = { en: SeoPage; ar: SeoPage };

export const SEO_PAGES: Record<string, SeoCopies> = {
  '': {
    en: {
      title: 'Oddio — Discover & Listen to AI-Generated Music',
      description: 'Discover original AI-generated songs, emerging AI music artists and curated playlists on Oddio. Explore new releases, genres and personalized music discovery.',
    },
    ar: {
      title: 'Oddio | اكتشف واسمع موسيقى بالذكاء الاصطناعي',
      description: 'اكتشف أغاني أصلية وموسيقى بالذكاء الاصطناعي على Oddio. اسمع إصدارات جديدة، وتعرّف على فنانين وموسيقى عربية وعالمية، واستكشف قوائم تشغيل متنوعة.',
    },
  },
  '/discover': {
    en: {
      title: 'Discover New AI Music, Artists & Songs',
      description: 'Find new AI-generated music on Oddio. Discover fresh tracks, independent AI artists, trending sounds, genres and playlists to match your taste.',
    },
    ar: {
      title: 'اكتشف أغاني جديدة وفنانين وموسيقى AI',
      description: 'استكشف أحدث الأغاني والموسيقى المصنوعة بالذكاء الاصطناعي على Oddio. اكتشف فنانين جدد وأنواع موسيقية متنوعة وترشيحات تناسب ذوقك.',
    },
  },
  '/genres': {
    en: {
      title: 'AI Music Genres — Arabic, Pop, Hip-Hop & More',
      description: 'Browse AI-generated songs by music genre on Oddio: Arabic music, pop, hip-hop, electronic, rock, chill, instrumental and more.',
    },
    ar: {
      title: 'أنواع الموسيقى | عربي وبوب وراب وإلكترونيك',
      description: 'استكشف الموسيقى بالذكاء الاصطناعي حسب النوع على Oddio: موسيقى عربية، بوب، راب، إلكترونيك، روك، موسيقى هادئة وآلية، وأنواع أخرى.',
    },
  },
  '/charts': {
    en: {
      title: 'AI Music Charts — Trending Songs on Oddio',
      description: 'Explore trending AI-generated songs on Oddio. Browse popular tracks and discover what listeners are playing across daily, weekly and monthly music charts.',
    },
    ar: {
      title: 'الأغاني الأكثر استماعًا | قوائم Oddio',
      description: 'شوف الأغاني والموسيقى بالذكاء الاصطناعي الأكثر استماعًا على Oddio. تابع الأغاني الرائجة والقوائم اليومية والأسبوعية والشهرية.',
    },
  },
  '/soundspace': {
    en: {
      title: 'Soundspace — AI Music Discovery by Mood',
      description: 'Choose your mood and discovery level with Oddio Soundspace, then explore an AI-music mix matched to how you want to listen.',
    },
    ar: {
      title: 'Soundspace | اكتشف موسيقى على حسب مزاجك',
      description: 'اختار مزاجك ودرجة الاكتشاف في Oddio Soundspace، واستمع لميكس من الموسيقى المصنوعة بالذكاء الاصطناعي يناسب طريقة استماعك.',
    },
  },
  '/apply/artist': {
    en: {
      title: 'Become an AI Music Artist on Oddio',
      description: 'Apply to join Oddio as an AI music artist. Learn about the artist review process and how to share original AI-generated music with listeners.',
    },
    ar: {
      title: 'انضم كفنان موسيقى AI إلى Oddio',
      description: 'قدّم للانضمام إلى Oddio كفنان موسيقى بالذكاء الاصطناعي، وتعرّف على مراجعة طلبات الفنانين وخطوات مشاركة أغانيك الأصلية.',
    },
  },
  '/install': {
    en: {
      title: 'Install Oddio — AI Music on Your Phone',
      description: 'Add the Oddio music web app to your mobile home screen for quick access to AI-generated songs, artists, playlists and music discovery.',
    },
    ar: {
      title: 'ثبّت Oddio على موبايلك | موسيقى AI',
      description: 'أضف موقع Oddio إلى الشاشة الرئيسية في موبايلك للوصول بسرعة إلى الموسيقى بالذكاء الاصطناعي، والأغاني والفنانين وقوائم التشغيل.',
    },
  },
  '/for-artists': {
    en: {
      title: 'Publish AI Music on Oddio — For Artists',
      description: 'Create an artist presence on Oddio. Learn how AI music artists can apply, submit original tracks for review and manage releases after approval.',
    },
    ar: {
      title: 'انشر موسيقى بالذكاء الاصطناعي | للفنانين',
      description: 'عاوز تنشر أغانيك على Oddio؟ تعرّف على خطوات تقديم الفنانين، ومتطلبات مراجعة الأغاني، وإدارة إصدارات الموسيقى بالذكاء الاصطناعي.',
    },
  },
  '/about': {
    en: {
      title: 'About Oddio — An AI Music Listening Platform',
      description: 'Learn what Oddio is, how to discover AI-generated songs and artists, and how its listening, publishing and music discovery features work.',
    },
    ar: {
      title: 'عن Oddio | منصة موسيقى بالذكاء الاصطناعي',
      description: 'اعرف أكتر عن Oddio، منصة اكتشاف وسماع الموسيقى بالذكاء الاصطناعي، وإزاي تستكشف الأغاني والفنانين وتنشر موسيقاك الأصلية.',
    },
  },
  '/search': {
    en: { title: 'Search Songs, Artists & Playlists', description: 'Search Oddio for AI-generated songs, artists, music genres and playlists.' },
    ar: { title: 'ابحث عن أغاني وفنانين وقوائم تشغيل', description: 'ابحث على Oddio عن أغاني وموسيقى بالذكاء الاصطناعي وفنانين وأنواع موسيقية وقوائم تشغيل.' },
  },
  '/library': {
    en: { title: 'Your Music Library', description: 'Manage your liked songs, saved playlists, followed artists and listening history in your private Oddio library.' },
    ar: { title: 'مكتبتك الموسيقية', description: 'نظّم الأغاني اللي عجبتك وقوائم التشغيل والفنانين المتابعين وسجل الاستماع في مكتبتك الخاصة على Oddio.' },
  },
  '/studio': {
    en: { title: 'Oddio Artist Studio', description: 'Manage your AI music releases, songs, artist profiles and listening insights in the Oddio Artist Studio.' },
    ar: { title: 'استوديو الفنانين على Oddio', description: 'أدر إصداراتك وأغانيك وملفات الفنانين وإحصائيات الاستماع من استوديو Oddio للفنانين.' },
  },
  '/admin': {
    en: { title: 'Oddio Administration', description: 'Manage music reviews, moderation requests, artist applications and platform operations in the private Oddio admin area.' },
    ar: { title: 'إدارة Oddio', description: 'إدارة مراجعات الأغاني والبلاغات وطلبات الفنانين وعمليات المنصة من لوحة إدارة Oddio الخاصة.' },
  },
  '/rooms': {
    en: { title: 'Private Listening Rooms', description: 'Listen together in invite-only Oddio rooms with synchronized music playback and a shared listening experience.' },
    ar: { title: 'غرف استماع موسيقية خاصة', description: 'اسمعوا الأغاني مع بعض في غرف Oddio الخاصة بالدعوات مع تشغيل موسيقي متزامن.' },
  },
  '/settings': {
    en: { title: 'Account Settings', description: 'Update your Oddio account settings, profile details and music listening preferences.' },
    ar: { title: 'إعدادات الحساب', description: 'عدّل إعدادات حسابك على Oddio وبيانات ملفك الشخصي وتفضيلات الاستماع.' },
  },
  '/notifications': {
    en: { title: 'Your Notifications', description: 'See account notifications, artist updates and important activity related to your Oddio account.' },
    ar: { title: 'إشعاراتك', description: 'تابع إشعارات الحساب وتحديثات الفنانين والأنشطة المرتبطة بحسابك على Oddio.' },
  },
  '/legal/terms': {
    en: { title: 'Terms of Service', description: 'Read the terms governing the use of Oddio, including accounts, listening and artist publishing responsibilities.' },
    ar: { title: 'شروط الاستخدام', description: 'اقرأ شروط استخدام Oddio المتعلقة بالحسابات والاستماع إلى الموسيقى ومسؤوليات نشر المحتوى.' },
  },
  '/legal/privacy': {
    en: { title: 'Privacy Policy', description: 'Learn how Oddio describes personal data, account privacy and privacy choices in its published Privacy Policy.' },
    ar: { title: 'سياسة الخصوصية', description: 'اقرأ سياسة خصوصية Oddio لمعرفة المعلومات المتعلقة ببيانات الحساب وخيارات الخصوصية.' },
  },
  '/legal/content-policy': {
    en: { title: 'Music Content Policy', description: 'Review Oddio rules for AI music submissions, artist responsibilities and music content moderation.' },
    ar: { title: 'سياسة المحتوى', description: 'تعرّف على قواعد Oddio لنشر الموسيقى بالذكاء الاصطناعي ومسؤوليات الفنانين ومراجعة المحتوى.' },
  },
  '/legal/copyright': {
    en: { title: 'Copyright & Rights', description: 'Learn about copyright concerns, content ownership and reporting intellectual property issues on Oddio.' },
    ar: { title: 'حقوق النشر والملكية', description: 'اقرأ معلومات حقوق النشر وملكية المحتوى والإبلاغ عن مشكلات الملكية الفكرية على Oddio.' },
  },
  '/login': {
    en: { title: 'Log In to Oddio', description: 'Sign in to Oddio to access your saved songs, playlists and personalized music listening experience.' },
    ar: { title: 'سجّل دخولك إلى Oddio', description: 'سجّل دخولك إلى Oddio للوصول لأغانيك المحفوظة وقوائم التشغيل وتجربة الموسيقى الشخصية.' },
  },
  '/signup': {
    en: { title: 'Create an Oddio Account', description: 'Create an Oddio account to save AI music, make playlists and follow your favorite artists.' },
    ar: { title: 'اعمل حساب على Oddio', description: 'أنشئ حسابًا على Oddio علشان تحفظ أغانيك المفضلة وتعمل قوائم تشغيل وتتابع الفنانين.' },
  },
};

export function seoPage(locale: Locale, path: string): SeoPage | null {
  return SEO_PAGES[path]?.[locale] ?? null;
}
