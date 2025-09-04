import { addAnswerToDb, addIceCandidateToDb, addOfferToDb, createTable, createTableRow, getOfferFromDb, listenForAnswer, listenForIceCandidates } from "./firebaseFuncs";
import { peerConnection } from "./server";

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
    
    return callId;
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
    listenForIceCandidates(callId, true, async candidate => {
        await peerConnection.addIceCandidate(candidate);
    });    

}
