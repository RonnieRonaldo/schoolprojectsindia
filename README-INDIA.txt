SCHOOL PROJECTS INDIA - CHECKOUT RECOVERY ROLLOUT

Includes 10 updated product HTML files, purchase-download.js, and worker.js.
Built from the user's latest SchoolProjectsIndia GitHub ZIP and the last available
Spanish recovery Worker snapshot. JavaScript syntax checked, not live tested.

IMPORTANT: before replacing the shared Worker, compare it to the CURRENT
production code. It serves India, Philippines, Malaysia, and Spain.
Keep existing Cloudflare Secrets and R2/KV bindings unchanged.
The new route is POST /create-india-recovery and only allows ten known
India products/URLs. It uses PADDLE_RECOVERY_API_KEY.

Deployment order:
1. Backup live shared Worker; verify it has current Spanish recovery routes.
2. Deploy worker.js to Cloudflare school-projects-india-downloads.
3. Upload 10 HTML files and purchase-download.js to SchoolProjectsIndia GitHub root.
4. Test Ocean Habitat: open checkout without paying, confirm correct product/price,
   inspect Paddle incomplete transaction's Payment link for Indian Ocean URL.
5. Open that recovery URL in a fresh browser session, confirm original checkout.
6. Test one non-habitat product (e.g. Arctic Animals) without paying.
Do not run additional real payments solely to check URL creation.

Note: Existing common pages have three buy buttons; special pages 4.
Rate limiting for public transaction-creation endpoints remains a future
hardening task. Do not assume all products have been tested individually.

WORKER MERGE: merged from the user-provided current Cloudflare Worker backup; all preexisting code preserved. JS syntax checked.
