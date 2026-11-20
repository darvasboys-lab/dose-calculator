/**
 * Stamp the real NEXT Apps Script project version into the minimalist
 * welcome banner immediately before an existing deployment is updated.
 *
 * Run this in the cloned clasp project directory after downloading
 * Index.html from GitHub and BEFORE clasp push --force.
 *
 * No additional Google Apps Script OAuth scope, page API call or visitor login.
 */
import {execSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const SCRIPT_ID = '1B-TfRTbxeejxTmVZjTolycZeir8cH_xrt75C3UoikmYviwzHKRM4_eUk';
const DEPLOYMENT_ID = 'AKfycbyVkV2rKnb9dcCk9VdNXgjsQnXN653SaTI8RDZ5kcBpbbV2zHMhecNmQVvg4piRBLnC';
const MARKER = '__PHO_DEPLOYMENT_VERSION__';
const directory = process.cwd();
const indexPath = join(directory, 'Index.html');
const claspConfigPath = join(directory, '.clasp.json');

function fail(reason) {
  console.error('Version banner: ' + reason);
  process.exit(1);
}
function clasp(command) {
  try {
    return execSync('clasp ' + command, {
      cwd: directory, encoding: 'utf8', windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    }).replace(/\x1b\[[0-9;]*m/g, '');
  } catch (error) {
    fail('clasp ' + command + ' failed: ' +
      (error.stderr ? String(error.stderr) : error.message));
  }
}
if (!existsSync(claspConfigPath) || !existsSync(indexPath)) {
  fail('Run this inside the existing PHO-ALL-LiveDeploy clasp folder.');
}
let config;
try {
  config = JSON.parse(readFileSync(claspConfigPath, 'utf8'));
} catch (_) {
  fail('Could not read .clasp.json.');
}
if (config.scriptId !== SCRIPT_ID) {
  fail('The local .clasp.json points to a different project. Nothing was changed.');
}
const html = readFileSync(indexPath, 'utf8');

if (process.argv.includes('--verify')) {
  const match = html.match(/id="deploymentVersion">(\d+)<\/strong>/);
  if (!match) fail('No numeric version was stamped in Index.html.');
  const lines = clasp('list-deployments').split(/\r?\n/);
  const line = lines.find(value => value.includes(DEPLOYMENT_ID));
  if (!line || !line.includes('@' + match[1])) {
    fail('Deployment does not match the stamped version ' + match[1] +
      '. Review clasp list-deployments.');
  }
  console.log('Verified: Updated to version ' + match[1]);
  process.exit(0);
}

if (!html.includes(MARKER)) {
  fail('Version marker missing. Download the latest Index.html before running this command.');
}
const deployments = clasp('list-deployments');
if (!deployments.includes(DEPLOYMENT_ID)) {
  fail('The existing PHO web-app deployment was not found. Nothing was changed.');
}
const versionsOutput = clasp('list-versions');
const count = versionsOutput.match(/Found\s+(\d+)\s+versions?\b/i);
if (!count) fail('Could not read Apps Script version count. Nothing was changed.');
const nextVersion = Number(count[1]) + 1;
if (!Number.isSafeInteger(nextVersion) || nextVersion < 1) {
  fail('Invalid next Apps Script version number.');
}
writeFileSync(indexPath, html.replace(MARKER, String(nextVersion)), 'utf8');
console.log('Banner prepared: Updated to version ' + nextVersion);
console.log('This number must match the version created by clasp create-deployment.');
