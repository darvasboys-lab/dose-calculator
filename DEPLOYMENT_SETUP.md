# Connect GitHub to the existing PHO ALL Calculator Apps Script web app

**Public access:** The current source is a read-only demo. After updating the source, use Apps Script **Deploy → Manage deployments → Edit existing web-app deployment**, choose **Execute as: Me** and **Who has access: Anyone** (anonymous), then publish a new version to retain the existing `/exec` URL. Do **not** choose **User accessing the web app**, which prompts every visitor to sign in. No visitor assessments are saved; the backend blocks `assessAndSave` and `saveAssessment`. Use fictional data only. This setting must be changed in the Google Apps Script deployment UI, not in GitHub.

**Current state:** The GitHub Actions workflow is installed. It will NOT be able to deploy until the project owner adds the Google account credentials securely in a protected GitHub environment.

## What will happen

On changes to Code.gs or Index.html in the main branch, GitHub Actions checks JavaScript and HTML syntax, then requests permission from an approver in the production environment. Once approved, it:

1. Authenticates with Google using the protected CLASPRC_JSON environment secret.
2. Clones the EXISTING Apps Script project and preserves its manifest and all other existing project files.
3. Confirms the specified existing web-app deployment belongs to the specified Script ID before modifying anything.
4. Replaces just the cloned Code.gs (or Code.js) and Index.html with the GitHub versions, then pushes the full cloned project.
5. Updates the specified EXISTING deployment ID with a new version, preserving its public /exec URL.

WARNING: clasp push replaces the Apps Script project's entire online source. Cloning first reduces the risk of deleting unrelated scripts and manifest configuration, but is not a substitute for an offline backup. Spreadsheet rows and Script Properties are not edited by this workflow.

## Step 1: Backup and identify the project

- Back up current Apps Script source AND the linked Google Sheet in a private institution-approved location.
- In the Apps Script editor, choose Project settings → IDs → Script ID. This is NOT the deployment ID.
- In Deploy → Manage deployments confirm the existing Web app Deployment ID. The ID last provided in chat was:

    AKfycbyVkV2rKnb9dcCk9VdNXgjsQnXN653SaTI8RDZ5kcBpbbV2zHMhecNmQVvg4piRBLnC

- Enable the Apps Script API at https://script.google.com/home/usersettings.
- Confirm your Google account has edit and deploy permissions for the project.

## Step 2: Authorise clasp on your OWN computer

Install Node.js 22+, then run these commands in a local terminal:

    npm install --global @google/clasp@3.4.1
    clasp login

Sign in as the Google account authorised to edit the Apps Script project. This creates a credentials file named .clasprc.json in your home folder (Mac/Linux: ~/.clasprc.json; Windows: %USERPROFILE%\.clasprc.json).

This file contains an OAuth refresh token. NEVER send it to ChatGPT, GitHub issues, a shared document, or your public repository. Copy its contents ONLY into the GitHub environment secret in Step 4.

## Step 3: Create a protected GitHub production environment FIRST

Go to the repository:

https://github.com/darvasboys-lab/dose-calculator/settings/environments

Choose New environment and name it exactly production.

Before adding credentials:
- Configure Required reviewers (you or an authorised deployment approver).
- Restrict Deployment branches to main.
- Enable prevent self-review if your institutional approval process requires independent review.

This configuration ensures source changes cannot automatically go live without production approval.

## Step 4: Set TWO environment variables and ONE secret

Under Settings → Environments → production, add:

| Type | Name | Value |
| --- | --- | --- |
| Environment variable | APPS_SCRIPT_ID | Paste the Script ID from Apps Script Project settings |
| Environment variable | WEB_APP_DEPLOYMENT_ID | Paste the existing deployment ID from Manage deployments |
| Environment secret | CLASPRC_JSON | The COMPLETE JSON contents of ~/.clasprc.json after clasp login |

Use environment-level variables and secrets, not a repository file. A protected environment prevents a job from accessing the secret until approved. The token has significant account access: keep the environment restricted and rotate credentials when appropriate.

## Step 5: Trigger the first deployment

1. In GitHub select Actions → Deploy PHO ALL Calculator to Apps Script.
2. Select Run workflow → main.
3. Review and approve the production deployment when requested.
4. Confirm both workflow jobs succeed.
5. Open the existing /exec link in an incognito mobile browser to check the current UI.
6. Test only with fictional CR cases. Confirm the read-only result, no save attempts, existing DemoCases preservation and persistent toxicity warnings. Test an incognito browser without a Google account to confirm the deployment settings.

The first deployment will intentionally make the live script Code.gs and Index.html match GitHub, so back up online-only edits first.

## Future updates

Once configured, pushing approved changes to Code.gs or Index.html on GitHub main triggers the same protected deployment workflow automatically. Required reviewers must still approve the job. Pull requests run a separate source checker that does not access Google credentials.

## Common problems

- Missing environment settings: APPS_SCRIPT_ID, WEB_APP_DEPLOYMENT_ID and CLASPRC_JSON must be configured under production.
- Wrong ID: Script ID and Deployment ID are DIFFERENT; the workflow checks the deployment belongs to that project.
- Authorisation failed: Re-authorise clasp locally with the correct Google account and replace the GitHub environment secret.
- Cannot find Code.gs/Code.js or Index.html: Verify your existing Apps Script project contains those files. The workflow deliberately stops rather than generating duplicate script files.
- Sign-in prompt: In **Deploy → Manage deployments**, set **Execute as: Me** and **Who has access: Anyone** (anonymous), selecting a new version on the existing deployment. Changing source files alone does not change this setting.
- Attempted save: Public mode deliberately disables all web-app save endpoints; never remove that guard to let arbitrary visitors write sensitive records.
- If GitHub Actions cannot run due to organisation policy, ask your GitHub administrator to enable the approved Actions workflow.

## Clinical security

This is an **unvalidated, synthetic-data-only clinical decision-support prototype**, NOT an authorised chemotherapy prescribing system. Do not publish live patient records, Google Sheet exports or Google OAuth tokens to this public repository.

References: https://github.com/google/clasp and https://developers.google.com/apps-script/guides/clasp
