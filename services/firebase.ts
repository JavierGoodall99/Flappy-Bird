
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCx86-MYNXCogPgSwwKU12_1O4SYDr6k-E",
  authDomain: "fliply-dba75.firebaseapp.com",
  projectId: "fliply-dba75",
  storageBucket: "fliply-dba75.firebasestorage.app",
  messagingSenderId: "159256066060",
  appId: "1:159256066060:web:44e16618fbf7e7a1d89629",
  measurementId: "G-GGSVTZNBKV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Enable offline persistence
// This allows the DB to work even if the network is down (caches reads/writes)
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence not supported by browser');
        }
    });
} catch (e) {
    // Ignore persistence errors
}

// Authenticate Anonymously
export const signIn = async () => {
    try {
        const userCredential = await signInAnonymously(auth);
        return userCredential.user;
    } catch (error: any) {
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') {
            console.warn("Firebase Authentication is not enabled. Proceeding in offline mode.");
            return null;
        }
        if (error.code === 'auth/admin-restricted-operation') {
             console.warn("Anonymous auth disabled in console. Proceeding offline.");
             return null;
        }
        console.error("Auth Error", error);
        return null;
    }
};

// Authenticate with Google
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error: any) {
        if (error.code === 'auth/unauthorized-domain') {
            let domainToWhitelist = window.location.hostname || window.location.host;

            // Fallback for blob: URLs or sandboxed iframes where hostname is empty
            if (!domainToWhitelist && window.location.href) {
                // Try to extract domain from blob:https://domain/... or just https://domain/...
                const matches = window.location.href.match(/https?:\/\/([a-zA-Z0-9.-]+)/);
                if (matches && matches[1]) {
                    domainToWhitelist = matches[1];
                }
            }

            console.error(`Firebase Auth Domain Error:`);
            console.error(`1. Current Hostname: '${window.location.hostname}'`);
            console.error(`2. Full URL: '${window.location.href}'`);
            console.error(`3. Detected Domain: '${domainToWhitelist}'`);
            console.error("ACTION REQUIRED: Go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add the domain listed above.");

            let alertMsg = `Firebase Auth Error: Domain not authorized.\n\n`;
            if (domainToWhitelist) {
                alertMsg += `Please add '${domainToWhitelist}' to your Firebase Console > Authentication > Settings > Authorized Domains.`;
            } else {
                alertMsg += `Could not detect a valid domain from the URL (${window.location.href}).\nGoogle Sign-In requires a valid public domain. Try deploying the app.`;
            }
            alert(alertMsg);
        } else if (error.code === 'auth/popup-closed-by-user') {
            console.warn("Sign-in popup closed by user.");
        } else {
            console.error("Google Sign In Error", error);
            alert(`Sign-In failed: ${error.message}`);
        }
        return null;
    }
};

// Sign Out
export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error", error);
    }
};

// Listen to Auth State Changes
export const subscribeToAuth = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

// Load User Data: Fetches directly from DB or creates defaults. No LocalStorage.
export const loadUserGameData = async (uid: string, userProfile?: { displayName: string | null, email: string | null, photoURL: string | null }) => {
    if (!uid) return null;
    
    // Default State
    const defaultData = {
        highScores: { standard: 0, battle: 0, danger: 0, playground: 0 },
        unlockedSkins: ['default'],
        currentSkinId: 'default',
        muted: false,
        stats: { gamesPlayed: 0, totalScore: 0 }
    };

    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const remoteData = snap.data();
            
            // If we have a user profile update, apply it
            if (userProfile) {
                await setDoc(userRef, { ...userProfile }, { merge: true });
            }

            // Return remote data merged with structure to ensure all fields exist
            return {
                highScores: { ...defaultData.highScores, ...remoteData.highScores },
                unlockedSkins: remoteData.unlockedSkins || defaultData.unlockedSkins,
                currentSkinId: remoteData.currentSkinId || defaultData.currentSkinId,
                muted: remoteData.muted !== undefined ? remoteData.muted : defaultData.muted,
                stats: { ...defaultData.stats, ...remoteData.stats }
            };
        } else {
            // New User: Create default document
            console.log("Creating new cloud user profile...");
            const newData = { 
                ...defaultData, 
                ...(userProfile || {}) 
            };
            await setDoc(userRef, newData, { merge: true });
            return defaultData;
        }
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Firestore Permission Error: Check console rules.");
        } else {
            console.error("Load Error", error);
        }
        // Fallback to defaults if DB fails, but we don't save locally
        return defaultData; 
    }
};

// Save specific fields to Firestore
export const saveGameData = async (uid: string, data: any) => {
    if (!uid) return;
    try {
        const userRef = doc(db, 'users', uid);
        await setDoc(userRef, data, { merge: true });
    } catch (error: any) {
        if (error.code === 'permission-denied') return;
        if (error.code === 'unavailable') return; // Offline, Firebase handles it via queue
        console.warn("Save Error", error); 
    }
};

export { app, analytics, auth, db };
