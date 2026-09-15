// Shared IndexedDB "outbox" for requests made while offline.
// Loaded both on normal pages (<script src="offline-db.js">) and inside the
// service worker (importScripts('offline-db.js')), so it must not assume
// `window` or `self` specifically - it only uses indexedDB + promises.

const OUTBOX_DB_NAME = 'expense-monitor-outbox';
const OUTBOX_DB_VERSION = 1;
const OUTBOX_STORE = 'requests';

function openOutboxDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(OUTBOX_DB_NAME, OUTBOX_DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
                db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// entry: { url, method, headers, body, createdAt }
async function queueOutboxRequest(entry) {
    const db = await openOutboxDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(OUTBOX_STORE, 'readwrite');
        const store = tx.objectStore(OUTBOX_STORE);
        const req = store.add(entry);
        req.onsuccess = () => resolve(req.result); // returns generated id
        req.onerror = () => reject(req.error);
    });
}

async function getAllOutboxRequests() {
    const db = await openOutboxDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(OUTBOX_STORE, 'readonly');
        const store = tx.objectStore(OUTBOX_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function deleteOutboxRequest(id) {
    const db = await openOutboxDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(OUTBOX_STORE, 'readwrite');
        const store = tx.objectStore(OUTBOX_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

async function countOutboxRequests() {
    const all = await getAllOutboxRequests();
    return all.length;
}
