# Verification results — 12 October 2026

## Passed

- Frontend workspace library compilation and React TypeScript checks.
- Production Vite build and separate browser-preview build.
- Frontend tests: **6 passed, 0 failed**.
- Java 21 backend integration/billing tests: **10 passed, 0 failed, 0 errors**.
- Executable Spring Boot JAR packaging with the production frontend included.
- Real packaged-app HTTP smoke checks: **11 passed** — root page, JavaScript asset, menu, registration, successful sign-in, exact ₹579.16 COD checkout, idempotent retry, stable saved receipt, denied unauthenticated access, account-scoped history, and account/order persistence after application restart.
- Private ChatGPT Sites preview deployment succeeded.

## Fixed

- The backend calculates the same supported coupon/delivery/packaging/platform/tip/tax rules as checkout and rejects a client/server total mismatch before creating an order.
- Catalog prices cannot be overridden by client-supplied values.
- Invoice/order ID, timestamp, invoice number, amounts and payment status come from the saved order.
- COD is marked DUE rather than PAID; online payment becomes PAID only after captured amount/currency and signature checks.
- Bill/coupon/history endpoints validate authentication and order ownership.
- Repeated order creation is idempotent; a changed request under the same retry key returns 409.
- Payment creation and coupon updates lock the order to prevent concurrent amount changes.
- CORS binds the intended source explicitly, permits listed origins and denies other origins.
- Both frontend API clients respect VITE_API_URL.
- Added gateway connection/request and checkout-script loading timeouts, structured API errors, stronger customer/quantity/tip/password validation, and portable startup/build scripts.
- Removed fabricated bank discounts, loyalty balances, donation collection, live dispatch, tax-registration and QR-payment claims.
- Removed credentials from the delivered ZIP. Only .env.example is included.

## Verification limits

- Real Razorpay test checkout and actual Gmail delivery require your credentials/account configuration and were not executed. Provider calls were mocked in integration tests; cryptographic signature, captured amount/currency and idempotency logic were exercised.
- SQL tests and the runnable local demo use H2 in PostgreSQL compatibility mode. The Docker/PostgreSQL deployment configuration was inspected, but Docker is unavailable here, so that stack was not launched.
- The Windows scripts were prepared for PowerShell/Windows but not executed on a Windows machine. The packaged JAR was launched and checked with Java 21 on Linux.
- Browser rendering/clicks were not automated because the supported browser-control plugin was unavailable. The frontend compiled, the bundled HTTP assets were checked, and the hosted preview deployment was confirmed.
- This is a college ordering/billing demonstration, not an operational restaurant/delivery service. Receipts are demonstration receipts, and benchmark/delivery coverage are illustrative.

These passing checks show the corrected implementation works in the tested flows. They are not a universal guarantee that every future environment, input or third-party service will have zero issues.
