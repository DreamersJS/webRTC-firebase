import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD--F0AJaSHS32wjDxxp75V1IZXWhC1TE0",
  authDomain: "webrtc-cf3ec.firebaseapp.com",
  databaseURL: "https://webrtc-cf3ec-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "webrtc-cf3ec",
  storageBucket: "webrtc-cf3ec.firebasestorage.app",
  messagingSenderId: "275417866958",
  appId: "1:275417866958:web:fcd70e540777ccef58669f",
  databaseURL: "https://webrtc-cf3ec-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
