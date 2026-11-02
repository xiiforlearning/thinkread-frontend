import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ApiError,
  type ConfirmWord,
  ERR,
  type IntakeResult,
  type Report,
  type ReportPatch,
  type ReportType,
} from '../api/types';
import { useInvalidateReports, useProfile, useProgress, useToday } from '../app/hooks';
import { ErrorBox, Screen } from '../app/Shell';
import { useApi } from '../app/session';
import { common } from '../i18n/common';
import { submitReportDict } from '../i18n/screens/submitReport';
import { tr, useT } from '../i18n/t';
import { words } from '../lib/dates';
import { clarifyFieldLabel, methodShort } from '../lib/labels';
import { haptic } from '../telegram/webapp';
import {
  Badge,
  Button,
  Callout,
  Card,
  Cell,
  CheckRow,
  ListGroup,
  MainButton,
  TextArea,
  TextField,
} from '../ui/components';

/**
 * The corrections form keeps what the student typed as strings: a cleared number field stays
 * empty instead of snapping back to the parsed value (the «залипает на 2» bug), and only the
 * fields that differ from the report are sent on «Всё верно».
 */
type Draft = Partial<Record<keyof ReportPatch, string>>;
const NUMERIC: ReadonlySet<keyof ReportPatch> = new Set([
  'pages',
  'firstPassPct',
  'secondPassPct',
  'listenCount',
]);

function draftToPatch(draft: Draft, report: Report): ReportPatch {
  const patch: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(draft) as Array<[keyof ReportPatch, string | undefined]>) {
    if (v === undefined) continue;
    const text = v.trim();
    if (text === '') continue;
    const value = NUMERIC.has(k) ? Number(text) : text;
    if (NUMERIC.has(k) && !Number.isFinite(value)) continue;
    if (value !== (report as unknown as Record<string, unknown>)[k]) patch[k] = value;
  }
  return patch as ReportPatch;
}

type Confirm = Extract<IntakeResult, { status: 'CONFIRM_WORDS' }>;

type Step =
  | { kind: 'type' }
  | { kind: 'text'; type: ReportType }
  | { kind: 'clarify'; type: ReportType; draftId: string; question: string; fields: string[] }
  | {
      /**
       * The word list to confirm (customer decision 02.11.2026): the report is saved and counted
       * only on «Подтвердить». `excluded` = unticked words, `extra` = the list typed in addition,
       * `asked` = the student answered «Да, добавить» when no list was found.
       */
      kind: 'confirm';
      type: ReportType;
      confirm: Confirm;
      excluded: Set<string>;
      extra: string;
      asked: boolean;
    }
  | { kind: 'result'; type: ReportType; result: Extract<IntakeResult, { status: 'SAVED' }> };

