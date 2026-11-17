export const PRETEST_BLUEPRINT_ID = 'shore-pretest-160-v2';

export const PRETEST_TOTAL_ITEMS = 160;

export const PRETEST_BLUEPRINT = [
  {
    name: 'Mathematics',
    maxScore: 40,
    questionRange: [1, 40],
    subtopics: [
      { name: 'Arithmetic', maxScore: 8, questionRange: [1, 8] },
      { name: 'Algebra', maxScore: 9, questionRange: [9, 17] },
      { name: 'Geometry', maxScore: 11, questionRange: [18, 28] },
      { name: 'Trigonometry', maxScore: 6, questionRange: [29, 34] },
      { name: 'Statistics & Probability', maxScore: 6, questionRange: [35, 40] },
    ],
  },
  {
    name: 'Science',
    maxScore: 40,
    questionRange: [41, 80],
    subtopics: [
      { name: 'Biology', maxScore: 10, questionRange: [41, 50] },
      { name: 'Chemistry', maxScore: 10, questionRange: [51, 60] },
      { name: 'Physics', maxScore: 10, questionRange: [61, 70] },
      { name: 'Earth & Space', maxScore: 10, questionRange: [71, 80] },
    ],
  },
  {
    name: 'Abstract Reasoning',
    maxScore: 40,
    questionRange: [81, 120],
    subtopics: [
      { name: 'Pattern Series', maxScore: 11, questionRange: [81, 91] },
      { name: 'Spatial Reasoning', maxScore: 10, questionRange: [92, 101] },
      { name: 'Mechanical Reasoning', maxScore: 10, questionRange: [102, 111] },
      { name: 'Logical Reasoning', maxScore: 9, questionRange: [112, 120] },
    ],
  },
  {
    name: 'English Proficiency',
    maxScore: 40,
    questionRange: [121, 160],
    subtopics: [
      { name: 'Grammar & Syntax', maxScore: 12, questionRange: [121, 132] },
      { name: 'Vocabulary', maxScore: 10, questionRange: [133, 142] },
      { name: 'Error Identification', maxScore: 8, questionRange: [143, 150] },
      { name: 'Reading Comprehension', maxScore: 10, questionRange: [151, 160] },
    ],
  },
];

export const PRETEST_SUBJECTS = PRETEST_BLUEPRINT.map(subject => subject.name);

export const PRETEST_SUBJECT_MAX = Object.fromEntries(
  PRETEST_BLUEPRINT.map(subject => [subject.name, subject.maxScore]),
);

export const PRETEST_SUBTOPICS = PRETEST_BLUEPRINT.flatMap(subject =>
  subject.subtopics.map(topic => ({ ...topic, subject: subject.name })),
);

const SUBJECT_SHORT_NAMES = {
  Mathematics: 'Math',
  Science: 'Sci',
  'Abstract Reasoning': 'Abs',
  'English Proficiency': 'Eng',
};

// Older generated score sheets split two sections that the official S5 sheet combines.
const LEGACY_TOPIC_COLUMNS = {
  'Statistics & Probability': { aliases: ['Statistics'] },
  'Earth & Space': {
    groups: [[['Earth Science', 8], ['Space Science', 2]]],
  },
  'Pattern Series': { aliases: ['Pattern Reasoning'] },
  'Grammar & Syntax': {
    groups: [[['Grammar', 11], ['Written Organization', 1]]],
  },
};

