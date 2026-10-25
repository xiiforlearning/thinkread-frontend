import { defineDict } from '../t';

export const staffDict = defineDict({
  ru: {
    openDashboard: 'Открыть дашборд',
    ownerTitle: 'Вы владелец школы',
    teacherTitle: 'Вы учитель',
    body: 'Это приложение для студентов: отчёты, словарь, карточки. Ваш инструмент — дашборд: обзор недели, студенты, флаги, группы{settings}.',
    settingsSuffix: ', настройки',
    step1: 'Кнопка внизу',
    step1Sub: 'Вход через Telegram уже выполнен',
    step2: 'На компьютере удобнее',
    step2Sub: 'Тот же адрес + /admin.html',
    footer:
      'Если вы ещё и учитесь в одной из групп, попросите владельца добавить вас как студента.',
  },
  en: {
    openDashboard: 'Open the dashboard',
    ownerTitle: 'You are the school owner',
    teacherTitle: 'You are a teacher',
    body: 'This app is for students: reports, dictionary, cards. Your tool is the dashboard: the week’s overview, students, flags, groups{settings}.',
    settingsSuffix: ', settings',
    step1: 'The button below',
    step1Sub: 'You are already signed in through Telegram',
    step2: 'Easier on a computer',
    step2Sub: 'The same address + /admin.html',
    footer: 'If you also study in one of the groups, ask the owner to add you as a student.',
  },
});
