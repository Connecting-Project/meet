/**
 * Socket.io socket
 */
let socket;
/**
 * The stream object used to send media
 */
let localStream = null;
/**
 * All peer connections
 */
let peers = {}

// redirect if not https
if (location.href.substr(0, 5) !== 'https')
    location.href = 'https' + location.href.substr(4, location.href.length - 4)

var clientId;
var myName;
var room;
//////////// CONFIGURATION //////////////////

/**
 * RTCPeerConnection configuration 
 */
const configuration = {
    "iceServers": [{
        "urls": "stun:stun.l.google.com:19302"
    },
    // public turn server from https://gist.github.com/sagivo/3a4b2f2c7ac6e1b5267c2f1f59ac6c6b
    // set your own servers here
    {
        url: 'turn:192.158.29.39:3478?transport=udp',
        credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        username: '28224511:1379330808'
    }
    ]
}

/**
 * UserMedia constraints
 */
let constraints = {
    audio: true,
    video: {
        width: {
            max: 300
        },
        height: {
            max: 300
        }
    }
}

/////////////////////////////////////////////////////////

constraints.video.facingMode = {
    ideal: "user"
}

// enabling the camera at startup
navigator.mediaDevices.getUserMedia(constraints).then(stream => {
    console.log('Received local stream');

    localVideo.srcObject = stream;
    localStream = stream;

    init()

}).catch(e => alert(`getusermedia error ${e.name}`))

/**
 * initialize the socket connections
 */
function init() {
    socket = io()

    socket.on('initReceive', socket_id => {
        console.log('INIT RECEIVE ' + socket_id)
        addPeer(socket_id, false)

        socket.emit('initSend', socket_id)
    })

    socket.on('initSend', socket_id => {
        console.log('INIT SEND ' + socket_id)
        addPeer(socket_id, true)
    })

    socket.on('removePeer', socket_id => {
        console.log('removing peer ' + socket_id)
        removePeer(socket_id)
    })

    socket.on('disconnect', () => {
        console.log('GOT DISCONNECTED')
        for (let socket_id in peers) {
            removePeer(socket_id)
        }
    })

    socket.on('signal', data => {
        peers[data.socket_id].signal(data.signal)
    })

    var temp = location.href.split("?");
    var datas = temp[1].split(":");
    room = datas[1];

    // Could prompt for room name:
    // room = prompt('Enter room name:');

    if (room !== '') {
        socket.emit('create or join', room);
        console.log('Attempted to create or  join room', room);
    }

    socket.on('created', function (room, id) {
        console.log('Created room ' + room);
        clientId = id;
    });

    socket.on('full', function (room) {
        console.log('Room ' + room + ' is full');
    });

    socket.on('join', function (room) {
        console.log('Another peer made a request to join room ' + room);
        console.log('This peer is the initiator of room ' + room + '!');
    });

    socket.on('joined', function (room, id) {
        console.log('joined: ' + room);
        clientId = id;
    });
    socket.on('receivechat', function (data) {
        receive(data);
    });
}

/**
 * chatting ststem
 */
 window.onload = function(){
    myName = prompt("닉네임을 입력해주세요.", Math.random().toString(36).substr(2, 11));
    while (true) {
        if (myName === null || myName.trim() === "") {
            alert('닉네임을 입력해주세요.');
            myName = prompt("닉네임을 입력해주세요.", Math.random().toString(36).substr(2, 11));
        } else {
            break;
        }
    }
}
// init 함수
function chatInit() {
    // enter 키 이벤트
    var textarea = document.querySelector('#chat-input');

    textarea.addEventListener("keydown", (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();
            const message = textarea.value;

            // 메시지 전송
            sendMessage(message);
            // 입력창 clear
            clearTextarea();
        }
    })
}

// 메세지 태그 생성
function createMessageTag(LR_className, senderName, message) {
    // 형식 가져오기
    let chatLi = document.querySelector('div.chat.format ul li').cloneNode(true);
    // 값 채우기
    chatLi.className = LR_className;
    chatLi.querySelector(".sender span").innerHTML = senderName;
    chatLi.querySelector(".message span").innerHTML = message;

    return chatLi;
}

// 메세지 태그 append
function appendMessageTag(LR_className, senderName, message) {
    const chatLi = createMessageTag(LR_className, senderName, message);

    document.querySelector('div.chat:not(.format) ul').append(chatLi);

    // 스크롤바 아래 고정
    document.querySelector('div.chat').scrollTop = document.querySelector('div.chat').scrollHeight;
}

// 메세지 전송
function sendMessage(message) {
    // 서버에 전송하는 코드로 후에 대체
    const data = {
        "room": room,
        "senderName": myName,
        "message": message,
        "clientId": clientId,
    };

    socket = io();
    socket.emit("sendchat", data);
}

// 메세지 입력박스 내용 지우기
function clearTextarea() {
    var textarea = document.querySelector('#chat-input');
    textarea.value = "";
}

// 메세지 수신
function receive(data) {
    const LR = (data.clientId !== clientId) ? "left" : "right";
    appendMessageTag(LR, data.senderName, data.message);
}

chatInit();







/**
 * Remove a peer with given socket_id. 
 * Removes the video element and deletes the connection
 * @param {String} socket_id 
 */
