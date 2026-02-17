/**
 * Global language configuration — per-language settings for autocomplete,
 * forbidden phrases, writing directives, and content generation.
 */

export interface LanguageConfig {
  code: string;          // ISO 639-1
  name: string;          // English name
  nativeName: string;    // Native name
  dir: 'rtl' | 'ltr';
  autocompleteLetters: string[];
  writingDirective: string;
  formalStyle: string;
  informalStyle: string;
  mixedStyle: string;
  forbiddenPhrases: string[];
}

// ─── Arabic ───
const ARABIC: LanguageConfig = {
  code: 'ar',
  name: 'Arabic',
  nativeName: 'العربية',
  dir: 'rtl',
  autocompleteLetters: 'أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(' '),
  writingDirective: 'Write in Arabic (العربية).',
  formalStyle: 'Write in Modern Standard Arabic (الفصحى).',
  informalStyle: 'Write in Arabic colloquial style.',
  mixedStyle: 'Write in a mix of Modern Standard Arabic and colloquial Arabic.',
  forbiddenPhrases: [
    'في الختام', 'في نهاية المطاف', 'خلاصة القول', 'في النهاية', 'وفي الأخير', 'ختاماً',
    'مما لا شك فيه', 'علاوة على ذلك', 'من الجدير بالذكر', 'تجدر الإشارة', 'لا يخفى على أحد',
    'في هذا السياق', 'بالإضافة إلى ذلك', 'فضلاً عن ذلك', 'من ناحية أخرى', 'على صعيد آخر',
    'في عالمنا المتسارع', 'في عصرنا الحالي', 'في ظل التطورات', 'يشهد العالم اليوم',
    'مع التقدم التكنولوجي', 'في عالم يتغير بسرعة', 'إن الحديث عن',
    'نغوص في', 'يجسد', 'سنتناول في هذا المقال', 'سنستعرض', 'دعونا نتعرف', 'هيا بنا',
    'دعنا نستكشف', 'سنلقي نظرة', 'سنكشف النقاب',
    'يعتبر من أهم', 'يلعب دوراً محورياً', 'يحظى باهتمام كبير', 'لا يمكن إنكار',
    'من المعروف أن', 'كما هو معلوم', 'بات من الضروري', 'أصبح لا غنى عنه',
  ],
};

// ─── English ───
const ENGLISH: LanguageConfig = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
  writingDirective: 'Write in English.',
  formalStyle: 'Write in formal, professional English.',
  informalStyle: 'Write in casual, conversational English.',
  mixedStyle: 'Write in a professional yet approachable English style.',
  forbiddenPhrases: [
    // Conclusion/summary clichés
    'In conclusion', 'To sum up', 'In today\'s fast-paced world', 'In this day and age',
    'It goes without saying', 'Without further ado', 'In the realm of', 'It is worth noting',
    'In summary', 'To summarize', 'Ultimately', 'To put it simply',
    // Article intro clichés
    'Let\'s dive in', 'Let\'s explore', 'Let\'s delve into', 'Let\'s take a look',
    'In this article, we will', 'We will explore', 'We will discuss', 'We will examine',
    // Overused transitions
    'Furthermore', 'Moreover', 'Additionally', 'In addition to this',
    'It is important to note', 'It should be noted', 'Needless to say',
    'Remember that', 'Specifically', 'Consequently', 'Importantly',
    'Indeed', 'Notably', 'Despite', 'Essentially', 'Alternatively',
    'In contrast', 'Given that', 'Arguably', 'You may want to',
    'On the other hand', 'As previously mentioned', 'It\'s worth noting that',
    'It\'s critical to', 'Subsequently',
    // Landscape/world clichés
    'In the ever-evolving landscape', 'In the world of', 'When it comes to',
    'At the end of the day', 'Last but not least', 'All in all',
    'I hope this email finds you well',
    // Overused role phrases
    'plays a crucial role', 'is a game-changer', 'is a must-have',
    // Banned action verbs
    'leverage', 'utilize', 'streamline', 'robust', 'cutting-edge',
    'unlock the power of', 'navigate the complexities', 'embark on a journey',
    'navigating', 'tailored', 'embark', 'unlock the secrets', 'unveil the secrets',
    'elevate', 'unleash', 'harness', 'delve into', 'take a dive into',
    'mastering', 'excels', 'enhance', 'revolutionize', 'foster',
    'whispering', 'reverberate', 'promptly',
    // Banned adjectives
    'meticulous', 'complexities', 'realm', 'everchanging', 'ever-evolving',
    'daunting', 'tapestry', 'bustling', 'vibrant', 'metropolis',
    'crucial', 'essential', 'vital', 'keen', 'fancy',
    'labyrinth', 'gossamer', 'enigma', 'indelible',
  ],
};

