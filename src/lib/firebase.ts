import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'studio-2888800028-25c84',
  appId: '1:625933516635:web:7bb6e14c0145fe2aa2247e',
  apiKey: 'AIzaSyCc1bIjC_lU-T3ghUvvFqnZ5Jyl1BSq774',
  authDomain: 'studio-2888800028-25c84.firebaseapp.com',
  messagingSenderId: '625933516635',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