function removePeer(socket_id) {

    let videoEl = document.getElementById(socket_id)
    if (videoEl) {

        const tracks = videoEl.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.srcObject = null
        videoEl.parentNode.removeChild(videoEl)
    }
    if (peers[socket_id]) peers[socket_id].destroy()
    delete peers[socket_id]
}

/**
 * Creates a new peer connection and sets the event listeners
 * @param {String} socket_id 
 *                 ID of the peer
 * @param {Boolean} am_initiator 
 *                  Set to true if the peer initiates the connection process.
 *                  Set to false if the peer receives the connection. 
 */
function addPeer(socket_id, am_initiator) {
    peers[socket_id] = new SimplePeer({
        initiator: am_initiator,
        stream: localStream,
        config: configuration
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id
        })
    })

    peers[socket_id].on('stream', stream => {
        let newVid = document.createElement('video')
        newVid.srcObject = stream
        newVid.id = socket_id
        newVid.playsinline = false
        newVid.autoplay = true
        newVid.className = "vid"
        newVid.onclick = () => openPictureMode(newVid)
        newVid.ontouchstart = (e) => openPictureMode(newVid)
        videos.appendChild(newVid)
    })
}

/**
 * Opens an element in Picture-in-Picture mode
 * @param {HTMLVideoElement} el video element to put in pip mode
 */
function openPictureMode(el) {
    console.log('opening pip')
    el.requestPictureInPicture()
}

/**
 * Switches the camera between user and environment. It will just enable the camera 2 cameras not supported.
 */
function switchMedia() {
    if (constraints.video.facingMode.ideal === 'user') {
        constraints.video.facingMode.ideal = 'environment'
    } else {
        constraints.video.facingMode.ideal = 'user'
    }

    const tracks = localStream.getTracks();

    tracks.forEach(function (track) {
        track.stop()
    })

    localVideo.srcObject = null
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {

        for (let socket_id in peers) {
            for (let index in peers[socket_id].streams[0].getTracks()) {
                for (let index2 in stream.getTracks()) {
                    if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                        peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                        break;
                    }
                }
            }
        }

        localStream = stream
        localVideo.srcObject = stream

        updateButtons()
    })
}

/**
 * Enable screen share
 */
function setScreen() {
    navigator.mediaDevices.getDisplayMedia().then(stream => {
        for (let socket_id in peers) {
            for (let index in peers[socket_id].streams[0].getTracks()) {
                for (let index2 in stream.getTracks()) {
                    if (peers[socket_id].streams[0].getTracks()[index].kind === stream.getTracks()[index2].kind) {
                        peers[socket_id].replaceTrack(peers[socket_id].streams[0].getTracks()[index], stream.getTracks()[index2], peers[socket_id].streams[0])
                        break;
                    }
                }
            }

        }
        localStream = stream

        localVideo.srcObject = localStream
        socket.emit('removeUpdatePeer', '')
    })
    updateButtons()
}

/**
 * Disables and removes the local stream and all the connections to other peers.
 */
function removeLocalStream() {
    if (localStream) {
        const tracks = localStream.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        localVideo.srcObject = null
    }

    for (let socket_id in peers) {
        removePeer(socket_id)
    }

    window.close();
}

/**
 * Enable/disable microphone
 */
function toggleMute() {
    var micbtn = document.getElementById("micbtn");
    var micbtnSlash = document.getElementById("micbtn-slash");
    var micbox = document.getElementById("micbox");
    for (let index in localStream.getAudioTracks()) {
        localStream.getAudioTracks()[index].enabled = !localStream.getAudioTracks()[index].enabled
    }
    if (micbtn.style.display === "none") {
        micbtn.style.display = "inline-block";
        micbtnSlash.style.display = "none";
        micbox.style.backgroundColor = "#FFFFFF";
    } else {
        micbtn.style.display = "none";
        micbtnSlash.style.display = "inline-block";
        micbtnSlash.style.color = "#FFFFFF";
        micbox.style.backgroundColor = "#d93025";
    }


}
/**
 * Enable/disable video
 */
function toggleVid() {
    var videobtn = document.getElementById("videobtn");
    var videobox = document.getElementById("videobox");
    var videoSlash = document.getElementById("video-slash");

    for (let index in localStream.getVideoTracks()) {
        localStream.getVideoTracks()[index].enabled = !localStream.getVideoTracks()[index].enabled
    }

    if (videobtn.style.display === "none") {
        videobtn.style.display = "inline-block";
        videoSlash.style.display = "none";
        videobox.style.backgroundColor = "#FFFFFF";
    } else {
        videobtn.style.display = "none";
        videoSlash.style.display = "inline-block";
        videoSlash.style.color = "#FFFFFF";
        videobox.style.backgroundColor = "#d93025";
    }
}

/**
 * updating text of buttons
 */
function updateButtons() {
    for (let index in localStream.getVideoTracks()) {
        vidButton.innerText = localStream.getVideoTracks()[index].enabled ? "Video Enabled" : "Video Disabled"
    }
    for (let index in localStream.getAudioTracks()) {
        muteButton.innerText = localStream.getAudioTracks()[index].enabled ? "Unmuted" : "Muted"
    }
}

function copylink() {
    copyToClipboard(window.document.location.href);
    alert("회의 링크가 복사되었습니다.");
}

function copyToClipboard(val) {
    const t = document.createElement("textarea");
    document.body.appendChild(t);
    t.value = val;
    t.select();
    document.execCommand('copy');
    document.body.removeChild(t);
  }

