// PGICH source-only safety checks. No clinical calculations are executed.
// Run: node scripts/check-source.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const code = readFileSync('Code.gs', 'utf8');
const html = readFileSync('Index.html', 'utf8');

function matches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}
function requireIncludes(source, label, phrase) {
  assert.ok(source.includes(phrase), 'Missing ' + label + ': ' + phrase);
}

assert.ok(html.startsWith('<!DOCTYPE html>'),
  'Index.html must begin with <!DOCTYPE html>; stray text above the UI is forbidden.');
assert.equal(matches(html, /<style(?:\s[^>]*)?>/gi), 1, 'Exactly one style tag is required');
assert.equal(matches(html, /<\/style>/gi), 1, 'Unmatched style tag');
assert.equal(matches(html, /<script(?:\s[^>]*)?>/gi), 1, 'Exactly one script block is required');
assert.equal(matches(html, /<\/script>/gi), 1, 'Unmatched script tag');
assert.ok(html.trimEnd().endsWith('</html>'), 'Missing closing HTML tag');

const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, 'Frontend script missing');
new Function(code);
new Function(script);

for (const label of ['Patient', 'CBC', 'LFT Panel', 'Clinical']) {
  requireIncludes(html, 'calculator tab', "'" + label + "'");
}
for (const id of ['tabs', 'result', 'output', 'stopBox', 'stopReasons',
  'saveState', 'save', 'calculate']) {
  requireIncludes(html, 'element ID', 'id="' + id + '"');
}
for (const fn of ['function doGet(', 'function assessCase(', 'function assessAndSave(',
  'function saveAssessment(', 'function persistAssessment_(']) {
  requireIncludes(code, 'backend function', fn);
}
requireIncludes(code, 'mobile viewport metadata', ".addMetaTag('viewport'");
requireIncludes(script, 'assessment preview', '.assessCase(input)');
requireIncludes(script, 'automatic history saving', '.assessAndSave(input)');
requireIncludes(script, 'retry save', '.saveAssessment(input)');
requireIncludes(script, 'hard-stop handling', 'stopBox.hidden = !r.hardStop');
requireIncludes(html, 'small final-page signature', 'Developed by Dr Aman Singh');

console.log('PGICH source checks passed: valid JS, clean document start, 4 tabs,');
console.log('mobile metadata, hard-stop interface, and assessment/save entry points.');
