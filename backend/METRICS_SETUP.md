# Public footer visit and engagement figures (no Apps Script update)

The footer shows ONLY five numbers, in this order:

1. Recorded page visits.
2. Average page visits per IST calendar day.
3. Customer enquiry form starts.
4. Developer application form starts.
5. Engaged visits reaching 75% of page depth.

No permanent labels, headings or icons are added. Native hover titles and accessible names identify each number. All figures must be available before the strip is displayed; a confirmed unused external key is zero, but a network error is not.

## Activation

No action is needed in Apps Script, Google Sheets or the admin dashboard. GitHub Pages publishes the integration after merge. The previous instructions to install Metrics.gs and update Code.gs solely for footer counters are superseded. Existing deployments, URLs, scopes, triggers and data remain unchanged.

## Definitions and counting

The browser uses https://countapi.mileshilliard.com/api/v1 with no account or API key. It makes one visit increment request and three read-only engagement requests per production page load. An engagement read cannot create a start or scroll event. Additional increments occur only for the corresponding genuine interaction.

- Visits: one successful request per page load, including refresh, using the existing key jebg_main_website_visits_20261107. Existing visits are retained.
- Daily average: visit total divided by inclusive IST calendar days since the counter launched on 7 November 2026, rounded to one decimal. Empty/no-traffic days count. No historical traffic is invented.
- Customer/developer starts: once per form per page load, on the first trusted input/change event with a nonblank value in a named enabled text field, textarea or select. Honeypot, hidden, checkbox/radio, empty, disabled and synthetic events are ignored. Changing more fields does not add another start. Programmatic product preselection does not count as typing. Autofill counts if it emits a genuine input/change event; otherwise it may not be captured.
- Engaged visit: once per page load when the visible viewport reaches at least 75% of the full document's height. Scroll/resize checks are coalesced with requestAnimationFrame. Hidden tabs do not count. Deep links or restored scroll position may qualify when viewed. This records page depth, not proof of reading, time spent or attention.

The new action counters begin with this release; earlier form activity is not reconstructed. Their keys are jebg_main_customer_starts_20261107, jebg_main_developer_starts_20261107 and jebg_main_engaged_depth75_20261107. A confirmed 404 Key not found response represents no recorded events. Do not reset or rename keys unintentionally.

The browser marks an action as sent before making its request. It does not automatically retry failures that might already have incremented a counter. A failed response may leave a figure incomplete/hidden. Read/increment responses are applied monotonically within the current page so a slower initial read cannot overwrite a newer event total.

## Privacy and limits

No names, emails, field contents, Google URLs, form payloads, cookies or browser-storage identifiers are included in counter requests. The code inspects whether a field is nonblank but sends only a fixed action key. Requests omit credentials and referrer. As with any external request, the provider receives network-level information under its policies. No executable external library is loaded, only JSON.

Counts are public and mutable and have no guaranteed SLA. Script blocking, network failure, rate limiting, refreshes, browser automation or public counter modifications can affect results. They are lightweight interaction figures, not unique people, confirmed saved submissions, completed enquiries or audit/billing data. The new footer does not read private spreadsheets or call any Google statistics endpoint.

Preview/local hosts do not request production counters. The strip is deliberately hidden if complete valid figures cannot be obtained instead of showing made-up values.

## Validation

GitHub Actions previously verified the provider's status endpoint returned HTTP 200 with Access-Control-Allow-Origin for https://jebg.jamilaexim.com, and a read-only query for the original new visit key returned HTTP 404 with the same origin permission. Automated tests use mocks and never increment production counters.

tests/visits.test.cjs covers five numbers only, all read/increment routes, genuine first-input detection, field exclusions, per-page deduplication, 75% depth, hidden-tab handling, startup event races, privacy, response validation, IST midnight, averages, failure behavior and preview exclusion. Existing storage/email/admin/timezone and legacy optional-metrics tests remain. Backend/Metrics.gs is unused by the website; no Apps Script update is required.

Provider documentation: https://countapi.mileshilliard.com/ and https://github.com/syntaxerror019/countapi.
