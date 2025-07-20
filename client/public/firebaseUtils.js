// firebaseUtils.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-auth.js';
import { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, updateDoc, query, where, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.x.x/firebase-firestore.js';
import { toast } from 'react-hot-toast';

// Load Firebase Config from environment variables
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const dbAction = async (userId, collectionName, action, data = {}) => {
    if (!userId || !db) {
        console.error("User or Firestore not initialized.");
        toast.error("An error occurred. Please try again.");
        return;
    }
    const collectionRef = collection(db, "users", userId, collectionName);
    try {
        if (action === 'add') {
            await addDoc(collectionRef, { ...data, createdAt: new Date() });
        } else if (action === 'delete') {
            await deleteDoc(doc(db, "users", userId, collectionName, data.id));
        } else if (action === 'update') {
            await updateDoc(doc(db, "users", userId, collectionName, data.id), data.updates);
        }
    } catch (error) {
        console.error(`Error with ${collectionName}:`, error);
        toast.error(`Failed to perform ${collectionName} action: ${error.message}`);
    }
};

export const fetchItems = async (userId, collectionName) => {
    if (!userId || !db) {
        console.error("User or Firestore not initialized.");
        return [];
    }
    try {
        const q = query(collection(db, "users", userId, collectionName), orderBy("createdAt", "desc"), limit(20));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        toast.error(`Failed to fetch ${collectionName}: ${error.message}`);
        return [];
    }
};

export const checkFavorite = async (userId, identifier) => {
    if (!userId || !db) return false;
    try {
        const q = query(collection(db, "users", userId, "favorites"), where("identifier", "==", identifier));
        const snapshot = await getDocs(q);
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking favorite:", error);
        return false;
    }
};
