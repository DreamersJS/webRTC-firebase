import { ref, set, push, onChildAdded, onValue, remove, get, off } from "firebase/database";
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

export const addIncomingToDb = async (callId, callerId, callerName, calleeId) => {
    const incomingCallRef = push(ref(db, `users/${calleeId}/incomingCall`));
    await set(incomingCallRef, {
        callId,
        callerId,
        callerName,
        accepted: null,
    });
    return incomingCallRef.key;
}

// export const listenForIncomingCall = (calleeId, callback) => {
//     onValue(ref(db, `users/${calleeId}/incomingCall`), async snapshot => {
//         const incoming = snapshot.val();
//         if (incoming) callback(incoming);
//     });
// };

export const listenForIncomingCall = (calleeId, callback) => {
    const refPath = ref(db, `users/${calleeId}/incomingCall`);
    const unsubscribe = onChildAdded(refPath, (snapshot) => {
        const callKey = snapshot.key;
        const callVal = snapshot.val();

        // Fetch the full metadata if needed, but for now just pass it
        callback({ ...callVal }, callKey);
    });

    return () => off(refPath); // so you can clean up in Home.jsx
};

//Add a new listenForCallStatus for the caller
export const listenForCallStatus = (calleeId, callKey, callback) => {
    const statusRef = ref(db, `users/${calleeId}/incomingCall/${callKey}/accepted`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
        const status = snapshot.val(); // true, false, or null
        callback(status);
    });

    return () => off(statusRef);
};



export const addAcceptCallToDb = async (calleeId, callKey) => {
    await set(ref(db, `users/${calleeId}/incomingCall/${callKey}/accepted`), true);
}
export const addRejectCallToDb = async (calleeId, callKey) => {
    await set(ref(db, `users/${calleeId}/incomingCall/${callKey}/accepted`), false);
}

export const removeIncoming = async (calleeId, callKey) => {
    await remove(ref(db, `users/${calleeId}/incomingCall/${callKey}`));
    return { message: "Incoming call data removed from database." };
}

