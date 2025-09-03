import React,{ useState } from "react";
import UserVideo from "./UserVideo";
import RemoteVideo from "./RemoteVideo";
import { peerConnection } from "./server";
// import CallButton from "./CallButton";

export default function Home() {
  
    return (
      <div className="flex gap-4">
        <UserVideo />
        <RemoteVideo peerConnection={peerConnection} />
      </div>
    );
  }
  