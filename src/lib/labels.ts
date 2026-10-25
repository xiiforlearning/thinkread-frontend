import type { GroupLevel, ListeningMethod, WordSource } from '../api/types';
import { common } from '../i18n/common';
import { currentLang } from '../i18n/lang';
import { tr } from '../i18n/t';

export const LEVEL_LABEL: Record<GroupLevel, string> = {
  PRE_INTERMEDIATE: 'Pre-Intermediate',
  INTERMEDIATE: 'Intermediate',
  UPPER_INTERMEDIATE: 'Upper-Intermediate',
  ADVANCED: 'Advanced',
  IELTS: 'IELTS',
};

export function levelLabel(level: GroupLevel | null): string {
  return level ? LEVEL_LABEL[level] : tr(common, 'levelUnset');
}

type Both<T> = { ru: T; en: T };
const pick = <T>(both: Both<T>): T => both[currentLang()];

const METHOD_LABEL: Both<Record<ListeningMethod, string>> = {
  ru: {
    PODCAST_WITH_SCRIPT: 'Подкаст со скриптом',
    SERIES: 'Сериал без субтитров',
    PODCAST_NO_TRANSCRIPT: 'Подкаст без транскрипта',
  },
  en: {
    PODCAST_WITH_SCRIPT: 'Podcast with a script',
    SERIES: 'Series without subtitles',
    PODCAST_NO_TRANSCRIPT: 'Podcast without a transcript',
  },
};
export function methodLabel(m: ListeningMethod): string {
  return pick(METHOD_LABEL)[m];
}

const METHOD_SHORT: Both<Record<ListeningMethod, string>> = {
  ru: {
    PODCAST_WITH_SCRIPT: 'подкасты со скриптом',
    SERIES: 'сериалы без субтитров',
    PODCAST_NO_TRANSCRIPT: 'подкасты без транскрипта',
  },
  en: {
    PODCAST_WITH_SCRIPT: 'podcasts with a script',
    SERIES: 'series without subtitles',
    PODCAST_NO_TRANSCRIPT: 'podcasts without a transcript',
  },
};
export function methodShort(m: ListeningMethod): string {
  return pick(METHOD_SHORT)[m];
}

const SOURCE_LABEL: Both<Record<WordSource, string>> = {
  ru: {
    READING: 'Из отчёта о чтении',
    PODCAST: 'Из отчёта об аудировании',
    SERIES: 'Из отчёта об аудировании',
    MANUAL: 'Добавил сам',
    IMPORT: 'Импорт списка',
    TEACHER: 'Список учителя',
  },
  en: {
    READING: 'From a reading report',
    PODCAST: 'From a listening report',
    SERIES: 'From a listening report',
    MANUAL: 'Added by you',
    IMPORT: 'Imported list',
    TEACHER: "Teacher's list",
  },
};
export function sourceLabel(src: WordSource): string {
  return pick(SOURCE_LABEL)[src];
}

const STAGE_LABEL: Both<Record<1 | 2 | 3, string>> = {
  ru: { 1: 'перевод', 2: 'в предложении', 3: 'своё предложение' },
  en: { 1: 'translation', 2: 'in a sentence', 3: 'own sentence' },
};
export function stageLabel(stage: 1 | 2 | 3): string {
  return pick(STAGE_LABEL)[stage];
}

