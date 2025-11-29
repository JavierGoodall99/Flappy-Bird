
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  signInAnonymously, 
  GoogleAuthProvider, 
  signInWithPopup,
  linkWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  enableIndexedDbPersistence, 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  onSnapshot
} from "firebase/firestore";

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

// Explicitly set persistence to local (survives browser restart)
setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Auth Persistence Error", error);
});

// Enable offline persistence
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

// --- NAME GENERATOR ---
const ADJECTIVES = ["Neon", "Cyber", "Turbo", "Hyper", "Pixel", "Mega", "Super", "Quantum", "Rapid", "Swift", "Epic", "Shadow", "Cosmic", "Rogue", "Iron", "Golden", "Mystic", "Solar", "Lunar", "Aero"];
const NOUNS = ["Pilot", "Flyer", "Ace", "Scout", "Bird", "Wing", "Glider", "Striker", "Dash", "Falcon", "Eagle", "Raven", "Phoenix", "Viper", "Hawk", "Storm", "Rider", "Ghost", "Surfer"];

const generateRandomName = () => {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const num = Math.floor(Math.random() * 1000);
    return `${adj} ${noun} ${num}`;
};

// Authenticate Anonymously
export const signIn = async () => {
    try {
        // If already signed in, don't create a new one
        if (auth.currentUser) return auth.currentUser;
        
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

export const deleteUserDocument = async (uid: string) => {
    if (!uid) return;
    try {
        await deleteDoc(doc(db, 'users', uid));
        console.log(`Deleted anonymous user data for ${uid}`);
    } catch (e) {
        console.error("Error deleting anonymous data", e);
    }
};

// Authenticate with Google
export const signInWithGoogle = async () => {
    try {
        let result;
        // Check if current user is anonymous. If so, try to link.
        if (auth.currentUser && auth.currentUser.isAnonymous) {
            const anonUid = auth.currentUser.uid;
            try {
                // Try to link the anonymous account to Google
                result = await linkWithPopup(auth.currentUser, googleProvider);
                // If successful, the anon account becomes the Google account.
                // The UID remains the same, so we KEEP the data.
            } catch (linkError: any) {
                if (linkError.code === 'auth/credential-already-in-use') {
                    // Google account already exists. We must sign in to it.
                    // This creates a "new" session with the existing Google user.
                    // The previous anonymous account is now abandoned.
                    
                    console.log("Account exists, switching to it...");
                    
                    // 1. Delete the ABANDONED anonymous account data to prevent table flooding
                    if (anonUid) {
                        await deleteUserDocument(anonUid);
                    }

                    // 2. Sign in to the existing Google account
                    result = await signInWithPopup(auth, googleProvider);
                    
                } else {
                    throw linkError;
                }
            }
        } else {
            // Not anonymous or not logged in, just sign in normally
            result = await signInWithPopup(auth, googleProvider);
        }
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

// Update user profile data
export const updateUserProfile = async (uid: string, data: any) => {
    if (!uid) return;
    try {
        const userRef = doc(db, 'users', uid);
        // Ensure data is an object
        const payload = typeof data === 'string' ? { displayName: data } : data;
        await setDoc(userRef, payload, { merge: true });
    } catch (e) {
        console.error("Error updating profile", e);
    }
};

// Listen to User Data Changes (Real-time)
export const subscribeToGameData = (uid: string, onData: (data: any) => void) => {
    if (!uid) return () => {};
    const userRef = doc(db, 'users', uid);
    return onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            onData(docSnap.data());
        }
    });
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
        stats: { gamesPlayed: 0, totalScore: 0 },
        streak: 0,
        lastLoginDate: null as string | null,
        displayName: null as string | null,
        photoURL: null as string | null,
        avatarColor: '#6366F1',
        avatarText: '',
        useCustomAvatar: false
    };

    try {
        const userRef = doc(db, 'users', uid);
        const snap = await getDoc(userRef);
        
        if (snap.exists()) {
            const remoteData = snap.data();
            
            // LOGIC: Ensure User has a Display Name
            let finalDisplayName = remoteData.displayName;
            let shouldUpdate = false;
            let updatePayload: any = {};

            // If we have a fresh Google profile, sync it
            if (userProfile?.displayName && userProfile.displayName !== remoteData.displayName) {
                finalDisplayName = userProfile.displayName;
                updatePayload.displayName = finalDisplayName;
                shouldUpdate = true;
            }
            if (userProfile?.photoURL && userProfile.photoURL !== remoteData.photoURL) {
                updatePayload.photoURL = userProfile.photoURL;
                shouldUpdate = true;
            }
            if (userProfile?.email && userProfile.email !== remoteData.email) {
                updatePayload.email = userProfile.email;
                shouldUpdate = true;
            }

            // If still no name (Anonymous user first time or existing anonymous), generate one
            if (!finalDisplayName || finalDisplayName === 'Anonymous') {
                finalDisplayName = generateRandomName();
                updatePayload.displayName = finalDisplayName;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                await setDoc(userRef, updatePayload, { merge: true });
            }

            return {
                highScores: { ...defaultData.highScores, ...remoteData.highScores },
                unlockedSkins: remoteData.unlockedSkins || defaultData.unlockedSkins,
                currentSkinId: remoteData.currentSkinId || defaultData.currentSkinId,
                muted: remoteData.muted !== undefined ? remoteData.muted : defaultData.muted,
                stats: { ...defaultData.stats, ...remoteData.stats },
                streak: remoteData.streak || defaultData.streak,
                lastLoginDate: remoteData.lastLoginDate || defaultData.lastLoginDate,
                displayName: finalDisplayName || defaultData.displayName,
                photoURL: remoteData.photoURL || userProfile?.photoURL || defaultData.photoURL,
                avatarColor: remoteData.avatarColor || defaultData.avatarColor,
                avatarText: remoteData.avatarText || defaultData.avatarText,
                useCustomAvatar: remoteData.useCustomAvatar ?? defaultData.useCustomAvatar
            };
        } else {
            // New User: Create default document
            console.log("Creating new cloud user profile...");
            
            let finalDisplayName = userProfile?.displayName;
            if (!finalDisplayName) {
                finalDisplayName = generateRandomName();
            }

            const newData = { 
                ...defaultData, 
                ...(userProfile || {}),
                displayName: finalDisplayName,
                // Initialize streak for new user
                streak: 1,
                lastLoginDate: new Date().toDateString()
            };
            await setDoc(userRef, newData, { merge: true });
            
            return {
                ...newData
            };
        }
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            console.warn("Firestore Permission Error: Check console rules.");
        } else {
            console.error("Load Error", error);
        }
        // Fallback for failed load
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

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  photoURL: string;
  score: number;
}

export const getLeaderboard = async (mode: string = 'standard'): Promise<LeaderboardEntry[]> => {
  try {
    const usersRef = collection(db, 'users');
    // Query top 20 users by high score in the specified mode
    const q = query(usersRef, orderBy(`highScores.${mode}`, 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        displayName: data.displayName || 'Anonymous',
        photoURL: data.photoURL || '',
        score: data.highScores?.[mode] || 0
      };
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

export { app, analytics, auth, db };
