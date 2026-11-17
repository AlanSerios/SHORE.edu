import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {
  PRETEST_BLUEPRINT,
  PRETEST_BLUEPRINT_ID,
  PRETEST_SUBTOPICS,
  buildPretestRecord,
  createPretestTemplate,
  parsePretestWorkbook,
} from '../src/utils/assessmentBlueprint.js';

assert.equal(PRETEST_BLUEPRINT.length, 4);
assert.deepEqual(PRETEST_BLUEPRINT.map(domain => [domain.name, domain.subtopics.map(topic => topic.name)]), [
  ['Mathematics', ['Arithmetic', 'Algebra', 'Geometry', 'Trigonometry', 'Statistics & Probability']],
  ['Science', ['Biology', 'Chemistry', 'Physics', 'Earth & Space']],
  ['Abstract Reasoning', ['Pattern Series', 'Spatial Reasoning', 'Mechanical Reasoning', 'Logical Reasoning']],
  ['English Proficiency', ['Grammar & Syntax', 'Vocabulary', 'Error Identification', 'Reading Comprehension']],
]);
assert.equal(PRETEST_SUBTOPICS.length, 17);
assert.equal(PRETEST_SUBTOPICS.reduce((sum, topic) => sum + topic.maxScore, 0), 160);

const workbook = createPretestTemplate(XLSX);
const worksheet = workbook.Sheets['Pre-Test Data'];
const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
const headerIndex = matrix.findIndex(row => row[0] === 'Student Name');
assert.equal(headerIndex, 3);
assert.equal(matrix[headerIndex].length, 2 + PRETEST_SUBTOPICS.length);

const scoreRow = ['Sample Student', 'sample@example.com', ...PRETEST_SUBTOPICS.map(topic => topic.maxScore)];
XLSX.utils.sheet_add_aoa(worksheet, [scoreRow], { origin: 'A5' });
const roundTrip = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
const parsed = parsePretestWorkbook(roundTrip, XLSX);
assert.deepEqual(parsed.errors, []);
assert.equal(parsed.assessmentId, PRETEST_BLUEPRINT_ID);
assert.equal(parsed.rows.length, 1);
assert.equal(buildPretestRecord(parsed.rows[0]).total, 160);
assert.equal(buildPretestRecord(parsed.rows[0]).subjects['English Proficiency'], 40);

// The official monitoring sheet has a title row, section headings, maximum row,
// then session and post-test columns that the pre-test importer must ignore.
const official = XLSX.utils.book_new();
const officialRows = Array.from({ length: 5 }, () => Array(42).fill(''));
officialRows[0][0] = 'NAMES';
officialRows[0][1] = 'PRE-DIAGNOSTIC TEST';
officialRows[0][24] = 'PER SESSION QUIZ (S1-S6)';
officialRows[0][37] = 'POST-DIAGNOSTIC TEST';
const officialHeaders = [
  'Math: Arithmetic', 'Math: Algebra', 'Math: Geometry', 'Math: Trigonometry', 'Math: Statistics & Probability', 'MATH TOTAL',
  'Sci: Biology', 'Sci: Chemistry', 'Sci: Physics', 'Sci: Earth & Space', 'SCIENCE TOTAL',
  'Abs: Pattern Series', 'Abs: Spatial Reasoning', 'Abs: Mechanical Reasoning', 'Abs: Logical Reasoning', 'ABSTRACT TOTAL',
  'Eng: Grammar & Syntax', 'Eng: Vocabulary', 'Eng: Error Identification', 'Eng: Reading Comprehension', 'ENGLISH TOTAL', 'PRE-DIAG TOTAL',
];
officialHeaders.forEach((header, index) => { officialRows[1][index + 1] = header; });
const officialTopicColumns = [1, 2, 3, 4, 5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 19, 20];
PRETEST_SUBTOPICS.forEach((topic, index) => {
  officialRows[2][officialTopicColumns[index]] = topic.maxScore;
});
officialRows[3][0] = 'Sample Student';
PRETEST_SUBTOPICS.forEach((topic, index) => {
  officialRows[3][officialTopicColumns[index]] = topic.maxScore;
});
officialRows[4][0] = 'Roster Only Student';
XLSX.utils.book_append_sheet(official, XLSX.utils.aoa_to_sheet(officialRows), 'FTF SHOREMATES');
const officialParsed = parsePretestWorkbook(official, XLSX);
assert.deepEqual(officialParsed.errors, []);
assert.equal(officialParsed.sheetName, 'FTF SHOREMATES');
assert.equal(officialParsed.rows.length, 1);
assert.equal(officialParsed.skippedCount, 1);
assert.equal(buildPretestRecord(officialParsed.rows[0]).total, 160);

