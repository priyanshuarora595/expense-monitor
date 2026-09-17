// Biometric (Touch ID / Face ID / Android fingerprint) support for the PWA,
// backed by WebAuthn. Two independent things live in this file:
//
// 1. A local "quick unlock" gate (isBiometricEnabled/unlockWithBiometric/
//    ensureUnlocked) - no backend involved, just checks whether the sensor
//    accepts, then reveals the already-stored session token. Fast and works
//    offline, but only useful while that token is still valid.
// 2. Real server-verified passwordless login/registration (registerBiometric/
//    loginWithBiometric) - talks to /api/webauthn/*, so it can obtain a BRAND
//    NEW token even after the old one has expired. Requires
//    SimpleWebAuthnBrowser (loaded via CDN on the pages that need it) to
//    handle the WebAuthn <-> JSON conversion.
//
// Both share the same credential: registering once (via registerBiometric)
// serves both purposes - no separate enrollment needed.

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
    const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
    localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
    sessionStorage.removeItem('appUnlocked');

    // Best-effort: also remove the server-side record so a disabled device
    // can't still be used for passwordless login. Never block the local
    // disable on this - the user should always be able to turn this off
    // locally even if offline or the request fails.
    const userToken = localStorage.getItem('userToken');
    if (credentialId && userToken) {
        fetch(`${get_api_url()}/api/webauthn/credentials/${encodeURIComponent(credentialId)}/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Token ${userToken}` },
        }).catch(() => {});
    }
}

// Server-verified registration: gets a real challenge from the backend,
// creates the credential, and has the backend verify + store its public key.
// The same credential is then also used by the local-only quick-unlock gate.
async function registerBiometric(userID, username) {
    const userToken = localStorage.getItem('userToken');
    const optionsResp = await fetch(`${get_api_url()}/api/webauthn/register/options/`, {
        method: 'POST',
        headers: { 'Authorization': `Token ${userToken}` },
    });
    if (!optionsResp.ok) throw new Error('Could not start biometric registration');
    const { options, state } = await optionsResp.json();

    const registrationResponse = await SimpleWebAuthnBrowser.startRegistration({
        optionsJSON: JSON.parse(options),
    });

    const verifyResp = await fetch(`${get_api_url()}/api/webauthn/register/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${userToken}` },
        body: JSON.stringify({ credential: registrationResponse, state }),
    });
    const verifyData = await verifyResp.json();
    if (!verifyResp.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Could not verify biometric registration');
    }

    localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, registrationResponse.rawId);
}

// Real passwordless login: no existing session needed. Gets a login
// challenge, lets the browser pick a registered discoverable credential
// (no username required), and exchanges the signed assertion for a fresh
// token from the backend - works even after the old token has expired.
async function loginWithBiometric() {
    const optionsResp = await fetch(`${get_api_url()}/api/webauthn/login/options/`, {
        method: 'POST',
    });
    if (!optionsResp.ok) throw new Error('Could not start fingerprint login');
    const { options, state } = await optionsResp.json();

    const authenticationResponse = await SimpleWebAuthnBrowser.startAuthentication({
        optionsJSON: JSON.parse(options),
    });

    const verifyResp = await fetch(`${get_api_url()}/api/webauthn/login/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: authenticationResponse, state }),
    });
    const data = await verifyResp.json();
    if (!verifyResp.ok || !data.token) {
        throw new Error(data.error || 'Fingerprint login failed');
    }

    localStorage.setItem('userToken', data.token);
    localStorage.setItem('userID', data.user_id);
    localStorage.setItem('userEmail', data.email);
    localStorage.setItem('logged_in', '1');
    sessionStorage.setItem('appUnlocked', '1');
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
