import { get, set, ref, query} from "firebase/database";
import { db } from "./firebase-config";

export const getAllUsers = async () => {
  const snapshot = await get(query(ref(db, "users")));
  if (!snapshot.exists()) {
    return [];
  }
  const users = Object.keys(snapshot.val()).map((key) => ({
    id: key,
    ...snapshot.val()[key],
  }));

  return users;
};

export const getUserByUid = async (uid) => {
  const snapshot = await get(ref(db, `users/${uid}`));
  if (!snapshot.exists()) {
    throw new Error("User " + uid + " does not exist.");
  }
  return snapshot.val();
};

export const createUserProfile = (
  uid,
  username,
  email,
  phoneNumber,
  password,
  role = "user",
  status,
  friendsList,
  sentRequests,
  pendingRequests
) => {
  const readableDate = new Date();

  return set(ref(db, `users/${uid}`), {
    uid,
    username,
    email,
    password,
    phoneNumber,
    createdOnReadable: readableDate,
    role,
    status,
    friendsList,
    sentRequests,
    pendingRequests,
    profilePhotoURL: "",
    profileBackgroundURL: "",
    fileURL: "",
    location: "",
  });
};

// subscribe to incoming calls