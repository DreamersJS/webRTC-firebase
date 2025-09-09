import React, { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "./login/AppContext";
import UserVideo from "./UserVideo";
import RemoteVideo from "./RemoteVideo";
import { listenForRemoteTracks, createPeerConnection } from "./server";
import ListUsers from "./ListUsers";
import ModalCallerCalling from "./ModalCallerCalling";
import ModalCallee from "./ModalCallee";
import { firstCallSetup, joinCall, startCall } from "./services";
import {
  addAcceptCallToDb,
  addIncomingToDb,
  addRejectCallToDb,
  deleteTableRow,
  listenForCallStatus,
  listenForIncomingCall,
  removeIncoming,
} from "./firebaseFuncs";
import { Login } from "./login/Login";

export default function Home() {
  const { user } = useContext(AppContext);

  const [isCalling, setIsCalling] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isCanceled, setIsCanceled] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  const [remoteStream, setRemoteStream] = useState(null);
  const videoRef = useRef(null);
  const pc = useRef(null);

  // Attach remote stream when available
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Attach listener for remote tracks
  useEffect(() => {
    listenForRemoteTracks((stream) => setRemoteStream(stream));
  }, []);

  // Debug
  useEffect(() => {
    console.log({ isCalling, incomingCall });
  }, [isCalling, incomingCall]);

  // Subscribe to incoming calls
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = listenForIncomingCall(user.uid, (callData, callKey) => {
      console.log("Incoming call:", callData);
      setIncomingCall({
        ...callData,
        calleeId: user.uid,
        key: callKey,
      });
    });

    return () => unsubscribe && unsubscribe();
  }, [user?.uid]);

  // Handle cancel from caller side
  useEffect(() => {
    if (isCanceled) {
      handleEndCall();
      setIsCalling(false);
      setSelectedUser(null);
      setIsCanceled(false);
    }
  }, [isCanceled]);

  // Handle reject from callee side
  useEffect(() => {
    if (isRejected && incomingCall) {
      const rejectCall = async () => {
        await addRejectCallToDb(incomingCall.calleeId, incomingCall.key);
        await removeIncoming(incomingCall.calleeId, incomingCall.key);
        handleEndCall();
        setIncomingCall(null);
        setIsRejected(false);
      };
      rejectCall();
    }
  }, [isRejected, incomingCall]);

  // Handle accept from callee side
  useEffect(() => {
    if (isAccepted && incomingCall) {
      const acceptCall = async () => {
        await addAcceptCallToDb(incomingCall.calleeId, incomingCall.key);
        await handleJoinCall(incomingCall.callId);
        setIncomingCall(null);
        setIsAccepted(false);
      };
      acceptCall();
    }
  }, [isAccepted, incomingCall]);

  // Caller starts a call
  const handleStartCall = async ({ id, username }) => {
    setSelectedUser({ id, username });
    setIsCalling(true);

    // create new peer connection
    pc.current = createPeerConnection();

    const callId = await startCall(pc.current);

    const callKey = await addIncomingToDb(
      callId,
      user?.uid,
      user?.username,
      id
    );

    // 👇 Caller listens for accept/reject
    const unsubscribe = listenForCallStatus(id, callKey, (status) => {
      if (status === true) {
        console.log("Callee accepted");
        setIsCalling(false); // hide caller modal
      } else if (status === false) {
        console.log("Callee rejected");
        setIsCalling(false);
        setSelectedUser(null);
      }
    });

    return () => unsubscribe && unsubscribe();
  };

  // Callee joins call
// Callee joins call
const handleJoinCall = async (callId) => {
  pc.current = createPeerConnection();

  // get local media and add tracks (callee video/audio)
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => pc.current.addTrack(track, localStream));

  // attach local stream to UserVideo
  setRemoteStream(localStream); // Optional: show own video in remote stream area

  await joinCall(pc.current, callId);
};


  // End call
  const handleEndCall = async () => {
    if (incomingCall) {
      await deleteTableRow(incomingCall.callId);
      removeIncoming(incomingCall.calleeId, incomingCall.key);
      setIncomingCall(null);
    }
    if (pc.current) {
      pc.current.getSenders().forEach((s) => s.track && s.track.stop());
      pc.current.close();
      pc.current = null;
    }
    setRemoteStream(null);
  };

  return (
    <div>
      <Login />
      <p>Hello {user?.username}!</p>

      <ListUsers onCall={handleStartCall} selectedUser={selectedUser} />

      {isCalling && selectedUser && (
        <ModalCallerCalling
          callee={selectedUser.username}
          onCancel={() => setIsCanceled(true)}
        />
      )}

      {incomingCall && (
        <ModalCallee
          onAccept={() => setIsAccepted(true)}
          onReject={() => setIsRejected(true)}
          callData={incomingCall}
        />
      )}

      <div className="flex gap-4">
        <UserVideo pc={pc} />
        <div>
          <p>Remote Video</p>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="rounded-xl shadow-md"
          />
        {/* <RemoteVideo stream={remoteStream} /> */}
          </div>
        <button onClick={handleEndCall}>End call</button>
      </div>
    </div>
  );
}