/** "cloak — плащ, whisper" → the words the student typed on the confirmation screen. */
function parseExtra(text: string): ConfirmWord[] {
  const out: ConfirmWord[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const line = raw.replace(/^\s*\d+[.)]\s*/, '').trim();
    if (!line) continue;
    const [w, ...rest] = line.split(/\s+[—–-]\s+|\s*[—–]\s*|\s*[:=]\s*/);
    const word = w.trim();
    if (!/^[A-Za-z][A-Za-z'’ -]*$/.test(word)) continue;
    out.push({ word, translation: rest.join(' ').trim() || null });
  }
  return out;
}

/** The list that goes to the server: ticked words plus the typed ones, one per word. */
function chosenWords(step: Extract<Step, { kind: 'confirm' }>): ConfirmWord[] {
  const seen = new Set<string>();
  const out: ConfirmWord[] = [];
  const push = (w: ConfirmWord) => {
    const key = w.word.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(w);
  };
  for (const w of step.confirm.words)
    if (!w.duplicate && !step.excluded.has(w.word))
      push({ word: w.word, translation: w.translation });
  for (const w of parseExtra(step.extra)) push(w);
  return out;
}

type Key = keyof typeof submitReportDict.ru;
const HINT: Record<ReportType, Key> = { READING: 'hintReading', LISTENING: 'hintListening' };
const PLACEHOLDER: Record<ReportType, Key> = {
  READING: 'placeholderReading',
  LISTENING: 'placeholderListening',
};

/** 07 · Сдать отчёт — type → free text → (one clarification) → parsed result the student can correct. */
export function SubmitReportScreen() {
  const api = useApi();
  const [params] = useSearchParams();
  const profile = useProfile();
  const today = useToday();
  const progress = useProgress();
  const invalidate = useInvalidateReports();
  const t = useT(submitReportDict);
  const [step, setStep] = useState<Step>({ kind: 'type' });
  const [text, setText] = useState('');
  const [retell, setRetell] = useState('');
  const [edit, setEdit] = useState<Draft>({});

  useEffect(() => {
    const t = params.get('type');
    if ((t === 'READING' || t === 'LISTENING') && step.kind === 'type')
      setStep({ kind: 'text', type: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResult = (type: ReportType) => (r: IntakeResult) => {
    if (r.status === 'CLARIFY') {
      haptic('light');
      setStep({
        kind: 'clarify',
        type,
        draftId: r.draftId,
        question: r.question,
        fields: r.missingFields,
      });
    } else if (r.status === 'CONFIRM_WORDS') {
      haptic('light');
      setStep({ kind: 'confirm', type, confirm: r, excluded: new Set(), extra: '', asked: false });
    } else {
      haptic('success');
      invalidate();
      setEdit({});
      setStep({ kind: 'result', type, result: r });
    }
  };

  // A report in progress survives a reload: the server keeps the draft.
  const pending = useQuery({ queryKey: ['reports', 'draft'], queryFn: () => api.reports.draft() });
  useEffect(() => {
    const d = pending.data;
    if (!d || step.kind !== 'type') return;
    if (d.status === 'CONFIRM_WORDS') onResult(d.type)(d);
    else if (d.status === 'CLARIFY') {
      setStep({
        kind: 'clarify',
        type: 'LISTENING',
        draftId: d.draftId,
        question: d.question,
        fields: d.missingFields,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.data]);

  const submit = useMutation({
    mutationFn: (v: { type: ReportType; text: string }) => api.reports.submit(v.type, v.text),
    onSuccess: (r, v) => onResult(v.type)(r),
    onError: () => haptic('error'),
  });
  const clarify = useMutation({
    mutationFn: (v: { type: ReportType; draftId: string; text: string }) =>
      api.reports.clarify(v.draftId, v.text),
    onSuccess: (r, v) => onResult(v.type)(r),
    onError: () => haptic('error'),
  });
  const confirmWords = useMutation({
    mutationFn: (v: { type: ReportType; draftId: string; words: ConfirmWord[] }) =>
      api.reports.confirm(v.draftId, v.words),
    onSuccess: (r, v) => onResult(v.type)(r),
    onError: () => haptic('error'),
  });
  const discard = useMutation({ mutationFn: (draftId: string) => api.reports.discard(draftId) });
  const patch = useMutation({
    mutationFn: (v: { id: string; patch: ReportPatch }) => api.reports.patch(v.id, v.patch),
    onSuccess: () => {
      haptic('success');
      invalidate();
    },
  });

  const busy = submit.isPending || clarify.isPending || confirmWords.isPending;
  const error = submit.error ?? clarify.error;
  const dailyLimit = error instanceof ApiError && error.errorCode === ERR.DAILY_LIMIT;
  const tooLong =
    error instanceof ApiError && error.errorCode === ERR.REPORT_TOO_LONG
      ? (error.details as { max?: number; got?: number } | undefined)
      : null;
  const week = progress.data?.week;
  const method = profile.data ? methodShort(profile.data.listeningMethod) : '';

  const title =
    step.kind === 'type'
      ? t('titleSubmit')
      : step.kind === 'text'
        ? step.type === 'READING'
          ? t('reading')
          : t('listening')
        : step.kind === 'clarify'
          ? t('titleClarify')
          : step.kind === 'confirm'
            ? t('titleConfirm')
            : t('titleResult');

  /** «Назад к отчёту»: the draft is dropped on the server, the text stays in the form. */
  const backToReport = (step: Extract<Step, { kind: 'confirm' }>) => {
    discard.mutate(step.confirm.draftId);
    setStep({ kind: 'text', type: step.type });
  };

  const bottom =
    step.kind === 'text' ? (
      <MainButton
        disabled={text.trim().length < 5 || busy}
        loading={submit.isPending}
        onClick={() => submit.mutate({ type: step.type, text: text.trim() })}
      >
        {busy ? t('parsing') : tr(common, 'send')}
      </MainButton>
    ) : step.kind === 'clarify' ? (
      <MainButton
        disabled={retell.trim().length < 1 || busy}
        loading={clarify.isPending}
        onClick={() =>
          clarify.mutate({ type: step.type, draftId: step.draftId, text: retell.trim() })
        }
      >
        {busy ? t('parsing') : t('sendAnswer')}
      </MainButton>
    ) : step.kind === 'confirm' ? (
      (() => {
        const chosen = chosenWords(step);
        // No list and the question not answered yet: the two buttons live in the callout.
        if (!step.confirm.hasList && !step.asked) return null;
        return (
          <MainButton
            disabled={busy}
            loading={confirmWords.isPending}
            onClick={() =>
              confirmWords.mutate({
                type: step.type,
                draftId: step.confirm.draftId,
                words: chosen,
              })
            }
          >
            {busy ? t('confirming') : chosen.length ? t('confirmBtn') : t('confirmNoWordsBtn')}
          </MainButton>
        );
      })()
    ) : step.kind === 'result' ? (
      <MainButton icon="check" to="/reports" onClick={() => savePatch(step.result.report)}>
        {t('allCorrect')}
      </MainButton>
    ) : null;

  function savePatch(report: Report) {
    const changed = draftToPatch(edit, report);
    if (Object.keys(changed).length) patch.mutate({ id: report.id, patch: changed });
  }

  return (
    <Screen
      back={
        step.kind === 'type' || step.kind === 'result'
          ? '/reports'
          : step.kind === 'text'
            ? () => setStep({ kind: 'type' })
            : step.kind === 'confirm'
              ? () => backToReport(step)
              : () => setStep({ kind: 'text', type: step.type })
      }
      bottom={bottom}
    >
      <h1 className="tr-h1-sm">{title}</h1>

      {step.kind === 'type' ? (
        <>
          <ListGroup header={t('whatHeader')} footer={t('whatFooter')}>
            <Cell
              tileIcon="book"
              tileTone="brand"
              title={t('reading')}
              subtitle={today.data?.READING ? t('doneToday') : t('readingSub')}
              badge={today.data?.READING ? t('doneBadge') : undefined}
              badgeTone="good"
              norms={
                !today.data?.READING && week
                  ? `${week.reading.done}/${week.reading.norm}`
                  : undefined
              }
              chevron={!today.data?.READING}
              onClick={
                today.data?.READING ? undefined : () => setStep({ kind: 'text', type: 'READING' })
              }
            />
            <Cell
              tileIcon="headphones"
              tileTone="listen"
              title={t('listening')}
              subtitle={
                today.data?.LISTENING
                  ? t('doneToday')
                  : `${method ? method.charAt(0).toUpperCase() + method.slice(1) : t('byLevelMethod')}`
              }
              badge={today.data?.LISTENING ? t('doneBadge') : undefined}
              badgeTone="good"
              norms={
                !today.data?.LISTENING && week
                  ? `${week.listening.done}/${week.listening.norm}`
                  : undefined
              }
              chevron={!today.data?.LISTENING}
              onClick={
                today.data?.LISTENING
                  ? undefined
                  : () => setStep({ kind: 'text', type: 'LISTENING' })
              }
            />
          </ListGroup>
          <ListGroup header={t('countsHeader')}>
            <Cell
              tileIcon="check"
              tileTone="good"
              tileSize="sm"
              title={t('countsDesc')}
              subtitle={t('countsDescSub')}
            />
            <Cell
              tileIcon="plus"
              tileTone="cards"
              tileSize="sm"
              title={t('countsWords')}
              subtitle={t('countsWordsSub')}
            />
            <Cell
              tileIcon="edit"
              tileTone="brand"
              tileSize="sm"
              title={t('countsEdit')}
              subtitle={t('countsEditSub')}
            />
          </ListGroup>
        </>
      ) : null}

      {step.kind === 'text' ? (
        <>
          {busy ? (
            <Callout tone="info" icon="spinner" title={t('parsingTitle')}>
              {t('parsingBody')}
            </Callout>
          ) : null}
          {dailyLimit ? (
            <Callout tone="warn" title={t('limitTitle')}>
              {t('limitBody')}
            </Callout>
          ) : tooLong ? (
            <Callout tone="warn" title={t('tooLongTitle')}>
              {t('tooLongBody', { max: tooLong.max ?? 1500, got: tooLong.got ?? text.length })}
            </Callout>
          ) : error ? (
            <ErrorBox error={error} />
          ) : null}
          <Card>
            <TextArea
              label={step.type === 'LISTENING' ? t('labelListening') : t('labelReading')}
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t(PLACEHOLDER[step.type])}
              hint={t(HINT[step.type])}
              disabled={busy}
            />
            {step.type === 'LISTENING' ? (
              <div>
                <Button variant="ghost" size="sm" icon="headphones" to="/reports/method">
                  {t('remindMethod')}
                </Button>
              </div>
            ) : null}
          </Card>
          <Button
            variant="ghost"
            size="md"
            disabled={busy}
            onClick={() => setStep({ kind: 'type' })}
          >
            {t('backToChoice')}
          </Button>
        </>
      ) : null}

      {step.kind === 'clarify' ? (
        <>
          {busy ? (
            <Callout tone="info" icon="spinner" title={t('parsingTitle')}>
              {t('parsingBody')}
            </Callout>
          ) : null}
          <Callout tone="brand" icon="chat">
            {step.question}
          </Callout>
          {error && !busy ? <ErrorBox error={error} /> : null}
          <Card>
            <TextArea
              label={step.fields.map((f) => clarifyFieldLabel(f)).join(', ') || t('answer')}
              rows={5}
              value={retell}
              onChange={(e) => setRetell(e.target.value)}
              placeholder={
                step.fields.includes('retelling')
                  ? 'The episode was about… The hosts said that…'
                  : t('answerPlaceholder')
              }
              disabled={busy}
            />
          </Card>
        </>
      ) : null}

      {step.kind === 'confirm' ? (
        <ConfirmView
          step={step}
          setStep={setStep}
          busy={busy}
          error={confirmWords.error}
          onBack={() => backToReport(step)}
          onNoWords={() =>
            confirmWords.mutate({ type: step.type, draftId: step.confirm.draftId, words: [] })
          }
        />
      ) : null}

      {step.kind === 'result' ? (
        <ResultView result={step.result} edit={edit} setEdit={setEdit} />
      ) : null}
    </Screen>
  );
}

/** The word list of the report with checkboxes, like the import preview; or «Есть новые слова?». */
function ConfirmView({
  step,
  setStep,
  busy,
  error,
  onBack,
  onNoWords,
}: {
  step: Extract<Step, { kind: 'confirm' }>;
  setStep: (s: Step) => void;
  busy: boolean;
  error: unknown;
  onBack: () => void;
  onNoWords: () => void;
}) {
  const t = useT(submitReportDict);
  const c = step.confirm;
  const minWords =
    error instanceof ApiError && error.errorCode === ERR.WORDS_REQUIRED
      ? ((error.details as { minWords?: number } | undefined)?.minWords ?? c.minWords)
      : null;
  const duplicates = c.words.filter((w) => w.duplicate).length;
  const showInput = step.asked || step.extra.length > 0;
  return (
    <>
      {c.hasList ? (
        <Callout tone="brand" title={t('confirmFound', { words: words(c.words.length) })}>
          {duplicates ? t('confirmDuplicates', { n: duplicates }) : ''}
          {c.dropped ? t('confirmDropped', { n: c.dropped, max: c.maxWords }) : ''}
          {t('confirmFoundBody')}
        </Callout>
      ) : !step.asked ? (
        <Callout tone="brand" icon="chat" title={t('confirmNoListTitle')}>
          {t('confirmNoListBody')}
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              icon="plus"
              disabled={busy}
              onClick={() => setStep({ ...step, asked: true })}
            >
              {t('yesWordsBtn')}
            </Button>
            <Button variant="secondary" size="md" disabled={busy} onClick={onNoWords}>
              {t('noWordsBtn')}
            </Button>
          </div>
        </Callout>
      ) : null}
      {minWords !== null ? (
        <Callout tone="warn" title={t('minWordsTitle', { n: minWords })}>
          {t('minWordsBody', { n: minWords })}
        </Callout>
      ) : error ? (
        <ErrorBox error={error} />
      ) : null}
      {c.hasList ? (
        <ListGroup header={t('wordsList')}>
          {c.words.map((it) => (
            <CheckRow
              key={it.word}
              checked={!it.duplicate && !step.excluded.has(it.word)}
              disabled={it.duplicate || busy}
              onChange={(v) => {
                const excluded = new Set(step.excluded);
                if (v) excluded.delete(it.word);
                else excluded.add(it.word);
                setStep({ ...step, excluded });
              }}
              title={it.word}
              subtitle={it.translation ?? t('translationByAi')}
              badge={it.duplicate ? t('alreadyHave') : undefined}
              badgeTone="neutral"
            />
          ))}
        </ListGroup>
      ) : null}
      {showInput ? (
        <Card>
          <TextArea
            label={t('addMoreLabel')}
            rows={5}
            value={step.extra}
            onChange={(e) => setStep({ ...step, extra: e.target.value })}
            placeholder={t('addMorePlaceholder')}
            hint={t('addMoreHint')}
            disabled={busy}
          />
        </Card>
      ) : c.hasList ? (
        <div>
          <Button
            variant="ghost"
            size="sm"
            icon="plus"
            disabled={busy}
            onClick={() => setStep({ ...step, asked: true })}
          >
            {t('addMore')}
          </Button>
        </div>
      ) : null}
      <Button variant="ghost" size="md" disabled={busy} onClick={onBack}>
        {t('backToReport')}
      </Button>
    </>
  );
}

function ResultView({
  result,
  edit,
  setEdit,
}: {
  result: Extract<IntakeResult, { status: 'SAVED' }>;
  edit: Draft;
  setEdit: (p: Draft) => void;
}) {
  const t = useT(submitReportDict);
  const r = result.report;
  const listening = r.type === 'LISTENING';
  const w = result.weekProgress;
  const added = result.words.added;
  const plus = added.length ? `, +${words(added.length)}` : '';
  const head = listening
    ? t('headListening', { done: w.listening.done, norm: w.listening.norm, plus })
    : t('headReading', { done: w.reading.done, norm: w.reading.norm, plus });
  /** What the field shows: the student's draft once touched, else the parsed value. */
  const shown = (k: keyof ReportPatch, parsed: string | number | null): string =>
    edit[k] ?? (parsed === null ? '' : String(parsed));
  return (
    <>
      <Callout tone="good" icon="check" title={head}>
        {t('resultBody')}
      </Callout>
      <Card title={t('resultCard')}>
        <TextField
          label={listening ? t('source') : t('book')}
          value={shown('sourceTitle', r.sourceTitle)}
          onChange={(e) => setEdit({ ...edit, sourceTitle: e.target.value })}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          {listening ? (
            <>
              <TextField
                label={t('pct')}
                type="number"
                inputMode="numeric"
                value={shown('firstPassPct', r.firstPassPct)}
                onChange={(e) => setEdit({ ...edit, firstPassPct: e.target.value })}
                style={{ flex: '1 1 0' }}
              />
              <TextField
                label={t('listens')}
                type="number"
                inputMode="numeric"
                value={shown('listenCount', r.listenCount)}
                onChange={(e) => setEdit({ ...edit, listenCount: e.target.value })}
                style={{ flex: '1 1 0' }}
              />
            </>
          ) : (
            <>
              <TextField
                label={t('pages')}
                type="number"
                inputMode="numeric"
                value={shown('pages', r.pages)}
                onChange={(e) => setEdit({ ...edit, pages: e.target.value })}
                style={{ flex: '1 1 0' }}
              />
              <TextField
                label={t('about')}
                value={shown('summary', r.summary)}
                onChange={(e) => setEdit({ ...edit, summary: e.target.value })}
                style={{ flex: '2 1 0' }}
              />
            </>
          )}
        </div>
        <span className="tr-field-label">
          {added.length
            ? t('wordsAdded')
            : result.words.alreadyHad.length
              ? t('wordsHad')
              : r.noNewWords
                ? t('noNewWordsMark')
                : t('wordsNone')}
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {added.map((x) => (
            <Badge key={x} tone="brand">
              {x}
            </Badge>
          ))}
          {result.words.alreadyHad.map((x) => (
            <Badge key={`had-${x}`} tone="neutral">
              {x}
            </Badge>
          ))}
        </div>
      </Card>
      <Button variant="secondary" size="md" block icon="book" to="/words">
        {t('seeWords')}
      </Button>
    </>
  );
}
