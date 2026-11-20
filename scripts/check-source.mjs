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

for (const label of ['Patient', 'CBC', 'LFT / RFT', 'Clinical']) {
  requireIncludes(html, 'calculator tab', "'" + label + "'");
}
for (const id of ['tabs', 'result', 'output', 'stopBox', 'stopReasons',
  'saveState', 'saveChoice', 'saveYes', 'saveNo', 'save', 'calculate']) {
  requireIncludes(html, 'element ID', 'id="' + id + '"');
}
for (const fn of ['function doGet(', 'function assessCase(', 'function assessAndSave(',
  'function saveAssessment(', 'function persistAssessment_(']) {
  requireIncludes(code, 'backend function', fn);
}
requireIncludes(code, 'mobile viewport metadata', ".addMetaTag('viewport'");
requireIncludes(script, 'preview without saving', '.assessCase(input)');
requireIncludes(script, 'explicit Yes save', '.assessAndSave(input)');
requireIncludes(script, 'retry failed saving', '.saveAssessment(input)');
requireIncludes(script, 'Yes action', "saveYes.addEventListener('click'");
requireIncludes(script, 'No action', "saveNo.addEventListener('click'");
requireIncludes(script, 'save gate', 'if (!assessmentReady || saved || saveBusy || !lastInput) return;');
requireIncludes(html, 'opt-in prompt after results', 'Save to Google Sheets?');
requireIncludes(html, 'Yes green', '.save-choice-btn.yes { background: #188155; }');
requireIncludes(html, 'No red', '.save-choice-btn.no { background: #c33f47; }');
const beforeYes = script.split("saveYes.addEventListener('click'")[0];
assert.ok(!beforeYes.includes('.assessAndSave(input)'),
  'Assessment submit must not write to Sheets before explicit Yes');
assert.ok(!script.includes('fetchSavedByCR('),
  'Anonymous four-digit CR must not retrieve stored Sheet records');
requireIncludes(code, 'backend Sheets history writer', 'persistAssessment_(d, assessment)');
requireIncludes(code, 'no visitor identity attribution', 'Anonymous web submission');
requireIncludes(html, 'simple saved confirmation', 'Saved to Google Sheets · CR ');
requireIncludes(html, 'retry save button', 'Retry save');
assert.ok(!code.includes('publicReadOnly: true'), 'Saving must not be blocked in this prototype');
requireIncludes(script, 'hard-stop handling', 'stopBox.hidden = !r.hardStop');
requireIncludes(html, 'small final-page signature', 'Developed by Dr Aman Singh');

requireIncludes(html, 'new app title', '<h1>PHO ALL Calculator</h1>');
requireIncludes(html, 'minimal welcome banner', 'id="welcomeBanner"');
requireIncludes(html, 'banner starts without blocking broken JS', 'class="welcome-overlay" hidden');
requireIncludes(html, 'one-line golden message', 'Updated to version <strong id="deploymentVersion">__PHO_DEPLOYMENT_VERSION__</strong>');
requireIncludes(script, 'automatic welcome dismissal', 'window.setTimeout(closeWelcome, 2800)');
requireIncludes(script, 'tap to dismiss', "welcomeBanner.addEventListener('click', closeWelcome)");
assert.ok(!html.includes('id="welcomeStart"'), 'Welcome modal must not add extra controls');
assert.ok(!html.includes('Build 2026.11.20'), 'Do not confuse source-build date with Apps Script version');


