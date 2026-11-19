/**
 * PGICH ALL Maintenance Calculator — v5
 * Automatically saves each completed calculation to a restricted Google Sheet.
 * CLINICAL DECISION-SUPPORT PROTOTYPE, NOT A PRESCRIBING SYSTEM.
 * Do not use for real patient records until PGICH has approved clinical
 * thresholds, access control, privacy, retention and deployment.
 */
const CFG = Object.freeze({
  publicReadOnly: true,          // Anonymous users: calculations only; never write patient records
  sheetIdProperty: 'PGICH_SHEET_ID',
  allowlistProperty: 'PGICH_ALLOWED_EMAILS',
  latestName: 'LatestByCR',
  historyName: 'AssessmentHistory',
  reference6: 50,             // mg/m²/day, protocol-specific
  referenceM: 20,             // mg/m²/week, protocol-specific
  wbcLow: 1500,
  wbcHigh: 3000,
  ancLow: 750,
  ancHigh: 1500,
  adjustment: 0.10,
  algorithmVersion: 'PROTOTYPE-v5'
});

const HISTORY_HEADERS = [
  'SavedAt', 'CR_4_digits', 'GoogleUser', 'PatientInputsJSON',
  'Decision', 'HardStop', 'StopReasonsJSON',
  'Candidate6MP_mg_day', 'CandidateMTX_mg_week',
  'BSA_m2', 'Reference6MP_mg_day', 'ReferenceMTX_mg_week',
  'AlgorithmVersion'
];
const LATEST_HEADERS = [
  'CR_4_digits', 'LastSavedAt', 'GoogleUser', 'PatientInputsJSON',
  'Decision', 'HardStop', 'StopReasonsJSON', 'HistoryRow'
];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('PHO ALL Calculator')
    .addItem('Initialise record sheets', 'setupWorkbook')
    .addItem('Open calculator', 'showCalculator')
    .addItem('Preview old DemoCases', 'previewLegacyMigration')
    .addItem('Import old DemoCases', 'migrateLegacyDemoCases')
    .addToUi();
}

function setupWorkbook() {
  // This administrative operation must not run on behalf of public visitors
  // in a web app deployed as Execute as Me.
  const actor = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const owner = (Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!actor || !owner || actor !== owner) {
    throw new Error('Workbook setup is restricted to the signed-in script owner.');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Run setupWorkbook from a bound Google Sheet.');
  const props = PropertiesService.getScriptProperties();
  props.setProperty(CFG.sheetIdProperty, ss.getId());

  // Initial allowlist contains only the Google account running setup.
  // Add authorised staff under Project Settings > Script properties.
  if (!props.getProperty(CFG.allowlistProperty)) {
    const ownerEmail = Session.getEffectiveUser().getEmail();
    if (!ownerEmail) {
      throw new Error('Google account email not available; configure PGICH_ALLOWED_EMAILS.');
    }
    props.setProperty(CFG.allowlistProperty, ownerEmail.toLowerCase());
  }

  initTab_(ss, CFG.historyName, HISTORY_HEADERS, 2);
  initTab_(ss, CFG.latestName, LATEST_HEADERS, 1);
  return 'Two record tabs created. Restrict sharing and deployment before patient use.';
}

function initTab_(ss, title, headers, crColumn) {
  let sheet = ss.getSheetByName(title);
  if (!sheet) sheet = ss.insertSheet(title);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold').setBackground('#173d56').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    const actual = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
    if (actual.join('|') !== headers.join('|')) {
      throw new Error('Existing ' + title + ' sheet has different columns. Do not overwrite it.');
    }
  }
  sheet.getRange(2, crColumn, Math.max(1, sheet.getMaxRows()-1), 1)
    .setNumberFormat('@');
}

function workbook_() {
  const id = PropertiesService.getScriptProperties()
    .getProperty(CFG.sheetIdProperty);
  if (!id) throw new Error('Run setupWorkbook first.');
  return SpreadsheetApp.openById(id);
}

