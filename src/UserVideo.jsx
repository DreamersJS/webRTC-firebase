import { useEffect, useRef } from "react";
import { attachLocalStream } from "./server";

export default function UserVideo() {
  const videoRef = useRef(null);
  const streamRef = useRef(null); // keep a reference to stop it later

  useEffect(() => {
    let stream;

    const initStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }

        // Attach to peer connection
        attachLocalStream(stream);
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    initStream();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className="rounded-xl shadow-md"
    />
  );
}