requireIncludes(code, 'Google Sheets menu title', "createMenu('PHO ALL Calculator')");
requireIncludes(html, 'BSA arithmetic details', 'BSA-derived reference arithmetic');
requireIncludes(html, 'concise result heading', '<h2>Results</h2>');
const crPos = html.indexOf("field('CR Number (4 digits)'");
const agePos = html.indexOf("'age', 'Age (years)'");
assert.ok(crPos > 0 && crPos < agePos, 'CR entry must precede age at the top');
requireIncludes(script, 'same-session CR restore', 'window.sessionStorage.getItem');
requireIncludes(script, 'same-session snapshot after confirmed save', 'rememberSavedInput(input)');
requireIncludes(script, 'choices restored visibly', 'selectChoice(choice, value)');
requireIncludes(html, '100 percent no-change wording', "(no change)");
requireIncludes(html, 'unambiguous percent-of-entered dose', "'% of entered dose'");
requireIncludes(html, 'single calculated-dose display', "element('div', 'report-dose-outcome')");
assert.ok(!html.includes('class="report-eyebrow">ASSESSMENT REPORT'), 'Redundant report eyebrow must be removed');
assert.ok(!html.includes('PROTOTYPE ASSESSMENT'), 'Internal assessment label must be removed');
assert.ok(!html.includes("'Entered dose'"), 'Redundant entered-dose tiles must be removed');
assert.ok(!html.includes('MAINTAIN CANDIDATE'), 'Backend shorthand must not be shown in the UI');

requireIncludes(html, 'clearly named table dose percentage', 'TABLE LEVEL');
requireIncludes(html, 'traceability summary', 'Rules applied');
requireIncludes(html, 'rules-affecting count', 'r.rulesAffecting');
requireIncludes(html, 'tablets for 6-MP', "'current6Tabs'");
requireIncludes(html, 'tablets for MTX', "'currentMTabs'");
requireIncludes(html, 'optional RFT creatinine', "'creatinine'");
requireIncludes(html, 'optional LFT selection', 'Transaminases rising? (optional)');
requireIncludes(code, 'WBC target threshold', 'x.wbc <= 3000');
requireIncludes(code, 'lymphocyte threshold', 'x.alc < 300');
requireIncludes(code, 'platelet stop threshold', 'x.platelets < 50000');
requireIncludes(html, 'visible multiplication', "' mg × ' + factor + ' = '");
requireIncludes(html, '3-second noncritical notice timer', 'Math.max(0, 3000 - (Date.now() - disclaimerFirstShownAt))');
requireIncludes(html, 'transient caution wrapper', '#output.report-notices-dismissed .report-disclaimer');
requireIncludes(html, 'recoverable caution link', "element('summary', '', 'Safety notes')");
requireIncludes(html, 'do not auto-hide hard stops', "stopBox.hidden = !r.hardStop");
requireIncludes(html, 'keep clinical warnings persistent', "(r.warnings || []).forEach");
requireIncludes(html, 'reset notice timer after edits', 'resetTransientNotices();');
requireIncludes(code, 'oncologist-supplied ALT > 5 x ULN', 'x.alt > 5 * x.transULN');
requireIncludes(code, 'oncologist-supplied bilirubin > 5 x ULN', 'x.bilirubin > 5 * x.biliULN');
requireIncludes(code, 'clinic liver stop wording', 'Clinic liver rule: ALT >5 × ULN');
requireIncludes(code, 'BFM lower bilirubin review retained', 'BFM liver review threshold: bilirubin >3 × ULN');
requireIncludes(html, 'mobile numeric keyboard inputmode', 'inputmode="decimal"');
requireIncludes(html, 'stable stale-result layout', '#result.stale-while-typing');
requireIncludes(script, 'stop per-key layout collapse', 'if (!busy && !saveBusy && !assessmentReady && !lastInput) return;');
requireIncludes(script, 'defer old result collapse to blur', "form.addEventListener('focusout'");
requireIncludes(script, 'defer CR autofill to field exit', "cr.addEventListener('change'");
const crInputHandler = script.slice(script.indexOf("cr.addEventListener('input'"),
  script.indexOf("cr.addEventListener('change'"));
assert.ok(!crInputHandler.includes('restoreCR('),
  'Do not do CR autofill during active typing');



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
assert.equal(stable.candidate.percentOfEntered, 100);
assert.equal(stable.bsa, 0.799);
assert.equal(stable.ref6, 40);
assert.equal(stable.refM, 16);
assert.equal(stable.rulesChecked, 7);

