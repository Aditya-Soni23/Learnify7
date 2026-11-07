// Learnify Authentication Module
// Powered by Google Firebase Authentication
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged, 
    setPersistence, 
    browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    get, 
    set, 
    update 
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// Firebase configuration for Learnify
export const firebaseConfig = {
    apiKey: "AIzaSyBKQJki3JUr5pDhgOxOQRmXpOY7-gOj2Bk",
    authDomain: "learnify-ada08.firebaseapp.com",
    databaseURL: "https://learnify-ada08-default-rtdb.firebaseio.com",
    projectId: "learnify-ada08",
    storageBucket: "learnify-ada08.firebasestorage.app",
    messagingSenderId: "380617329082",
    appId: "1:380617329082:web:c2242ea09e6f78f1f73583",
    measurementId: "G-DT4WG6622N"
};

// Initialize Firebase App safely
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    try {
        app = getApp();
    } catch (e) {
        app = initializeApp(firebaseConfig, "learnify-auth");
    }
}

export const auth = getAuth(app);
export const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Aditya's official email address
export const ADITYA_OFFICIAL_EMAIL = "adityasonihyderabad@gmail.com";
export const OWNER_EMAILS = [
    ADITYA_OFFICIAL_EMAIL.toLowerCase()
];

/**
 * Resolves the database user key for a given user.
 * - If email is adityasonihyderabad@gmail.com, returns "aditya" so ALL existing data is preserved 100%!
 * - For any friend, returns their unique Firebase UID (or safe sanitized ID) so no data clashes occur!
 */
export function resolveUserKey(user) {
    if (!user) {
        return localStorage.getItem("learnify_user") || "aditya";
    }
    const email = (user.email || "").toLowerCase().trim();
    if (OWNER_EMAILS.includes(email)) {
        return "aditya";
    }
    // For other users: Use their UID
    return user.uid || email.replace(/[^a-zA-Z0-9]/g, "_");
}

/**
 * Returns the currently active user key synchronously from localStorage or fallback.
 */
export function getCurrentUserId() {
    return localStorage.getItem("learnify_user") || "aditya";
}

/**
 * Returns current user's display name
 */
export function getCurrentUserName() {
    return localStorage.getItem("learnify_name") || (getCurrentUserId() === "aditya" ? "Aditya" : "Friend");
}

/**
 * Returns current user's email
 */
export function getCurrentUserEmail() {
    return localStorage.getItem("learnify_email") || (getCurrentUserId() === "aditya" ? ADITYA_OFFICIAL_EMAIL : "");
}

/**
 * Returns current user's photo URL
 */
export function getCurrentUserPhoto() {
    return localStorage.getItem("learnify_photo") || "";
}

/**
 * Checks if the currently active user is Aditya
 */
export function isCurrentUserAditya() {
    const email = getCurrentUserEmail().toLowerCase().trim();
    const id = getCurrentUserId();
    return email === ADITYA_OFFICIAL_EMAIL.toLowerCase() || id === "aditya";
}

// Sync user profile with Firebase Realtime Database
async function syncUserProfile(user, userKey) {
    if (!user || !userKey) return;
    try {
        const isAditya = userKey === "aditya" || (user.email && user.email.toLowerCase() === ADITYA_OFFICIAL_EMAIL.toLowerCase());
        const userNodeRef = ref(db, `users/${userKey}`);
        
        if (isAditya) {
            // Aditya: Safely attach profile metadata WITHOUT touching balance, streak, cars, goodbye, etc.
            await update(userNodeRef, {
                email: ADITYA_OFFICIAL_EMAIL,
                ownerEmail: ADITYA_OFFICIAL_EMAIL,
                authUid: user.uid || "aditya-primary",
                authName: user.displayName || "Aditya Soni",
                authPhoto: user.photoURL || "",
                lastLoginAt: Date.now()
            });
            console.log("Learnify: Aditya account verified. All precious data preserved under users/aditya.");
        } else {
            // Friend account: Check if user node exists; if not, initialize with default starting values
            const snap = await get(userNodeRef);
            if (!snap.exists()) {
                await set(userNodeRef, {
                    profile: {
                        name: user.displayName || "Learner",
                        email: user.email || "",
                        photoURL: user.photoURL || "",
                        createdAt: Date.now()
                    },
                    balance: 0,
                    streak: 0,
                    dgm: 0,
                    lastLoginAt: Date.now()
                });
                console.log(`Learnify: Created new fresh account for friend: ${userKey}`);
            } else {
                await update(ref(db, `users/${userKey}/profile`), {
                    name: user.displayName || snap.val()?.profile?.name || "Learner",
                    email: user.email || snap.val()?.profile?.email || "",
                    photoURL: user.photoURL || snap.val()?.profile?.photoURL || "",
                    lastLoginAt: Date.now()
                });
            }
        }
    } catch (err) {
        console.warn("Learnify: Note during profile sync:", err);
    }
}