// ─── French ───
const FRENCH: LanguageConfig = {
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
  writingDirective: 'Write in French (Français).',
  formalStyle: 'Write in formal, professional French.',
  informalStyle: 'Write in casual, conversational French.',
  mixedStyle: 'Write in a professional yet approachable French style.',
  forbiddenPhrases: [
    'En conclusion', 'Pour conclure', 'En résumé', 'Dans le monde d\'aujourd\'hui',
    'Il va sans dire', 'Sans plus tarder', 'Il est important de noter',
    'Dans cet article, nous allons', 'Nous allons explorer', 'Plongeons dans',
    'De plus', 'En outre', 'Par ailleurs', 'Il convient de noter',
    'Force est de constater', 'Il est indéniable que', 'Nul doute que',
    'joue un rôle crucial', 'est un incontournable', 'Au final',
  ],
};

// ─── Spanish ───
const SPANISH: LanguageConfig = {
  code: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z ñ'.split(' '),
  writingDirective: 'Write in Spanish (Español).',
  formalStyle: 'Write in formal, professional Spanish.',
  informalStyle: 'Write in casual, conversational Spanish.',
  mixedStyle: 'Write in a professional yet approachable Spanish style.',
  forbiddenPhrases: [
    'En conclusión', 'Para concluir', 'En resumen', 'En el mundo actual',
    'No cabe duda de que', 'Sin más preámbulos', 'Es importante señalar',
    'En este artículo vamos a', 'Vamos a explorar', 'Sumerjámonos en',
    'Además', 'Por otra parte', 'Asimismo', 'Cabe destacar que',
    'juega un papel crucial', 'es imprescindible', 'Al fin y al cabo',
  ],
};

// ─── German ───
const GERMAN: LanguageConfig = {
  code: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z ä ö ü'.split(' '),
  writingDirective: 'Write in German (Deutsch).',
  formalStyle: 'Write in formal, professional German.',
  informalStyle: 'Write in casual, conversational German.',
  mixedStyle: 'Write in a professional yet approachable German style.',
  forbiddenPhrases: [
    'Zusammenfassend', 'Abschließend', 'In der heutigen schnelllebigen Welt',
    'Es versteht sich von selbst', 'Ohne Umschweife', 'Es ist wichtig zu beachten',
    'In diesem Artikel werden wir', 'Lassen Sie uns eintauchen',
    'Darüber hinaus', 'Außerdem', 'Des Weiteren', 'Es sei darauf hingewiesen',
    'spielt eine entscheidende Rolle', 'ist unverzichtbar', 'Letzten Endes',
  ],
};

// ─── Portuguese ───
const PORTUGUESE: LanguageConfig = {
  code: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
  writingDirective: 'Write in Portuguese (Português).',
  formalStyle: 'Write in formal, professional Portuguese.',
  informalStyle: 'Write in casual, conversational Portuguese.',
  mixedStyle: 'Write in a professional yet approachable Portuguese style.',
  forbiddenPhrases: [
    'Em conclusão', 'Para concluir', 'Em resumo', 'No mundo atual',
    'Não há dúvida de que', 'Sem mais delongas', 'É importante notar',
    'Neste artigo, vamos', 'Vamos explorar', 'Mergulhemos em',
    'Além disso', 'Por outro lado', 'Vale ressaltar que',
    'desempenha um papel crucial', 'é indispensável', 'No final das contas',
  ],
};

