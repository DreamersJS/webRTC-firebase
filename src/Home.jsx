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
  addRejectCallToDb,
  removeIncoming,
  deleteTableRow,
  listenForIncomingCall,
  addOfferToDb,
  listenForAnswer,
  addIceCandidateToDb,
  listenForIceCandidates,
  createTableRow,
  getOfferFromDb,
  addAnswerToDb,
} from "./firebaseFuncs";

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
  const iceQueue = useRef([]); // hold ICE before callId exists
  const isCallerRef = useRef(false);

  // 🔔 Listen for incoming calls
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = listenForIncomingCall(user.uid, (callData, callKey) => {
      console.log("📞 Incoming call from:", callData.callerName);
      setIncomingCall({ ...callData, key: callKey });
    });
    return () => unsubscribe && unsubscribe();
  }, [user?.uid]);

  // ❌ End call
  const handleEndCall = async () => {
    console.log("🔚 Ending call...");
    if (activeCall?.callId) await deleteTableRow(activeCall.callId);
    if (activeCall?.calleeId && activeCall.key) {
      await removeIncoming(activeCall.calleeId, activeCall.key);
    }

    if (pc.current) {
      pc.current.getSenders().forEach((s) => s.track?.stop());
      pc.current.close();
      pc.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setIsCalling(false);
    setSelectedUser(null);
    setCallId(null);
  };

  // 🌊 Local and remote video
  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  // 🚀 Flush ICE once callId is ready
  useEffect(() => {
    if (callId && iceQueue.current.length > 0) {
      console.log("🚀 Flushing queued ICE:", iceQueue.current.length);
      iceQueue.current.forEach((c) =>
        addIceCandidateToDb(callId, c, isCallerRef.current)
      );
      iceQueue.current = [];
    }
  }, [callId]);

  // 📞 Start call (caller)
  const handleStartCall = async ({ id: calleeId, username: calleeName }) => {
    console.log("📞 Starting call to:", calleeName);
    setSelectedUser({ id: calleeId, username: calleeName });
    setIsCalling(true);
    isCallerRef.current = true;
  
    // ✅ Use STUN server
    pc.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ]
    });
  
    // 1️⃣ Local media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));
  
    // 2️⃣ Remote tracks
    pc.current.ontrack = (event) => {
      console.log("🎥 Remote stream received (caller)");
      setRemoteStream(event.streams[0]);
    };
  
    // 3️⃣ ICE candidates
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        if (!callId) {
          console.log("⏳ Queuing ICE (caller):", event.candidate);
          iceQueue.current.push(event.candidate);
        } else {
          addIceCandidateToDb(callId, event.candidate, true);
        }
      }
    };
  
    pc.current.oniceconnectionstatechange = () =>
      console.log("ICE connection state:", pc.current.iceConnectionState);
    pc.current.onsignalingstatechange = () =>
      console.log("Signaling state:", pc.current.signalingState);
    pc.current.onicegatheringstatechange = () =>
      console.log("ICE gathering state:", pc.current.iceGatheringState);
  
    // 4️⃣ Create DB row
    const newCallId = await createTableRow();
    setCallId(newCallId);
  
    // 5️⃣ Create & send offer
    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    await addOfferToDb(newCallId, offer);
  
    // 6️⃣ Add incoming call for callee
    const incomingKey = await addIncomingToDb(
      newCallId,
      user.uid,
      user.username,
      calleeId
    );
  
    // 7️⃣ Listen for answer
    listenForAnswer(newCallId, async (answer) => {
      if (!answer) return;
      try {
        await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log("✅ Answer applied (caller)");
      } catch (err) {
        console.error("❌ Failed to apply answer:", err);
      }
    });
  
    // 8️⃣ Listen for ICE from callee
    listenForIceCandidates(newCallId, true, async (candidate) => {
      try {
        await pc.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn("⚠️ Failed to add ICE from callee:", err);
      }
    });
  
    setActiveCall({ callId: newCallId, calleeId, key: incomingKey });
    setIsCalling(false); // hide modal
  };   

  // 📡 Join call (callee)
  const handleJoinCall = async (incomingCallData) => {
    console.log("📡 Joining call:", incomingCallData.callId);
    const { callId: cid, key } = incomingCallData;
    setCallId(cid);
    isCallerRef.current = false;
  
    // ✅ Correctly assign to ref
    pc.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" } // add STUN
      ]
    });
  
    // Local media
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.current.addTrack(track, stream));
  
    // Remote tracks
    pc.current.ontrack = (event) => {
      console.log("🎥 Remote stream received (callee)");
      setRemoteStream(event.streams[0]);
    };
  
    // ICE candidates
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        if (!callId) {
          console.log("⏳ Queuing ICE (callee):", event.candidate);
          iceQueue.current.push(event.candidate);
        } else {
          addIceCandidateToDb(cid, event.candidate, false);
        }
      }
    };
  
    pc.current.oniceconnectionstatechange = () =>
      console.log("ICE connection state:", pc.current.iceConnectionState);
    pc.current.onsignalingstatechange = () =>
      console.log("Signaling state:", pc.current.signalingState);
    pc.current.onicegatheringstatechange = () =>
      console.log("ICE gathering state:", pc.current.iceGatheringState);
  
    // 1️⃣ Get caller's offer
    const offer = await getOfferFromDb(cid);
    if (!offer) return console.error("❌ No offer found for call:", cid);
  
    await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
    console.log("✅ Offer applied (callee)");
  
    // 2️⃣ Create & send answer
    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);
    await addAnswerToDb(cid, answer);
  
    // 3️⃣ Listen for ICE from caller
    listenForIceCandidates(cid, false, async (candidate) => {
      try {
        await pc.current.addIceCandidate(candidate);
      } catch (err) {
        console.warn("⚠️ Failed to add ICE from caller:", err);
      }
    });
  
    setActiveCall({ callId: cid, calleeId: user.uid, key });
    setIncomingCall(null);
  };

  return (
    <div>
      <Login />
      <p>Hello {user?.username}!</p>

      <ListUsers onCall={handleStartCall} selectedUser={selectedUser} />

      {isCalling && selectedUser && (
        <ModalCallerCalling
          callee={selectedUser.username}
          onCancel={handleEndCall}
        />
      )}

      {incomingCall && (
        <ModalCallee
          callData={incomingCall}
          onAccept={() => handleJoinCall(incomingCall)}
          onReject={async () => {
            await addRejectCallToDb(incomingCall.calleeId, incomingCall.key);
            await removeIncoming(incomingCall.calleeId, incomingCall.key);
            setIncomingCall(null);
          }}
        />
      )}

      <div className="flex gap-4">
        <UserVideo ref={localVideoRef} stream={localStream} />
        <RemoteVideo ref={remoteVideoRef} stream={remoteStream} />
        {activeCall && <button onClick={handleEndCall}>End call</button>}
      </div>
    </div>
  );
}
