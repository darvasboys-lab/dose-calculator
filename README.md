# PHO ALL Calculator

**Unvalidated research prototype. Not an authorised chemotherapy prescribing tool.**

## Open without sign-in and save to the linked Sheet

The current source supports a straightforward single-doctor demonstration workflow:

1. Open the existing Apps Script web-app URL. The welcome panel closes automatically after four seconds, or press **Start assessment**.
2. Enter values on the Patient, CBC, LFT Panel and Clinical tabs, then press **Calculate Assessment**.
3. The server calculates the assessment and writes the snapshot to the attached Google Sheet.
4. The result shows **Saved automatically** only after the backend confirms that both `AssessmentHistory` and `LatestByCR` were updated. If saving fails, it still shows the calculation and offers **Retry save**.

The browser uses `assessAndSave()` to calculate and save, and `saveAssessment()` to retry with the same request ID. The backend retains append-only history, four-digit CRs (including leading zeroes), and safety hard stops. A hard-stop row is saved without candidate-dose values. Existing `DemoCases` and older records remain unchanged by deployment.

**Public-link trade-off:** There is deliberately **no account sign-in, doctor key, password or visitor identity check** on saving. The script executes as its owner; anyone who obtains the public web-app URL can submit and potentially overwrite a `LatestByCR` entry. Rows are labelled `Anonymous web submission`, not falsely attributed to the owner. Keep the Sheet itself private, avoid sharing the URL widely and **use fictional data only**. This is not suitable for real patient data without appropriate authenticated access and clinical/privacy review.

## Deployment

See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for GitHub Actions and manual deployment.

To avoid visitor Google sign-in, use the existing Apps Script deployment settings **Execute as: Me** and **Who has access: Anyone**. This option does not require visitors to be granted access to the linked spreadsheet because saving uses the owner's script authorisation. The script owner must grant the relevant Apps Script/Sheets permissions during deployment.

The workflow is configured to deploy updates to the existing web-app URL only after the GitHub environment and credentials have been configured. Otherwise use your authorised Windows CMD `clasp` installation; preserve the cloned `.clasp.json` and `appsscript.json` when pushing files.

## Clinical boundaries

- The dose rules and reference coefficients are illustrative and unvalidated.
- Default symptoms, pharmacogenetic statuses and starting doses are fictional examples, not confirmed findings.
- The app is not a prescription, order to hold or resume chemotherapy, or a substitute for oncologist review.
- Clinical hard-stop alerts persist on the result screen. Noncritical repeated cautions collapse after three seconds and remain available under **Safety notes**.
