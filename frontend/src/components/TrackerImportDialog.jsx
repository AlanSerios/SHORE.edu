import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Download, FileSpreadsheet, History, Loader2, RotateCcw, Upload, X } from 'lucide-react';
import { PRETEST_BLUEPRINT, buildPretestRecord, normalizeTrackerHeader } from '../utils/assessmentBlueprint';

export default function TrackerImportDialog({
  open,
  draft,
  currentNames = [],
  busy = false,
  history = [],
  historyLoading = false,
  historyError = '',
  restoreBusy = false,
  onClose,
  onChooseFile,
  onDownloadTemplate,
  onImport,
  onLoadHistory,
  onRestore,
}) {
  const [mode, setMode] = useState('replace');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState('');
  const closeRef = useRef(null);
  const dialogRef = useRef(null);
  const busyRef = useRef(busy || restoreBusy);
  const onCloseRef = useRef(onClose);

  busyRef.current = busy || restoreBusy;
  onCloseRef.current = onClose;

  const records = useMemo(
    () => (draft?.rows || []).map(buildPretestRecord),
    [draft],
  );

  const uploadedNames = useMemo(() => new Set(records.map(record => normalizeTrackerHeader(record.name))), [records]);

  const removedCount = mode === 'replace'
    ? currentNames.filter(name => !uploadedNames.has(normalizeTrackerHeader(name))).length
    : 0;

  const hasErrors = Boolean(draft?.errors?.length);
  const importLocked = busy || restoreBusy;
  const canImport = Boolean(draft?.rows?.length) && !draft?.loading && !hasErrors && !importLocked && (mode !== 'replace' || removedCount === 0 || confirmReplace);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = event => {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onCloseRef.current?.();

        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter(element => element.offsetParent !== null);

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setMode('replace');
      setConfirmReplace(false);
    }
  }, [open, draft?.fileName]);

  const handleImport = () => onImport({ mode, confirmReplace: confirmReplace && mode === 'replace' });

  const toggleHistory = () => {
    const nextOpen = !historyOpen;
    setHistoryOpen(nextOpen);
    setPendingRestoreId('');

    if (nextOpen) onLoadHistory?.();
  };

  const handleRestore = async (backupId) => {
    const restored = await onRestore?.(backupId);

    if (restored) {
      setHistoryOpen(false);
      setPendingRestoreId('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onMouseDown={event => { if (event.target === event.currentTarget && !importLocked) onClose(); }}
        >
          <motion.section
            ref={dialogRef}
            role="dialog" aria-modal="true" aria-labelledby="tracker-import-title"
            className="flex max-h-[min(92dvh,850px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 12, scale: 0.99 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.99 }}
            transition={{ duration: 0.18 }}
          >
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileSpreadsheet className="h-5 w-5" /></span>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">Pre-test tracker</p>
                  <h2 id="tracker-import-title" className="mt-0.5 text-lg font-bold text-slate-950 sm:text-xl">Import student results</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">Upload the S5 monitoring sheet. The importer reads its 17 pre-test sections and ignores session quizzes and post-test columns.</p>
                </div>
              </div>
              <button ref={closeRef} type="button" onClick={onClose} disabled={importLocked} aria-label="Close tracker import" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{draft?.fileName || 'Choose a completed score sheet'}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Excel file · 4 test areas · 17 sections · 160 items</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={toggleHistory} disabled={importLocked} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"><History className="h-4 w-4" />{historyOpen ? 'Hide history' : 'Saved versions'}</button>
                  <button type="button" onClick={onDownloadTemplate} disabled={importLocked} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"><Download className="h-4 w-4" />Download template</button>
                  <button type="button" onClick={onChooseFile} disabled={importLocked || draft?.loading} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"><Upload className="h-4 w-4" />{draft ? 'Choose another' : 'Choose file'}</button>
                </div>
              </div>

              {historyOpen && (
                <section className="mt-4 rounded-xl border border-slate-200 p-4" aria-labelledby="tracker-history-title">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 id="tracker-history-title" className="text-sm font-bold text-slate-900">Saved tracker versions</h3>
                      <p className="mt-1 text-xs text-slate-600">The last 10 versions are kept. Restoring also saves the current version.</p>
                    </div>
                    <button type="button" onClick={onLoadHistory} disabled={historyLoading || restoreBusy} className="text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50">Refresh</button>
                  </div>

                  {historyLoading ? (
                    <p className="mt-3 flex items-center gap-2 text-xs text-slate-600" role="status"><Loader2 className="h-4 w-4 animate-spin" />Loading saved versions…</p>
                  ) : historyError ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800" role="alert">{historyError}</p>
                  ) : history.length ? (
                    <ul className="mt-3 divide-y divide-slate-100">
                      {history.map(version => (
                        <li key={version.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{version.label || version.filename || 'Tracker version'}</p>
                            <p className="mt-0.5 text-xs text-slate-600">{version.savedAt ? new Date(version.savedAt).toLocaleString() : 'Saved version'} · {version.recordCount || 0} records{version.mode ? ` · ${version.mode}` : ''}</p>
                            {version.diagnosticCount > 0 && <p className="mt-0.5 text-xs font-medium text-blue-800">{version.diagnosticCount} S5 pre-test results</p>}
                            {version.filename && <p className="mt-0.5 truncate text-[11px] text-slate-500">{version.filename}</p>}
                          </div>
                          {pendingRestoreId === version.id ? (
                            <div className="flex shrink-0 items-center gap-2">
                              <button type="button" onClick={() => setPendingRestoreId('')} disabled={restoreBusy} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
                              <button type="button" onClick={() => handleRestore(version.id)} disabled={restoreBusy} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{restoreBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}Restore version</button>
                            </div>
                          ) : (
                            <button type="button" onClick={() => setPendingRestoreId(version.id)} disabled={restoreBusy} className="min-h-9 shrink-0 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50">Restore</button>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">No saved versions yet. An existing tracker is saved here when the next import is published.</p>
                  )}
                </section>
              )}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {PRETEST_BLUEPRINT.map(domain => (
                  <div key={domain.name} className="rounded-xl border border-slate-200 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{domain.name}</p>
                      <span className="text-xs tabular-nums text-slate-500">{domain.maxScore} items</span>
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-600">{domain.subtopics.map(topic => `${topic.name} (${topic.maxScore})`).join(' · ')}</p>
                  </div>
                ))}
              </div>

              {draft && (
                <>
                  {draft.loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600" role="status"><Loader2 className="h-4 w-4 animate-spin" />Reading workbook…</p>}

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Review before saving</h3>
                      <p className="mt-1 text-xs text-slate-600">{draft.rows?.length || 0} scored students found{draft.sheetName ? ` in “${draft.sheetName}”` : ''}.</p>
                      {draft.skippedCount > 0 && <p className="mt-1 text-xs text-amber-800">{draft.skippedCount} named row{draft.skippedCount === 1 ? ' has' : 's have'} no diagnostic scores and will be skipped.</p>}
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1" role="group" aria-label="Import mode">
                      {[['replace', 'Replace results'], ['merge', 'Merge results']].map(([value, label]) => (
                        <button key={value} type="button" aria-pressed={mode === value} onClick={() => { setMode(value); setConfirmReplace(false); }} className={`min-h-9 rounded-md px-3 text-xs font-semibold transition-colors ${mode === value ? 'bg-white text-blue-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>{label}</button>
                      ))}
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {mode === 'merge'
                      ? 'Merge updates matching students and keeps existing results for students not in this file.'
                      : 'Replace updates the published pre-test results to match this file. The class registration roster is never changed.'}
                  </p>

                  {removedCount > 0 && mode === 'replace' && (
                    <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5" role="alert">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                        <div>
                          <p className="text-sm font-semibold text-amber-950">{removedCount} existing result{removedCount === 1 ? '' : 's'} will be removed.</p>
                          <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs leading-5 text-amber-900">
                            <input type="checkbox" checked={confirmReplace} onChange={event => setConfirmReplace(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-amber-500 text-blue-700 focus:ring-blue-600" />
                            <span>I reviewed the count and want to replace the published results.</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasErrors ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
                      <p className="text-sm font-bold text-red-900">Fix these rows before importing</p>
                      <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-xs leading-5 text-red-800">
                        {draft.errors.slice(0, 24).map((issue, index) => <li key={`${issue.row}-${index}`}><span className="font-semibold">{issue.row ? `Row ${issue.row}: ` : ''}{issue.name ? `${issue.name} — ` : ''}</span>{issue.message}</li>)}
                        {draft.errors.length > 24 && <li>And {draft.errors.length - 24} more issue(s).</li>}
                      </ul>
                    </div>
                  ) : records.length > 0 ? (
                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">Score preview</p>
                        <span className="text-xs text-slate-500">First {Math.min(records.length, 6)} of {records.length}</span>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-slate-500 shadow-[0_1px_0_#e2e8f0]">
                            <tr><th className="px-4 py-2.5">Student</th>{PRETEST_BLUEPRINT.map(domain => <th key={domain.name} className="px-3 py-2.5 text-right">{domain.name}</th>)}<th className="px-4 py-2.5 text-right">Total</th></tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {records.slice(0, 6).map(record => <tr key={record.name}>
                              <th scope="row" className="max-w-48 truncate px-4 py-3 font-semibold text-slate-900">{record.name}</th>
                              {PRETEST_BLUEPRINT.map(domain => <td key={domain.name} className="px-3 py-3 text-right tabular-nums text-slate-700">{record.subjects[domain.name]}/{domain.maxScore}</td>)}
                              <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-950">{record.total}/160</td>
                            </tr>)}
                          </tbody>
                        </table>
                      </div>
                      <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">Scores are correct answers per printed section. Enter 0 when there are no correct answers.</div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Choose the template or a workbook with the section scores printed in the current diagnostic.</div>
                  )}
                </>
              )}
            </div>

            <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <button type="button" onClick={onClose} disabled={importLocked} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50">Close</button>
              <button type="button" onClick={handleImport} disabled={!canImport} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Saving results…</> : <><Check className="h-4 w-4" />Import {records.length ? `${records.length} results` : 'results'}</>}
              </button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
