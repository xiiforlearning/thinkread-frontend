import { defineDict } from '../t';

/** The sign-in screen and the session's developer-token errors. */
export const loginDict = defineDict({
  ru: {
    title: 'ThinkRead · Дашборд',
    meta: 'для владельца и учителей',
    intro:
      'Вход через Telegram: пускаем только владельца школы и учителей (админов групп с подписью teacher). Студентам сюда не нужно — у них Mini App.',
    codeLabel: 'Код из Telegram',
    codeSent: 'Код отправлен владельцу в Telegram, действует до {time}.',
    codeHint:
      'Владелец: нажмите «Прислать код», бот напишет вам в Telegram. Учитель: напишите боту любое сообщение — он ответит кодом.',
    signIn: 'Войти',
    resendCode: 'Прислать ещё раз',
    sendCode: 'Прислать код в Telegram',
    devToken: 'Войти по токену разработчика',
    nameLabel: 'Как вас показывать',
    namePlaceholder: 'Рустам',
    apiSameOrigin: 'тот же адрес, что и страница',
    build: 'сборка {build}',
    demoOwner: 'Демо: владелец',
    demoTeacher: 'Демо: учитель',
    demoNote: 'Демо работает на данных из макета, без сервера.',
    noJwt: 'Не нашёл JWT в тексте: нужен токен вида xxx.yyy.zzz из `pnpm dev:token owner`.',
    noStaffRole:
      'В токене нет роли OWNER или TEACHER (роли: {roles}). Токен владельца даёт `pnpm dev:token owner`, учителя — `pnpm dev:token teacher <telegram id>`.',
    rolesUnread: 'не прочитаны',
    ownerName: 'Владелец',
    teacherName: 'Учитель',
  },
  en: {
    title: 'ThinkRead · Dashboard',
    meta: 'for the owner and teachers',
    intro:
      'Sign in via Telegram: only the school owner and teachers (group admins with the title “teacher”) are let in. Students do not need this — they have the Mini App.',
    codeLabel: 'Code from Telegram',
    codeSent: 'The code has been sent to the owner in Telegram; it is valid until {time}.',
    codeHint:
      'Owner: press “Send code” and the bot will message you in Telegram. Teacher: write anything to the bot — it will reply with a code.',
    signIn: 'Sign in',
    resendCode: 'Send again',
    sendCode: 'Send code to Telegram',
    devToken: 'Sign in with a developer token',
    nameLabel: 'How to show your name',
    namePlaceholder: 'Rustam',
    apiSameOrigin: 'same address as the page',
    build: 'build {build}',
    demoOwner: 'Demo: owner',
    demoTeacher: 'Demo: teacher',
    demoNote: 'The demo runs on the design mock-up data, without a server.',
    noJwt:
      'No JWT found in the text: a token like xxx.yyy.zzz from `pnpm dev:token owner` is needed.',
    noStaffRole:
      'The token has no OWNER or TEACHER role (roles: {roles}). `pnpm dev:token owner` gives the owner token, `pnpm dev:token teacher <telegram id>` a teacher one.',
    rolesUnread: 'not readable',
    ownerName: 'Owner',
    teacherName: 'Teacher',
  },
});
