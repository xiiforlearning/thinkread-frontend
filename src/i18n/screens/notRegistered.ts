import { defineDict } from '../t';

export const notRegisteredDict = defineDict({
  ru: {
    checkAgain: 'Проверить снова',
    closedTitle: 'Доступ закрыт',
    noAccessTitle: 'Пока нет доступа',
    archivedBody:
      'Твой аккаунт в архиве: ты больше не состоишь ни в одной учебной группе. Если это ошибка — напиши Рустаму.',
    notMemberBody:
      'ThinkRead работает для студентов групп Рустама. Мы не нашли тебя ни в одной учебной группе в Telegram.',
    step1: 'Вступи в группу своего уровня',
    step1Sub: 'Ссылку даёт Рустам',
    step2: 'Нажми «Проверить снова»',
    step2Sub: 'Мы сразу увидим тебя в группе',
    footer: 'Если ты уже учишься у Рустама, а группы нет — напиши ему, он добавит тебя вручную.',
  },
  en: {
    checkAgain: 'Check again',
    closedTitle: 'Access closed',
    noAccessTitle: 'No access yet',
    archivedBody:
      'Your account is archived: you are no longer in any study group. If that is a mistake, message Rustam.',
    notMemberBody:
      'ThinkRead is for students of Rustam’s groups. We could not find you in any study group on Telegram.',
    step1: 'Join the group of your level',
    step1Sub: 'Rustam gives you the link',
    step2: 'Tap “Check again”',
    step2Sub: 'We will see you in the group right away',
    footer:
      'If you already study with Rustam but there is no group, message him and he will add you by hand.',
  },
});
