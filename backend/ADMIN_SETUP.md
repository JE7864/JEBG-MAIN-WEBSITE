# JEBG owner workspace — activation and operation

This change is source code, not a live Apps Script deployment. GitHub Pages cannot run Apps Script or secure spreadsheet records by itself. The public /admin/ page is an entry point; the actual dashboard runs inside an authenticated Google web app. No password, token, spreadsheet records or OAuth credentials are published in /docs.

## One-time activation (owner)

1. Open the existing Apps Script project attached to JEBG MAIN. Preserve its project, existing deployments, properties, triggers and spreadsheet data. Update Code.gs and Email.gs from this branch; add Settings.gs, Admin.gs and Admin.html. Update appsscript.json with the supplied manifest (adds userinfo.email). Do not put Apps Script sources under /docs.
2. The authorized owner is hard-coded as jamilaexim786vector@gmail.com in Admin.gs. Every admin RPC verifies Session.getActiveUser(), then checks a short-lived user-cache token. Blank identities and all other accounts fail closed. Do not substitute getEffectiveUser(): the public deployment executes as its owner.
3. Create a NEW, SEPARATE web app deployment for admin. Set execution to **User accessing the web app**, require Google sign-in, and use the most restrictive access option available for the owner. The supplied manifest retains the PUBLIC defaults; explicitly choose the private execution/access settings for this second deployment. Never change the public endpoint into a user-executed deployment. Authorize the new email-identity scope as the owner.
4. Open the new URL with ?page=admin while signed in as the owner. Test an incognito/signed-out session and another Google account: neither may load private records or invoke admin RPCs. If the active-user identity is blank, access is intentionally refused; check private deployment settings.
5. In the authenticated workspace verify the current spreadsheet, actual enquiry/application counts, email history, and request details. Test a status/notes edit on a designated test record and restore its values. Reopening a record after another editor changes it must reject a stale save.
6. Update the EXISTING PUBLIC deployment to a new version of the same project, retaining its deployment ID, URL, **Execute as Me** and **Anyone** access. Verify one authorized customer and one developer submission through the public website. Confirm saved rows, receipts and transactional email behavior. This step activates dynamic sheet routing for the public form and retry worker; do not attempt a sheet cutover until it is complete.
7. Save the private admin URL in Backend settings. Download backend-config.json from the workspace and publish that file to docs/backend-config.json through GitHub. Keep submissionUrl at the existing public endpoint unless intentionally migrating the web app. The public /admin/ launcher then fills the private URL automatically.
8. Recheck desktop/mobile dashboard layout in the live private deployment. The source includes responsive layouts, native dialogs, keyboard focus and safe text rendering, but final Google-hosted browser validation requires activation.

The existing email enable flag and retry trigger remain in the project. Do not rerun email activation as part of this update. Editor-only helpers now have trailing underscores, including setupJebgBackend_; these helpers are deliberately unavailable through google.script.run. If an editor does not offer a private helper in its Run menu, use a temporary editor-only wrapper and remove it before any deployment.

## Dashboard

Overview shows actual request totals, active follow-ups and queue states. Customer and developer tables support search, status filters and 20-record pages. Detail panels preserve submitted fields and opt-in evidence; only Status, Notes and Updated At UTC are editable. Saves use row fingerprints to reject stale edits. Email history is read-only. “Sent” means accepted by Google's sending service, not proven inbox delivery.

## Move to another spreadsheet

Use a dedicated destination spreadsheet owned by or shared with the owner and the public deployment owner. Spreadsheet ID/URL and web app URL have different purposes: changing a sheet does not require changing the public web app URL.

1. Test destination: read-only checks for access, managed tabs, exact headers and Etc/UTC timezone.
2. Prepare: explicitly confirm UTC if needed. All existing managed headers are checked before changes. Only missing tabs/blank headers are created; existing records are not overwritten. Unrelated tabs remain intact.
3. Preview: compares source/destination references and full managed row values. Duplicate references, conflicting rows, formula-like source text and in-flight Sending email rows block activation. Matching references are retained; missing source records are copied; destination-only records are retained.
4. Type the exact destination ID, then Copy, verify & activate. A shared script lock blocks public writers and the email worker during cutover. The plan is recomputed to reject stale previews. Source changes during copying also block activation. All managed rows are read back and compared before the single active-connection property is updated.
5. Verify a new public test submission and queued notification in the new destination. Keep the former spreadsheet as an archive. To switch back, select Previous destination, then test/preview again; new records must be copied back before activation.

Failed copying may leave some appended rows in the destination, while the source remains active. Preview again after resolving the cause: matching rows will not be duplicated. No source rows are deleted. Migration copies managed tabs, not unrelated sheets, formatting, formulas or permissions. Large sheets may exceed Apps Script execution limits; do not use this synchronous flow for a large historical archive without a staged migration assessment.

**Keep the original JEBG MAIN file if it contains the bound Apps Script project.** Selecting a new data spreadsheet does not move the script project, triggers, deployments or properties. Deleting that container could delete the application.

## Connection references

Sheet selection is a server-side Script Property shared by deployments in this same project. With no property, the current JEBG MAIN ID remains the default. Malformed settings fail closed. Ordinary sheet changes take effect without editing website HTML after public deployment activation.

Saving web app URLs records references only. A changed public URL requires publishing the downloaded docs/backend-config.json through GitHub; saving it in Apps Script cannot write the GitHub repository. The public form loads this nonsecret JSON and retains the current endpoint if loading/validation fails. Standard form POST, JSON payload field and new-tab confirmation are preserved.

Do not migrate to a separate Apps Script project by merely pasting its URL: properties, triggers, ownership, stored records and authorization must be moved and tested separately. Settings revisions and the latest 15 owner actions are kept in Script Properties; this is an operational activity log, not an immutable compliance audit.

## Validation

Run node tests/backend.test.cjs, node tests/email.test.cjs and node tests/admin.test.cjs. Mock tests do not contact Google, send mail or change stored data. Live identity, Google authorization/deployment, real spreadsheet permissions, email delivery and browser rendering must be validated by the owner after deployment.
