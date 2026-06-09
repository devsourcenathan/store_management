/**
 * Desktop/Electron serves UI + API on the same origin (e.g. http://127.0.0.1:3100).
 * A baked VITE_API_URL pointing to localhost:3000 or a remote host causes axios "Network Error".
 */
export function getApiBaseUrl(): string {
    // Desktop build: always use same-origin relative path (avoids stale baked URLs).
    if (import.meta.env.VITE_DESKTOP === 'true') {
        return '/api';
    }

    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (envUrl) {
        return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/api`;
    }
    return 'http://localhost:3000/api';
}

/** Base URL without /api suffix (for legacy auth pages). */
export function getApiOrigin(): string {
    const base = getApiBaseUrl();
    return base.endsWith('/api') ? base.slice(0, -4) : base.replace(/\/$/, '');
}

export function isDesktopBundle(): boolean {
    return import.meta.env.VITE_DESKTOP === 'true';
}

/** PWA/offline sync is disabled in the Electron desktop build. */
export function isOfflineEnabled(): boolean {
    return !isDesktopBundle();
}

/**
 * Resolves a media URL for display.
 * On desktop builds, remote S3 URLs are routed through the local backend proxy
 * so that images are cached locally and available offline.
 * On web builds, URLs are returned as-is.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
    if (!url) return '';
    
    // Already a local proxy URL — return as-is (relative path works fine)
    if (url.startsWith('/api/media')) {
        return url;
    }
    
    // On desktop, convert remote http URLs to local proxy
    if (isDesktopBundle() && url.startsWith('http')) {
        // Extract the media ID from the URL path or query if possible.
        // Our media records use /api/media/files/:id — we need the DB id.
        // Since we can't extract the id from an S3 URL alone, we use a
        // proxy-by-url endpoint instead.
        return `/api/media/proxy?url=${encodeURIComponent(url)}`;
    }
    
    return url;
}
