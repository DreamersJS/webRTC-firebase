import React, { useContext, useEffect, useState } from "react";
import { AppContext } from "./login/AppContext";
import UserVideo from "./UserVideo";
import RemoteVideo from "./RemoteVideo";
import { peerConnection } from "./server";
import ListUsers from "./ListUsers";
import ModalCallerCalling from "./ModalCallerCalling";
import ModalCallee from "./ModalCallee";
import { firstCallSetup, joinCall, startCall } from "./services";
import { addAcceptCallToDb, addIncomingToDb, addRejectCallToDb, deleteTableRow, listenForCallStatus, listenForIncomingCall, removeIncoming } from "./firebaseFuncs";
import {Login} from "./login/Login";
 
// login and store userData in context
// Hello {user.username}
// list of users + button to select user to call
// on click of button, start call with that user, popup modal Calling Marty... Cancel call button
// other user gets popup modal Incoming call from Andy Accept/Reject buttons
// on accept, join call- both users see video call screen
export default function Home() {
  const { user } = useContext(AppContext);
  const [isCalling, setIsCalling] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null); // { callId, callerId, callerName }
  const [isCanceled, setIsCanceled] = useState(null);
  const [isAccepted, setIsAccepted] = useState(null);
  const [isRejected, setIsRejected] = useState(null);
  // Add activeCall state to track if user is already in a call. Reject new calls automatically or queue them.

  useEffect(() => {
    console.log({ selectedUser, isCalling, incomingCall });
  }, [selectedUser, isCalling, incomingCall]);
  // useEffect(() => {
  //   console.log(`user.uid ${ user.uid}, user.username ${user.username}`);
  //   console.log({user});
  // }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
  
    // Subscribe to incoming calls
    const unsubscribe = listenForIncomingCall(user.uid, (callData, callKey) => {
      console.log("Incoming call:", callData);
      setIncomingCall({
        ...callData,
        calleeId: user.uid,
        key: callKey
      });
    });
  
    return () => unsubscribe && unsubscribe(); // clean up listener on unmount
  }, [user?.uid]);
  
  useEffect(() => {
    if (isCanceled) {
      handleEndCall();
      setIsCalling(false);
      setSelectedUser(null);
      setIsCanceled(false);
    }
  }, [isCanceled]);

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

  useEffect(() => {
    if (isAccepted && incomingCall) {
      // join call logic
      const acceptCall = async () => {
      await addAcceptCallToDb(incomingCall.calleeId, incomingCall.key);
      handleJoinCall(incomingCall.callId);
      setIncomingCall(null);
      setIsAccepted(false);
      }
      acceptCall();
    }
  }, [isAccepted, incomingCall]);

  const handleStartCall = async ({ id, username }) => {
    setSelectedUser({ id, username });
    setIsCalling(true);
  
    const callId = await startCall();
  
    const callKey = await addIncomingToDb(callId, user?.uid, user?.username, id);
  
    // 👇 Caller listens for accept/reject
    const unsubscribe = listenForCallStatus(id, callKey, (status) => {
      if (status === true) {
        console.log("Callee accepted");
        setIsCalling(false); // hide caller modal
      } else if (status === false) {
        console.log("Callee rejected");
        setIsCalling(false); // hide caller modal
        setSelectedUser(null);
      }
    });
  
    // clean up listener on unmount or end
    return () => unsubscribe && unsubscribe();
  };  

  const handleJoinCall = async (callData) => {
    await joinCall(callData);
  }

  const handleEndCall = async () => {
    if (incomingCall) {
      await deleteTableRow(incomingCall.callId);
      removeIncoming(incomingCall.calleeId, incomingCall.key);
      setIncomingCall(null);
    }
    // Close peerConnection tracks
    peerConnection.getSenders().forEach(sender => sender.track.stop());
    peerConnection.close();
  }

  return (
    <div >
      <Login />
      <p>Hello {user?.username}!</p>

      <ListUsers
        onCall={handleStartCall}
        selectedUser={selectedUser}
      />

      {isCalling && selectedUser &&
        <ModalCallerCalling
          callee={selectedUser.username}
          onCancel={() => setIsCanceled(true)} />}

      {incomingCall && <ModalCallee
        onAccept={() => setIsAccepted(true)}
        onReject={() => setIsRejected(true)}
        callData={incomingCall}
      />}

      <div className="flex gap-4">
        <UserVideo />
        <RemoteVideo peerConnection={peerConnection} />
        <button onClick={handleEndCall}>End call</button>
      </div>
    </div>
  );
}
