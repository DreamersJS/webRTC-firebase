import React, { useContext, useState } from "react";
import { AppContext } from "./login/AppContext";
import UserVideo from "./UserVideo";
import RemoteVideo from "./RemoteVideo";
import { peerConnection } from "./server";
import ListUsers from "./ListUsers";
import ModalCallerCalling from "./ModalCallerCalling";
import ModalCallee from "./ModalCallee";

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


  useEffect(() => {
    if (isCanceled) {
      setIsCalling(false);
      setSelectedUser(null);
      setIsCanceled(false);
    }
  }, [isCanceled]);

  useEffect(() => {
    console.log({ selectedUser });
  }, [selectedUser]);
  
  useEffect(() => {
    if (isRejected && incomingCall) {
      // reject call logic
      setIncomingCall(null);
      setIsRejected(false);
    }
  }, [isRejected, incomingCall]);

  useEffect(() => {
    if (isAccepted && incomingCall) {
      // join call logic
      setIncomingCall(null);
      setIsAccepted(false);
    }
  }, [isAccepted, incomingCall]);

  const handleStartCall = ({ id, username }) => {
    setSelectedUser({ id, username });
    setIsCalling(true);
    if (isCanceled) {
      // cancel call logic
      setIsCalling(false);
      setSelectedUser(null);
      setIsCanceled(false);
    }
  }

  return (
    <div className="flex gap-4">
      <p>Hello {user.username}!</p>
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

      <UserVideo />
      <RemoteVideo peerConnection={peerConnection} />
    </div>
  );
}
