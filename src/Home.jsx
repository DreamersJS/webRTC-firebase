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
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    pc.current.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.current.onicecandidate = (e) => {
      if (e.candidate?.candidate) {
        if (!callId) iceQueue.current.push(e.candidate);
        else addIceCandidateToDb(callId, e.candidate, true);
      }
    };

    const newCallId = await createTableRow();
    setCallId(newCallId);

    const offer = await pc.current.createOffer();
    await pc.current.setLocalDescription(offer);
    await addOfferToDb(newCallId, offer);

    const incomingKey = await addIncomingToDb(newCallId, user.uid, user.username, calleeId);

    listenForAnswer(newCallId, async (answer) => {
      if (!answer) return;
      await pc.current.setRemoteDescription(answer);
      flushIceQueue();
    });

    listenForIceCandidates(newCallId, true, async (candidate) => {
      if (candidate?.candidate) {
        if (!pc.current.remoteDescription) iceQueue.current.push(candidate);
        else await pc.current.addIceCandidate(candidate).catch(console.warn);
      }
    });

    setActiveCall({ callId: newCallId, calleeId, key: incomingKey });
    setIsCalling(false);
  };

  const handleJoinCall = async (incomingCallData) => {
    const { callId: cid, key } = incomingCallData;
    setCallId(cid);
    isCallerRef.current = false;

    pc.current = new RTCPeerConnection();
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    stream.getTracks().forEach((t) => pc.current.addTrack(t, stream));

    pc.current.ontrack = (e) => setRemoteStream(e.streams[0]);
    pc.current.onicecandidate = (e) => {
      if (e.candidate?.candidate) {
        if (!pc.current.remoteDescription) iceQueue.current.push(e.candidate);
        else addIceCandidateToDb(cid, e.candidate, false);
      }
    };

    const offer = await getOfferFromDb(cid);
    await pc.current.setRemoteDescription(offer);

    const answer = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answer);
    await addAnswerToDb(cid, answer);

    flushIceQueue();

    listenForIceCandidates(cid, false, async (candidate) => {
      if (candidate?.candidate) {
        if (!pc.current.remoteDescription) iceQueue.current.push(candidate);
        else await pc.current.addIceCandidate(candidate).catch(console.warn);
      }
    });

    setActiveCall({ callId: cid, calleeId: user.uid, key });
    setIncomingCall(null);
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
          onAccept={() => handleJoinCall(incomingCall)}
          onReject={async () => {
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
