import { ref, set, push, onChildAdded, onValue, remove, get, off } from "firebase/database";
import { db } from "./firebase";

// 🕒 helper
const log = (action, data) => {
  console.log(`[${new Date().toISOString()}] 🔥 ${action}:`, data);
};

export const createTable = async () => {
  const callsRef = ref(db, "calls");
  return callsRef;
};

export const createTableRow = async () => {
  const newCallRef = push(ref(db, "calls"));
  const callId = newCallRef.key;
  log("createTableRow", { callId });
  return callId;
};

export const addOfferToDb = async (callId, offer) => {
  log("addOfferToDb", { callId, type: offer.type });
  await set(ref(db, `calls/${callId}/offer`), offer);
};

export const addAnswerToDb = async (callId, answer) => {
  log("addAnswerToDb", { callId, type: answer.type });
  await set(ref(db, `calls/${callId}/answer`), answer);
};

export const listenForAnswer = (callId, callback) => {
  log("listenForAnswer", { callId });
  onValue(ref(db, `calls/${callId}/answer`), async (snapshot) => {
    const answer = snapshot.val();
    if (answer) {
      console.log("Answer received from DB:", answer);
      log("answerReceived", { callId, type: answer.type });
      callback(answer);
    }
  });
};

export const listenForAnswerOnce = (callId) => {
  log("listenForAnswerOnce", { callId });
  return new Promise((resolve) => {
    onValue(
      ref(db, `calls/${callId}/answer`),
      (snapshot) => {
        const answer = snapshot.val();
        if (answer) {
          log("answerReceivedOnce", { callId, type: answer.type });
          resolve(answer);
        }
      },
      { onlyOnce: true }
    );
  });
};

export const addIceCandidateToDb = async (callId, candidate, isCaller) => {
  const candidatePath = isCaller
    ? `calls/${callId}/callerCandidates`
    : `calls/${callId}/calleeCandidates`;

  log("addIceCandidateToDb", {
    callId,
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    role: isCaller ? "caller" : "callee",
  });
  await push(ref(db, candidatePath), candidate.toJSON());
  console.log("Adding ICE candidate to DB:", candidate, "at path:", candidatePath);
};

export const listenForIceCandidates = (callId, isCaller, callback) => {
  const candidatePath = isCaller
    ? `calls/${callId}/calleeCandidates`
    : `calls/${callId}/callerCandidates`;

  log("listenForIceCandidates", { callId, path: candidatePath });
  console.log("Listening for ICE candidates at path:", candidatePath);

  onChildAdded(ref(db, candidatePath), (snapshot) => {
    const candidate = snapshot.val();
    
    // Determine actual role of candidate from DB path
    const candidateRole = isCaller ? "callee" : "caller";

    log("iceCandidateReceived", {
      callId,
      candidate: candidate?.candidate,
      role: candidateRole, // <-- real candidate role
    });

    callback(new RTCIceCandidate(candidate));
  });
};

export const deleteTableRow = async (callId) => {
  log("deleteTableRow", { callId });
  await remove(ref(db, `calls/${callId}`));
  return { message: "Call ended and data removed from database." };
};

export const getOfferFromDb = async (callId) => {
  const offerSnapshot = await get(ref(db, `calls/${callId}/offer`));
  const offer = offerSnapshot.val();
  log("getOfferFromDb", { callId, found: !!offer });
  return offer;
};

export const getAnswerFromDb = async (callId) => {
  const answerSnapshot = await get(ref(db, `calls/${callId}/answer`));
  const answer = answerSnapshot.val();
  log("getAnswerFromDb", { callId, found: !!answer });
  return answer;
};

export const addIncomingToDb = async (callId, callerId, callerName, calleeId) => {
  const incomingCallRef = push(ref(db, `users/${calleeId}/incomingCall`));
  const callData = {
    callId,
    callerId,
    callerName,
    accepted: null,
  };
  log("addIncomingToDb", { calleeId, callData });
  await set(incomingCallRef, callData);
  return incomingCallRef.key;
};

export const listenForIncomingCall = (calleeId, callback) => {
  const refPath = ref(db, `users/${calleeId}/incomingCall`);
  log("listenForIncomingCall", { calleeId });

  const unsubscribe = onChildAdded(refPath, (snapshot) => {
    const callKey = snapshot.key;
    const callVal = snapshot.val();
    log("incomingCallReceived", { calleeId, callKey, callVal });
    callback({ ...callVal }, callKey);
  });

  return () => off(refPath);
};

export const listenForCallStatus = (calleeId, callKey, callback) => {
  const statusRef = ref(db, `users/${calleeId}/incomingCall/${callKey}/accepted`);
  log("listenForCallStatus", { calleeId, callKey });

  const unsubscribe = onValue(statusRef, (snapshot) => {
    const status = snapshot.val();
    log("callStatusUpdate", { calleeId, callKey, status });
    callback(status);
  });

  return () => off(statusRef);
};

export const addAcceptCallToDb = async (calleeId, callKey) => {
  log("addAcceptCallToDb", { calleeId, callKey });
  await set(ref(db, `users/${calleeId}/incomingCall/${callKey}/accepted`), true);
};

export const addRejectCallToDb = async (calleeId, callKey) => {
  log("addRejectCallToDb", { calleeId, callKey });
  await set(ref(db, `users/${calleeId}/incomingCall/${callKey}/accepted`), false);
};

export const removeIncoming = async (calleeId, callKey) => {
  log("removeIncoming", { calleeId, callKey });
  await remove(ref(db, `users/${calleeId}/incomingCall/${callKey}`));
  return { message: "Incoming call data removed from database." };
};
