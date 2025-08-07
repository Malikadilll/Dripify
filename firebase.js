// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


const firebaseConfig = {
  apiKey: "AIzaSyBQq8IIdqrl0NMf_GhE4BM9ecp4OKvTDIc",
  authDomain: "dripify-hehe.firebaseapp.com",
  projectId: "dripify-hehe",
  storageBucket: "dripify-hehe.firebasestorage.app",
  messagingSenderId: "518272536379",
  appId: "1:518272536379:web:f9a9ad74b43ec7d5b0311e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

