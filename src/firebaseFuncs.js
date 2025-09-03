import { ref, set, push, onChildAdded, onValue, remove, get } from "firebase/database";
import { db } from "./firebase";

export const createTable = async () => {
    const callsRef = ref(db, "calls");
    return callsRef;
};

export const createTableRow = async () => {
    const newCallRef = push(ref(db, "calls"));
    const callId = newCallRef.key;
    return callId;
};

export const addOfferToDb = async (callId, offer) => {
    await set(ref(db, `calls/${callId}/offer`), offer);
};

export const addAnswerToDb = async (callId, answer) => {
    await set(ref(db, `calls/${callId}/answer`), answer);
};

export const listenForAnswer = (callId, callback) => {
    onValue(ref(db, `calls/${callId}/answer`), async snapshot => {
        const answer = snapshot.val();
        if (answer) callback(answer);
    });
};

export const addIceCandidateToDb = async (callId, candidate, isCaller) => {
    const candidatePath = isCaller ? `calls/${callId}/callerCandidates` : `calls/${callId}/calleeCandidates`;
    await push(ref(db, candidatePath), candidate.toJSON());
}

export const listenForIceCandidates = (callId, isCaller, callback) => {
    const candidatePath = isCaller ? `calls/${callId}/calleeCandidates` : `calls/${callId}/callerCandidates`;
    onChildAdded(ref(db, candidatePath), snapshot => {
        const candidate = snapshot.val();
        callback(new RTCIceCandidate(candidate));
    });
};

export const deleteTableRow = async (callId) => {
    await remove(ref(db, `calls/${callId}`));
    return { message: "Call ended and data removed from database." };
};

export const getOfferFromDb = async (callId) => {
    const offerSnapshot = await get(ref(db, `calls/${callId}/offer`));
    const offer = offerSnapshot.val();
    return offer;
};

export const getAnswerFromDb = async (callId) => {
    const answerSnapshot = await get(ref(db, `calls/${callId}/answer`));
    const answer = answerSnapshot.val();
    return answer;
};