function requireAuthorisedUser_() {
  const allowed = (PropertiesService.getScriptProperties()
    .getProperty(CFG.allowlistProperty) || '')
    .toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  // Never substitute getEffectiveUser(): a web app executing as its owner
  // could otherwise make every visitor appear to be the owner.
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!email || !allowed.includes(email)) {
    throw new Error('Saving blocked: signed-in Google account is not authorised.');
  }
  return email;
}

function doGet() {
  // Apps Script ignores viewport meta tags written directly in Index.html.
  // Register it on HtmlOutput to render at device width on mobile.
  return HtmlService.createHtmlOutputFromFile('Index')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('PHO ALL Calculator');
}
function showCalculator() {
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutputFromFile('Index')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
  );
}

function number_(d, key, min, max) {
  if (d[key] === null || d[key] === undefined || d[key] === '') {
    throw new Error('Missing: ' + key);
  }
  const v = Number(d[key]);
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new Error('Invalid ' + key + ': check value or units.');
  }
  return v;
}
function optional_(d, key) {
  return d[key] === null || d[key] === undefined || d[key] === ''
    ? null : number_(d, key, 0, 200000);
}

function assessCase(d) {
  const x = {
    age: number_(d, 'age', 0, 25),
    height: number_(d, 'height', 35, 230),
    weight: number_(d, 'weight', 1, 200),
    current6: number_(d, 'current6', 0, 1000),
    currentM: number_(d, 'currentM', 0, 1000),
    wbc: number_(d, 'wbc', 0, 200000),
    anc: number_(d, 'anc', 0, 200000),
    alc: number_(d, 'alc', 0, 200000),
    platelets: number_(d, 'platelets', 0, 2000000),
    prevWbc: optional_(d, 'prevWbc'),
    prevAnc: optional_(d, 'prevAnc'),
    bilirubin: number_(d, 'bilirubin', 0, 100),
    biliULN: number_(d, 'biliULN', 0.01, 20),
    ast: number_(d, 'ast', 0, 20000),
    alt: number_(d, 'alt', 0, 20000),
    transULN: number_(d, 'transULN', 1, 1000)
  };
  const options = {
    rising: ['yes', 'no'], fever: ['yes', 'no'],
    infection: ['yes', 'no'], jaundice: ['yes', 'no'],
    mucositis: ['yes', 'no'],
    tpmt: ['normal', 'variant', 'unknown'],
    nudt15: ['normal', 'variant', 'unknown'],
    adherence: ['good', 'missed', 'unknown']
  };
  Object.keys(options).forEach(key => {
    if (!options[key].includes(d[key])) {
      throw new Error('Please select a valid value for ' + key);
    }
  });
  if (x.anc > x.wbc || x.alc > x.wbc || x.anc + x.alc > x.wbc * 1.15) {
    throw new Error('CBC inconsistent: check WBC, ANC and ALC units.');
  }
  const bsa = Math.sqrt(x.height * x.weight / 3600);
  const stops = [];
  const warnings = [];
  const yes = key => d[key] === 'yes';

  // These flags stop *automated dose suggestions*, NOT necessarily medication.
  // Actual decisions to hold, reduce or resume therapy belong to the oncologist.
  if (x.wbc < 1500) stops.push('WBC below 1,500/µL');
  if (x.anc < 500) stops.push('ANC below 500/µL');
  if (x.alc < 300) stops.push('ALC below 300/µL');
  if (x.platelets < 50000) stops.push('Platelets below 50,000/µL');
  if (x.bilirubin > 3 * x.biliULN) stops.push('Bilirubin above 3 × ULN');
  if ((x.ast > 10 * x.transULN || x.alt > 10 * x.transULN) && yes('rising')) {
    stops.push('Rising AST or ALT above 10 × ULN');
  }
  if (x.ast > 20 * x.transULN || x.alt > 20 * x.transULN) {
    stops.push('AST or ALT above 20 × ULN');
  }
  if (yes('fever')) stops.push('Fever reported: clinical assessment required');
  if (yes('infection')) stops.push('Serious infection reported');
  if (yes('jaundice')) stops.push('Clinical jaundice reported');
  if (yes('mucositis')) stops.push('Mucositis reported');
  if (d.tpmt !== 'normal' || d.nudt15 !== 'normal') {
    stops.push('Pharmacogenetic status requires individualised review');
  }

  if (x.current6 === 0 || x.currentM === 0) {
    stops.push('Drug interruption/restart requires a clinician-directed plan');
  }
  if (x.age > 18) {
    stops.push('Confirm applicability of the paediatric protocol');
  }
  if (d.adherence !== 'good') {
    warnings.push('Adherence not confirmed; do not auto-titrate');
  }
  if (x.current6 > 0 && x.currentM > 0 &&
      Math.abs(x.current6 / x.currentM - 2.5) > 0.25) {
    warnings.push('Current 6-MP:MTX dose ratio differs from 2.5:1; review');
  }

  let status = 'REVIEW REQUIRED';
  let factor = null;
  if (stops.length) {
    status = 'HARD STOP — CLINICIAN REVIEW';
  } else if (d.adherence !== 'good') {
    status = 'REVIEW REQUIRED';
  } else if (x.wbc >= CFG.wbcLow && x.wbc <= CFG.wbcHigh &&
             x.anc >= CFG.ancLow && x.anc <= CFG.ancHigh) {
    status = 'MAINTAIN CANDIDATE';
    factor = 1;
  } else if (x.wbc > CFG.wbcHigh && x.anc > CFG.ancHigh &&
             x.prevWbc !== null && x.prevWbc > CFG.wbcHigh &&
             x.prevAnc !== null && x.prevAnc > CFG.ancHigh) {
    status = 'INCREASE CANDIDATE';
    factor = 1 + CFG.adjustment;
  } else if (x.wbc >= CFG.wbcLow && x.anc >= 500 && x.anc < CFG.ancLow) {
    status = 'DECREASE CANDIDATE';
    factor = 1 - CFG.adjustment;
  } else {
    warnings.push('Discordant CBC or insufficient trend; clinical review');
  }

  const candidate = factor === null ? null : {
    mpDaily: Math.round(x.current6 * factor * 10) / 10,
    mtxWeekly: Math.round(x.currentM * factor * 10) / 10,
    changePercent: Math.round((factor - 1) * 100)
  };
  return {
    status,
    hardStop: stops.length > 0,
    stopReasons: stops,
    warnings,
    candidate,
    bsa: Number(bsa.toFixed(3)),
    ref6: Number((bsa * CFG.reference6).toFixed(1)),
    refM: Number((bsa * CFG.referenceM).toFixed(1)),
    note: 'Assessment only. Not an authorised prescription.'
  };
}

