import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "./login/AppContext";
import UserVideo from "./UserVideo";
import RemoteVideo from "./RemoteVideo";
import ListUsers from "./ListUsers";
import ModalCallerCalling from "./ModalCallerCalling";
import ModalCallee from "./ModalCallee";
import { Login } from "./login/Login";
import {
  addIncomingToDb,
  removeIncoming,
  createTableRow,
  addOfferToDb,
  listenForAnswer,
  addAnswerToDb,
  getOfferFromDb,
  addIceCandidateToDb,
  listenForIceCandidates,
  listenForIncomingCall,
} from "./firebaseFuncs";
import DebugLog from "./DebugLog";

// WORKING
// https://incomparable-bavarois-2e0fb3.netlify.app/
export default function Home() {
  const { user } = useContext(AppContext);

  const [isCalling, setIsCalling] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callId, setCallId] = useState(null);

  const pc = useRef(null);
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const iceQueue = useRef([]);
  const isCallerRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = listenForIncomingCall(user.uid, (callData, key) => {
      setIncomingCall({ ...callData, key });
    });
    return () => unsubscribe && unsubscribe();
  }, [user?.uid]);

  const handleEndCall = async () => {
    if (activeCall?.callId) {
      // remove call from Firebase
      try {
        if (isCallerRef.current) {
          await removeIncoming(activeCall.calleeId, activeCall.key);
        } else {
          await removeIncoming(user.uid, activeCall.key);
        }
      } catch (err) {
        console.error("❌ Failed to clean up call in DB:", err);
      }
    }
    if (pc.current) {
      pc.current.getSenders().forEach((s) => s.track?.stop());
      pc.current.close();
      pc.current = null;
    }
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsCalling(false);
    setSelectedUser(null);
    setCallId(null);
    iceQueue.current = [];
  };

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // Flush queued ICE
  const flushIceQueue = async () => {
    if (!pc.current || !pc.current.remoteDescription) return;
    for (let c of iceQueue.current) {
      if (c?.candidate) await pc.current.addIceCandidate(c).catch(console.warn);
    }
    iceQueue.current = [];
  };

  const handleStartCall = async ({ id: calleeId, username: calleeName }) => {
    setSelectedUser({ id: calleeId, username: calleeName });
    setIsCalling(true);
    isCallerRef.current = true;

    pc.current = new RTCPeerConnection();
    // Get local media
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    // Remote stream
    pc.current.ontrack = (e) => setRemoteStream(e.streams[0]);

    // Create callId early so ICE can go straight to DB
    const newCallId = await createTableRow();
    setCallId(newCallId);
    // flush caller ICE
    for (let c of iceQueue.current) {
      // addIceCandidateToDb = async (callId, candidate, isCaller)
      if (c?.candidate) await addIceCandidateToDb(newCallId, c, true);
    }
    iceQueue.current = [];

    // ICE candidates
    pc.current.onicecandidate = (e) => {
      if (e.candidate?.candidate) {
        // if (!callId) iceQueue.current.push(e.candidate);
        // else addIceCandidateToDb(callId, e.candidate, true);
        if (!e.candidate?.candidate) return;
        addIceCandidateToDb(newCallId, e.candidate, true);
      }
    };

    // Create offer
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    await addOfferToDb(newCallId, offer);

    // Add yourself as incoming for callee
    const incomingKey = await addIncomingToDb(newCallId, user.uid, user.username, calleeId);

    // Listen for answer and remote ICE
    listenForAnswer(newCallId, async (answer) => {
      if (!answer) return;
      await pc.current.setRemoteDescription(answer);
      flushIceQueue();
    });

    listenForIceCandidates(newCallId, true, async (candidate) => {
      // if (candidate?.candidate) {
      //   if (!pc.current.remoteDescription) iceQueue.current.push(candidate);
      //   else await pc.current.addIceCandidate(candidate).catch(console.warn);
      // }
      if (!candidate?.candidate) return;
      if (!pc.current.remoteDescription) iceQueue.current.push(candidate);
      else await pc.current.addIceCandidate(candidate).catch(console.warn);
    });

    setActiveCall({ callId: newCallId, calleeId, key: incomingKey });
    setIsCalling(false);
  };

  const handleJoinCall = async (incomingCallData) => {
    const { callId: cid, key } = incomingCallData;
    setCallId(cid);
    isCallerRef.current = false;

    pc.current = new RTCPeerConnection();

    // 🎤 Get local stream
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    // 📺 Remote stream
    pc.current.ontrack = (e) => setRemoteStream(e.streams[0]);

    // ❄️ ICE candidates
    pc.current.onicecandidate = (e) => {
      // if (e.candidate?.candidate) {
      //   if (!pc.current.remoteDescription) {
      //     console.log("⏳ Queuing local ICE (callee)", e.candidate);
      //     iceQueue.current.push(e.candidate);
      //   } else {
      //     addIceCandidateToDb(cid, e.candidate, false);
      //   }
      // }
      if (!e.candidate?.candidate) return;
      if (!pc.current.remoteDescription) {
        iceQueue.current.push(e.candidate);
      } else {
        addIceCandidateToDb(cid, e.candidate, false);
      }
    };

    try {
      // 🔁 Wait for offer in DB (retry up to 5x)
      let offer = null;
      for (let i = 0; i < 20; i++) {
        offer = await getOfferFromDb(cid);
        if (offer) break;
        console.warn(`⏳ Offer not found yet, retrying... (${i + 1}/5)`);
        await new Promise((res) => setTimeout(res, 500));
      }
      if (!offer) throw new Error("❌ No offer found in DB after retries");

      await pc.current.setRemoteDescription(offer);

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      await addAnswerToDb(cid, answer);

      // 🚀 Flush queued ICE after remote description is set
      // flushIceQueue();
      for (let c of iceQueue.current) {
        if (c?.candidate) await pc.current.addIceCandidate(c).catch(console.warn);
      }
      iceQueue.current = [];

      // 🔥 Listen for remote ICE from caller
      // listenForIceCandidates(cid, false, async (candidate) => {
      //   if (candidate?.candidate) {
      //     if (!pc.current.remoteDescription) {
      //       console.log("⏳ Queuing remote ICE (callee)", candidate);
      //       iceQueue.current.push(candidate);
      //     } else {
      //       try {
      //         await pc.current.addIceCandidate(candidate);
      //       } catch (err) {
      //         console.warn("⚠️ Failed to add ICE from caller:", err);
      //       }
      //     }
      //   }
      // });
      listenForIceCandidates(cid, false, async (candidate) => {
        if (!candidate?.candidate) return;
        if (!pc.current.remoteDescription) {
          iceQueue.current.push(candidate);
        } else {
          try {
            await pc.current.addIceCandidate(candidate);
          } catch (err) {
            console.warn("Failed to add caller ICE:", err);
          }
        }
      }); 

      setActiveCall({ callId: cid, calleeId: user.uid, key });
    } catch (err) {
      console.error("❌ handleJoinCall failed:", err);
      alert("Could not join the call. Please try again.");
    } finally {
      // ✅ Always close modal (even if error)
      setIncomingCall(null);
    }
  };

  return (
    <div>
      <Login />
      <p>Hello {user?.username}</p>
      <ListUsers onCall={handleStartCall} selectedUser={selectedUser} />

      {isCalling && selectedUser && (
        <ModalCallerCalling callee={selectedUser.username} onCancel={handleEndCall} />
      )}

      {incomingCall && (
        <ModalCallee
          callData={incomingCall}
          onAccept={async () => {
            try {
              await handleJoinCall(incomingCall);
              // setActiveCall((prev) => ({
              //   ...prev,
              //   calleeId: user.uid,
              // }));
              setIncomingCall(null); // ✅ only clear modal after success
            } catch (err) {
              console.error("❌ Failed to join call:", err);
              alert("Joining failed, try again.");
            }
          }}

          onReject={async () => {
            try {
              await addRejectCallToDb(incomingCall.callId, user.uid); // mark call rejected
              await removeIncoming(user.uid, incomingCall.key);       // remove your incoming entry
            } catch (err) {
              console.error("❌ Failed to clean DB on reject:", err);
            } finally {
              setIncomingCall(null);
            }
          }}
        />
      )}

      <div className="flex gap-4">
        <UserVideo ref={localVideoRef} stream={localStream} />
        <RemoteVideo ref={remoteVideoRef} stream={remoteStream} />
        {activeCall && <button onClick={handleEndCall}>End call</button>}
      </div>
      <DebugLog />
    </div>
  );
}
