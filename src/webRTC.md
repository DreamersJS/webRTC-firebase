
Private direct calls 1:1

navigator.mediaDevices.getUserMedia({ video: true, audio:true })

This asks the browser for access to the user’s camera and mic
It returns a MediaStream object, which represents the live video stream from your camera.
Since it’s await, the code pauses until the user grants/denies permission and the stream is ready.
