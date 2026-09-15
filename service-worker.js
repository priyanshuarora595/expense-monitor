importScripts('offline-db.js');

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `expense-monitor-static-${CACHE_VERSION}`;
const API_CACHE = `expense-monitor-api-${CACHE_VERSION}`;

// Any request whose path starts with /api/ is treated as a backend call,
// regardless of which host `get_api_url()` in script.js currently points at.
const API_PATH_PREFIX = '/api/';

const PRECACHE_URLS = [
    './',
    'index.html',
    'login.html',
    'register.html',
    'forgot_password.html',
    'reset_password.html',
    'dashboard.html',
    'balance.html',
    'balanceDetails.html',
    'balanceDetailsRange.html',
    'commodities.html',
    'sources.html',
    'internal_transactions.html',
    'profile.html',
    'style.css',
    'script.js',
    'offline-db.js',
    'biometric.js',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'icons/icon-512-maskable.png',
    'icons/icon-180.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
                    .map((key) => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

function isApiRequest(url) {
    return url.pathname.startsWith(API_PATH_PREFIX);
}

// Auth and account-deletion calls must never be silently queued for a blind
// later replay - the user needs to see the failure immediately instead.
const NO_QUEUE_PATTERNS = [
    /\/api\/login\/?$/,
    /\/api\/logout\/?$/,
    /\/api\/accounts\/change-password\/?$/,
];

function shouldQueueWrite(request, url) {
    if (request.method === 'DELETE' && /\/api\/accounts\/profile\//.test(url.pathname)) return false;
    return !NO_QUEUE_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

async function handleApiGet(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cache = await caches.open(API_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response(
            JSON.stringify({ error: "You're offline and this data hasn't been cached yet." }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function handleApiWrite(request, url) {
    if (!shouldQueueWrite(request, url)) {
        return fetch(request);
    }
    try {
        return await fetch(request.clone());
    } catch (err) {
        const bodyText = await request.clone().text();
        const headers = {};
        for (const [key, value] of request.headers.entries()) {
            headers[key] = value;
        }
        const id = await queueOutboxRequest({
            url: request.url,
            method: request.method,
            headers,
            body: bodyText,
            createdAt: Date.now(),
        });

        if ('sync' in self.registration) {
            try {
                await self.registration.sync.register('sync-outbox');
            } catch (e) {
                // Background Sync unsupported/blocked (e.g. iOS Safari) - the page's
                // own 'online' listener will call FLUSH_OUTBOX as a fallback.
            }
        }

        notifyClients({ type: 'OUTBOX_QUEUED', count: await countOutboxRequests() });

        return new Response(
            JSON.stringify({ queued: true, id: `pending-${id}` }),
            { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function handleStaticGet(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response && (response.ok || response.type === 'opaque')) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response.clone());
    }
    return response;
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    if (isApiRequest(url)) {
        if (request.method === 'GET') {
            event.respondWith(handleApiGet(request));
        } else {
            event.respondWith(handleApiWrite(request, url));
        }
        return;
    }

    if (request.method === 'GET') {
        event.respondWith(handleStaticGet(request));
    }
    // Non-GET, non-API requests (none currently exist in this app) pass through untouched.
});

async function replayOutbox() {
    const pending = await getAllOutboxRequests();
    let replayed = 0;
    for (const entry of pending) {
        try {
            // Getting a response at all (even an error one) means we're back online
            // and the server has made a final decision on this request, so it's
            // removed from the queue either way - only a thrown error means we're
            // still offline and should stop and retry the rest later.
            await fetch(entry.url, {
                method: entry.method,
                headers: entry.headers,
                body: entry.body,
            });
            await deleteOutboxRequest(entry.id);
            replayed++;
        } catch (err) {
            break;
        }
    }
    const remaining = await countOutboxRequests();
    notifyClients({ type: 'OUTBOX_SYNCED', replayed, remaining });
    return { replayed, remaining };
}

async function notifyClients(message) {
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((client) => client.postMessage(message));
}

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-outbox') {
        event.waitUntil(replayOutbox());
    }
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'FLUSH_OUTBOX') {
        event.waitUntil(replayOutbox());
    }
});
