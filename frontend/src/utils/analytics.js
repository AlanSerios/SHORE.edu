/** Pure compute helpers — no React, no side effects. */
import {
  PRETEST_BLUEPRINT,
  PRETEST_SUBJECTS,
  PRETEST_SUBJECT_MAX,
  PRETEST_TOTAL_ITEMS,
} from './assessmentBlueprint';

export const ALL_SUBJ = PRETEST_SUBJECTS;

export const MATH_SUBJ = ['Mathematics'];

export const SCI_SUBJ = ['Science'];

export const REASONING_SUBJ = ['Abstract Reasoning'];

export const ENGLISH_SUBJ = ['English Proficiency'];

/**
 * Compute dashboard analytics for a selected student.
 * Returns null when no data is available.
 */
export function computeStats(selectedStudent, reportType, parsedData, userRole = 'student') {
  if (!selectedStudent) return null;
  const pre = parsedData?.pre?.[selectedStudent];
  const post = parsedData?.post?.[selectedStudent];

  const activeType = reportType === 'post' || (reportType === 'both' && post) ? 'post' : 'pre';
  const activeData = parsedData?.[activeType] || {};

  const studentData = activeData?.[selectedStudent];

  if (!studentData) return null;

  const isAdmin = userRole === 'admin';
  const cohort = isAdmin ? Object.values(activeData || {}) : [];
  const totalStudents = cohort.length;
  const totalMax = Number(studentData.totalMax) || PRETEST_TOTAL_ITEMS;
  const totalPercent = totalMax > 0 ? (Number(studentData.total || 0) / totalMax) * 100 : 0;
  let rank = null;

  if (isAdmin && totalStudents) {
    rank = 1 + cohort.filter(record => {
      const max = Number(record.totalMax) || PRETEST_TOTAL_ITEMS;

      return (Number(record.total || 0) / max) > (Number(studentData.total || 0) / totalMax);
    }).length;
  }

  const subjectRankings = ALL_SUBJ
    .filter(name => studentData.subjects?.[name] !== undefined)
    .map(name => {
      const max = Number(studentData.subjectMax?.[name]) || PRETEST_SUBJECT_MAX[name] || 0;
      const score = Number(studentData.subjects[name]) || 0;
      const percent = max ? (score / max) * 100 : 0;

      const cohortScores = cohort
        .filter(record => record.subjects?.[name] !== undefined)
        .map(record => {
          const cohortMax = Number(record.subjectMax?.[name]) || PRETEST_SUBJECT_MAX[name] || 0;

          return cohortMax ? (Number(record.subjects[name]) / cohortMax) * 100 : 0;
        });

      const cohortAvg = cohortScores.length
        ? cohortScores.reduce((sum, value) => sum + value, 0) / cohortScores.length
        : null;

      return {
        name,
        score,
        max,
        percent,
        cohortAvg,
        diff: cohortAvg === null ? null : percent - cohortAvg,
      };
    });

  const vsCohortData = subjectRankings.map(subject => ({
    subject: subject.name,
    student: Math.round(subject.percent),
    cohort: subject.cohortAvg === null ? null : Math.round(subject.cohortAvg),
  }));

  const radarData = subjectRankings.map(subject => ({
    subject: subject.name,
    score: Math.round(subject.percent),
    cohort: subject.cohortAvg === null ? null : Math.round(subject.cohortAvg),
  }));

  const subtopicRankings = PRETEST_BLUEPRINT.flatMap(subject =>
    subject.subtopics.flatMap(topic => {
      const scoreData = studentData.subtopics?.[subject.name]?.[topic.name];

      if (!scoreData) return [];

      const max = Number(scoreData.max) || topic.maxScore;
      const score = Number(scoreData.score) || 0;
      const percent = max ? (score / max) * 100 : 0;

      const cohortScores = cohort
        .map(record => record.subtopics?.[subject.name]?.[topic.name])
        .filter(Boolean)
        .map(record => {
          const cohortMax = Number(record.max) || topic.maxScore;

          return cohortMax ? (Number(record.score) / cohortMax) * 100 : 0;
        });

      const cohortAvg = cohortScores.length
        ? cohortScores.reduce((sum, value) => sum + value, 0) / cohortScores.length
        : null;

      return [{
        name: topic.name,
        subject: subject.name,
        score,
        max,
        percent,
        cohortAvg,
        diff: cohortAvg === null ? null : percent - cohortAvg,
      }];
    })
  );

  const strongest = subjectRankings.length > 0
    ? [...subjectRankings].sort((a, b) => b.percent - a.percent)[0]
    : { name: 'N/A', score: 0, max: 0, percent: 0, cohortAvg: null, diff: null };

  const weaknesses = [...subjectRankings].sort((a, b) => a.percent - b.percent).slice(0, 3);

  const preVsPostData = reportType === 'both' && pre && post ? ALL_SUBJ.flatMap(subject => {
    if (pre.subjects?.[subject] == null || post.subjects?.[subject] == null) return [];

    const preMax = Number(pre.subjectMax?.[subject]) || PRETEST_SUBJECT_MAX[subject];
    const postMax = Number(post.subjectMax?.[subject]) || PRETEST_SUBJECT_MAX[subject];

    return [{
      subject,
      pre: Math.round(pre.subjects[subject] / preMax * 100),
      post: Math.round(post.subjects[subject] / postMax * 100),
    }];
  }) : [];

  const growth = preVsPostData.length && (Number(pre.totalMax) || PRETEST_TOTAL_ITEMS) === totalMax
    ? Number(post.total) - Number(pre.total)
    : null;

  return {
    rank,
    totalStudents,
    total: Number(studentData.total) || 0,
    totalMax,
    totalPercent,
    growth,
    strongest,
    weaknesses,
    subjectRankings,
    subtopicRankings,
    mostImproved: null,
    activeType,
    radarData,
    vsCohortData,
    preVsPostData: preVsPostData.length ? preVsPostData : null,
  };
}

/**
 * Compute consecutive attendance streak for a student.
 */
export function computeStreak(globalAttendance, globalUsers, selectedStudent, userRole, userEmail) {
  if (!globalAttendance || globalAttendance.length === 0) return 0;

  let targetEmail = userEmail;

  if (userRole === 'admin' || userRole === 'volunteer') {
    const matchingUser = globalUsers.find(u => u.name === selectedStudent);

    if (matchingUser) targetEmail = matchingUser.email;
    else return 0;
  }

  if (!targetEmail) return 0;

  const allTimeIns = globalAttendance.filter(log => log.type === 'Time In');

  if (allTimeIns.length === 0) return 0;

  const classDatesSet = new Set();
  allTimeIns.forEach(log => {
    classDatesSet.add(new Date(log.timestamp).toISOString().split('T')[0]);
  });

  const classDatesList = Array.from(classDatesSet).sort((a, b) => new Date(b) - new Date(a));

  if (classDatesList.length === 0) return 0;

  const studentDatesSet = new Set(
    allTimeIns
      .filter(log => log.email === targetEmail)
      .map(log => new Date(log.timestamp).toISOString().split('T')[0])
  );

  let streak = 0;

  for (const date of classDatesList) {
    if (studentDatesSet.has(date)) streak++;
    else break;
  }

  return streak;
}

/** Play a brief UI sound using the Web Audio API. */
export function playSound(type) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;

    if (!Ctx) return;
    const ctx = new Ctx();

    if (type === 'pop') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'whoosh') {
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.15);
      filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0, ctx.currentTime);
      noiseGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.15);
      noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(ctx.currentTime);
    }
  } catch {}
}
