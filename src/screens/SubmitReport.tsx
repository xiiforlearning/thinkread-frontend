import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ApiError,
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

type Step =
  | { kind: 'type' }
  | { kind: 'text'; type: ReportType }
  | { kind: 'clarify'; type: ReportType; draftId: string; question: string; fields: string[] }
  | { kind: 'result'; type: ReportType; result: Extract<IntakeResult, { status: 'SAVED' }> };

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
    } else {
      haptic('success');
      invalidate();
      setEdit({});
      setStep({ kind: 'result', type, result: r });
    }
  };

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
  const patch = useMutation({
    mutationFn: (v: { id: string; patch: ReportPatch }) => api.reports.patch(v.id, v.patch),
    onSuccess: () => {
      haptic('success');
      invalidate();
    },
  });

  const busy = submit.isPending || clarify.isPending;
  const error = submit.error ?? clarify.error;
  const dailyLimit = error instanceof ApiError && error.errorCode === ERR.DAILY_LIMIT;
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
          : t('titleResult');

  const bottom =
    step.kind === 'text' ? (
      <MainButton
        disabled={text.trim().length < 5 || busy}
        onClick={() => submit.mutate({ type: step.type, text: text.trim() })}
      >
        {busy ? t('parsing') : tr(common, 'send')}
      </MainButton>
    ) : step.kind === 'clarify' ? (
      <MainButton
        disabled={retell.trim().length < 1 || busy}
        onClick={() =>
          clarify.mutate({ type: step.type, draftId: step.draftId, text: retell.trim() })
        }
      >
        {busy ? t('parsing') : t('sendAnswer')}
      </MainButton>
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

      {step.kind === 'result' ? (
        <ResultView result={step.result} edit={edit} setEdit={setEdit} />
      ) : null}
    </Screen>
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
