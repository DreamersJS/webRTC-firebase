// server.js
const servers = {
    iceServers: [
        { urls: ["stun:stun.l.google.com:19302"] },
    ],
};

export function createPeerConnection() {
    return new RTCPeerConnection(servers);
}

let peerConnection = createPeerConnection();

export const attachLocalStream = (stream) => {
    stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
    });
};

export function listenForRemoteTracks(onRemoteStream) {
    const remoteStream = new MediaStream();
    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            if (!remoteStream.getTracks().includes(track)) {
                remoteStream.addTrack(track);
            }
        });
        onRemoteStream(remoteStream);
    };
}