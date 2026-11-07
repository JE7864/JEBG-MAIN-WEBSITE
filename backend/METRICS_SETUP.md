# Numbers-only footer metrics — activation

The public footer shows four numbers, in this order: page visits, average visits per IST calendar day, saved customer enquiries, saved developer applications. No visible heading, description or icon is added. Native hover titles and accessible names identify the figures. The strip stays hidden until a valid response arrives, so an unavailable backend does not display invented zeros.

## Activate in the existing bound Apps Script project

1. Copy updated backend/Code.gs into your existing Code.gs.
2. Add a Script file named Metrics (Metrics.gs) and paste backend/Metrics.gs.
3. Save. Keep Settings.gs, Email.gs, Admin.gs, Admin1.html, Script Properties, active spreadsheet ID and existing triggers unchanged.
4. Update the EXISTING PUBLIC web app deployment to a New version. Preserve its URL, Execute as Me, access Anyone. No private-admin deployment update, new OAuth scope or URL change is required for metrics.
5. Reload the public website. The numbers should appear at the bottom after the visit request and aggregate response finish. Submit one marked test of each form, confirm the stored records, then reload after up to 60 seconds to check the submission figures.

GitHub merging alone cannot deploy Apps Script. Until step 4, the public endpoint serves its older GET response and the strip remains hidden. Do not change spreadsheet headers or timezone for this update.

## Meaning of the figures

- Visits: one successful client-reported page load, including refresh, from activation onward. The browser creates a random per-load UUID. Retry IDs are deduplicated using Script Cache for up to six hours. Cache eviction, blocked scripts, network failures, browser automation and endpoint abuse can affect counts; this is a lightweight page-load counter, not audited analytics or unique-person tracking.
- Average: total visits divided by the number of IST calendar days since the first recorded visit, including today, rounded to one decimal. It is not a rolling 24-hour figure. Traffic before activation is unknown and is not fabricated.
- Customer/developer counts: distinct nonblank saved references in the corresponding tabs of the active spreadsheet, cached for up to 60 seconds. Existing historical records in that sheet are included. Duplicate requests do not add a reference. These figures represent records retained in the current database, not unsuccessful clicks; deleting records reduces the figure. Normal migration preserves the records and changes the cache key to the destination's ID.

Visit aggregates (count and first date only) live in the existing project's Script Properties under JEBG_PUBLIC_VISITS_V1, independent of the active data spreadsheet. Do not remove this property during sheet migration. No raw page-load IDs are persisted in the spreadsheet or properties; the short-lived random IDs are only in Script Cache. No IP address, email, name, cookie, persistent visitor ID or fingerprint is collected by this implementation. Requests are handled by Google under its platform policies.

## Public endpoint and privacy boundary

GET ?page=stats is read-only and returns only schema version, four aggregate values and first tracking date through the FIXED window.jebgFooterStats callback. Callback/query values cannot inject JavaScript. Errors return only an unavailable flag. No sheet ID, record references, private columns, request fields, consent, admin URLs or settings are returned. The visitor's POST event only updates the isolated visit property; it does not write form rows or send mail.

Google ContentService's standard redirect is followed by browser script loading. The website uses an anonymous no-cors POST for the visit and reads public aggregates through a script tag; credentials are omitted on POST. Google documents JSONP for non-sensitive, read-only content. The visit event is a separate POST route. There is no new third-party analytics service.

Existing form POST, payload, request deduplication, confirmations, email queue, signature, admin owner checks, IST behavior, media and custom domain are unchanged. No backend form-submission code is repurposed as a click counter.

## Validation

node tests/metrics.test.cjs covers counting, retry deduplication, active-sheet totals, cache use, failure behavior, read-only GET, fixed callback, output privacy, IST midnight/day average and numbers-only accessible rendering. Existing storage/email/admin/timezone regression suites also run in GitHub Actions.

Live Google deployment, cross-origin browser delivery, actual counter activation and rendered desktop/mobile layout must be checked after owner deployment. Do not repeatedly send test visits directly to the production endpoint during source validation.