// ─── Turkish ───
const TURKISH: LanguageConfig = {
  code: 'tr',
  name: 'Turkish',
  nativeName: 'Türkçe',
  dir: 'ltr',
  autocompleteLetters: 'a b c ç d e f g ğ h ı i j k l m n o ö p r s ş t u ü v y z'.split(' '),
  writingDirective: 'Write in Turkish (Türkçe).',
  formalStyle: 'Write in formal, professional Turkish.',
  informalStyle: 'Write in casual, conversational Turkish.',
  mixedStyle: 'Write in a professional yet approachable Turkish style.',
  forbiddenPhrases: [
    'Sonuç olarak', 'Özetle', 'Günümüzün hızla değişen dünyasında',
    'Söylemeye gerek yok ki', 'Lafı uzatmadan', 'Belirtmek gerekir ki',
    'Bu makalede', 'Hadi keşfedelim', 'Derinlemesine bakalım',
    'Ayrıca', 'Bunun yanı sıra', 'Üstelik', 'Dikkat çekilmesi gereken',
    'kritik bir rol oynamaktadır', 'vazgeçilmezdir', 'Sonuçta',
  ],
};

// ─── Indonesian ───
const INDONESIAN: LanguageConfig = {
  code: 'id',
  name: 'Indonesian',
  nativeName: 'Bahasa Indonesia',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
  writingDirective: 'Write in Indonesian (Bahasa Indonesia).',
  formalStyle: 'Write in formal, professional Indonesian.',
  informalStyle: 'Write in casual, conversational Indonesian.',
  mixedStyle: 'Write in a professional yet approachable Indonesian style.',
  forbiddenPhrases: [
    'Kesimpulannya', 'Sebagai penutup', 'Di dunia yang serba cepat saat ini',
    'Sudah jelas bahwa', 'Tanpa basa-basi', 'Perlu dicatat bahwa',
    'Dalam artikel ini, kita akan', 'Mari kita jelajahi', 'Mari kita telusuri',
    'Selain itu', 'Di samping itu', 'Lebih lanjut',
    'memainkan peran penting', 'sangat diperlukan', 'Pada akhirnya',
  ],
};

// ─── Italian ───
const ITALIAN: LanguageConfig = {
  code: 'it',
  name: 'Italian',
  nativeName: 'Italiano',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i l m n o p q r s t u v z'.split(' '),
  writingDirective: 'Write in Italian (Italiano).',
  formalStyle: 'Write in formal, professional Italian.',
  informalStyle: 'Write in casual, conversational Italian.',
  mixedStyle: 'Write in a professional yet approachable Italian style.',
  forbiddenPhrases: [
    'In conclusione', 'Per concludere', 'In sintesi', 'Nel mondo di oggi',
    'Va da sé che', 'Senza ulteriori indugi', 'È importante notare che',
    'In questo articolo', 'Esploriamo', 'Immergiamoci in',
    'Inoltre', 'Per di più', 'In aggiunta', 'Vale la pena notare',
    'gioca un ruolo cruciale', 'è indispensabile', 'In fin dei conti',
  ],
};

// ─── Dutch ───
const DUTCH: LanguageConfig = {
  code: 'nl',
  name: 'Dutch',
  nativeName: 'Nederlands',
  dir: 'ltr',
  autocompleteLetters: 'a b c d e f g h i j k l m n o p q r s t u v w x y z'.split(' '),
  writingDirective: 'Write in Dutch (Nederlands).',
  formalStyle: 'Write in formal, professional Dutch.',
  informalStyle: 'Write in casual, conversational Dutch.',
  mixedStyle: 'Write in a professional yet approachable Dutch style.',
  forbiddenPhrases: [
    'Concluderend', 'Samenvattend', 'In de snelle wereld van vandaag',
    'Het spreekt voor zich', 'Zonder verder oponthoud',
    'Het is belangrijk op te merken', 'In dit artikel zullen we',
    'Laten we duiken in', 'Daarnaast', 'Bovendien', 'Verder',
    'speelt een cruciale rol', 'is onmisbaar', 'Uiteindelijk',
  ],
};

