import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera, Check, ChevronDown, Circle, Loader2, Pencil, RefreshCw, Save, X } from 'lucide-react';

const FALLBACK_SCHOOLS = [
  { id: 'ustp', name: 'USTP' },
  { id: 'cmu', name: 'CMU' },
  { id: 'buksu', name: 'BukSU' },
  { id: 'msu', name: 'MSU' },
  { id: 'msuiit', name: 'MSU-IIT' },
  { id: 'msun', name: 'MSU at Naawan' },
  { id: 'xavier', name: 'Xavier University' },
  { id: 'liceo', name: 'Liceo de Cagayan' },
  { id: 'phinma_coc', name: 'PHINMA COC' },
  { id: 'city_cdo', name: 'City College of CDO' },
  { id: 'capitol', name: 'Capitol University' },
  { id: 'lourdes', name: 'Lourdes College' },
  { id: 'undecided', name: 'Still Deciding' },
  { id: 'other', name: 'Other School' },
];

const FALLBACK_SCHOLARSHIPS = [
  { id: 'dost-sei-undergrad', title: 'DOST-SEI S&T Undergraduate Scholarship' },
  { id: 'ched-merit-program', title: 'CHED State & Private Merit Scholarship' },
  { id: 'sm-college-scholarship', title: 'SM Foundation College Scholarship' },
  { id: 'aboitiz-future-leaders', title: 'Aboitiz Future Leaders College Scholarship' },
  { id: 'owwa-edsp-odsp', title: 'OWWA Education for Development Scholarship' },
  { id: 'landbank-gawad-patnubay', title: 'Landbank Gawad Patnubay Scholarship' },
  { id: 'city-cdo-scholarship', title: 'CDO City Scholarship Program' },
  { id: 'undecided', title: 'Still Deciding' },
  { id: 'other', title: 'Other Scholarship' },
];

const APPLICATION_STAGES = [
  ['exploring', 'Exploring Options'],
  ['preparing', 'Preparing Requirements'],
  ['applied', 'Already Applied'],
  ['waiting', 'Waiting for an Exam or Results'],
];

const INCOME_RANGES = [
  ['under_10k', 'Below ₱10,000'],
  ['10k_20k', '₱10,000–₱19,999'],
  ['20k_40k', '₱20,000–₱39,999'],
  ['40k_60k', '₱40,000–₱59,999'],
  ['60k_plus', '₱60,000 or more'],
  ['prefer_not_to_say', 'Prefer not to say'],
];

const EMPTY_PREFERENCES = {
  schoolInterests: [],
  otherSchool: '',
  scholarshipInterests: [],
  otherScholarship: '',
  intendedProgram: '',
  applicationStage: '',
  householdIncomeRange: '',
};

const normalizePreferences = (preferences = {}) => ({
  ...EMPTY_PREFERENCES,
  ...preferences,
  schoolInterests: Array.isArray(preferences.schoolInterests) ? preferences.schoolInterests : [],
  scholarshipInterests: Array.isArray(preferences.scholarshipInterests) ? preferences.scholarshipInterests : [],
  otherSchool: preferences.otherSchool || '',
  otherScholarship: preferences.otherScholarship || '',
  intendedProgram: preferences.intendedProgram || '',
  applicationStage: preferences.applicationStage || '',
  householdIncomeRange: preferences.householdIncomeRange || '',
});

const removeSpecialOptions = (items, type) => {
  const seen = new Set();

  const specialTitles = type === 'school'
    ? new Set(['still deciding', 'other school'])
    : new Set(['still deciding', 'other scholarship']);

  return (Array.isArray(items) ? items : []).filter((item) => {
    const id = String(item?.id || '').trim().toLowerCase();
    const title = String(item?.name || item?.title || '').trim().replace(/\s+/g, ' ').toLowerCase();

    if (!id || id === 'undecided' || id === 'other' || specialTitles.has(title) || seen.has(id)) return false;

    seen.add(id);

    return true;
  });
};

