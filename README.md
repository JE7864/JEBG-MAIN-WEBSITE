# JEBG AI Technologies

Website: https://jebg.jamilaexim.com

GitHub Pages publishes main → /docs. Preserve docs/CNAME and docs/media when updating the public page.

## Form storage and automatic emails
Both form types submit a standard POST with a JSON payload field to the existing Google Apps Script web app. A Google confirmation opens in a new tab. Customer enquiries and developer applications save in the private JEBG MAIN workbook.

After a new request is stored, a branded acknowledgement goes to the submitter and a separate internal notification goes to jamilaexim786vector@gmail.com. Each includes the request reference and Shekh Aman signature. Service acknowledgements are separate from optional promotional consent.

Email Notifications tracks recipient-specific Pending, Sending, Sent and Needs review states. The scheduled worker retries Pending items when Google's sending quota is available. Successful sends are not repeated. For uncertain sends, check Sent mail before manually changing Needs review to Pending. Sent means Google accepted the message; inbox delivery is not guaranteed.

Current backend: milestone 1.2.0, Apps Script version 4. The previous workbook and all historical records remain intact. Historical requests are not retrospectively emailed.

## Source and checks
The Apps Script source is backend/Code.gs, backend/Email.gs and backend/appsscript.json. Run node tests/backend.test.cjs and node tests/email.test.cjs. See milestones/1.2.0.md for the release and verification report.

Source merges do not automatically redeploy Apps Script. Preserve the existing endpoint when updating deployments. Owner authorization for send-mail and scheduled triggers is required; enableJebgEmails_ has already been run for this deployment.

Never commit credentials or submission records, publish the private Sheet, or add administration links to docs/index.html.
