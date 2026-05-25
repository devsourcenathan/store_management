// Desktop bundle injects env from Electron — do not load backend/.env (often Postgres).
if (process.env.LOCAL_BUNDLE !== 'true') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv/config');
}

// Sentry can slow or block startup on locked-down PCs (no network).
if (process.env.LOCAL_BUNDLE !== 'true' && process.env.SENTRY_DSN) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/nestjs');
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 1.0,
    });
}
