import React, { forwardRef, useEffect } from "react";

const UserVideo = forwardRef(({ stream }, ref) => {
  useEffect(() => {
    if (ref?.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream, ref]);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      style={{ width: "300px", height: "200px", backgroundColor: "black" }}
    />
  );
});

export default UserVideo;
