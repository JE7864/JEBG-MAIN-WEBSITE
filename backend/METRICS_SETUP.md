# Public footer visits (no Apps Script update)

The website now shows ONLY two numbers: total recorded page visits and average per IST calendar day. No descriptions or icons are permanently visible; accessible names and hover titles explain the figures.

## Activation

No action is needed in Apps Script, Google Sheets or the admin dashboard. GitHub Pages publishes this website-only integration after merge. The previous instructions to install Metrics.gs and update Code.gs are superseded for this footer. Do not install or redeploy anything solely for the visit counter.

## Counting

The page calls https://countapi.mileshilliard.com/api/v1/hit/jebg_main_website_visits_20261107 exactly once per page load on jebg.jamilaexim.com. The external Count API service stores and increments the public numeric total. It needs no account or secret key. This is the same external-service pattern as the USSS badge, but a numeric API permits the average to be calculated locally. It does not use Hits.sh, whose statistics endpoint did not allow browser cross-origin reads during verification.

The dedicated key starts at this release on 7 November 2026. Average = total divided by inclusive IST calendar days since 7 November 2026, rounded to one decimal. Empty/no-traffic days count in that period. No earlier traffic or old experimental backend-counter values are fabricated or imported. Keep the key and launch date paired and unchanged for consistent reporting.

Refreshes count as page loads. This is a lightweight public page-load figure, not verified unique people or audited analytics. Scripts blocked by browser/network policy, service downtime, rate limiting and public counter modifications can affect results. Keys are public; the provider supports public operations, so do not use this figure for billing or authoritative reporting. Do not automatically retry failed increment requests: a timed-out request might already have counted.

Only the numeric count is requested. No names, emails, form fields, Google URLs, cookies or browser storage IDs are sent by our code; credentials and referrer are omitted. As with any external request, the provider receives network-level information under its policies. No external JavaScript library is loaded: the response is JSON.

If requests fail or return invalid data, the two figures stay hidden rather than showing fake zeroes. Site functionality and form submissions continue independently. Preview/local hosts do not increment the production counter.

## Validation

GitHub Actions verified the provider's status endpoint returned HTTP 200 and permitted the Origin https://jebg.jamilaexim.com. A read-only query for the new key returned HTTP 404 with the same permitted origin, confirming an unused key without adding fake production visits. The temporary provider probes are removed from final CI; ordinary tests use mocks and never increment the production counter.

tests/visits.test.cjs checks exactly two visible numbers, numeric response validation, one request per load, no retry, no Google statistics calls, IST day averages/midnight and failure/preview behavior. Existing backend regression tests remain intact. Legacy backend/Metrics.gs is unused by the website; existing deployments and stored data are unchanged.

Provider documentation: https://countapi.mileshilliard.com/ and https://github.com/syntaxerror019/countapi.