/** Saves even HARD STOP cases, but always leaves candidate dose cells blank. */

/**
 * Unique request marker lets retry repair partially completed saves
 * without appending the same calculation twice.
 */
function entryId_(d) {
  const id = String((d && d._entryId) || '');
  if (!id) return null; // Compatible with earlier/manual clients.
  if (!/^[A-Za-z0-9_-]{12,100}$/.test(id)) {
    throw new Error('Invalid assessment request ID.');
  }
  return id;
}

function ensureRows_(sheet, lastRow) {
  if (lastRow > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), lastRow - sheet.getMaxRows());
  }
}

/**
 * Save a validated assessment under its 4-digit CR.
 * Saves even when hardStop=true, but leaves dose cells blank.
 * Both history and latest record are updated under one script lock.
 */
function persistAssessment_(d, assessment) {
  const cr = String((d && d.demoId) || '').trim();
  if (!/^\d{4}$/.test(cr)) {
    throw new Error('CR must contain exactly four digits, e.g. 0042.');
  }
  const email = requireAuthorisedUser_();
  const requestId = entryId_(d);
  const inputJSON = JSON.stringify(d);
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('Records busy; please retry the save.');

  try {
    const ss = workbook_();
    const history = ss.getSheetByName(CFG.historyName);
    const latest = ss.getSheetByName(CFG.latestName);
    if (!history || !latest) throw new Error('Run setupWorkbook first.');

    let historyRow = null;
    let date = null;
    let historic = null;

    if (requestId && history.getLastRow() > 1) {
      const match = history.getRange(2, 4, history.getLastRow() - 1, 1)
        .createTextFinder('"_entryId":"' + requestId + '"')
        .matchCase(true)
        .findNext();

      if (match) {
        historyRow = match.getRow();
        historic = history.getRange(historyRow, 1, 1, HISTORY_HEADERS.length).getValues()[0];
        if (String(historic[1]) !== cr || String(historic[3]) !== inputJSON) {
          throw new Error('Duplicate assessment ID with different data. Save blocked.');
        }
        date = historic[0];
      }
    }

    if (!historic) {
      date = new Date();
      historyRow = history.getLastRow() + 1;
      ensureRows_(history, historyRow);
      history.getRange(historyRow, 2).setNumberFormat('@');

      historic = [
        date, cr, email, inputJSON, assessment.status,
        assessment.hardStop ? 'YES' : 'NO',
        JSON.stringify(assessment.stopReasons),
        assessment.hardStop || !assessment.candidate ? '' : assessment.candidate.mpDaily,
        assessment.hardStop || !assessment.candidate ? '' : assessment.candidate.mtxWeekly,
        assessment.bsa,
        assessment.hardStop ? '' : assessment.ref6,
        assessment.hardStop ? '' : assessment.refM,
        CFG.algorithmVersion
      ];
      history.getRange(historyRow, 1, 1, HISTORY_HEADERS.length).setValues([historic]);
    }

    const last = latest.getLastRow();
    const match = last > 1
      ? latest.getRange(2, 1, last - 1, 1)
        .createTextFinder(cr).matchEntireCell(true).findNext()
      : null;
    const latestRow = match ? match.getRow() : last + 1;
    ensureRows_(latest, latestRow);

    // A retry for an old request must not replace a more recent CR entry.
    const currentHistoryRow = match ? Number(latest.getRange(latestRow, 8).getValue()) : 0;
    if (!currentHistoryRow || currentHistoryRow <= historyRow) {
      latest.getRange(latestRow, 1).setNumberFormat('@');
      latest.getRange(latestRow, 1, 1, LATEST_HEADERS.length).setValues([[
        cr, date, historic[2], historic[3],
        historic[4], historic[5], historic[6], historyRow
      ]]);
    }

    const savedAt = date instanceof Date ? date.toISOString() : String(date);
    return {cr: cr, savedAt: savedAt, historyRow: historyRow, reused: !!requestId && !!historic && historic[0] !== undefined};
  } finally {
    lock.releaseLock();
  }
}

