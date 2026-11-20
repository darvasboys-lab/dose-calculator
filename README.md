# PHO ALL Calculator

**Unvalidated research prototype. Not an authorised chemotherapy prescribing tool.**

## Open without sign-in and save to the linked Sheet

The current source supports a straightforward single-doctor demonstration workflow:

1. Open the existing Apps Script web-app URL. The small gold **Updated to version N** notice closes automatically after about three seconds (or tap it to dismiss).
2. Enter a four-digit **CR** at the top of Patient Details, then enter age, height, weight, current doses and the other values on Patient, CBC, **LFT / KFT**, and Clinical tabs. LFT/KFT values may be left blank. The transaminase-trend control has **Yes / No / Unassessed** buttons (Unassessed selected initially).
3. Press **Calculate Assessment**. The browser calls `assessAndSave()`: the calculation and its inputs are **saved to Google Sheets automatically**, including hard-stop assessments. A successful save is confirmed on the result screen.
4. The result asks **Remove from Sheets? Yes (red) / No (green)**. **No** leaves the saved record in place. **Yes** removes only the newly saved assessment after verifying its unique request ID and complete input; it never deletes all records for a four-digit CR.
5. Removing clears the matching `AssessmentHistory` row without shifting other history references, and restores `LatestByCR` to the previous record for that CR (or removes that CR's latest entry if none remains). If automatic saving fails, the assessment stays visible and offers **Retry save** with the same request ID. The removal prompt appears only after a confirmed save.

**Previous CR values:** After an automatic successful save, the entered form values are also cached for that *same browser tab/session*. Entering that four-digit CR again and then leaving the CR field restores age, height, weight, doses, CBC, LFT/KFT and clinical choices, and recalculates the visible BSA. Restoration is deferred until focus leaves the input so the mobile number keypad stays open while typing. This is **not a Google Sheets record lookup**: older Sheet records, other devices and new browser sessions are not available through public CR autofill. Four digits are easy to guess; anonymously reading Google Sheets records by CR would expose stored clinical information. Cache only fictional examples.

The browser uses `assessAndSave()` on Calculate, `removeSavedAssessment()` for an explicit Yes to removal, and `saveAssessment()` only to retry an unconfirmed save with the same request ID. Four-digit CRs (including leading zeroes) and safety hard stops remain. Hard-stop assessments are saved without candidate-dose values. The removal operation clears only the identified assessment, preserves other CR history row references, and does not touch `DemoCases`. Older records are unchanged by deployment.

**Public-link trade-off:** There is deliberately **no account sign-in, doctor key, password or visitor identity check** on saving. The script executes as its owner; anyone who obtains the public web-app URL can submit and potentially overwrite a `LatestByCR` entry. Rows are labelled `Anonymous web submission`, not falsely attributed to the owner. Keep the Sheet itself private, avoid sharing the URL widely and **use fictional data only**. This is not suitable for real patient data without appropriate authenticated access and clinical/privacy review.

## Deployment

See [DEPLOYMENT_SETUP.md](DEPLOYMENT_SETUP.md) for GitHub Actions and manual deployment.

To avoid visitor Google sign-in, use the existing Apps Script deployment settings **Execute as: Me** and **Who has access: Anyone**. This option does not require visitors to be granted access to the linked spreadsheet because saving uses the owner's script authorisation. The script owner must grant the relevant Apps Script/Sheets permissions during deployment.

The workflow is configured to deploy updates to the existing web-app URL only after the GitHub environment and credentials have been configured. It now stamps the *actual next Google Apps Script version number* into the golden banner before creating the deployment, and verifies the resulting deployment number.

For a manual Windows CMD deployment, in your existing `PHO-ALL-LiveDeploy` folder, download the latest `Code.gs` as `Code.js`, `Index.html` as `Index.html`, and `scripts/stamp-deployment-version.mjs`. Run `node stamp-deployment-version.mjs` immediately before `clasp push --force`, then update the existing deployment with `clasp create-deployment --deploymentId ...`. Finally run `node stamp-deployment-version.mjs --verify`. The version helper uses `clasp list-versions` and `clasp list-deployments`; it does not request additional Google permissions or make visitor-side API calls. Always refresh `Index.html` before each stamp. Preserve the cloned `.clasp.json` and `appsscript.json` files.

## Clinic maintenance rules with matched protocol references

The calculator prioritises **Ma’am’s clinic rules (20 November 2026)**. AIEOP-BFM ALL 2009 §24.9.1.2 (printed pp.155–156, PDF pp.165–166) is the closer source for WBC-guided adjustment and low ALC/platelets. It does **not** prescribe the clinic's exact 0/50/100/150% bands; those steps are explicitly attributed to Ma’am. The ANC 750–1,500/µL target also matches ICiCLe ALL-14 Appendix 14 (printed p.167). The result lists **7 checks**, each with its source and an explanation of what calculated, limited, blocked or skipped the result:

| WBC (/µL) | Table level displayed |
| --- | --- |
| Below 1,000 | 0%; candidate suppressed for clinician review |
| 1,000–2,000 | 50% |
| Above 2,000–3,000 | 100% |
| Above 3,000 | Up to 150%; the prototype illustrates 150% |

The result also checks **ANC (stated target 750–1,500/µL)**, **ALC below 300/µL** (50% cap), **platelets below 50,000/µL** (0%/hard stop), and the **platelet recovery threshold above 100,000/µL** if therapy was previously held. The older ANC below 500/µL safety stop remains. Some combinations require clinician review rather than a numerical candidate. **LFT is optional** and liver thresholds run only when results and reference values are present. **KFT creatinine is optional** and recorded without dosing changes: no renal-dose thresholds were supplied.

**Dose entry:** The app accepts current 6-MP as **50 mg tablets per day**, and current MTX as **2.5 mg tablets per week**. It calculates milligram equivalents. For a fictional 1-tablet 6-MP daily / 4-tablet MTX weekly example at a WBC above 3,000/µL, the 150% calculation displays **1.5 tablets daily** and **6 tablets weekly**. That is **150% of the entered dose, a 50% increase**, not a 150% increase.

**Baseline and protocol distinction:** The clinic's fixed percentage levels are applied to the *entered dose*, not a verified protocol baseline. Repeating a calculation with the previous result as the new entered dose compounds percentages. BFM recommends WBC-directed titration, while ICiCLe instead uses staged ANC-based adjustments. These are not identical regimens; the source and effect are shown beside every rule. Confirm the baseline and treatment phase before relying on numerical results.

## Verification against two supplied clinical protocols

The 20 November 2026 **Ma’am’s clinic rule** was added: with available ALT or bilirubin and the corresponding ULN, **ALT >5 × ULN OR bilirubin >5 × ULN** blocks both candidate-dose displays and records the clinic-specific interruption instruction for oncologist confirmation. The BFM bilirubin threshold **>3 × ULN and up to 5 × ULN** is now treated as **review required (no numerical candidate, but not labelled interruption)**. The clinic's **>5 × ULN** threshold is a separate hard stop. No LFT result means this particular check cannot run.

The source documents supplied for review are **AIEOP-BFM ALL 2009 Study 9, v1.2, 15 April 2011, pp. 155–156** (PDF pp. 165–166) and **ICiCLe ALL-14/InPOG-ALL-15-01, v4.0, 2 May 2018, Appendix 14 p. 167** (PDF p. 167). They are **not interchangeable**:

| Topic | BFM 2009 §24.9.1.2 | ICiCLe Appendix 14 |
| --- | --- | --- |
| Titration target | Leukocytes below 3,000/µL | ANC 750–1,500/µL and platelets ≥75,000/µL |
| Reduction / stop | WBC <1,500; granulocytes <500; ALC <300; platelets <50,000 → reduce or if necessary stop | ANC ≤500 or platelets ≤50,000 → stop both; resume after ANC ≥1,000 and platelets ≥75,000 |
| Escalation | Increase toward desired WBC; can exceed 150% of reference dose | ANC persistently >2,000 for ≥4 weeks: assess adherence, sequentially increase 6-MP by 25%, then MTX by 25% after further monitoring |
| Hepatic | Consider reduction at bilirubin >3× ULN or rising aminotransferases >10–20× ULN | Raised transaminases alone do not dictate adjustment; withhold in cholestasis / conjugated hyperbilirubinemia |
| Reference starting 6-MP | 50 mg/m²/day | 60 mg/m²/day |
| Oral MTX | 20 mg/m² once weekly | 20 mg/m² once weekly |

**Mismatch still to resolve:** The current WBC band calculator uses the local 0/50/100/150% table, immediately illustrates 150% when WBC >3,000, and applies percentages to the entered dose. It therefore does **not exactly implement BFM or ICiCLe**. ICiCLe requires persistent ANC elevation, adherence assessment, and staged escalation; BFM uses a 50 mg/m² baseline whereas ICiCLe uses 60 mg/m². Additionally ICiCLe uses 12.5-mg quarter-tablet steps for 6-MP; this app's 50-mg tablet entry uses half-tablet increments. The chosen institutional algorithm, baseline, and formulation need to be confirmed before real-world dosing.

### Mobile number keypad

A numeric editing change no longer repeatedly destroys/reflows the result panel. Stale results are hidden visually without collapsing page height during active numeric input and fully removed after the field loses focus. Numeric fields use decimal keyboard hints, and same-CR autofill happens on field exit rather than on every digit. This was verified with simulated browser focus/input events, not an on-device mobile browser.

## Clinical boundaries

- The dose rules and reference coefficients are illustrative and unvalidated; the latest proposed CBC modification table has not undergone institutional clinical verification.
- Default symptoms, pharmacogenetic statuses and starting doses are fictional examples, not confirmed findings.
- The app is not a prescription, order to hold or resume chemotherapy, or a substitute for oncologist review.
- Clinical hard-stop alerts persist on the result screen. Noncritical repeated cautions collapse after three seconds and remain available under **Safety notes**.
