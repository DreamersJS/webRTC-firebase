
Private direct calls 1:1

## navigator.mediaDevices.getUserMedia({ video: true, audio:true })

This asks the browser for access to the user’s camera and mic
It returns a MediaStream object, which represents the live video stream from your camera.
Since it’s await, the code pauses until the user grants/denies permission and the stream is ready.

Normally, we set video.src = "somefile.mp4" when playing a video file.

But for live streams (camera/microphone), we can’t use a normal URL. Instead, we use srcObject, which can take a MediaStream directly.

The browser will then play that live stream inside the <video> element.

autoplay: start playing automatically.
playsinline: prevents full-screen on mobile.

## new RTCPeerConnection()

Creates a WebRTC peer connection with default settings.
By default:
It won’t use any STUN or TURN servers for NAT traversal.
This means peers can only connect directly if they’re on the same local network, wifi or if the browser can figure out a direct route.
In real-world cases, this often fails across different networks (e.g., two people behind different routers).
So this is fine for local tests but not for production video calls.

## new RTCPeerConnection(servers)

Here, servers is an RTCConfiguration object where you specify ICE servers (STUN/TURN).

STUN server → helps discover the device’s public IP + port behind a NAT.

TURN server → acts as a relay when a direct peer-to-peer connection is impossible (e.g., corporate firewalls, strict NATs).

## What is an ICE candidate?

ICE = Interactive Connectivity Establishment.
An ICE candidate is basically a possible way to reach a peer.
It’s just an object with connection details like IP address + port + transport protocol.
The browser gathers multiple candidates (local, reflexive via STUN, or relay via TURN).

Types of ICE candidates
Host → your local IP address (e.g., 192.168.x.x). Works on same WiFi.
Server reflexive → public IP discovered via STUN server. Works across NAT.
Relay → goes through TURN server. Used when direct connections fail.

Why do we need this?

WebRTC is peer-to-peer. But in reality:
Devices are often behind routers (NAT) or firewalls.
Browsers don’t know ahead of time how to connect.
ICE + STUN/TURN lets peers try different paths until one succeeds.

## 