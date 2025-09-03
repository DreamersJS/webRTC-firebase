import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCJLJh9C08iNJ4oCNnysoREuHe64c26uFo",
  authDomain: "final-project-chat-cd4de.firebaseapp.com",
  projectId: "final-project-chat-cd4de",
  storageBucket: "final-project-chat-cd4de.appspot.com",
  messagingSenderId: "345534762505",
  appId: "1:345534762505:web:7bdcafbd4412a67be6b2d8",
  databaseURL: "https://final-project-chat-cd4de-default-rtdb.europe-west1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
