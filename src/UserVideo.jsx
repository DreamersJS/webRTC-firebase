import { useEffect, useRef } from "react";

export default function UserVideo() {
  const videoRef = useRef(null);
  const streamRef = useRef(null); // keep a reference to stop it later

  useEffect(() => {
    const initStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream; // save it for cleanup
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };

    initStream();

    // Cleanup function: runs when component unmounts
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
