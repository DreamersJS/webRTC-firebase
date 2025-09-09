// server.js — WebRTC helper utilities with proper ICE candidate queuing

let pendingCandidates = new Map(); // callId → [candidates]

export function createPeerConnection(remoteVideoEl) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  // Debug logging
  pc.addEventListener("signalingstatechange", () =>
    console.log("🔄 signalingState:", pc.signalingState)
  );
  pc.addEventListener("icegatheringstatechange", () =>
    console.log("❄️ iceGatheringState:", pc.iceGatheringState)
  );
  pc.addEventListener("iceconnectionstatechange", () =>
    console.log("🌐 iceConnectionState:", pc.iceConnectionState)
  );

  // Remote stream container
  const remoteStream = new MediaStream();
  if (remoteVideoEl) {
    remoteVideoEl.srcObject = remoteStream;
  }

  // Incoming remote tracks
  pc.addEventListener("track", (event) => {
    console.log("🎥 Remote track received:", event.track.kind);
    event.streams[0].getTracks().forEach((track) => {
      if (!remoteStream.getTracks().includes(track)) {
        remoteStream.addTrack(track);
      }
    });
  });

  return { pc, remoteStream };
}

export async function attachLocalStream(pc, stream) {
  stream.getTracks().forEach((track) => {
    console.log("➕ Adding local track:", track.kind);
    pc.addTrack(track, stream);
  });

  // Explicit transceivers (better negotiation stability)
  pc.addTransceiver("audio", { direction: "sendrecv" });
  pc.addTransceiver("video", { direction: "sendrecv" });
}

export function listenForRemoteTracks(pc, callback) {
  pc.addEventListener("track", (event) => {
    const remoteStream = event.streams[0];
    console.log("📡 Remote stream event");
    callback(remoteStream);
  });
}

// Save candidate until remoteDescription is set
export function queueCandidate(callId, candidate) {
  if (!pendingCandidates.has(callId)) {
    pendingCandidates.set(callId, []);
  }
  pendingCandidates.get(callId).push(candidate);
  console.log("📥 Queued ICE candidate for call", callId);
}

// Apply queued candidates after remoteDescription is set
export async function flushCandidates(pc, callId) {
  const queued = pendingCandidates.get(callId) || [];
  for (const candidate of queued) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log("✅ Added queued candidate:", candidate);
    } catch (err) {
      console.error("❌ Error adding queued candidate:", err);
    }
  }
  pendingCandidates.delete(callId);
}
