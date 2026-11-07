# Search visibility setup for JEBG

Preferred homepage: https://jebg.jamilaexim.com/
Sitemap: https://jebg.jamilaexim.com/sitemap.xml
Crawler guidance: https://jebg.jamilaexim.com/robots.txt

## What is published

- Descriptive homepage title/description and a self-referencing canonical URL for the custom domain.
- Open Graph and summary-card text metadata for consistent links.
- Organization and WebSite JSON-LD with the public brand, phone/email and site-name relationship.
- A square SVG mark based on the existing JEBG wordmark, used as favicon and organization logo.
- A single-page XML sitemap and permissive robots.txt pointing to it.

The public visible content, product links, forms, counters, private-admin access and Apps Script integration are unchanged. No credentials, verification secret, new tracking script or backend change is introduced.

## Owner steps after GitHub Pages deployment succeeds

1. In Search Console select the URL-prefix property https://jebg.jamilaexim.com/.
2. Open Sitemaps. Under Add a new sitemap enter sitemap.xml when the site prefix is shown. If Google asks for a full URL, use https://jebg.jamilaexim.com/sitemap.xml. Click Submit.
3. Check for Success. The sitemap currently lists ONE public content page. Product sections such as #usss and #campaign are sections of that page, not separate indexable URLs.
4. Inspect the homepage with URL Inspection. A live result “URL is available to Google” means crawl/index eligibility, not confirmed indexing. Check the indexed-status report. If appropriate and not already requested, Request indexing once; there is no benefit to repeatedly clicking it.
5. Watch Page indexing and Performance over subsequent weeks. Verification and sitemap submission do not guarantee indexing, rankings or traffic.
6. In Bing Webmaster Tools, add this website or import its verified Search Console property and submit the same sitemap.

The domain property jamilaexim.com can cover this subdomain. Keep the URL-prefix property for an uncluttered JEBG-only report. No GoDaddy DNS change is needed for these website files.

## Deliberate boundaries

Only https://jebg.jamilaexim.com/ is listed. The private-admin launcher, Google web app URLs, JSON configuration, images and product subdomains are not listed as separate public pages in this sitemap. Product subdomains need their own accurate metadata and sitemap configuration; their live HTML was not changed by this update.

robots.txt does not block /admin/ because the crawler needs to read its existing noindex,nofollow meta directive. Access remains protected by Google authentication and server-side owner checks. Crawler guidance and canonical tags are not authorization mechanisms.

The brand schema includes only public, supported facts. It does not invent reviews, prices, office addresses, certifications, customer countries, employee counts or founder status. Shekh Aman's international employment experience is not presented as JEBG client coverage. Structured data can help identify the organization but does not guarantee rich results.

The sitemap intentionally omits changefreq, priority and a fabricated automatic lastmod. Add real new public pages when created; do not add fragment-only links or unrelated subdomains. Keep the canonical hostname, sitemap and crawler directive aligned.

## Growth work after this foundation

Improve each product's dedicated website with distinctive, useful product content and real demonstrations. Publish documented use cases with permission. Use Search Console impressions/queries/clicks to choose topics; footer activity counts are approximate public interaction counters, not a substitute for search-performance data. Avoid keyword stuffing, purchased link schemes and promises of first-place rankings.

## Checks

node tests/seo.test.cjs verifies canonical/social/schema consistency, public contact values, safe local logo/favicons, sitemap scope/structure, robots discovery, private-admin noindex and executable-versus-JSON script handling. CI also runs existing backend, form, counter and launcher regressions. Google Search Console account state, actual indexing and rich-result eligibility must be checked through the owner's account after publication.

Official references:
- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/organization
- https://developers.google.com/search/docs/appearance/site-names
- https://support.google.com/webmasters/answer/9012289
- https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b
