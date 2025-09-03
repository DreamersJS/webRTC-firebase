import { ref, set, push, onChildAdded, onValue, remove, get } from "firebase/database";
import { db } from "./firebase";

export const createTable = async () => {
    const callsRef = ref(db, "calls");
    return callsRef;
};

export const createTableRow = async () => {
    // const newCallRef = push(callsRef);
    const newCallRef = push(ref(db, "calls"));  // auto-ID
    const callId = newCallRef.key;
    return callId;
};

export const addOfferToDb = async (callId, offer) => {
    await set(ref(db, `calls/${callId}/offer`), offer);
};

export const addAnswerToDb = async (callId, answer) => {
    await set(ref(db, `calls/${callId}/answer`), answer);
};

export const listenForAnswer = async (callId) => {
    onValue(ref(db, `calls/${callId}/answer`), async snapshot => {
        const answer = snapshot.val();
        return answer;
    });
};

export const addIceCandidateToDb = async (callId, candidate, isCaller) => {
    const candidatePath = isCaller ? `calls/${callId}/callerCandidates` : `calls/${callId}/calleeCandidates`;
    await push(ref(db, candidatePath), candidate.toJSON());
}
/**
 * 
Can't Returning Values from Listeners

onValue and onChildAdded don’t work with return.

They’re event listeners, not promises — so your current return candidate; inside listenForIceCandidates won’t actually return anything to the caller.

Fix: You should provide a callback or use Promise wrapping. 
export const listenForIceCandidates = async (callId, isCaller) => {
    const candidatePath = isCaller ? `calls/${callId}/calleeCandidates` : `calls/${callId}/callerCandidates`;
    onChildAdded(ref(db, candidatePath), async snapshot => {
        const candidate = snapshot.val();
        return candidate;
    }
    );
};
*/
export const listenForIceCandidates = (callId, isCaller, callback) => {
    const candidatePath = isCaller ? `calls/${callId}/calleeCandidates` : `calls/${callId}/callerCandidates`;
    onChildAdded(ref(db, candidatePath), snapshot => {
      const candidate = snapshot.val();
      callback(new RTCIceCandidate(candidate));
    });
  };
  

export const deleteTableRow = async () => {
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
    await listenForAnswer(callId);
    onValue(ref(db, `calls/${callId}/answer`), async snapshot => {
        const answer = snapshot.val();
        if (answer && !peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    });

    // Send caller ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            addIceCandidateToDb(callId, event.candidate, true);
            // push(ref(db, `calls/${callId}/callerCandidates`), event.candidate.toJSON());
        }
    };

    // Listen for callee ICE
    /**
    const candidate = await listenForIceCandidates(callId, false);
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
     */
    listenForIceCandidates(callId, false, async candidate => {
        await peerConnection.addIceCandidate(candidate);
      });      

}

async function joinCall(callId) {

    // Get offer
    const offer = getOfferFromDb(callId);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await addAnswerToDb(callId, answer);

    // Send callee ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            addIceCandidateToDb(callId, event.candidate, false);
            // push(ref(db, `calls/${callId}/calleeCandidates`), event.candidate.toJSON());
        }
    };

    // Listen for caller ICE
    listenForIceCandidates(callId, false, async candidate => {
        await peerConnection.addIceCandidate(candidate);
      });
      
}