/**
 * Saves authenticated user details to localStorage for instant, synchronous multi-page access.
 */
export function saveUserToLocalStorage(user, overrideKey = null) {
    const userKey = overrideKey || resolveUserKey(user);
    const email = user ? (user.email || "") : "";
    const name = user ? (user.displayName || (user.email ? user.email.split("@")[0] : "Learner")) : "Learner";
    const photo = user ? (user.photoURL || "") : "";
    const uid = user ? (user.uid || "") : "";

    localStorage.setItem("learnify_user", userKey);
    localStorage.setItem("learnify_email", email);
    localStorage.setItem("learnify_name", name);
    localStorage.setItem("learnify_photo", photo);
    localStorage.setItem("learnify_uid", uid);
    localStorage.setItem("learnify_auth_time", Date.now().toString());

    return userKey;
}

/**
 * Clears user details from localStorage on logout.
 */
export function clearUserLocalStorage() {
    localStorage.removeItem("learnify_user");
    localStorage.removeItem("learnify_email");
    localStorage.removeItem("learnify_name");
    localStorage.removeItem("learnify_photo");
    localStorage.removeItem("learnify_uid");
    localStorage.removeItem("learnify_auth_time");
}

// Enable local persistence so user doesn't have to sign in again and again
try {
    setPersistence(auth, browserLocalPersistence).catch(e => {
        console.warn("Learnify persistence warning:", e);
    });
} catch (e) {}

/**
 * Triggers Google Sign In via Firebase Popup.
 */
export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userKey = resolveUserKey(user);
        saveUserToLocalStorage(user, userKey);
        await syncUserProfile(user, userKey);
        showAuthNotification(`Signed in as ${user.displayName || user.email}!`, "success");
        return { user, userKey };
    } catch (error) {
        console.error("Learnify Google Sign-In error:", error);
        
        // Check if provider is not yet enabled in Firebase Console or popup blocked
        if (error.code === 'auth/operation-not-allowed' || 
            error.code === 'auth/configuration-not-found' ||
            error.code === 'auth/popup-blocked') {
            showFirebaseConfigModal(error);
        } else {
            showAuthNotification(error.message || "Failed to sign in with Google", "error");
        }
        throw error;
    }
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutUser() {
    try {
        await signOut(auth);
        clearUserLocalStorage();
        showAuthNotification("Signed out successfully", "info");
        setTimeout(() => {
            window.location.reload();
        }, 600);
    } catch (error) {
        console.error("Learnify Sign-Out error:", error);
        clearUserLocalStorage();
        window.location.reload();
    }
}

/**
 * Simulates email sign in / switch account for testing or before Google provider is toggled in console.
 */
export async function signInWithEmailDirect(email, displayName = null) {
    if (!email || !email.includes("@")) {
        alert("Please enter a valid email address.");
        return;
    }
    const cleanEmail = email.toLowerCase().trim();
    const isAditya = cleanEmail === ADITYA_OFFICIAL_EMAIL.toLowerCase();
    const userKey = isAditya ? "aditya" : "user_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
    const name = displayName || (isAditya ? "Aditya Soni" : cleanEmail.split("@")[0]);

    const fakeUser = {
        email: cleanEmail,
        displayName: name,
        photoURL: isAditya ? "Learnify.png" : "",
        uid: userKey
    };

    saveUserToLocalStorage(fakeUser, userKey);
    await syncUserProfile(fakeUser, userKey);
    showAuthNotification(`Welcome ${name}! (${userKey === "aditya" ? "Owner Account" : "Separate Friend Account"})`, "success");
    setTimeout(() => {
        window.location.reload();
    }, 700);
}

/**
 * Subscribes to Firebase Auth state changes.
 */
