import { defineDict } from '../t';

/** 02a · Очередь карточек — the order the cards will come in, with priority management. */
export const queueDict = defineDict({
  ru: {
    title: 'Очередь',
    subtitle: 'В каком порядке придут карточки',
    intro:
      'Сначала просроченные, потом приоритетные, потом остальные по дате. Для слов стадий 1–2 показан перевод — само слово будет ответом карточки.',
    sectionToday: 'На сегодня · {words}',
    empty: 'На сегодня в очереди пусто — следующие слова появятся завтра.',
    stage: 'стадия {stage} · {label}',
    overdue: 'просрочено',
    priority: 'приоритет',
    due: 'по плану',
    prioritize: 'Приоритет',
    known: 'Уже знаю',
    knownDone: 'выучено',
    footer:
      'Приоритетные слова идут сразу после просроченных. «Уже знаю» убирает слово из очереди навсегда — вернуть его можно в словаре.',
  },
  en: {
    title: 'Queue',
    subtitle: 'The order the cards will come in',
    intro:
      'Overdue first, then priority, then the rest by date. For stage 1–2 words the translation is shown — the word itself is the answer of the card.',
    sectionToday: 'For today · {words}',
    empty: 'Nothing in the queue for today — the next words come tomorrow.',
    stage: 'stage {stage} · {label}',
    overdue: 'overdue',
    priority: 'priority',
    due: 'on schedule',
    prioritize: 'Priority',
    known: 'I know it',
    knownDone: 'learned',
    footer:
      'Priority words come right after the overdue ones. “I know it” takes the word out of the queue for good — you can bring it back in the dictionary.',
  },
});