// Existing one-row files remain importable, but their split sections are summed
// into the official combined Earth & Space and Grammar & Syntax sections.
const legacyTopics = [
  ['Mathematics', 'Arithmetic', 8], ['Mathematics', 'Algebra', 9], ['Mathematics', 'Geometry', 11],
  ['Mathematics', 'Trigonometry', 6], ['Mathematics', 'Statistics', 6],
  ['Science', 'Biology', 10], ['Science', 'Chemistry', 10], ['Science', 'Physics', 10],
  ['Science', 'Earth Science', 8], ['Science', 'Space Science', 2],
  ['Abstract Reasoning', 'Pattern Reasoning', 11], ['Abstract Reasoning', 'Spatial Reasoning', 10],
  ['Abstract Reasoning', 'Mechanical Reasoning', 10], ['Abstract Reasoning', 'Logical Reasoning', 9],
  ['English Proficiency', 'Grammar', 11], ['English Proficiency', 'Written Organization', 1],
  ['English Proficiency', 'Vocabulary', 10], ['English Proficiency', 'Error Identification', 8],
  ['English Proficiency', 'Reading Comprehension', 10],
];
const legacyWorkbook = XLSX.utils.book_new();
const legacyHeaders = ['Student Name', 'Student Email (optional)', ...legacyTopics.map(([domain, topic, max]) => `${domain} - ${topic} (0-${max})`)];
const legacyScores = ['Legacy Student', '', ...legacyTopics.map(([, , max]) => max)];
XLSX.utils.book_append_sheet(legacyWorkbook, XLSX.utils.aoa_to_sheet([legacyHeaders, legacyScores]), 'Pre-Test Data');
const legacyParsed = parsePretestWorkbook(legacyWorkbook, XLSX);
assert.deepEqual(legacyParsed.errors, []);
assert.equal(buildPretestRecord(legacyParsed.rows[0]).total, 160);
assert.equal(legacyParsed.rows[0].subtopics['Earth & Space'], 10);
assert.equal(legacyParsed.rows[0].subtopics['Grammar & Syntax'], 12);

const duplicateWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(duplicateWorkbook, XLSX.utils.aoa_to_sheet([
  matrix[headerIndex],
  scoreRow,
  scoreRow,
]), 'Pre-Test Data');
assert.match(parsePretestWorkbook(duplicateWorkbook, XLSX).errors[0].message, /Duplicate student name/);

const blankScoreWorkbook = XLSX.utils.book_new();
const blankRow = [...scoreRow];
blankRow[3] = '';
XLSX.utils.book_append_sheet(blankScoreWorkbook, XLSX.utils.aoa_to_sheet([
  matrix[headerIndex],
  blankRow,
]), 'Pre-Test Data');
assert.match(parsePretestWorkbook(blankScoreWorkbook, XLSX).errors[0].message, /Algebra is blank/);

const unknownWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(unknownWorkbook, XLSX.utils.aoa_to_sheet([['Untitled'], ['data']]), 'Sheet1');
assert.match(parsePretestWorkbook(unknownWorkbook, XLSX).errors[0].message, /S5 diagnostic sections/);

console.log('S5 sheet, current template, legacy template, and score validation checks passed.');
