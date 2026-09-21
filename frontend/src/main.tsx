import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './styles/globals.css';
import './lib/i18n';
import { ThemeProvider } from '@/components/ThemeProvider';
import * as Sentry from "@sentry/react";
import { clarity } from 'react-microsoft-clarity';

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  window.location.reload();
});

if (import.meta.env.VITE_CLARITY_PROJECT_ID) {
    clarity.init(import.meta.env.VITE_CLARITY_PROJECT_ID);
}

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
    ],
    // Perf Phase 1: light sampling in production to cut CPU/network overhead
    // (100% tracing + replay in dev, sampled in prod).
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    // Session Replay
    replaysSessionSampleRate: import.meta.env.PROD ? 0.01 : 0.1,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <App />
        </ThemeProvider>
    </React.StrictMode>,
);
