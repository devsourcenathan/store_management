// Desktop bundle injects env from Electron — do not load backend/.env (often Postgres).
if (process.env.LOCAL_BUNDLE !== 'true') {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv/config');
}
import * as Sentry from '@sentry/nestjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        // Note: User hasn't installed @sentry/profiling-node, so this might fail if uncommented.
        // I will exclude it for now to be safe, or just use the basic setup.
        // nodeProfilingIntegration(), 
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
});