export function normalizeTrackerHeader(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const HEADER_ALIASES = {
  name: ['student name', 'full name', 'name', 'names'],
  email: ['student email', 'student email optional', 'email address', 'email'],
};

function topicHeaderAliases(topic, label = topic.name, maxScore = topic.maxScore) {
  const labels = [label, `${label} (0-${maxScore})`];
  const subjectLabels = [topic.subject, SUBJECT_SHORT_NAMES[topic.subject]];

  for (const subject of subjectLabels) {
    labels.push(`${subject} ${label}`, `${subject} - ${label}`, `${subject}: ${label}`);
    labels.push(`${subject} ${label} (0-${maxScore})`, `${subject} - ${label} (0-${maxScore})`);
  }

  return labels.map(normalizeTrackerHeader);
}

function findHeaderIndex(headers, aliases) {
  const normalizedAliases = new Set(aliases.map(normalizeTrackerHeader));

  return headers.findIndex(header => normalizedAliases.has(normalizeTrackerHeader(header)));
}

function resolveTopicColumns(headers, topic) {
  const legacy = LEGACY_TOPIC_COLUMNS[topic.name] || {};
  const aliases = [topic.name, ...(legacy.aliases || [])];

  for (const alias of aliases) {
    const column = findHeaderIndex(headers, topicHeaderAliases(topic, alias));

    if (column !== -1) return { parts: [{ column, maxScore: topic.maxScore, label: topic.name }] };
  }

  for (const group of legacy.groups || []) {
    const parts = group.map(([label, maxScore]) => ({
      column: findHeaderIndex(headers, topicHeaderAliases(topic, label, maxScore)),
      maxScore,
      label,
    }));

    if (parts.every(part => part.column !== -1)) return { parts };

    if (parts.some(part => part.column !== -1)) return { parts, incomplete: true };
  }

  return null;
}

function inspectHeader(headers) {
  const nameColumn = findHeaderIndex(headers, HEADER_ALIASES.name);
  const emailColumn = findHeaderIndex(headers, HEADER_ALIASES.email);
  const topicColumns = new Map();

  for (const topic of PRETEST_SUBTOPICS) {
    const columns = resolveTopicColumns(headers, topic);

    if (columns) topicColumns.set(topic.name, columns);
  }

  return { nameColumn, emailColumn, topicColumns };
}

export function buildPretestRecord(row) {
  const subjects = {};
  const subjectMax = {};
  const subtopics = {};
  let total = 0;

  for (const subject of PRETEST_BLUEPRINT) {
    let subjectScore = 0;
    subtopics[subject.name] = {};

    for (const topic of subject.subtopics) {
      const score = Number(row.subtopics[topic.name]);
      subjectScore += score;
      total += score;
      subtopics[subject.name][topic.name] = { score, max: topic.maxScore };
    }

    subjects[subject.name] = subjectScore;
    subjectMax[subject.name] = subject.maxScore;
  }

  return {
    name: row.name.trim(),
    email: row.email?.trim().toLocaleLowerCase() || '',
    total,
    totalMax: PRETEST_TOTAL_ITEMS,
    subjects,
    subjectMax,
    subtopics,
  };
}

export function parsePretestWorkbook(workbook, XLSX) {
  if (!workbook || !Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) {
    return { rows: [], errors: [{ row: 0, message: 'This workbook has no readable sheets.' }] };
  }

  const sheets = workbook.SheetNames.map(name => ({ name, sheet: workbook.Sheets[name] }));
  const preferred = sheets.filter(({ name }) => normalizeTrackerHeader(name) === 'ftfshoremates');
  const candidates = [...preferred, ...sheets.filter(candidate => !preferred.includes(candidate))];
  let selected = null;
  let matrix = null;
  let headerIndex = -1;
  let nameColumn = -1;
  let emailColumn = -1;
  let topicColumns = new Map();
  let recognizedCount = 0;

  for (const candidate of candidates) {
    const rows = XLSX.utils.sheet_to_json(candidate.sheet, { header: 1, defval: '', raw: true });

    for (let index = 0; index < Math.min(rows.length, 12); index += 1) {
      const headers = rows[index] || [];
      const inspected = inspectHeader(headers);
      const isHeader = inspected.nameColumn !== -1 && inspected.topicColumns.size >= 8;

      if (isHeader && inspected.topicColumns.size > recognizedCount) {
        selected = candidate;
        matrix = rows;
        headerIndex = index;
        nameColumn = inspected.nameColumn;
        emailColumn = inspected.emailColumn;
        topicColumns = inspected.topicColumns;
        recognizedCount = inspected.topicColumns.size;
      }

      // The S5 monitoring sheet puts “NAMES” above the section labels in column A.
      if (index + 1 < rows.length && findHeaderIndex(headers, HEADER_ALIASES.name) !== -1) {
        const next = inspectHeader(rows[index + 1] || []);

        if (next.topicColumns.size >= 8 && next.topicColumns.size > recognizedCount) {
          selected = candidate;
          matrix = rows;
          headerIndex = index + 1;
          nameColumn = Math.max(0, inspected.nameColumn);
          emailColumn = -1;
          topicColumns = next.topicColumns;
          recognizedCount = next.topicColumns.size;
        }
      }
    }
  }

  if (!selected) {
    return {
      rows: [],
      errors: [{ row: 0, message: 'Could not match the workbook to the S5 diagnostic sections. Use the current score template.' }],
    };
  }

  const missingTopics = PRETEST_SUBTOPICS.flatMap(topic => topicColumns.has(topic.name) ? [] : [topic.name]);
  const errors = [];

  if (missingTopics.length) {
    errors.push({
      row: headerIndex + 1,
      message: `Missing diagnostic sections: ${missingTopics.join(', ')}. Use the current 160-item diagnostic sheet.`,
    });
  }

  const parsedRows = [];
  const seenNames = new Set();
  const seenEmails = new Set();
  let skippedCount = 0;
  const hasAllTopics = missingTopics.length === 0;

  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const row = matrix[index] || [];
    const isBlank = row.every(value => String(value ?? '').trim() === '');

    if (isBlank) continue;

    const rowNumber = index + 1;
    const name = String(row[nameColumn] ?? '').trim();

    // The official workbook has a maximum-score row below its headers; only named rows are results.
    if (!name) continue;

    const email = emailColumn === -1 ? '' : String(row[emailColumn] ?? '').trim().toLocaleLowerCase();
    const rowIssues = [];

    const scoreValues = hasAllTopics
      ? [...topicColumns.values()].flatMap(resolved => resolved.parts.map(part => row[part.column]))
      : [];

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) rowIssues.push('Student Email must be a valid email address.');

    const normalizedName = normalizeTrackerHeader(name);

    if (normalizedName && seenNames.has(normalizedName)) rowIssues.push('Duplicate student name in this sheet.');

    if (normalizedName) seenNames.add(normalizedName);

    if (email && seenEmails.has(email)) rowIssues.push('Duplicate student email in this sheet.');

    if (email) seenEmails.add(email);

    if (scoreValues.length && scoreValues.every(value => String(value ?? '').trim() === '')) {
      if (rowIssues.length) errors.push({ row: rowNumber, name, message: rowIssues.join(' ') });
      else skippedCount += 1;
      continue;
    }

    const subtopics = {};

    if (hasAllTopics) {
      for (const topic of PRETEST_SUBTOPICS) {
        const resolved = topicColumns.get(topic.name);

        if (resolved.incomplete) {
          rowIssues.push(`${topic.name} is missing one of its score columns.`);
          continue;
        }

        let score = 0;
        let isValid = true;

        for (const part of resolved.parts) {
          const rawValue = row[part.column];
          const valueText = String(rawValue ?? '').trim();

          if (!valueText) {
            rowIssues.push(`${topic.name} is blank; enter 0 when there are no correct answers.`);
            isValid = false;
            continue;
          }

          const partScore = Number(valueText);

          if (!Number.isInteger(partScore) || partScore < 0 || partScore > part.maxScore) {
            rowIssues.push(`${part.label} must be a whole-number score from 0 to ${part.maxScore}.`);
            isValid = false;
            continue;
          }

          score += partScore;
        }

        if (isValid && score <= topic.maxScore) subtopics[topic.name] = score;
        else if (isValid) rowIssues.push(`${topic.name} must not exceed ${topic.maxScore}.`);
      }
    }

    if (rowIssues.length) {
      errors.push({ row: rowNumber, name, message: rowIssues.join(' ') });
      continue;
    }

    parsedRows.push({ name, email, subtopics });
  }

  if (!parsedRows.length && !errors.length) {
    errors.push({
      row: 0,
      message: skippedCount
        ? 'No completed diagnostic score rows were found. Enter scores for at least one student.'
        : 'No student score rows were found in this workbook.',
    });
  }

  return {
    sheetName: selected.name,
    rows: parsedRows,
    errors,
    skippedCount,
    assessmentId: PRETEST_BLUEPRINT_ID,
    totalItems: PRETEST_TOTAL_ITEMS,
    topicCount: PRETEST_SUBTOPICS.length,
  };
}

