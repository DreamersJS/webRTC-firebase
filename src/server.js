// create STUN/TURN server using free google STUN server
const servers = {
    iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] }, // free STUN
    ],
};
// Create RTCPeerConnection
let localStream;
let remoteStream;
let peerConnection = new RTCPeerConnection(servers);
// Media setup
const mediaSetup = async () => {
    // get local stream
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    // remote stream
    remoteStream = new MediaStream();
}
// Listen for tracks
const setupTrackListener = () => {
    // local
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    // remote
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        });
    };
}
// Create offer
const createOffer = async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    // send offer to remote peer
    console.log("Offer sent to remote peer:", offer);
    return offer;
}
// Set local description
// Send offer to remote peer
// Receive offer and create answer and description
// Wait for answer from remote peer
// ICE candidate exchange

