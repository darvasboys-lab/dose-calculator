# PHO ALL Calculator

**Unvalidated demonstration only. Not an authorised chemotherapy prescribing or patient-record system.**

## Welcome banner

The app displays a brief welcome panel whenever it first opens. It shows **PHO ALL Calculator**, the source-build label **2026.11.20**, and a **Start assessment** button. It closes automatically after four seconds or immediately on button click. The build label is not the numeric Apps Script deployment version shown by `clasp list-deployments`.

## Public, no-login calculator

The current web-app source is designed for **read-only public demonstrations**. Visitors can open the link without signing in (after the owner changes the Apps Script deployment settings), complete the four tabs and view the synthetic assessment report.

- No visitor Google account or allowlisted email is needed to **calculate**.
- The browser calls only `assessCase()`; the server does arithmetic without opening the Google Sheet.
- `assessAndSave()` and `saveAssessment()` are disabled **on the server**, not merely hidden in the UI. The app **does not save new assessments** to `AssessmentHistory` or `LatestByCR`.
- Previously saved spreadsheet records and the `DemoCases` sheet are **not deleted** by these code changes. Keep their sharing restricted.
- The app shows a discrete "No sign-in" / "Entries are not saved" note so users know this is a demonstration.
- Use **fictional input and fictional CR numbers only**. Do not enter identifiable patients or genuine clinical information into an anonymous public demo. Values are processed by Google's script infrastructure to calculate a result, even though the app does not save them to its Sheet.

### Remove the Google sign-in prompt

The project owner must open **Apps Script → Deploy → Manage deployments → Edit (pencil)** for the EXISTING web-app deployment, then choose:

- **Execute as:** Me (the owner)
- **Who has access:** Anyone (anonymous, not "Anyone with Google account")
- **Version:** New version, when prompted

Save/deploy the existing deployment, preserving its `/exec` URL. The source code **cannot** change this deployment access setting on its own. These changes make calculations public, not the linked spreadsheet. Test the `/exec` link in a private/incognito browser that is not signed in.

**Important:** Do not use "User accessing the web app" when you want no-login access; that mode requires visitor Google authorisation.

## Files and protected deployment

- `Code.gs` is the Apps Script backend with illustrative assessment rules and enforced public no-save mode.
- `Index.html` is the four-tab mobile-friendly calculator and assessment display.
- `scripts/check-source.mjs` runs source checks and synthetic arithmetic tests.
- `.github/workflows/deploy-apps-script.yml` can update the existing deployment after protected GitHub credentials and review are configured. See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md).

**Manual deployment (Windows CMD):** In a separate folder cloned using `clasp clone-script`, retain `appsscript.json` and `.clasp.json`. Download the repository's `Code.gs` as `Code.js` and `Index.html` as `Index.html`. After checking the source, run `clasp push --force` and then update the EXISTING deployment ID with `clasp create-deployment --deploymentId ...`. Do not push the GitHub repo directory directly without first cloning/preserving the original manifest.

When the user changes inputs, stale requests are invalidated. Long requests show an error rather than remaining indefinitely on "Preparing assessment". Non-critical repeated caution notes collapse after three seconds; clinical hard-stop alerts and warnings remain visible.

## Historical record-management functions

Older code for `AssessmentHistory`, `LatestByCR` and `DemoCases` is retained for historical context, but new saves are blocked in **public read-only mode**. The `PGICH_SHEET_ID` and `PGICH_ALLOWED_EMAILS` script properties are left unchanged to avoid disrupting existing private records.

If the institution later requires authenticated assessment storage, it needs a **separately secured** workflow with verified user identity, appropriate sheet permissions, privacy review and approved clinical validation. Do not simply remove the backend public-read-only guard or enable unrestricted writing.

## Clinical and privacy limitations

- Built-in dose thresholds, reference coefficients and percentage rules are illustrative and **unvalidated**.
- Default answers for symptoms, adherence and TPMT/NUDT15 are demo placeholders, not confirmed patient results.
- The entered starting doses (example 35 mg/day of 6-MP and 20 mg/week of MTX) are not prescribing recommendations.
- Software hard stops prevent candidate calculations; they are **not independent orders to hold or resume medication**.
- Neither an assessment result nor BSA reference arithmetic is an authorised prescription. Any real-world use requires independent medical and institutional review.
