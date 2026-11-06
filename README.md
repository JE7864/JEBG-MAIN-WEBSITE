# JEBG AI Technologies

Website: https://jebg.jamilaexim.com

GitHub Pages publishes main → /docs. Preserve docs/CNAME and docs/media when updating the public page.

## Form storage and automatic emails
Both form types submit a standard POST with a JSON payload field to the existing Google Apps Script web app. A Google confirmation opens in a new tab. Customer enquiries and developer applications save in the private JEBG MAIN workbook.

After a new request is stored, a branded acknowledgement goes to the submitter and a separate internal notification goes to jamilaexim786vector@gmail.com. Each includes the request reference and Shekh Aman signature. Service acknowledgements are separate from optional promotional consent.

Email Notifications tracks recipient-specific Pending, Sending, Sent and Needs review states. The scheduled worker retries Pending items when Google's sending quota is available. Successful sends are not repeated. For uncertain sends, check Sent mail before manually changing Needs review to Pending. Sent means Google accepted the message; inbox delivery is not guaranteed.

Last deployed backend: milestone 1.2.0, Apps Script version 4. This branch adds milestone 1.3.0 source; Apps Script activation is still required. The previous workbook and all historical records remain intact. Historical requests are not retrospectively emailed.

## Source and checks
The Apps Script source is in backend/ (Code.gs, Email.gs, Settings.gs, Admin.gs, Admin.html and appsscript.json). Run node tests/backend.test.cjs, node tests/email.test.cjs and node tests/admin.test.cjs. See milestones/1.2.0.md for the release and verification report.

Source merges do not automatically redeploy Apps Script. Preserve the existing endpoint when updating deployments. Owner authorization for send-mail and scheduled triggers is required; enableJebgEmails_ has already been run for this deployment.

Never commit credentials or submission records, or publish the private Sheet. The public Admin link is only an entry page: all records and settings require owner authorization inside the private Apps Script deployment.

## Owner workspace (1.3.0 source)

A responsive navy/cyan dashboard provides actual enquiry/application totals, searchable request lists, status/notes editing, notification history and backend connection settings. Every admin server call verifies the signed-in owner; there is no public records API.

The guided sheet migration checks headers and UTC timestamps, previews differences, copies missing managed rows and verifies them before activating the destination. The source remains intact. Keep the original bound spreadsheet because the script project still resides there.

**Activation is required:** follow [backend/ADMIN_SETUP.md](backend/ADMIN_SETUP.md). Create a separate Google-authenticated, user-executed admin deployment while preserving the public owner-executed submission deployment. Merging GitHub source alone does not activate the dashboard or dynamic sheet routing. The public launcher is docs/admin/index.html; docs/backend-config.json holds only nonsecret endpoint references.
