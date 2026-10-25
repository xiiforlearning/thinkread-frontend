import { defineDict } from '../t';

export const outsideTelegramDict = defineDict({
  ru: {
    title: 'ThinkRead живёт в Telegram',
    body: 'Отчёты, словарь и карточки открываются из бота школы: он узнаёт студента по аккаунту Telegram, в обычном браузере войти нельзя.',
    open: 'Открыть в Telegram',
    step1: 'Вступите в группу',
    step1Sub: 'Ссылку на группу даёт школа',
    step2: 'Нажмите «Открыть ThinkRead»',
    step2SubBot: 'Кнопка меню в чате с @{bot}',
    step2SubNoBot: 'Кнопка меню в чате с ботом',
    forStaff: 'Учителю и владельцу —',
    dashboard: 'дашборд',
    tryWithoutLogin: 'Посмотреть интерфейс без входа:',
  },
  en: {
    title: 'ThinkRead lives in Telegram',
    body: 'Reports, dictionary and cards open from the school’s bot: it knows the student by their Telegram account, so you cannot sign in from a plain browser.',
    open: 'Open in Telegram',
    step1: 'Join the group',
    step1Sub: 'The school gives you the group link',
    step2: 'Tap “Open ThinkRead”',
    step2SubBot: 'The menu button in the chat with @{bot}',
    step2SubNoBot: 'The menu button in the chat with the bot',
    forStaff: 'Teachers and the owner —',
    dashboard: 'dashboard',
    tryWithoutLogin: 'See the interface without signing in:',
  },
});