/** Single call used by Calculate: assessment + auto-save, including toxicity. */
function assessAndSave(d) {
  // Server-side enforcement; hiding a button alone is not secure.
  if (CFG.publicReadOnly) {
    throw new Error('Public calculator: saving is disabled. No patient records were written.');
  }
  const r = assessCase(d);
  const info = persistAssessment_(d, r);
  return {assessment: r, saved: true, cr: info.cr, savedAt: info.savedAt};
}

/** Manual retry for a failed auto-save. */
function saveAssessment(d) {
  if (CFG.publicReadOnly) {
    throw new Error('Public calculator: saving is disabled. No patient records were written.');
  }
  const r = assessCase(d);
  const info = persistAssessment_(d, r);
  return 'Saved to AssessmentHistory for CR ' + info.cr +
    (r.hardStop ? ' (hard stop flagged).' : '.');
}

/* Legacy records remain in DemoCases; migration only copies them. */
function legacyCR_(raw, displayed) {
  const shown = String(displayed[1] || '').trim();
  if (/^\d{4}$/.test(shown)) return shown;
  try {
    const id = String(JSON.parse(String(raw[2] || '')).demoId || '').trim();
    return /^\d{4}$/.test(id) ? id : null;
  } catch (_) { return null; }
}
function legacyRowMarker_(value) {
  try {
    const lines = JSON.parse(String(value || ''));
    const m = Array.isArray(lines)
      ? lines.find(x => typeof x === 'string' && /^LEGACY_SOURCE_ROW=\d+$/.test(x))
      : null;
    return m ? Number(m.split('=')[1]) : null;
  } catch (_) { return null; }
}
function previewLegacyMigration() {
  requireAuthorisedUser_();
  const sh = workbook_().getSheetByName('DemoCases');
  if (!sh) return 'DemoCases does not exist; nothing to import.';
  const n = Math.max(0, sh.getLastRow() - 1);
  if (!n) return 'DemoCases is empty.';
  const raw = sh.getRange(2, 1, n, 7).getValues();
  const txt = sh.getRange(2, 1, n, 7).getDisplayValues();
  let valid = 0, invalid = 0;
  for (let i = 0; i < n; i++) {
    if (txt[i].every(x => x === '')) continue;
    if (legacyCR_(raw[i], txt[i])) valid++; else invalid++;
  }
  return 'Legacy rows: ' + n + '; valid CR: ' + valid +
    '; invalid CR for manual review: ' + invalid + '. No data changed.';
}
function migrateLegacyDemoCases() {
  requireAuthorisedUser_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Import busy.');
  try {
    const ss = workbook_();
    const source = ss.getSheetByName('DemoCases');
    const history = ss.getSheetByName(CFG.historyName);
    const latest = ss.getSheetByName(CFG.latestName);
    if (!source) return 'DemoCases not found; no data changed.';
    if (!history || !latest) throw new Error('Run setupWorkbook first.');
    const oldHeader = source.getRange(1, 1, 1, 7).getDisplayValues()[0];
    if (oldHeader[0] !== 'Timestamp' || oldHeader[1] !== 'Test CR (4 digits)' ||
        oldHeader[2] !== 'Input JSON') throw new Error('DemoCases headers unexpected; stopped.');
    if (history.getRange(1,1,1,HISTORY_HEADERS.length).getDisplayValues()[0].join('|') !== HISTORY_HEADERS.join('|') ||
        latest.getRange(1,1,1,LATEST_HEADERS.length).getDisplayValues()[0].join('|') !== LATEST_HEADERS.join('|')) {
      throw new Error('Destination headers unexpected; stopped.');
    }
    const n = Math.max(0, source.getLastRow() - 1);
    if (!n) return 'No old records to import.';
    const raw = source.getRange(2, 1, n, 7).getValues();
    const displayed = source.getRange(2, 1, n, 7).getDisplayValues();
    const prior = history.getLastRow() > 1
      ? history.getRange(2,1,history.getLastRow()-1,HISTORY_HEADERS.length).getValues()
      : [];
    const imported = new Set();
    for (const row of prior) {
      if (row[12] === 'LEGACY-v3') {
        const sourceRow = legacyRowMarker_(row[6]);
        if (sourceRow !== null) imported.add(sourceRow);
      }
    }
    const rows = [];
    let already = 0, invalid = 0;
    for (let i = 0; i < n; i++) {
      if (displayed[i].every(x => x === '')) continue;
      const line = i + 2;
      if (imported.has(line)) { already++; continue; }
      const cr = legacyCR_(raw[i], displayed[i]);
      if (!cr) { invalid++; continue; }
      const notes = [
        'LEGACY_SOURCE_ROW=' + line,
        'Historic Fast v3 assessment, NOT reassessed for toxicity',
        'Original status: ' + String(raw[i][3] || ''),
        'Original 6-MP: ' + String(raw[i][4] || ''),
        'Original MTX: ' + String(raw[i][5] || ''),
        'Original save marker: ' + String(raw[i][6] || '')
      ];
      rows.push([
        raw[i][0], cr, 'LEGACY AUTHOR UNKNOWN', String(raw[i][2] || ''),
        'LEGACY — NOT REASSESSED', 'UNKNOWN', JSON.stringify(notes),
        '', '', '', '', '', 'LEGACY-v3'
      ]);
    }
    if (rows.length) {
      const pos = history.getLastRow() + 1;
      ensureRows_(history, pos + rows.length - 1);
      history.getRange(pos, 2, rows.length, 1).setNumberFormat('@');
      history.getRange(pos, 1, rows.length, HISTORY_HEADERS.length).setValues(rows);
    }

    // Do not overwrite a newer record already present for this CR.
    const existingCRs = new Set();
    if (latest.getLastRow() > 1) {
      latest.getRange(2,1,latest.getLastRow()-1,1)
        .getDisplayValues().forEach(x => existingCRs.add(String(x[0]).trim()));
    }
    const now = history.getLastRow() > 1
      ? history.getRange(2,1,history.getLastRow()-1,HISTORY_HEADERS.length).getValues()
      : [];
    const newest = new Map();
    now.forEach((row, i) => {
      if (row[12] !== 'LEGACY-v3') return;
      const line = legacyRowMarker_(row[6]);
      if (line === null) return;
      const cr = String(row[1]).trim();
      const old = newest.get(cr);
      if (!old || line > old.line) newest.set(cr, {row, line, historyRow:i+2});
    });
    const latestRows = [];
    newest.forEach((v, cr) => {
      if (existingCRs.has(cr)) return;
      latestRows.push([
        cr, v.row[0], v.row[2], v.row[3],
        v.row[4], 'UNKNOWN', v.row[6], v.historyRow
      ]);
    });
    if (latestRows.length) {
      const pos = latest.getLastRow()+1;
      ensureRows_(latest, pos+latestRows.length-1);
      latest.getRange(pos,1,latestRows.length,1).setNumberFormat('@');
      latest.getRange(pos,1,latestRows.length,LATEST_HEADERS.length).setValues(latestRows);
    }
    return 'Imported ' + rows.length + ', already imported ' + already +
      ', invalid CR ' + invalid + ', latest CR rows added ' + latestRows.length +
      '. DemoCases was not changed.';
  } finally {
    lock.releaseLock();
  }
}

function runSelfTests() {
  const d = {
    demoId: '0001', age: 6, height: 115, weight: 20,
    current6: 12, currentM: 12, wbc: 2500,
    anc: 1000, alc: 900, platelets: 180000,
    prevWbc: 2600, prevAnc: 1050,
    bilirubin: 0.8, biliULN: 1, ast: 30, alt: 30,
    transULN: 40, rising: 'no', fever: 'no',
    infection: 'no', jaundice: 'no', mucositis: 'no',
    tpmt: 'normal', nudt15: 'normal', adherence: 'good'
  };
  const normal = assessCase(d);
  if (normal.hardStop || !normal.candidate) throw new Error('Normal synthetic test failed');
  for (const changed of [
    {anc: 400}, {platelets: 40000}, {fever: 'yes'},
    {jaundice: 'yes'}, {bilirubin: 4}, {tpmt: 'unknown'}
  ]) {
    const r = assessCase(Object.assign({}, d, changed));
    if (!r.hardStop || r.candidate !== null) {
      throw new Error('Safety test failed: ' + JSON.stringify(changed));
    }
  }
  return '7 software checks passed on synthetic cases; not clinical validation.';
}