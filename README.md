# JEBG AI Technologies

Website: https://jebg.jamilaexim.com

GitHub Pages publishes main → /docs. Preserve docs/CNAME and docs/media when updating the page.

## Form storage
Customer enquiries and developer applications submit to the existing Google Apps Script web app using a standard form POST with a JSON payload field. Google's confirmation opens in a new tab.

Both form types save in the private **JEBG MAIN** workbook, in **Customer Enquiries** and **Developer Applications** tabs. Review records there; do not put submission records or admin links in this public repository.

The current backend release is milestone **1.1.1**, deployed as Apps Script version **3**. The prior workbook is preserved as a backup; existing records were copied with their references and consent metadata intact.

## Backend source and checks
backend/Code.gs and backend/appsscript.json contain the Apps Script source and manifest. Run node tests/backend.test.cjs for isolated checks. See milestones/1.1.1.md for the current release report.

GitHub merges preserve source but do not automatically redeploy Apps Script. To deploy a backend change, push only the backend source and manifest, create a version, and update the existing deployment. Keep its public endpoint unchanged.

No automatic email sending is enabled. Compose email opens the visitor's email application for review and sending.