const increase = assess({...fixture, wbc: 3500, anc: 1600,
  alc: 900, prevWbc: 4500, prevAnc: 1800});
assert.equal(increase.candidate.mpDaily, 52.5);
assert.equal(increase.candidate.mtxWeekly, 30);
assert.equal(increase.candidate.changePercent, 50);
assert.equal(increase.candidate.percentOfEntered, 150);

const half = assess({...fixture, wbc: 1500, anc: 1000, alc: 400});
assert.equal(half.candidate.mpDaily, 17.5);
assert.equal(half.candidate.mtxWeekly, 10);
assert.equal(half.candidate.percentOfEntered, 50);

const lymphocyteCap = assess({...fixture, wbc: 3500, anc: 1600, alc: 200});
assert.equal(lymphocyteCap.candidate.percentOfEntered, 50);
assert.ok(lymphocyteCap.rules.find(r => r.id === 'ALC').affected);

const tablets = assess({...fixture, wbc: 3500, anc: 1600,
  current6: 50, currentM: 10, current6Tabs: 1, currentMTabs: 4});
assert.equal(tablets.candidate.mpTabletsDaily, 1.5);
assert.equal(tablets.candidate.mtxTabletsWeekly, 6);

const optionalLft = assess({...fixture, bilirubin: '',
  biliULN: '', ast: '', alt: '', transULN: '', rising: ''});
assert.equal(optionalLft.hardStop, false);
assert.ok(optionalLft.rules.find(r => r.id === 'LFT').detail.includes('Not entered'));

const wbcStop = assess({...fixture, wbc: 900, anc: 500, alc: 200});
assert.equal(wbcStop.hardStop, true);
assert.equal(wbcStop.candidate, null);
const plateletStop = assess({...fixture, platelets: 49000});
assert.equal(plateletStop.hardStop, true);
assert.equal(plateletStop.candidate, null);
const ancStop = assess({...fixture, anc: 400});
assert.equal(ancStop.hardStop, true);
assert.equal(ancStop.candidate, null);
const lowAnc = assess({...fixture, anc: 650});
assert.equal(lowAnc.hardStop, false);
assert.equal(lowAnc.candidate, null);

// Clinic ALT/bilirubin >5x ULN are independent of the rising trend flag.
const alt5 = assess({...fixture, alt: 200, transULN: 40, rising: ''});
assert.equal(alt5.hardStop, false);
const altOver5 = assess({...fixture, alt: 201, transULN: 40, rising: ''});
assert.equal(altOver5.hardStop, true);
assert.equal(altOver5.candidate, null);
assert.ok(altOver5.stopReasons.some(x => x.includes('Clinic liver rule: ALT')));
const bilirubinOver5 = assess({...fixture, bilirubin: 5.1, biliULN: 1});
assert.equal(bilirubinOver5.hardStop, true);
assert.equal(bilirubinOver5.candidate, null);
assert.ok(bilirubinOver5.stopReasons.some(x => x.includes('Clinic liver rule: bilirubin')));
const bilirubinAboveBFMReview = assess({...fixture, bilirubin: 3.5, biliULN: 1});
assert.equal(bilirubinAboveBFMReview.hardStop, false);
assert.equal(bilirubinAboveBFMReview.candidate, null);
assert.ok(bilirubinAboveBFMReview.warnings.some(x =>
  x.includes('BFM liver review threshold')));

// A database outage must still return the calculated assessment and a failure message.
const failedSave = runInNewContext(code + '\nassessAndSave(' +
  JSON.stringify(fixture) + ');', {}, {timeout:3000});
assert.equal(failedSave.saved, false);
assert.equal(failedSave.assessment.candidate.mpDaily, 35);
assert.ok(failedSave.saveError, 'No error message when Sheets saving is unavailable');

console.log('PHO source checks passed: valid JS, clean document start, 4 tabs,');
console.log('mobile metadata, hard-stop interface and simple Sheet saving.');
console.log('Synthetic checks: CBC bands, tablet arithmetic, optional LFT, >5x clinic liver rule, and hard stops passed.');
