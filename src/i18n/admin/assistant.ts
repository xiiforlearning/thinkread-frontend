import { defineDict } from '../t';

export const assistantDict = defineDict({
  ru: {
    promptBehindReading: 'Кто отстаёт по чтению?',
    promptBehindListening: 'Кто отстаёт по аудированию?',
    promptCompareGroups: 'Сравни группы',
    promptWeekSummary: 'Итоги недели',
    promptNewFlags: 'У кого новые пометки?',
    promptBehindMyGroups: 'Кто отстаёт в моих группах?',
    title: 'AI по школе',
    subtitleOwner:
      'Вопросы по всем студентам и группам. Цифры считает система, AI только объясняет.',
    subtitleTeacher: 'Вопросы по вашим группам. Цифры считает система, AI только объясняет.',
    ask: 'Спросить',
    askMeta: 'последние 4 недели · ничего не сохраняется',
    whatItDoes: 'Что умеет',
    whatItDoesText:
      'Кто отстаёт и по чему, сравнение групп, итоги недели, у кого появились пометки. AI видит только посчитанные факты: нормы по неделям, здоровье, словарь, количество флагов. Тексты отчётов ему не передаются.',
    you: 'Вы',
    aiSchool: 'AI · по данным школы',
    aiGroups: 'AI · по вашим группам',
    gatheringSchool: 'Собираю факты по школе…',
    gatheringGroups: 'Собираю факты по группам…',
    placeholder: 'Например: кто отстаёт по чтению на этой неделе?',
  },
  en: {
    promptBehindReading: 'Who is behind on reading?',
    promptBehindListening: 'Who is behind on listening?',
    promptCompareGroups: 'Compare the groups',
    promptWeekSummary: 'Week summary',
    promptNewFlags: 'Who has new flags?',
    promptBehindMyGroups: 'Who is behind in my groups?',
    title: 'School AI',
    subtitleOwner:
      'Questions about all students and groups. The system does the counting, AI only explains.',
    subtitleTeacher: 'Questions about your groups. The system does the counting, AI only explains.',
    ask: 'Ask',
    askMeta: 'last 4 weeks · nothing is stored',
    whatItDoes: 'What it can do',
    whatItDoesText:
      'Who is behind and on what, group comparison, the week summary, who got new flags. AI sees only computed facts: weekly norms, health, dictionary, flag counts. Report texts are not passed to it.',
    you: 'You',
    aiSchool: "AI · on the school's data",
    aiGroups: 'AI · on your groups',
    gatheringSchool: 'Gathering facts about the school…',
    gatheringGroups: 'Gathering facts about the groups…',
    placeholder: 'For example: who is behind on reading this week?',
  },
});