type Steps = Array<{ title: string; subtitle: string }>;
/** Six steps of the listening method, per level group. */
const METHOD_STEPS: Both<Record<ListeningMethod, Steps>> = {
  ru: {
    PODCAST_WITH_SCRIPT: [
      { title: 'Прослушай выпуск целиком', subtitle: 'Без скрипта, первый раз' },
      { title: 'Отметь, сколько понял', subtitle: 'Примерный процент' },
      { title: 'Прочитай скрипт', subtitle: 'Выпиши незнакомые слова' },
      { title: 'Переслушай со скриптом', subtitle: 'Следи глазами за текстом' },
      { title: 'Финальное прослушивание', subtitle: 'Уже без скрипта, цель — около 90%' },
      { title: 'Отчёт', subtitle: 'Название, % с первого раза, слова' },
    ],
    SERIES: [
      { title: 'Посмотри серию с субтитрами', subtitle: 'Английские субтитры, первый раз' },
      { title: 'Выпиши новые слова', subtitle: 'Из субтитров' },
      { title: 'Посмотри ещё раз без субтитров', subtitle: 'Главная часть работы' },
      { title: 'Отметь, сколько понял', subtitle: 'Примерный процент во второй раз' },
      { title: 'Перескажи серию', subtitle: '2–3 предложения на английском' },
      { title: 'Отчёт', subtitle: 'Сериал, серия, %, пересказ, слова' },
    ],
    PODCAST_NO_TRANSCRIPT: [
      { title: 'Прослушай выпуск целиком', subtitle: 'Без пауз, первый раз' },
      { title: 'Перескажи по памяти', subtitle: '2–3 предложения на английском' },
      { title: 'Переслушай непонятные места', subtitle: 'Запиши, как слышится' },
      { title: 'Проверь слова в словаре', subtitle: 'Добавь новые в свой список' },
      { title: 'Финальное прослушивание', subtitle: 'Цель — около 90% понимания' },
      { title: 'Отчёт', subtitle: 'Название, % с первого раза, пересказ, слова' },
    ],
  },
  en: {
    PODCAST_WITH_SCRIPT: [
      { title: 'Listen to the whole episode', subtitle: 'Without the script, first time' },
      { title: 'Note how much you understood', subtitle: 'A rough percentage' },
      { title: 'Read the script', subtitle: 'Write down the unknown words' },
      { title: 'Listen again with the script', subtitle: 'Follow the text with your eyes' },
      { title: 'Final listen', subtitle: 'Without the script, aim for about 90%' },
      { title: 'Report', subtitle: 'Title, % on the first pass, words' },
    ],
    SERIES: [
      { title: 'Watch the episode with subtitles', subtitle: 'English subtitles, first time' },
      { title: 'Write down the new words', subtitle: 'From the subtitles' },
      { title: 'Watch again without subtitles', subtitle: 'The main part of the work' },
      { title: 'Note how much you understood', subtitle: 'A rough percentage the second time' },
      { title: 'Retell the episode', subtitle: '2–3 sentences in English' },
      { title: 'Report', subtitle: 'Series, episode, %, retelling, words' },
    ],
    PODCAST_NO_TRANSCRIPT: [
      { title: 'Listen to the whole episode', subtitle: 'No pauses, first time' },
      { title: 'Retell it from memory', subtitle: '2–3 sentences in English' },
      { title: 'Re-listen to the unclear parts', subtitle: 'Write down what you hear' },
      { title: 'Check the words in a dictionary', subtitle: 'Add the new ones to your list' },
      { title: 'Final listen', subtitle: 'Aim for about 90% understanding' },
      { title: 'Report', subtitle: 'Title, % on the first pass, retelling, words' },
    ],
  },
};
export function methodSteps(m: ListeningMethod): Steps {
  return pick(METHOD_STEPS)[m];
}

const METHOD_EXAMPLE: Both<Record<ListeningMethod, string>> = {
  ru: {
    PODCAST_WITH_SCRIPT:
      'слушал 6 Minute English про сон\nс первого раза ~60%, со скриптом всё понял\nнепонятно было: "sleep debt"\nслова: drowsy — сонный, nap — короткий сон',
    SERIES:
      'смотрел Friends, 2 сезон 5 серия\nс субтитрами понял почти всё, без субтитров ~75%\nThe episode was about Ross and Rachel. They argued about a letter.\nслова: awkward — неловкий, grumpy — ворчливый',
    PODCAST_NO_TRANSCRIPT:
      'слушал 6 Minute English про сон\nс первого раза ~70%, после третьего ~88%\nThe episode was about why we sleep. The hosts said that a short nap helps memory, but long naps make you drowsy.\nнепонятно: "sleep debt"\nслова: drowsy — сонный, nap — короткий сон',
  },
  en: {
    PODCAST_WITH_SCRIPT:
      'listened to 6 Minute English about sleep\nfirst pass ~60%, understood everything with the script\nunclear: "sleep debt"\nwords: drowsy, nap',
    SERIES:
      'watched Friends, season 2 episode 5\nalmost everything with subtitles, ~75% without\nThe episode was about Ross and Rachel. They argued about a letter.\nwords: awkward, grumpy',
    PODCAST_NO_TRANSCRIPT:
      'listened to 6 Minute English about sleep\nfirst pass ~70%, ~88% after the third listen\nThe episode was about why we sleep. The hosts said that a short nap helps memory, but long naps make you drowsy.\nunclear: "sleep debt"\nwords: drowsy, nap',
  },
};
export function methodExample(m: ListeningMethod): string {
  return pick(METHOD_EXAMPLE)[m];
}

const CLARIFY_FIELD_LABEL: Both<Record<string, string>> = {
  ru: {
    retelling: 'Пересказ своими словами',
    sourceTitle: 'Название',
    episode: 'Серия',
    firstPassPct: 'Понимание с первого раза',
    secondPassPct: 'Понимание после переслушивания',
    listenCount: 'Сколько раз слушал',
    pages: 'Сколько страниц',
    summary: 'О чём было',
    unclearParts: 'Что осталось непонятным',
  },
  en: {
    retelling: 'Retelling in your own words',
    sourceTitle: 'Title',
    episode: 'Episode',
    firstPassPct: 'Understanding on the first pass',
    secondPassPct: 'Understanding after re-listening',
    listenCount: 'How many times you listened',
    pages: 'How many pages',
    summary: 'What it was about',
    unclearParts: 'What stayed unclear',
  },
};
export function clarifyFieldLabel(field: string): string {
  return pick(CLARIFY_FIELD_LABEL)[field] ?? field;
}
