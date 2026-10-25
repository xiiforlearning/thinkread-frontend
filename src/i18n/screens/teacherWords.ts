import { defineDict } from '../t';

export const teacherWordsDict = defineDict({
  ru: {
    adding: 'Добавляю…',
    addN: 'Добавить {n}',
    toDictionary: 'В словарь',
    openDictionary: 'Открыть словарь',
    eyebrow: 'Рекомендовано учителем',
    title: 'Слова от учителя',
    teacher: 'Рустам',
    forGroup: 'для группы {group}',
    missingWords: '{words}, которых у тебя нет',
    noNewTitle: 'Новых слов нет',
    noNewText: 'Все слова из списков учителя уже в твоём словаре — или списков пока нет.',
    optionalText:
      'Это не обязательный импорт: ты сам решаешь, что добавить. Добавленные слова получат приоритет и пойдут в карточки сразу после просроченных.',
    notInDictionary: 'Нет в твоём словаре · {n}',
    listFooter: 'Слова из списка, которые у тебя уже есть, не трогаем — стадии сохраняются.',
    translationByAi: 'перевод подберёт AI',
    hideList: 'Скрыть этот список',
    addedTitle: 'Добавлено {words}',
    addedText:
      'Все со статусом «изучается», стадия 1, с приоритетом. Первые появятся в карточках уже сегодня.',
    reviewNow: 'Повторить сейчас',
    hiddenTitle: 'Список скрыт',
    hiddenText:
      'Больше не будем его предлагать. Рустам увидит, что ты его не добавил. Слова всегда можно добавить вручную в словаре.',
  },
  en: {
    adding: 'Adding…',
    addN: 'Add {n}',
    toDictionary: 'To dictionary',
    openDictionary: 'Open dictionary',
    eyebrow: 'Recommended by the teacher',
    title: 'Words from the teacher',
    teacher: 'Rustam',
    forGroup: 'for group {group}',
    missingWords: "{words} you don't have",
    noNewTitle: 'No new words',
    noNewText:
      "All the words from the teacher's lists are already in your dictionary — or there are no lists yet.",
    optionalText:
      'This is not a mandatory import: you decide what to add. Added words get priority and come up in cards right after the overdue ones.',
    notInDictionary: 'Not in your dictionary · {n}',
    listFooter: 'Words from the list you already have are left alone — their stages are kept.',
    translationByAi: 'AI will add the translation',
    hideList: 'Hide this list',
    addedTitle: 'Added {words}',
    addedText:
      'All marked “learning”, stage 1, with priority. The first ones come up in cards today.',
    reviewNow: 'Review now',
    hiddenTitle: 'List hidden',
    hiddenText:
      "We won't suggest it again. Rustam will see that you didn't add it. You can always add words by hand in the dictionary.",
  },
});
