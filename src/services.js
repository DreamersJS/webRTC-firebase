import {
    addAnswerToDb,
    addIceCandidateToDb,
    addOfferToDb,
    getOfferFromDb,
    listenForAnswer,
    listenForIceCandidates,
    createTableRow,
  } from "./firebaseFuncs";
  
  import { queueCandidate, flushCandidates } from "./server";
  
  // 📞 Caller creates a new call
  export async function startCall(pc) {
    const callId = await createTableRow();
    console.log("📡 [Caller] Starting call with ID:", callId);
  
    // ICE candidates from callee
    listenForIceCandidates(callId, false, async (candidate) => {
      if (!pc.remoteDescription) {
        queueCandidate(callId, candidate);
      } else {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ [Caller] Added ICE candidate from callee:", candidate);
        } catch (err) {
          console.error("❌ [Caller] Failed to add ICE candidate:", err);
        }
      }
    });
  
    // Create & send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await addOfferToDb(callId, offer);
    console.log("📤 [Caller] Offer stored in DB");
  
    // Wait for answer
    listenForAnswer(callId, async (answer) => {
      console.log("📥 [Caller] Answer received:", answer);
      await pc.setRemoteDescription(answer);
      await flushCandidates(pc, callId);
    });
  
    // Local ICE candidates → DB
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 [Caller] New ICE candidate:", event.candidate);
        addIceCandidateToDb(callId, event.candidate, true);
      }
    };
  
    return callId;
  }
  
  // 📞 Callee joins existing call
  export async function joinCall(pc, callId) {
    console.log("📡 [Callee] Joining call:", callId);
  
    // ICE candidates from caller
    listenForIceCandidates(callId, true, async (candidate) => {
      if (!pc.remoteDescription) {
        queueCandidate(callId, candidate);
      } else {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log("✅ [Callee] Added ICE candidate from caller:", candidate);
        } catch (err) {
          console.error("❌ [Callee] Failed to add ICE candidate:", err);
        }
      }
    });
  
    // Get offer from DB
    const offer = await getOfferFromDb(callId);
    console.log("📥 [Callee] Offer received:", offer);
    await pc.setRemoteDescription(offer);
  
    // Create & send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await addAnswerToDb(callId, answer);
    console.log("📤 [Callee] Answer stored in DB");
  
    // Flush queued ICE candidates
    await flushCandidates(pc, callId);
  
    // Local ICE candidates → DB
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("📤 [Callee] New ICE candidate:", event.candidate);
        addIceCandidateToDb(callId, event.candidate, false);
      }
    };
  }
  