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

// create table for calls db, "calls" on first call
export const firstCallSetup = async () => {
    const callsRef = await createTable();
};

export async function startCall() {

    // create db, `calls/${callId}` for this call and on end delete it
    // createTableRow returns callId
    const callId = await createTableRow();

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    await addOfferToDb(callId, offer);

    // Listen for answer
    listenForAnswer(callId, async answer => {
        if (!peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });

    // Send caller ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            addIceCandidateToDb(callId, event.candidate, true);
        }
    };

    // Listen for callee ICE
    listenForIceCandidates(callId, false, async candidate => {
        await peerConnection.addIceCandidate(candidate);
    });

}

export async function joinCall(callId) {

    // Get offer
    const offer = await getOfferFromDb(callId);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await addAnswerToDb(callId, answer);

    // Send callee ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            addIceCandidateToDb(callId, event.candidate, false);
        }
    };

    // Listen for caller ICE
    listenForIceCandidates(callId, false, async candidate => {
        await peerConnection.addIceCandidate(candidate);
    });

}