export function initAuthListener(onUserChanged) {
    return onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userKey = resolveUserKey(user);
            saveUserToLocalStorage(user, userKey);
            await syncUserProfile(user, userKey);
            if (typeof onUserChanged === 'function') {
                onUserChanged(user, userKey);
            }
        } else {
            // No active Firebase Auth session detected.
            // Check if user previously logged in via local session
            const cachedKey = localStorage.getItem("learnify_user");
            if (typeof onUserChanged === 'function') {
                onUserChanged(null, cachedKey || null);
            }
        }
        updateHeaderAuthUI();
    });
}

/**
 * Injects and updates modern, sleek Authentication UI in the header.
 */
export function renderHeaderAuthUI(containerElementOrId) {
    let container = typeof containerElementOrId === 'string' 
        ? document.getElementById(containerElementOrId) 
        : containerElementOrId;
        
    if (!container) {
        // Look for default header or header-actions
        container = document.querySelector(".header-actions") || document.querySelector("header");
    }
    if (!container) return;

    // Check if auth badge already exists
    let authBox = document.getElementById("learnify-auth-badge");
    if (!authBox) {
        authBox = document.createElement("div");
        authBox.id = "learnify-auth-badge";
        authBox.className = "learnify-auth-badge";
        container.appendChild(authBox);
    }

    injectAuthStyles();
    updateHeaderAuthUI();
}

/**
 * Updates the contents of the Auth UI badge in the header.
 */
export function updateHeaderAuthUI() {
    const authBox = document.getElementById("learnify-auth-badge");
    if (!authBox) return;

    const email = getCurrentUserEmail();
    const name = getCurrentUserName();
    const photo = getCurrentUserPhoto();
    const userKey = getCurrentUserId();
    const isAditya = isCurrentUserAditya();
    const isLoggedIn = !!localStorage.getItem("learnify_user");

    if (isLoggedIn) {
        const initial = name ? name.charAt(0).toUpperCase() : (isAditya ? "A" : "U");
        const avatarHtml = photo 
            ? `<img src="${photo}" alt="Avatar" class="auth-avatar-img" onerror="this.outerHTML='<div class=\\'auth-avatar-letter\\'>${initial}</div>'">`
            : `<div class="auth-avatar-letter">${initial}</div>`;

        const badgeLabel = isAditya ? "👑 Aditya" : `👤 ${name}`;
        const accountTag = isAditya ? `<span class="auth-owner-tag">Owner (All Data Linked)</span>` : `<span class="auth-friend-tag">Friend Account</span>`;

        authBox.innerHTML = `
            <div class="auth-logged-in-container">
                <div class="auth-user-pill" id="auth-dropdown-trigger" title="${email || name}">
                    <div class="auth-avatar-wrap">${avatarHtml}</div>
                    <div class="auth-user-info">
                        <span class="auth-user-name">${badgeLabel}</span>
                        ${accountTag}
                    </div>
                    <svg class="auth-arrow-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 10l5 5 5-5z"/>
                    </svg>
                </div>
                <button class="auth-quick-logout-btn" id="auth-quick-logout-btn" title="Log Out of Learnify">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Log Out</span>
                </button>
            </div>
            <div class="auth-dropdown-menu" id="auth-dropdown-menu" style="display:none;">
                <div class="auth-dropdown-header">
                    <div class="auth-dropdown-name">${name}</div>
                    <div class="auth-dropdown-email">${email || (isAditya ? ADITYA_OFFICIAL_EMAIL : "Logged In")}</div>
                    <div class="auth-dropdown-storage">Key: <code>users/${userKey}</code></div>
                </div>
                <div class="auth-dropdown-divider"></div>
                <button class="auth-dropdown-item" id="auth-btn-switch">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                    </svg>
                    Switch Account / Sign In
                </button>
                <button class="auth-dropdown-item auth-dropdown-signout" id="auth-btn-signout">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Sign Out
                </button>
            </div>
        `;

        // Wire quick logout button
        const quickLogoutBtn = document.getElementById("auth-quick-logout-btn");
        if (quickLogoutBtn) {
            quickLogoutBtn.onclick = (e) => {
                e.stopPropagation();
                signOutUser();
            };
        }

        // Wire dropdown click
        const trigger = document.getElementById("auth-dropdown-trigger");
        const menu = document.getElementById("auth-dropdown-menu");
        if (trigger && menu) {
            trigger.onclick = (e) => {
                e.stopPropagation();
                menu.style.display = menu.style.display === "none" ? "block" : "none";
            };
            document.addEventListener("click", () => {
                menu.style.display = "none";
            });
            menu.onclick = (e) => e.stopPropagation();
        }

        const switchBtn = document.getElementById("auth-btn-switch");
        if (switchBtn) {
            switchBtn.onclick = () => showSignInModal();
        }

        const signoutBtn = document.getElementById("auth-btn-signout");
        if (signoutBtn) {
            signoutBtn.onclick = () => signOutUser();
        }
    } else {
        // Not logged in: Show "Sign in with Google" button
        authBox.innerHTML = `
            <button class="auth-google-signin-btn" id="auth-google-login-btn">
                <svg class="google-icon" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
                <span>Sign in with Google</span>
            </button>
        `;

        const loginBtn = document.getElementById("auth-google-login-btn");
        if (loginBtn) {
            loginBtn.onclick = () => signInWithGoogle();
        }
    }
}

