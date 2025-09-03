import { useEffect, useRef } from "react";

export default function RemoteVideo({ peerConnection }) {
  const videoRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream()); // empty container

  useEffect(() => {
    if (!peerConnection) return;

    // Whenever a track arrives from the peer
    peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });

      if (videoRef.current) {
        videoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    // Cleanup: stop all tracks if component unmounts
    return () => {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop());
    };
  }, [peerConnection]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="rounded-xl shadow-md"
    />
  );
}
