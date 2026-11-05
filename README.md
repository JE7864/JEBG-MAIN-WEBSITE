# JEBG AI Technologies

Industrial and business solutions, consultancy enquiries and Expert Network applications.

Forms submit to `/api/submissions` and save in the Sites-managed D1 `DB` binding. Schema is declared in `db/schema.ts`; generated migrations are in `drizzle/` and applied on Sites deployment. No browser database credentials are used.

`/admin` requires verified Sites/ChatGPT identity with the owner email jamilaexim786vector@gmail.com. It supports searching, filters, contact stages, notes and CSV exports. Signed-in identity headers must come from the hosting dispatcher, never from an untrusted reverse proxy.

Storage agreement is required. Optional promotional/opportunity consent is unchecked by default and stored with wording, version and timestamp. No automated emails or marketing campaigns are sent by this application. Requests for correction, deletion or consent withdrawal are handled through the published contact email.

The application uses server routes and D1, so it cannot be hosted as a standalone GitHub Pages static website. A custom domain must point to a hosting platform supporting this backend.

Use the Sites build and publication helpers. `npm run db:generate` generates migrations when the schema changes; existing migration files must be preserved.

## GitHub Pages publishing

The public marketing page is exported into `docs/`. In **JE7864/JEBG-MAIN-WEBSITE → Settings → Pages**, choose **Deploy from a branch**, **main**, **/docs**, then Save. Set the custom domain to **www.jamilaexim.com** and enable HTTPS when the certificate is ready.

In GoDaddy DNS, the **www CNAME** must target **JE7864.github.io** (not the earlier Sites custom-domain target). Keep USSS, AISA and mail DNS records unchanged. The `docs/CNAME` file records the intended domain; repository Pages settings must still be enabled. Do not point DNS to GitHub until Pages is configured for the domain. A GitHub Pages deployment is not guaranteed permanent; keep this repository and an independent backup.

Form submissions from GitHub Pages and the custom domain are sent to the existing Sites backend at `https://jebg-technologies.jamilaexim786vector.chatgpt.site/api/submissions`. The backend allows only the listed JEBG origins, retains validation/rate controls and does not expose database credentials. Admin sign-in continues at the backend `/admin` URL. GitHub hosts the public pages; database storage and administration still depend on the backend remaining deployed.

After editing `lib/site-html.ts`, run `python scripts/export-github-pages.py` to refresh `docs/index.html`. Preserve the generated `docs/media` asset and `docs/CNAME`. Deploy server changes to Sites separately. The two publishing targets are not automatically synchronized by this repository.

Automatic notification and acknowledgement emails are not configured. Do not place API tokens, passwords, `.env` files or submission records in this public repository.
