/**
 * Pure compute helpers — no React, no side effects.
 * Extracted from App.jsx to keep the component lean.
 */

export const ALL_SUBJ = [
  "Arithmetic", "Algebra", "Geometry", "Calculus", "Trigonometry",
  "Logic", "Chemistry", "Biology", "Earth Science", "Physics", "English"
];

export const MATH_SUBJ = ["Arithmetic", "Algebra", "Geometry", "Calculus", "Trigonometry"];

export const SCI_SUBJ = ["Chemistry", "Biology", "Earth Science", "Physics"];

/**
 * Compute dashboard analytics for a selected student.
 * Returns null when no data is available.
 */
export function computeStats(selectedStudent, reportType, parsedData) {
  if (!selectedStudent) return null;
  const pre = parsedData.pre[selectedStudent];
  const post = parsedData.post[selectedStudent];

  const activeType = reportType === 'pre' ? 'pre' : 'post';
  const fallbackType = activeType === 'post' && !post ? 'pre' : activeType;
  const activeData = parsedData[fallbackType];

  const studentData = activeData?.[selectedStudent];

  if (!studentData) return null;

  let rank = 1;
  let totalStudents = 0;
  const cohortTotals = Object.values(activeData || {}).map(s => s.total);
  cohortTotals.forEach(t => {
    totalStudents++;

    if (t > studentData.total) rank++;
  });

  const cohortAverages = {};

  if (totalStudents > 0) {
    ALL_SUBJ.forEach(subj => {
      let sum = 0;
      Object.values(activeData).forEach(s => (sum += s.subjects[subj] || 0));
      cohortAverages[subj] = sum / totalStudents;
    });
  }

  const radarData = ALL_SUBJ.map(subj => ({
    subject: subj,
    score: studentData.subjects[subj] || 0,
    cohort: Math.round(cohortAverages[subj] || 0),
  }));

  const vsCohortData = ALL_SUBJ.map(subj => ({
    subject: subj,
    student: studentData.subjects[subj] || 0,
    cohort: Math.round(cohortAverages[subj] || 0),
  }));

  let preVsPostData = null;

  if (pre && post && reportType === 'both') {
    preVsPostData = ALL_SUBJ.map(subj => ({
      subject: subj,
      pre: pre.subjects[subj] || 0,
      post: post.subjects[subj] || 0,
    }));
  }

  const subjectRankings = Object.entries(studentData.subjects || {})
    .map(([name, score]) => {
      const cohortAvg = Math.round(cohortAverages[name] || 0);

      return { name, score, cohortAvg, diff: score - cohortAvg };
    })
    .sort((a, b) => b.score - a.score);

  const strongest = subjectRankings.length > 0
    ? subjectRankings[0]
    : { name: 'N/A', score: 0, cohortAvg: 0 };

  const weaknesses = [...subjectRankings].reverse().slice(0, 3);

  let growth = null;

  if (pre && post) growth = post.total - pre.total;

  let mostImproved = { name: 'N/A', diff: -Infinity };

  if (pre && post) {
    Object.keys(pre.subjects).forEach(subj => {
      const diff = (post.subjects[subj] || 0) - (pre.subjects[subj] || 0);

      if (diff > mostImproved.diff) mostImproved = { name: subj, diff };
    });
  }

  return {
    rank,
    totalStudents,
    total: studentData.total,
    growth,
    strongest,
    weaknesses,
    subjectRankings,
    mostImproved: mostImproved.diff !== -Infinity ? mostImproved : null,
    activeType: fallbackType,
    radarData,
    vsCohortData,
    preVsPostData,
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
