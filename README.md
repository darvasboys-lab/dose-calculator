# PHO ALL Calculator

**Unvalidated research prototype. Not an authorised chemotherapy prescribing tool.**

## Open without sign-in and save to the linked Sheet

The current source supports a straightforward single-doctor demonstration workflow:

1. Open the existing Apps Script web-app URL. The small gold **Updated to version N** notice closes automatically after about three seconds (or tap it to dismiss).
2. Enter a four-digit **CR** at the top of Patient Details, then enter age, height, weight, prescribed doses and the other values on the Patient, CBC, LFT Panel and Clinical tabs.
3. Press **Calculate Assessment**. This calls the read-only `assessCase()` function and **does not save** anything to Google Sheets.
4. After the result appears, choose **Save to Google Sheets? Yes (green) / No (red)**. Only **Yes** calls `assessAndSave()`. **No** leaves the result visible without writing a row.
5. The result shows **Saved to Google Sheets** only after the backend confirms both `AssessmentHistory` and `LatestByCR` were updated. A failed save offers **Retry save** using the same request ID.

**Previous CR values:** After a successful Yes/save, the entered form values are also cached for that *same browser tab/session*. Entering that four-digit CR again restores age, height, weight, doses, CBC, LFT and clinical choices, and recalculates the visible BSA. This is **not a Google Sheets record lookup**: older Sheet records, other devices and new browser sessions are not available through public CR autofill. Four digits are easy to guess; anonymously reading Google Sheets records by CR would expose stored clinical information. Cache only fictional examples.

The browser uses `assessCase()` for the preview, `assessAndSave()` after Yes, and `saveAssessment()` to retry with the same request ID. The backend retains append-only history, four-digit CRs (including leading zeroes), and safety hard stops. A hard-stop row is saved without candidate-dose values. Existing `DemoCases` and older records remain unchanged by deployment.

**Public-link trade-off:** There is deliberately **no account sign-in, doctor key, password or visitor identity check** on saving. The script executes as its owner; anyone who obtains the public web-app URL can submit and potentially overwrite a `LatestByCR` entry. Rows are labelled `Anonymous web submission`, not falsely attributed to the owner. Keep the Sheet itself private, avoid sharing the URL widely and **use fictional data only**. This is not suitable for real patient data without appropriate authenticated access and clinical/privacy review.

## Deployment

See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for GitHub Actions and manual deployment.

To avoid visitor Google sign-in, use the existing Apps Script deployment settings **Execute as: Me** and **Who has access: Anyone**. This option does not require visitors to be granted access to the linked spreadsheet because saving uses the owner's script authorisation. The script owner must grant the relevant Apps Script/Sheets permissions during deployment.

The workflow is configured to deploy updates to the existing web-app URL only after the GitHub environment and credentials have been configured. It now stamps the *actual next Google Apps Script version number* into the golden banner before creating the deployment, and verifies the resulting deployment number.

For a manual Windows CMD deployment, in your existing `PHO-ALL-LiveDeploy` folder, download the latest `Code.gs` as `Code.js`, `Index.html` as `Index.html`, and `scripts/stamp-deployment-version.mjs`. Run `node stamp-deployment-version.mjs` immediately before `clasp push --force`, then update the existing deployment with `clasp create-deployment --deploymentId ...`. Finally run `node stamp-deployment-version.mjs --verify`. The version helper uses `clasp list-versions` and `clasp list-deployments`; it does not request additional Google permissions or make visitor-side API calls. Always refresh `Index.html` before each stamp. Preserve the cloned `.clasp.json` and `appsscript.json` files.

## Proposed maintenance therapy rule panel (not validated)

The current calculator includes a **proposed maintenance rule table** supplied for review on 20 November 2026. The result lists **7 checks**, showing each matched condition and which checks changed the calculated illustration:

| WBC (/µL) | Table level displayed |
| --- | --- |
| Below 1,000 | 0%; candidate suppressed for clinician review |
| 1,000–2,000 | 50% |
| Above 2,000–3,000 | 100% |
| Above 3,000 | Up to 150%; the prototype illustrates 150% |

The result also checks **ANC (stated target 750–1,500/µL)**, **ALC below 300/µL** (50% cap), **platelets below 50,000/µL** (0%/hard stop), and the **platelet recovery threshold above 100,000/µL** if therapy was previously held. The older ANC below 500/µL safety stop remains. Some combinations require clinician review rather than a numerical candidate. **LFT is optional** and liver thresholds run only when results and reference values are present. **RFT creatinine is optional** and recorded without dosing changes: no renal-dose thresholds were supplied.

**Dose entry:** The app accepts current 6-MP as **50 mg tablets per day**, and current MTX as **2.5 mg tablets per week**. It calculates milligram equivalents. For a fictional 1-tablet 6-MP daily / 4-tablet MTX weekly example at a WBC above 3,000/µL, the 150% calculation displays **1.5 tablets daily** and **6 tablets weekly**. That is **150% of the entered dose, a 50% increase**, not a 150% increase.

**Important modelling limitation:** Protocol dose percentages normally relate to a documented protocol/previously attained full dose; the current prototype applies percentage multipliers to the *entered dose*. Repeated application may compound incorrectly. The project cannot safely support treatment decisions until a qualified clinical team resolves baseline-dose definitions, tablet splitting/rounding, drug interruption/restart status and local protocol applicability. Do not deploy these rules for patient care.

## Clinical boundaries

- The dose rules and reference coefficients are illustrative and unvalidated; the latest proposed CBC modification table has not undergone institutional clinical verification.
- Default symptoms, pharmacogenetic statuses and starting doses are fictional examples, not confirmed findings.
- The app is not a prescription, order to hold or resume chemotherapy, or a substitute for oncologist review.
- Clinical hard-stop alerts persist on the result screen. Noncritical repeated cautions collapse after three seconds and remain available under **Safety notes**.
