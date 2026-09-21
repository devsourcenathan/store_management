
// Import dotenv to ensure environment variables are loaded for local development
// This is not strictly necessary in production if env vars are injected by the container, 
// but it helps locally when running `npm run start:dev` without the Nest CLI's help in the instrument file.
import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
        // Note: User hasn't installed @sentry/profiling-node, so this might fail if uncommented.
        // I will exclude it for now to be safe, or just use the basic setup.
        // nodeProfilingIntegration(), 
    ],
    // Perf Phase 1: sample 100% in dev, 10% in production to cut overhead
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