function ChoiceList({ label, name, options, values, onToggle, disabled, description }) {
  const undecided = options.find((option) => option.id === 'undecided');
  const regularOptions = options.filter((option) => option.id !== 'undecided');

  const renderChoice = (option) => {
    const checked = values.includes(option.id);
    const id = `${name}-${option.id}`;

    return (
      <label
        key={option.id}
        htmlFor={id}
        className={`${option.id === 'other' ? 'sm:col-span-2' : ''} flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm leading-5 transition-[border-color,background-color] duration-150 focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-1 ${checked ? 'border-primary/60 bg-primary/5' : 'border-border/80 bg-background hover:border-primary/45 hover:bg-primary/[0.035]'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={() => onToggle(name, option.id)}
          className="h-4 w-4 shrink-0 accent-primary"
        />
        <span className="min-w-0">{option.name}</span>
      </label>
    );
  };

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-semibold text-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {regularOptions.map((option) => renderChoice(option))}
      </div>
      {undecided && (
        <div className="space-y-1.5">
          {renderChoice(undecided)}
          <p className="pl-1 text-xs leading-4 text-muted-foreground">{description}</p>
        </div>
      )}
      {!undecided && <p className="text-xs leading-4 text-muted-foreground">{description}</p>}
    </fieldset>
  );
}

export default function StudentProfileGoals({ profilePicture, onAddPhoto }) {
  const [preferences, setPreferences] = useState(null);
  const [draft, setDraft] = useState(null);
  const [schools, setSchools] = useState(FALLBACK_SCHOOLS);
  const [scholarships, setScholarships] = useState(FALLBACK_SCHOLARSHIPS);
  const [loadStatus, setLoadStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError('');

    try {
      const [preferencesResponse, optionsResponse] = await Promise.all([
        fetch('/api/users/me/onboarding'),
        fetch('/api/onboarding/options').catch(() => null),
      ]);

      const preferencesResult = await preferencesResponse.json().catch(() => ({}));

      if (!preferencesResponse.ok) {
        throw new Error(preferencesResult.error || 'Could not load your saved study plans.');
      }

      const nextPreferences = normalizePreferences(preferencesResult.preferences);
      setPreferences(nextPreferences);
      setDraft(nextPreferences);

      if (optionsResponse?.ok) {
        const options = await optionsResponse.json().catch(() => ({}));

        if (Array.isArray(options.schools) && options.schools.length) {
          const regularSchools = removeSpecialOptions(options.schools, 'school');

          setSchools([
            ...(regularSchools.length ? regularSchools : FALLBACK_SCHOOLS.filter((item) => !['undecided', 'other'].includes(item.id))),
            { id: 'undecided', name: 'Still Deciding' },
            { id: 'other', name: 'Other School' },
          ]);
        }

        if (Array.isArray(options.scholarships) && options.scholarships.length) {
          const regularScholarships = removeSpecialOptions(options.scholarships, 'scholarship');

          setScholarships([
            ...(regularScholarships.length ? regularScholarships : FALLBACK_SCHOLARSHIPS.filter((item) => !['undecided', 'other'].includes(item.id))),
            { id: 'undecided', title: 'Still Deciding' },
            { id: 'other', title: 'Other Scholarship' },
          ]);
        }
      }

      setLoadStatus('ready');
    } catch (error) {
      setLoadError(error.message || 'Could not load your saved study plans.');
      setLoadStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const stageLabels = useMemo(() => Object.fromEntries(APPLICATION_STAGES), []);
  const incomeLabels = useMemo(() => Object.fromEntries(INCOME_RANGES), []);

  const goalItems = useMemo(() => {
    const savedPreferences = preferences || EMPTY_PREFERENCES;

    return [
      { id: 'photo', label: 'Add a profile photo', done: Boolean(profilePicture), action: onAddPhoto, actionLabel: 'Add Photo', icon: Camera },
      { id: 'program', label: 'Add your planned course', done: Boolean(savedPreferences.intendedProgram.trim()) },
      { id: 'schools', label: 'Set your school plans', done: savedPreferences.schoolInterests.length > 0 },
      { id: 'scholarships', label: 'Choose scholarship interests', done: savedPreferences.scholarshipInterests.length > 0 },
      { id: 'progress', label: 'Set your application progress', done: Boolean(savedPreferences.applicationStage) },
    ];
  }, [preferences, profilePicture, onAddPhoto]);

  const completedGoals = goalItems.filter((item) => item.done).length;
  const progressPercent = Math.round((completedGoals / goalItems.length) * 100);

  const displayNames = (values, options, valueKey = 'name') => values
    .map((value) => {
      if (value === 'other' || value === 'undecided') return '';
      const option = options.find((item) => item.id === value);

      return option?.[valueKey] || option?.provider || value;
    })
    .filter(Boolean);

  const toggleDraftChoice = (field, value) => {
    setDraft((current) => {
      const selected = current[field] || [];

      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : value === 'undecided'
          ? [value]
          : [...selected.filter((item) => item !== 'undecided'), value];

      return { ...current, [field]: next };
    });
    setSaveError('');
    setSaved(false);
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    setSaveError('');
    setSaved(false);

    if (!draft.schoolInterests.length || !draft.scholarshipInterests.length) {
      setSaveError('Choose at least one school and scholarship, or select Still Deciding.');

      return;
    }

    if (draft.schoolInterests.includes('other') && !draft.otherSchool.trim()) {
      setSaveError('Enter the name of the other school.');

      return;
    }

    if (draft.scholarshipInterests.includes('other') && !draft.otherScholarship.trim()) {
      setSaveError('Enter the name of the other scholarship.');

      return;
    }

    if (!draft.applicationStage) {
      setSaveError('Choose your application progress.');

      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/users/me/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(normalizePreferences(draft)),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(result.error || 'Could not save your study plans.');

      const savedPreferences = normalizePreferences(result.preferences || draft);
      setPreferences(savedPreferences);
      setDraft(savedPreferences);
      setEditing(false);
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || 'Could not save your study plans. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openEditor = () => {
    setDraft(normalizePreferences(preferences));
    setEditing(true);
    setSaved(false);
    setSaveError('');
  };

  if (loadStatus === 'loading') {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-busy="true">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading your student profile…</div>
      </section>
    );
  }

  if (loadStatus === 'error') {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-foreground">Your Student Profile</h2><p role="alert" className="mt-1 text-sm text-destructive">{loadError}</p></div>
          <button type="button" onClick={() => void loadProfile()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw className="h-4 w-4" />Try Again</button>
        </div>
      </section>
    );
  }

  const schoolNames = displayNames(preferences.schoolInterests, schools);
  const scholarshipNames = displayNames(preferences.scholarshipInterests, scholarships, 'title');

  if (preferences.schoolInterests.includes('undecided')) schoolNames.push('Still Deciding');

  if (preferences.scholarshipInterests.includes('undecided')) scholarshipNames.push('Still Deciding');

  if (preferences.schoolInterests.includes('other') && preferences.otherSchool) schoolNames.push(preferences.otherSchool);

  if (preferences.scholarshipInterests.includes('other') && preferences.otherScholarship) scholarshipNames.push(preferences.otherScholarship);

  const schoolOptions = schools.map((option) => ({ id: option.id, name: option.name || option.title || option.id }));
  const scholarshipOptions = scholarships.map((option) => ({ id: option.id, name: option.title || option.provider || option.id }));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Your Student Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your schools, scholarships, and application progress.</p>
          {saved && <p className="mt-1 text-sm text-emerald-700" role="status">Your study plans are saved.</p>}
        </div>
        {!editing && (
          <button type="button" onClick={openEditor} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <Pencil className="h-4 w-4" />Edit Plans
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(250px,0.75fr)]">
        <dl className="grid min-w-0 gap-x-5 gap-y-3 sm:grid-cols-2">
          <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Schools</dt><dd className="mt-1 break-words text-sm text-foreground">{schoolNames.length ? schoolNames.join(', ') : 'Not added yet'}</dd></div>
          <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Scholarships</dt><dd className="mt-1 break-words text-sm text-foreground">{scholarshipNames.length ? scholarshipNames.join(', ') : 'Not added yet'}</dd></div>
          <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Planned Course</dt><dd className="mt-1 break-words text-sm text-foreground">{preferences.intendedProgram || 'Not added yet'}</dd></div>
          <div className="min-w-0"><dt className="text-xs font-medium text-muted-foreground">Application Progress</dt><dd className="mt-1 break-words text-sm text-foreground">{stageLabels[preferences.applicationStage] || 'Not selected'}</dd></div>
          <div className="min-w-0 sm:col-span-2"><dt className="text-xs font-medium text-muted-foreground">Monthly Household Income <span className="font-normal">· Private</span></dt><dd className="mt-1 break-words text-sm text-foreground">{incomeLabels[preferences.householdIncomeRange] || 'Not selected'}</dd></div>
        </dl>

        <details className="group min-w-0 border-t border-border pt-3 lg:border-t lg:pt-3">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-md text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <span>Profile Completion <span className="ml-1 text-xs font-medium tabular-nums text-muted-foreground">{completedGoals} of {goalItems.length}</span></span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="pb-1 pt-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Profile completion" aria-valuemin={0} aria-valuemax={goalItems.length} aria-valuenow={completedGoals}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <ul className="mt-3 space-y-2">
              {goalItems.map((item) => (
                <li key={item.id} className="flex min-h-8 items-center gap-2 text-sm">
                  {item.done ? <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <Circle className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
                  <span className={`min-w-0 flex-1 ${item.done ? 'text-muted-foreground' : 'text-foreground'}`}>{item.label}</span>
                  {!item.done && item.action && (
                    <button type="button" onClick={item.action} className="min-h-8 shrink-0 rounded-md px-2 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{item.actionLabel}</button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      {editing && (
        <form onSubmit={savePreferences} className="mt-5 space-y-5 border-t border-border pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm font-medium text-foreground sm:col-span-2" htmlFor="student-profile-program">
              Planned Course or Strand <span className="font-normal text-muted-foreground">(Optional)</span>
              <input id="student-profile-program" maxLength={120} value={draft.intendedProgram} onChange={(event) => setDraft({ ...draft, intendedProgram: event.target.value })} placeholder="For example, STEM or Engineering" className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            </label>
            <ChoiceList label="Schools You Plan to Apply To · Required" name="schoolInterests" options={schoolOptions} values={draft.schoolInterests} onToggle={toggleDraftChoice} disabled={saving} description="Choose at least one, or select Still Deciding." />
            <ChoiceList label="Scholarships You Plan to Apply For · Required" name="scholarshipInterests" options={scholarshipOptions} values={draft.scholarshipInterests} onToggle={toggleDraftChoice} disabled={saving} description="Choose at least one, or select Still Deciding." />
            {draft.schoolInterests.includes('other') && (
              <label className="block space-y-1.5 text-sm font-medium text-foreground" htmlFor="student-profile-other-school">
                Other School
                <input id="student-profile-other-school" maxLength={120} value={draft.otherSchool} onChange={(event) => setDraft({ ...draft, otherSchool: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              </label>
            )}
            {draft.scholarshipInterests.includes('other') && (
              <label className="block space-y-1.5 text-sm font-medium text-foreground" htmlFor="student-profile-other-scholarship">
                Other Scholarship
                <input id="student-profile-other-scholarship" maxLength={120} value={draft.otherScholarship} onChange={(event) => setDraft({ ...draft, otherScholarship: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
              </label>
            )}
            <fieldset className="space-y-2 sm:col-span-2">
              <legend className="mb-2 text-sm font-semibold text-foreground">Your Application Progress · Required</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {APPLICATION_STAGES.map(([value, label]) => (
                  <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm leading-5 transition-colors focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-1 ${draft.applicationStage === value ? 'border-primary/60 bg-primary/5' : 'border-border/80 bg-background hover:border-primary/45 hover:bg-primary/[0.035]'}`}>
                    <input type="radio" name="student-profile-application-stage" value={value} checked={draft.applicationStage === value} onChange={() => setDraft({ ...draft, applicationStage: value })} className="h-4 w-4 accent-primary" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block space-y-1.5 text-sm font-medium text-foreground sm:col-span-2" htmlFor="student-profile-income">
              Approximate Monthly Household Income <span className="font-normal text-muted-foreground">(Optional)</span>
              <select id="student-profile-income" value={draft.householdIncomeRange} onChange={(event) => setDraft({ ...draft, householdIncomeRange: event.target.value })} className="h-11 w-full rounded-lg border border-input bg-background px-3 font-normal text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <option value="">Skip this question</option>
                {INCOME_RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <span className="block text-xs font-normal leading-4 text-muted-foreground">An estimate is enough. You can leave this blank.</span>
            </label>
          </div>

          {saveError && <p className="text-sm text-destructive" role="alert">{saveError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setDraft(preferences); setSaveError(''); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"><X className="h-4 w-4" />Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save Plans'}</button>
          </div>
        </form>
      )}
    </section>
  );
}
