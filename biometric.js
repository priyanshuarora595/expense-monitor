// Local biometric "quick unlock" for the PWA, backed by the WebAuthn platform
// authenticator (Touch ID / Face ID / Android fingerprint).
//
// This does NOT replace server login and there is no backend involved: it's a
// device-local gate that unlocks the already-stored session token, the same
// way a banking app's "quick unlock" works. The credential is registered and
// verified entirely by the OS/browser; we only care whether
// navigator.credentials.get() resolves (sensor accepted) or rejects
// (cancelled/failed).

const BIOMETRIC_CREDENTIAL_KEY = 'biometricCredentialId';

function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64Url) {
    const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
    const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
    const str = atob(base64);
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes.buffer;
}

async function isBiometricSupported() {
    if (!window.isSecureContext || !window.PublicKeyCredential) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (err) {
        return false;
    }
}

function isBiometricEnabled() {
    return !!localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
}

function disableBiometric() {
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    sessionStorage.removeItem('appUnlocked');
}

async function registerBiometric(userID, username) {
    const credential = await navigator.credentials.create({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: { name: 'Expense Manager', id: location.hostname },
            user: {
                id: new TextEncoder().encode(String(userID)),
                name: username || 'user',
                displayName: username || 'user',
            },
            pubKeyCredParams: [
                { type: 'public-key', alg: -7 },   // ES256
                { type: 'public-key', alg: -257 }, // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'preferred',
            },
            timeout: 60000,
            attestation: 'none',
        },
    });
    if (!credential) throw new Error('Biometric registration was not completed');
    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, bufferToBase64Url(credential.rawId));
}

async function unlockWithBiometric() {
    const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
    if (!credentialId) return false;
    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ id: base64UrlToBuffer(credentialId), type: 'public-key' }],
            userVerification: 'required',
            timeout: 60000,
        },
    });
    return !!assertion;
}

// Called right after a successful password login to offer enabling the gate.
async function maybeOfferBiometricEnrollment(userID, username) {
    try {
        if (isBiometricEnabled()) return;
        if (!(await isBiometricSupported())) return;
        const wantsEnroll = window.confirm(
            'Enable fingerprint / Face ID quick-unlock for this app on this device?'
        );
        if (!wantsEnroll) return;
        await registerBiometric(userID, username);
        sessionStorage.setItem('appUnlocked', '1');
    } catch (err) {
        console.error('Biometric enrollment failed:', err);
    }
}

function buildLockOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'biometric-lock-overlay';
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:99999;background:#ffffff;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;' +
        'font-family:sans-serif;text-align:center;padding:20px;';
    overlay.innerHTML = `
        <div style="font-size:56px;line-height:1;">&#128274;</div>
        <div style="font-size:18px;font-weight:600;">Expense Manager is locked</div>
        <button id="biometric-unlock-btn" class="btn btn-primary">Unlock with Fingerprint / Face ID</button>
        <div id="biometric-unlock-message" style="color:#dc3545;min-height:20px;"></div>
        <button id="biometric-use-password-btn" class="btn btn-link" style="color:#6c757d;">Log out and use password instead</button>
    `;
    return overlay;
}

// Resolves once the app is unlocked. No-op if biometric unlock isn't enabled,
// or if it was already unlocked earlier in this browser session.
function ensureUnlocked() {
    return new Promise((resolve) => {
        if (!isBiometricEnabled() || sessionStorage.getItem('appUnlocked') === '1') {
            resolve(true);
            return;
        }

        const overlay = buildLockOverlay();
        document.body.appendChild(overlay);

        const unlockBtn = overlay.querySelector('#biometric-unlock-btn');
        const usePasswordBtn = overlay.querySelector('#biometric-use-password-btn');
        const messageEl = overlay.querySelector('#biometric-unlock-message');

        async function attemptUnlock() {
            messageEl.textContent = '';
            try {
                const ok = await unlockWithBiometric();
                if (ok) {
                    sessionStorage.setItem('appUnlocked', '1');
                    overlay.remove();
                    resolve(true);
                } else {
                    messageEl.textContent = 'Unlock failed. Try again.';
                }
            } catch (err) {
                messageEl.textContent = 'Unlock failed or cancelled. Try again.';
            }
        }

        unlockBtn.addEventListener('click', attemptUnlock);
        usePasswordBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = 'index.html';
        });
    });
}
