# Rasoi Route — Java 21 + React TypeScript

A working college food-ordering demonstration. Accounts and orders are stored in the database; checkout prices are calculated by the backend from the catalog. Razorpay and Gmail are optional integrations. Delivery dispatch, real restaurant operations, bank offers, loyalty redemption and charity collection are not connected.

## See it before installing

Interactive browser preview: https://rasoi-route-preview.readypetal2.chatgpt.site

Create an account using a demo email and password, choose dishes, go to billing, enter name/mobile/address, and place an order. The hosted preview simulates online payments; it never charges or emails anyone. Accounts and orders reset when the page reloads. Do not enter real payment details in the preview.

## Easiest way to run the real application on Windows

1. Extract this ZIP fully to a new folder. Open that folder in VS Code if you want to inspect the source.
2. Install Java JDK 21 or use your existing JDK 21. Check `java -version` in PowerShell. It must show version 21 or newer.
3. Double-click **Run-Demo.cmd**, or run `powershell -ExecutionPolicy Bypass -File .\run-demo.ps1` from the extracted project folder.
4. Wait for the Java output to say `Started RasoiApplication`.
5. Open **http://localhost:8080** in Chrome. Keep the terminal open.
6. Register, choose dishes, enter delivery information and select **Cash on Delivery** for a complete check without any API keys.
7. The receipt must say **PAYMENT DUE** for COD. Online payment only becomes **PAID** after backend verification.

The prebuilt JAR contains both frontend and backend. Node.js, Maven and PostgreSQL are not required for this local demo. A persistent H2 database is created in `data/`; do not delete this folder if you want to keep your demo accounts/orders. The demo listens only on your own computer. Stop it with Ctrl+C.

## Optional real Razorpay test checkout and Gmail email

Copy `.env.example` to `.env`. Fill a random JWT_SECRET (32+ bytes). Fill Razorpay **test** key ID/secret, plus the webhook secret if using webhooks. Use a Gmail app password with SMTP_USER, SMTP_PASSWORD and SMTP_FROM. Restart the application after configuration changes.

Razorpay test checkout depends on the provider's available methods and account configuration; UPI availability in test mode may differ. No bank discount or loyalty balance is fabricated. The payment method selected in billing expresses a preference; the enabled Razorpay checkout determines the actual method. Without payment keys, use COD.

Registration sends a welcome email when SMTP is configured. Captured, verified payment sends payment confirmation. Email delivery failures are logged; SMTP is an optional best-effort integration and the app does not claim an email was delivered. COD is not a captured online payment.

Local webhook testing needs a public HTTPS tunnel to port 8080 and `/api/payments/webhook`. Browser signature verification works without the webhook. Never publish `.env` or real credentials.

## Development from source

Requirements: Java 21, Maven 3.9+, Node.js 22 LTS, pnpm 10.28.0. PostgreSQL 15+ for the production profile, or use the local H2 demo profile.

```powershell
npm.cmd install -g pnpm@10.28.0
pnpm.cmd install --frozen-lockfile
Copy-Item .env.example .env
# Edit .env and fill JWT_SECRET. For PostgreSQL, create rasoi_route and set DATABASE_PASSWORD.
powershell -ExecutionPolicy Bypass -File .\scripts\start-backend.ps1 -Demo
```

In a second terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-frontend.ps1
```

Frontend http://localhost:5173 proxies `/api` to the Java backend http://localhost:8080. Remove `-Demo` to use PostgreSQL. Configure a separate hosted API by putting `VITE_API_URL=https://your-api.example` in `artifacts/rasoi-route/.env.local` **before building** and setting the Java backend's `CORS_ORIGINS` to the exact frontend origin. Both API clients use the same configured URL. Never expose provider secrets using a VITE_ variable.

Frontend-only local preview, without Java or a database:

```powershell
pnpm.cmd preview:demo
```

## Rebuild and verify

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\build-release.ps1
```

Frontend tests cover routing/currency and billing arithmetic. Backend tests exercise authentication, customer validation, trusted pricing, coupon thresholds, owner-only access, idempotent order creation, COD, gateway amount/signature checks, repeated notifications and CORS. Tests use H2 in PostgreSQL compatibility mode and a mocked Razorpay gateway; they do not make live payments or send emails.

## Docker / PostgreSQL hosting

Install Docker with Compose. Copy `.env.example` to `.env`, fill a strong DATABASE_PASSWORD and JWT_SECRET, then:

```powershell
docker compose up --build -d
docker compose logs -f backend
```

Open http://localhost:8088. The web container serves the production frontend and proxies `/api` to Java; PostgreSQL persists in the `db-data` volume. The database and backend ports are not publicly exposed. Run `docker compose down` to stop; do not use `down -v` if you want to retain data.

For internet hosting, add your domain and HTTPS, use PostgreSQL backups and configure secrets outside source control. Java/PostgreSQL require separate hosting from ChatGPT Sites. The included compose configuration has not been executed in this review environment because Docker is unavailable.

## API and accounting

Public: `GET /api/health`, `/api/menu`, `/api/delivery/availability`, `/api/performance/benchmark`, `POST /api/auth/register`, `/api/auth/login`, `/api/orders/calculate`.

Protected with Bearer JWT: `GET /api/auth/me`, `/api/orders`; `POST /api/orders`, `/api/orders/{id}/bill`, `/api/orders/{id}/coupon`, `/api/payments/create`, `/api/payments/verify`. Order creation also requires `Idempotency-Key` (a UUID). Reusing the same key/payload returns the saved order; changing the payload under the same key returns 409. Prices/amounts supplied by the client cannot override catalog prices. Payment amount is read from the saved server bill.

Webhook: `POST /api/payments/webhook` requires an HMAC signature. Captured amount and INR currency must match the stored payment. Duplicate confirmation cannot generate repeated payment emails.

The final receipt uses the database order ID, saved date, stable invoice number, saved totals and payment status. It is explicitly a demonstration receipt; no business registration or legal tax compliance is invented. The benchmark and delivery availability endpoints are demonstration data, not measured performance or live delivery coverage.

## Troubleshooting

- Java 17 error: select your JDK 21 in JAVA_HOME and PATH.
- Port 8080 already used: stop the other app, or run the JAR with `--server.port=8081` and open http://localhost:8081. The prebuilt app uses same-origin APIs.
- PostgreSQL connection error: for a first local check use Run-Demo.cmd, which requires no PostgreSQL.
- Missing payment keys: select COD or configure Razorpay test credentials.
- Wrong/expired password session: sign out and sign in again. Tokens expire after one hour.
- Build error about `dist/index.d.ts`: run `pnpm.cmd typecheck:libs` before the frontend type check, or use the provided root build script.
- Refreshing the hosted preview clears demo accounts/orders. Create a new demo account.

There is no honest universal guarantee of “zero issues.” See TEST-RESULTS.md for exactly what was verified and what still depends on your environment or provider accounts.
