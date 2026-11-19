# PHO ALL Calculator

**Unvalidated, synthetic-data-only prototype. Not an authorised chemotherapy prescribing tool.**

Four-tab Google Apps Script / Google Sheets calculator for 6-mercaptopurine (6-MP) and methotrexate (MTX) maintenance dose *demonstration*, with CR-linked assessment records and provisional toxicity hard-stop flags.

## Automatic assessment saving

**Click _Calculate Assessment_** after completing the form. The calculator shows the prototype assessment promptly using `assessCase()`, and independently calls `assessAndSave()` to **save the calculated snapshot automatically**. The UI confirms success only after the server reports that the record was saved.

- **AssessmentHistory:** append-only assessment history, including save date/time, exactly four-digit CR (leading zeros preserved), entered inputs, warnings/hard-stop markers and any provisional dose candidates.
- **LatestByCR:** most recently completed assessment for each CR. Previous history rows remain intact.
- **Hard-stop cases are saved too:** candidate doses are blank, with stop reasons recorded. A software *hard stop* prevents automatic suggestions; it does **not** independently instruct holding chemotherapy.
- If storing fails, the interface displays **NOT SAVED** and a **Retry save** button, while separately requesting the safety assessment so toxicity alerts remain visible. The retry uses the same unique request ID to avoid duplicate history entries. Rendering the assessment before save completion does **not** mean it was saved.
- **Saving occurs on Calculate, not on every keystroke or tab change.** The UI never silently claims an assessment was saved.

**No patient data should ever be committed, uploaded, placed in an Issue or stored in this GitHub repository.** GitHub contains source code only; assessment storage is the **linked Google Sheet**, whose sharing and Apps Script permissions must be restricted.

## Deployment and setup

1. **Make a full backup of the existing Google spreadsheet**, including `DemoCases`. Keep copies in institution-approved restricted storage.
2. In that spreadsheet, choose **Extensions → Apps Script**. Use the repository's full `Code.gs` and `Index.html` as the bound project source. The GitHub Actions deployment workflow is ready but requires **one-time Google authorisation and a protected production environment** before it can update this project. See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md). Until that setup is completed, changes on GitHub will **not** reach the live Apps Script deployment.
3. Run `setupWorkbook()` once to create/check `AssessmentHistory` and `LatestByCR`. This function does **not** delete or clear `DemoCases`.
4. In **Project Settings → Script Properties**, configure `PGICH_ALLOWED_EMAILS` as comma-separated approved Google account email addresses. `setupWorkbook()` initializes the property to the setup account if missing. Saving/migration requires a nonblank active user's email in that list.
5. Restrict Sheet sharing and any web-app access to authorised institutional accounts. If `Session.getActiveUser().getEmail()` is blank under a deployment mode, **saving is intentionally denied** rather than falling back to the script owner's identity. Do not enable anonymous access or deploy publicly for patient information.
6. Run `runSelfTests()` using **fictional inputs**; reopen the sidebar through **PHO ALL Calculator → Open calculator**. If deploying as a web app, publish a **new deployment version** after code changes.
7. Test a fictional CR such as `0042`: calculate; check for an explicit “Saved automatically” notice, then verify the corresponding rows in both record tabs. Repeat with a synthetic toxicity flag and check that doses are suppressed and reasons saved.


## GitHub Actions continuous deployment

See **[DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md)** for the one-time secure setup and the existing web-app deployment ID. After the owner configures the `production` GitHub environment with required reviewers, script ID, deployment ID and protected OAuth secret, GitHub Actions can update the **same** Apps Script web-app URL when `Code.gs` or `Index.html` changes on `main`. Deployment requires approval of the protected environment.

The workflow downloads the existing Apps Script project first to preserve its manifest and other files. Since `clasp push` replaces full project source, make a separate backup before enabling the automation. Source checks do not constitute clinical validation.

## Retaining older v3 records

The earlier `DemoCases` tab is preserved in place. To copy its data without modifying it:

1. Run `previewLegacyMigration()` and review the valid/invalid CR counts.
2. Run `migrateLegacyDemoCases()` after making a backup.
3. Verify the added `AssessmentHistory` and `LatestByCR` rows and the **unchanged** `DemoCases` row count.
4. Re-running migration skips previously imported source rows. Historic dose suggestions are preserved only inside textual notes; historic candidate columns are blank and toxicity is **not** retrospectively assessed.

A four-digit CR number alone may not be globally unique. Institutional identification and duplicate-resolution processes are required before any operational use.

## Clinical and privacy boundaries

- **The dose thresholds, targets and adjustment percentages are illustrative and unvalidated.** The app does not replace treating-oncologist decisions, a local chemotherapy protocol or independent prescription verification.
- The UI preselects “No” for toxicity symptoms and “Normal” for TPMT/NUDT15 **for synthetic demos**. Those defaults are **not confirmed patient findings**, and must not be trusted without verified actual results. The editable example starting values are currently 35 mg/day for 6-MP and 20 mg/week for MTX; **they are not recommended doses** and must be replaced with confirmed actual prescribed doses.
- **Do not enter real patient identifiers or health data until the institution has approved clinical validation, role-based access, audit, retention, security, consent/privacy processes and the appropriateness of Google Sheets storage.**
- A saved entry is **not** an authorised prescription and does not imply that therapy should be administered or withheld.
