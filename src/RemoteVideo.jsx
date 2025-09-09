import React, { forwardRef, useEffect } from "react";

const RemoteVideo = forwardRef(({ stream }, ref) => {
  useEffect(() => {
    if (ref?.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, ref]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      style={{ width: "300px", height: "200px", backgroundColor: "black" }}
    />
  );
});

export default RemoteVideo;