export function createPretestTemplate(XLSX) {
  const workbook = XLSX.utils.book_new();

  const headers = [
    'Student Name',
    'Student Email (optional)',
    ...PRETEST_SUBTOPICS.map(topic => `${topic.subject} - ${topic.name} (0-${topic.maxScore})`),
  ];

  const domainHeaders = ['', ''];
  const merges = [{ s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }];
  let column = 2;

  for (const domain of PRETEST_BLUEPRINT) {
    const firstColumn = column;

    domainHeaders.push(...domain.subtopics.map(() => domain.name));
    column += domain.subtopics.length;

    merges.push({ s: { r: 2, c: firstColumn }, e: { r: 2, c: column - 1 } });
  }

  const worksheet = XLSX.utils.aoa_to_sheet([
    ['SHORE SKWELA 5.0 · PRE-TEST SCORE SHEET'],
    ['Enter the printed diagnostic section scores. Use 0 when the score is zero; do not leave score cells blank.'],
    ['Student details', '', ...domainHeaders.slice(2)],
    headers,
  ]);

  worksheet['!merges'] = merges;
  worksheet['!rows'] = [{ hpt: 26 }, { hpt: 32 }, { hpt: 22 }, { hpt: 34 }];

  worksheet['!cols'] = [
    { wch: 28 },
    { wch: 32 },
    ...PRETEST_SUBTOPICS.map(() => ({ wch: 24 })),
  ];
  worksheet['!autofilter'] = { ref: `A4:${XLSX.utils.encode_col(headers.length - 1)}4` };
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Pre-Test Data');

  return workbook;
}
