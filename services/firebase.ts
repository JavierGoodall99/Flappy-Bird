
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
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

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

// Sync Logic: Merges local data with cloud data
export const syncUserData = async (uid: string, localData: any) => {
    if (!uid) return localData;
    
    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const remoteData = snap.data();
            
            // Merge High Scores (Keep Highest)
            const mergedScores = {
                standard: Math.max(localData.highScores?.standard || 0, remoteData.highScores?.standard || 0),
                battle: Math.max(localData.highScores?.battle || 0, remoteData.highScores?.battle || 0),
                danger: Math.max(localData.highScores?.danger || 0, remoteData.highScores?.danger || 0),
                playground: 0
            };

            // Merge Skins (Union)
            const localSkins = Array.isArray(localData.unlockedSkins) ? localData.unlockedSkins : [];
            const remoteSkins = Array.isArray(remoteData.unlockedSkins) ? remoteData.unlockedSkins : [];
            const mergedSkins = [...new Set([...localSkins, ...remoteSkins])];

            // Merge Settings
            const mergedMuted = remoteData.muted !== undefined ? remoteData.muted : localData.muted;
            const mergedSkinId = remoteData.currentSkinId || localData.currentSkinId;

            return {
                highScores: mergedScores,
                unlockedSkins: mergedSkins,
                currentSkinId: mergedSkinId,
                muted: mergedMuted
            };
        } else {
            // First time cloud user, save local data to cloud
            await setDoc(userRef, localData, { merge: true });
            return localData;
        }
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Firestore Permission Error: Database access denied. Check your Firestore Security Rules in Firebase Console.");
        } else if (error.code === 'unavailable') {
             console.warn("Firestore unavailable (offline).");
        } else {
            console.error("Sync Error", error);
        }
        return localData; 
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
        if (error.code === 'unavailable') return;
        console.warn("Save Error", error); 
    }
};

export { app, analytics, auth, db };
