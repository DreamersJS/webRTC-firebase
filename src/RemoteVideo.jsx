import { useEffect, useRef } from "react";
import { listenForRemoteTracks } from "./server";

export default function RemoteVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleRemoteTrack = (remoteStream) => {
      if (videoRef.current) videoRef.current.srcObject = remoteStream;
    };
  
    listenForRemoteTracks(handleRemoteTrack);
  
    return () => {
      peerConnection.ontrack = null; // remove the listener
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, []);  

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="rounded-xl shadow-md"
    />
  );
}