// ─── Japanese ───
const JAPANESE: LanguageConfig = {
  code: 'ja',
  name: 'Japanese',
  nativeName: '日本語',
  dir: 'ltr',
  autocompleteLetters: 'あ い う え お か き く け こ さ し す せ そ た ち つ て と な に ぬ ね の は ひ ふ へ ほ ま み む め も や ゆ よ ら り る れ ろ わ を ん'.split(' '),
  writingDirective: 'Write in Japanese (日本語).',
  formalStyle: 'Write in formal, professional Japanese (ですます調).',
  informalStyle: 'Write in casual, conversational Japanese (である調).',
  mixedStyle: 'Write in a professional yet approachable Japanese style.',
  forbiddenPhrases: [
    'まとめると', '結論として', '今日の急速に変化する世界では',
    '言うまでもなく', '前置きはさておき', '注目すべきは',
    'この記事では', '探っていきましょう', '深掘りしていきましょう',
    'さらに', 'また', 'その上', '重要な役割を果たしている',
  ],
};

// ─── Korean ───
const KOREAN: LanguageConfig = {
  code: 'ko',
  name: 'Korean',
  nativeName: '한국어',
  dir: 'ltr',
  autocompleteLetters: 'ㄱ ㄴ ㄷ ㄹ ㅁ ㅂ ㅅ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ'.split(' '),
  writingDirective: 'Write in Korean (한국어).',
  formalStyle: 'Write in formal, professional Korean (합니다체).',
  informalStyle: 'Write in casual, conversational Korean (해요체).',
  mixedStyle: 'Write in a professional yet approachable Korean style.',
  forbiddenPhrases: [
    '결론적으로', '요약하면', '오늘날 빠르게 변화하는 세상에서',
    '말할 것도 없이', '서론은 그만하고', '주목할 점은',
    '이 기사에서는', '살펴보겠습니다', '깊이 들어가 보겠습니다',
    '또한', '게다가', '더불어', '중요한 역할을 합니다',
  ],
};

// ─── Hindi ───
const HINDI: LanguageConfig = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  dir: 'ltr',
  autocompleteLetters: 'अ आ इ ई उ ऊ ए ऐ ओ औ क ख ग घ च छ ज झ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह'.split(' '),
  writingDirective: 'Write in Hindi (हिन्दी).',
  formalStyle: 'Write in formal, professional Hindi.',
  informalStyle: 'Write in casual, conversational Hindi.',
  mixedStyle: 'Write in a professional yet approachable Hindi style.',
  forbiddenPhrases: [
    'निष्कर्ष में', 'संक्षेप में', 'आज की तेज़ रफ़्तार दुनिया में',
    'यह कहने की ज़रूरत नहीं', 'बिना किसी देरी के', 'यह ध्यान देने योग्य है',
    'इस लेख में हम', 'आइए जानते हैं', 'गहराई से समझते हैं',
    'इसके अलावा', 'साथ ही', 'इतना ही नहीं',
    'महत्वपूर्ण भूमिका निभाता है', 'अनिवार्य है', 'अंत में',
  ],
};

// ─── Master Registry ───
const ALL_LANGUAGES: Record<string, LanguageConfig> = {
  ar: ARABIC, en: ENGLISH, fr: FRENCH, es: SPANISH, de: GERMAN,
  pt: PORTUGUESE, tr: TURKISH, id: INDONESIAN, it: ITALIAN, nl: DUTCH,
  ja: JAPANESE, ko: KOREAN, hi: HINDI,
};

/**
 * Get language config for an ISO 639-1 code.
 * Falls back to English if the language is not configured.
 */
export function getLanguageConfig(langCode: string): LanguageConfig {
  return ALL_LANGUAGES[langCode] || ENGLISH;
}

/** Get all supported language codes */
export function getSupportedLanguages(): LanguageConfig[] {
  return Object.values(ALL_LANGUAGES);
}

/** Get forbidden phrases for a specific language */
export function getForbiddenPhrases(langCode: string): string[] {
  return (ALL_LANGUAGES[langCode] || ENGLISH).forbiddenPhrases;
}

/** Get writing style directive based on language + style config */
export function getWritingStyleDirective(langCode: string, style: 'formal' | 'informal' | 'mixed'): string {
  const config = ALL_LANGUAGES[langCode] || ENGLISH;
  switch (style) {
    case 'formal': return config.formalStyle;
    case 'informal': return config.informalStyle;
    case 'mixed': return config.mixedStyle;
    default: return config.formalStyle;
  }
}
