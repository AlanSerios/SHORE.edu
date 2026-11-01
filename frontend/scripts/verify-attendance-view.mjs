import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
});

try {
  const { default: AttendanceStudentView } = await vite.ssrLoadModule('/src/components/AttendanceStudentView.jsx');
  const markup = renderToStaticMarkup(React.createElement(AttendanceStudentView, { userEmail: 'student@example.com' }));

  assert.match(markup, /<svg\b/, 'the student attendance card should render its QR code');
  assert.match(markup, /student@example\.com/, 'the attendance card should display the account email');
  console.log('Student attendance view and QR code render passed.');
} finally {
  await vite.close();
}