/**
 * Displays the Sign In / Account Switch Modal.
 */
export function showSignInModal() {
    let modal = document.getElementById("learnify-auth-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "learnify-auth-modal";
        modal.className = "learnify-auth-modal-overlay";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="learnify-auth-modal-card">
            <button class="auth-modal-close" id="auth-modal-close-btn">&times;</button>
            <div class="auth-modal-header">
                <img src="Learnify.png" alt="Logo" class="auth-modal-logo">
                <h2>Welcome to Learnify</h2>
                <p>Sign in to sync your progress, goals, study sessions and cars!</p>
            </div>

            <div class="auth-modal-body">
                <button class="auth-google-large-btn" id="modal-google-signin-btn">
                    <svg class="google-icon" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                    <span>Sign in with Google Account</span>
                </button>

                <div class="auth-divider"><span>OR SIGN IN BY EMAIL</span></div>

                <div class="auth-email-form">
                    <label>Google / Personal Email:</label>
                    <input type="email" id="modal-email-input" placeholder="e.g. adityasonihyderabad@gmail.com" value="${getCurrentUserEmail()}">
                    <div class="auth-hint">
                        💡 <b>Aditya:</b> Use <code>adityasonihyderabad@gmail.com</code> to access all your existing progress & streak!<br>
                        👥 <b>Friends:</b> Enter your email to get your own fresh, separate account.
                    </div>
                    <button class="auth-email-submit-btn" id="modal-email-submit-btn">Continue to Learnify</button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";

    document.getElementById("auth-modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("modal-google-signin-btn").onclick = async () => {
        try {
            await signInWithGoogle();
            modal.style.display = "none";
        } catch (e) {
            // Error already logged and handled
        }
    };

    document.getElementById("modal-email-submit-btn").onclick = () => {
        const email = document.getElementById("modal-email-input").value;
        if (email) {
            signInWithEmailDirect(email);
            modal.style.display = "none";
        }
    };
}

/**
 * Displays helpful guidance modal when Google provider needs to be toggled in Firebase Console.
 */
function showFirebaseConfigModal(error) {
    let modal = document.getElementById("learnify-config-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "learnify-config-modal";
        modal.className = "learnify-auth-modal-overlay";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="learnify-auth-modal-card" style="max-width: 540px;">
            <button class="auth-modal-close" id="config-modal-close-btn">&times;</button>
            <div class="auth-modal-header">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">⚙️</div>
                <h2>Enable Google Sign-In in Firebase</h2>
                <p style="color: #ffb74d;">Firebase reported: <code>${error.code || error.message}</code></p>
            </div>

            <div class="auth-modal-body" style="font-size: 0.9rem; line-height: 1.5; color: #e0e0e0;">
                <p>To enable 1-click Google Sign-In on your Firebase project (<b>learnify-ada08</b>):</p>
                <ol style="margin-left: 20px; margin-top: 10px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
                    <li>Open <b><a href="https://console.firebase.google.com/project/learnify-ada08/authentication/providers" target="_blank" style="color:#00e5ff;">Firebase Console &rarr; Authentication &rarr; Sign-in method</a></b></li>
                    <li>Click <b>Add new provider &rarr; Google</b></li>
                    <li>Toggle <b>Enable</b>, set support email to your email, and click <b>Save</b>.</li>
                </ol>

                <div class="auth-divider"><span>INSTANT ACCESS (WHILE YOU DO THAT)</span></div>

                <div class="auth-email-form">
                    <label>Enter email to login immediately:</label>
                    <input type="email" id="config-modal-email" placeholder="adityasonihyderabad@gmail.com" value="${ADITYA_OFFICIAL_EMAIL}">
                    <button class="auth-email-submit-btn" id="config-modal-submit">Login Directly with this Email</button>
                </div>
            </div>
        </div>
    `;

    modal.style.display = "flex";

    document.getElementById("config-modal-close-btn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("config-modal-submit").onclick = () => {
        const val = document.getElementById("config-modal-email").value;
        if (val) {
            signInWithEmailDirect(val);
            modal.style.display = "none";
        }
    };
}

/**
 * Toast notification for auth feedback.
 */
function showAuthNotification(message, type = "info") {
    let toast = document.getElementById("learnify-auth-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "learnify-auth-toast";
        toast.className = "learnify-auth-toast";
        document.body.appendChild(toast);
    }
    const bg = type === "success" ? "#10b981" : (type === "error" ? "#ef4444" : "#3b82f6");
    toast.style.background = bg;
    toast.innerText = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-20px)";
    }, 3500);
}

// Injects styles for Auth badges, dropdowns, and modals
function injectAuthStyles() {
    if (document.getElementById("learnify-auth-styles")) return;
    const style = document.createElement("style");
    style.id = "learnify-auth-styles";
    style.textContent = `
        .learnify-auth-badge {
            position: relative;
            display: inline-flex;
            align-items: center;
            z-index: 1000;
        }
        .auth-logged-in-container {
            display: inline-flex;
            align-items: center;
            gap: 10px;
        }
        .auth-quick-logout-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(239, 68, 68, 0.2);
            border: 1px solid rgba(239, 68, 68, 0.45);
            color: #fecaca;
            padding: 6px 14px;
            border-radius: 9999px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            backdrop-filter: blur(8px);
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            user-select: none;
        }
        .auth-quick-logout-btn:hover {
            background: rgba(239, 68, 68, 0.4);
            border-color: #ef4444;
            color: #fff;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.5);
            transform: translateY(-1px);
        }
        .auth-user-pill {
            display: flex;
            align-items: center;
            gap: 10px;
            background: rgba(15, 23, 42, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 5px 14px 5px 6px;
            border-radius: 9999px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #fff;
            user-select: none;
        }
        .auth-user-pill:hover {
            border-color: #00e5ff;
            box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
            transform: translateY(-1px);
        }
        .auth-avatar-wrap {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #00c6ff, #0072ff);
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .auth-avatar-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .auth-avatar-letter {
            font-size: 14px;
            font-weight: 700;
            color: #fff;
        }
        .auth-user-info {
            display: flex;
            flex-direction: column;
            text-align: left;
            line-height: 1.2;
        }
        .auth-user-name {
            font-size: 0.85rem;
            font-weight: 700;
            color: #fff;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .auth-owner-tag {
            font-size: 0.65rem;
            color: #ffd700;
            font-weight: 600;
        }
        .auth-friend-tag {
            font-size: 0.65rem;
            color: #38bdf8;
            font-weight: 600;
        }
        .auth-arrow-icon {
            opacity: 0.7;
            transition: transform 0.2s;
        }
        .auth-user-pill:hover .auth-arrow-icon {
            opacity: 1;
        }
        .auth-dropdown-menu {
            position: absolute;
            top: calc(100% + 8px);
            right: 0;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
            min-width: 220px;
            padding: 8px;
            z-index: 1001;
            animation: authFadeIn 0.15s ease-out;
        }
        @keyframes authFadeIn {
            from { opacity: 0; transform: translateY(-6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .auth-dropdown-header {
            padding: 8px 12px;
        }
        .auth-dropdown-name {
            font-weight: 700;
            font-size: 0.9rem;
            color: #fff;
        }
        .auth-dropdown-email {
            font-size: 0.75rem;
            color: #94a3b8;
            word-break: break-all;
            margin-top: 2px;
        }
        .auth-dropdown-storage {
            font-size: 0.68rem;
            color: #38bdf8;
            margin-top: 4px;
        }
        .auth-dropdown-divider {
            height: 1px;
            background: rgba(255, 255, 255, 0.1);
            margin: 6px 0;
        }
        .auth-dropdown-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 8px 12px;
            border: none;
            background: transparent;
            color: #cbd5e1;
            font-size: 0.85rem;
            border-radius: 8px;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s, color 0.15s;
        }
        .auth-dropdown-item:hover {
            background: rgba(255, 255, 255, 0.08);
            color: #fff;
        }
        .auth-dropdown-signout:hover {
            background: rgba(239, 68, 68, 0.15);
            color: #f87171;
        }
        .auth-google-signin-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            background: #ffffff;
            color: #3c4043;
            border: 1px solid #dadce0;
            padding: 8px 16px;
            border-radius: 9999px;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .auth-google-signin-btn:hover {
            background: #f8f9fa;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transform: translateY(-1px);
        }
        .google-icon {
            width: 18px;
            height: 18px;
            flex-shrink: 0;
        }
        .learnify-auth-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(8px);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .learnify-auth-modal-card {
            background: #111827;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 20px;
            width: 100%;
            max-width: 440px;
            padding: 28px;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            color: #fff;
            animation: modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalPop {
            from { opacity: 0; transform: scale(0.92); }
            to { opacity: 1; transform: scale(1); }
        }
        .auth-modal-close {
            position: absolute;
            top: 16px;
            right: 18px;
            background: transparent;
            border: none;
            color: #9ca3af;
            font-size: 24px;
            cursor: pointer;
            line-height: 1;
        }
        .auth-modal-close:hover {
            color: #fff;
        }
        .auth-modal-header {
            text-align: center;
            margin-bottom: 20px;
        }
        .auth-modal-logo {
            width: 60px;
            height: 60px;
            border-radius: 12px;
            margin-bottom: 12px;
            box-shadow: 0 4px 14px rgba(0, 229, 255, 0.4);
        }
        .auth-modal-header h2 {
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .auth-modal-header p {
            font-size: 0.85rem;
            color: #94a3b8;
        }
        .auth-google-large-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            background: #fff;
            color: #1f2937;
            border: none;
            padding: 12px 20px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transition: all 0.2s;
        }
        .auth-google-large-btn:hover {
            background: #f3f4f6;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        }
        .auth-divider {
            display: flex;
            align-items: center;
            text-align: center;
            margin: 20px 0;
            color: #64748b;
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.05em;
        }
        .auth-divider::before, .auth-divider::after {
            content: '';
            flex: 1;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .auth-divider span {
            padding: 0 10px;
        }
        .auth-email-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .auth-email-form label {
            font-size: 0.8rem;
            color: #94a3b8;
            font-weight: 500;
        }
        .auth-email-form input {
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 10px;
            padding: 10px 14px;
            color: #fff;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .auth-email-form input:focus {
            border-color: #00e5ff;
        }
        .auth-hint {
            font-size: 0.75rem;
            color: #9ca3af;
            background: rgba(255, 255, 255, 0.04);
            padding: 8px 10px;
            border-radius: 8px;
            line-height: 1.4;
            margin: 4px 0 8px 0;
        }
        .auth-email-submit-btn {
            background: linear-gradient(135deg, #00c6ff, #0072ff);
            color: #fff;
            border: none;
            padding: 11px;
            border-radius: 10px;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.2s;
        }
        .auth-email-submit-btn:hover {
            opacity: 0.95;
            transform: translateY(-1px);
        }
        .learnify-auth-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            padding: 12px 20px;
            border-radius: 10px;
            color: #fff;
            font-size: 0.88rem;
            font-weight: 600;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            z-index: 10000;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            pointer-events: none;
        }
    `;
    document.head.appendChild(style);
}

// Attach LearnifyAuth to window so non-module scripts can access helpers immediately
window.LearnifyAuth = {
    auth,
    db,
    ADITYA_OFFICIAL_EMAIL,
    getCurrentUserId,
    getCurrentUserName,
    getCurrentUserEmail,
    getCurrentUserPhoto,
    isCurrentUserAditya,
    resolveUserKey,
    signInWithGoogle,
    signOutUser,
    signInWithEmailDirect,
    showSignInModal,
    renderHeaderAuthUI,
    updateHeaderAuthUI,
    initAuthListener
};
