// PHO source regression checks. Clinical rules are exercised only with synthetic inputs.
// Run: node scripts/check-source.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

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
  'saveState', 'calculate']) {
  requireIncludes(html, 'element ID', 'id="' + id + '"');
}
for (const fn of ['function doGet(', 'function assessCase(', 'function assessAndSave(',
  'function saveAssessment(', 'function persistAssessment_(']) {
  requireIncludes(code, 'backend function', fn);
}
requireIncludes(code, 'mobile viewport metadata', ".addMetaTag('viewport'");
requireIncludes(script, 'public calculation call', '.assessCase(input)');
assert.ok(!script.includes('.assessAndSave(input)'), 'Anonymous UI must never attempt spreadsheet writes');
assert.ok(!script.includes('.saveAssessment(input)'), 'Anonymous UI must not show save retry');
requireIncludes(code, 'server-side public read-only mode', 'publicReadOnly: true');
requireIncludes(code, 'server-side write protection', 'if (CFG.publicReadOnly)');
requireIncludes(html, 'plain disclosure that records are not saved', 'Entries are not saved');
requireIncludes(script, 'hard-stop handling', 'stopBox.hidden = !r.hardStop');
requireIncludes(html, 'small final-page signature', 'Developed by Dr Aman Singh');

requireIncludes(html, 'new app title', '<h1>PHO ALL Calculator</h1>');
requireIncludes(code, 'Google Sheets menu title', "createMenu('PHO ALL Calculator')");
requireIncludes(html, 'BSA arithmetic details', 'BSA-derived reference arithmetic');
requireIncludes(html, '0%-adjustment explanation', 'the CBC rule applied 0%');
requireIncludes(html, 'visible multiplication', "' × ' + factor + ' = '");
requireIncludes(html, '3-second noncritical notice timer', 'Math.max(0, 3000 - (Date.now() - disclaimerFirstShownAt))');
requireIncludes(html, 'transient caution wrapper', '#output.report-notices-dismissed .report-disclaimer');
requireIncludes(html, 'recoverable caution link', "element('summary', '', 'Safety notes')");
requireIncludes(html, 'do not auto-hide hard stops', "stopBox.hidden = !r.hardStop");
requireIncludes(html, 'keep clinical warnings persistent', "(r.warnings || []).forEach");
requireIncludes(html, 'reset notice timer after edits', 'resetTransientNotices();');


// Confirm real arithmetic with fictional inputs, without Google Sheets access.
const assess = runInNewContext(code + '\nassessCase;', {}, {timeout: 3000});
const fixture = {
  demoId: '0042', age: 6, height: 115, weight: 20,
  current6: 35, currentM: 20,
  wbc: 2500, anc: 1000, alc: 900, platelets: 180000,
  prevWbc: 2600, prevAnc: 1050,
  bilirubin: 0.8, biliULN: 1, ast: 30, alt: 30,
  transULN: 40, rising: 'no', fever: 'no',
  infection: 'no', jaundice: 'no', mucositis: 'no',
  tpmt: 'normal', nudt15: 'normal', adherence: 'good'
};
const stable = assess(fixture);
assert.equal(stable.candidate.mpDaily, 35);
assert.equal(stable.candidate.mtxWeekly, 20);
assert.equal(stable.candidate.changePercent, 0);
assert.equal(stable.bsa, 0.799);
assert.equal(stable.ref6, 40);
assert.equal(stable.refM, 16);

const increase = assess({...fixture,
  wbc: 5000, anc: 2000, prevWbc: 4500, prevAnc: 1800});
assert.equal(increase.candidate.mpDaily, 38.5);
assert.equal(increase.candidate.mtxWeekly, 22);
assert.equal(increase.candidate.changePercent, 10);

const decrease = assess({...fixture, anc: 600});
assert.equal(decrease.candidate.mpDaily, 31.5);
assert.equal(decrease.candidate.mtxWeekly, 18);
assert.equal(decrease.candidate.changePercent, -10);

const hardStop = assess({...fixture, anc: 400});
assert.equal(hardStop.hardStop, true);
assert.equal(hardStop.candidate, null);

// Anonymous guests cannot use the older writable endpoints.
assert.throws(() => runInNewContext(code + '\nassessAndSave({});', {}, {timeout:3000}),
  /Public calculator: saving is disabled/);
assert.throws(() => runInNewContext(code + '\nsaveAssessment({});', {}, {timeout:3000}),
  /Public calculator: saving is disabled/);


console.log('PHO source checks passed: valid JS, clean document start, 4 tabs,');
console.log('mobile metadata, hard-stop interface and public read-only assessment.');
console.log('Synthetic arithmetic checks: unchanged, +10%, -10%, hard stop, and BSA references passed.');
