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

let check = {}
// redirect if not https
if (location.href.substr(0, 5) !== 'https')
    location.href = 'https' + location.href.substr(4, location.href.length - 4)

var clientId;
var myName;
var room;
var videoAvailable = true;
var audioAvailable = true;
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
    video: true,
}

/////////////////////////////////////////////////////////

constraints.video.facingMode = {
    ideal: "user"
}


// enabling the camera at startup


// navigator.mediaDevices.getUserMedia(constraints).then(stream => {
//     console.log('Received local stream');

//     localVideo.srcObject = stream;
//     localStream = stream;
//     init()

// }).catch(e => init())

navigator.mediaDevices.getUserMedia({ video: true })
    .then(() => videoAvailable = true)
    .catch(() => videoAvailable = false);


navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => audioAvailable = true)
    .catch(() => audioAvailable = false);

if (videoAvailable || audioAvailable) {

    navigator.mediaDevices.getUserMedia({ video: videoAvailable, audio: audioAvailable }).then(stream => {
        console.log('Received local stream');

        localVideo.srcObject = stream;
        localStream = stream;
        init()

    }).catch(function (err) {
        console.log(err); /* handle the error */
        if (err.name == "NotFoundError" || err.name == "DevicesNotFoundError") {
            //required track is missing 
            if(videoAvailable){
                navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
                    console.log('Received local stream');
            
                    localVideo.srcObject = stream;
                    localStream = stream;
                    init()
                    toggleMute();
            
                }).catch(function (err) {
                    console.log(err);
                })
            }else if(audioAvailable) {
                navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
                    console.log('Received local stream');
            
                    localVideo.srcObject = stream;
                    localStream = stream;
                    init()

                    toggleVid();
                }).catch(function (err) {
                    console.log(err);
                })
            }else{
                init();
            }
        } else if (err.name == "NotReadableError" || err.name == "TrackStartError") {
            //webcam or mic are already in use 
        } else if (err.name == "OverconstrainedError" || err.name == "ConstraintNotSatisfiedError") {
            //constraints can not be satisfied by avb. devices 
        } else if (err.name == "NotAllowedError" || err.name == "PermissionDeniedError") {
            //permission denied in browser 
            if(videoAvailable){
                navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
                    console.log('Received local stream');
            
                    localVideo.srcObject = stream;
                    localStream = stream;
                    init()
                    toggleMute();
            
                }).catch(function (err) {
                    console.log(err);
                })
            }else if(audioAvailable) {
                navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(stream => {
                    console.log('Received local stream');
            
                    localVideo.srcObject = stream;
                    localStream = stream;
                    init()

                    toggleVid();
                }).catch(function (err) {
                    console.log(err);
                })
            }
        } else if (err.name == "TypeError" || err.name == "TypeError") {
            //empty constraints object 
        } else {
            //other errors 
        }
    })
}


/**
 * initialize the socket connections
 */
function init() {
    socket = io()

    socket.on('initReceive', socket_id => {
        console.log('INIT RECEIVE ' + socket_id)
        addPeer(socket_id,false)

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
        socket.emit('create or join', (room));
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
window.onload = function () {
    myName = prompt("닉네임을 입력해주세요.", Math.random().toString(36).substr(2, 11));
    while (true) {
        if (myName === null || myName.trim() === "") {
            alert('닉네임을 입력해주세요.');
            myName = prompt("닉네임을 입력해주세요.", Math.random().toString(36).substr(2, 11));
        } else {
            break;
        }
    }
    document.getElementById('localVideo').nextSibling.nextSibling.innerHTML=myName;

    
}
// init 함수
function chatInit() {
    // enter 키 이벤트
    var textarea = document.querySelector('#chat-input');

    textarea.addEventListener("keydown", (e) => {
        if (e.keyCode == 13 && !e.shiftKey) {
            e.preventDefault();
            const message = textarea.value;

            // 입력창 clear
            clearTextarea();

            if(message.trim() === "") return;

            // 메시지 전송
            sendMessage(message);
            
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
        const tracks = videoEl.firstChild.srcObject.getTracks();

        tracks.forEach(function (track) {
            track.stop()
        })

        videoEl.firstChild.srcObject = null
        videoEl.parentNode.removeChild(videoEl)
        Dish();
    }
    if (peers[socket_id]) peers[socket_id].destroy()
    delete peers[socket_id]
    delete check[socket_id]
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
        config: configuration,
    })

    peers[socket_id].on('signal', data => {
        socket.emit('signal', {
            signal: data,
            socket_id: socket_id,
        })
    })

    peers[socket_id].on('stream', stream => {
        let newDiv = document.createElement('div')
        newDiv.className = "vid"
        newDiv.id = socket_id

        let newSpan = document.createElement('span')
        newSpan.className = "name"

        let newVid = document.createElement('video')
        newVid.srcObject = stream
        newVid.playsinline = false
        newVid.autoplay = true
        newVid.onclick = () => openPictureMode(newVid)
        newVid.ontouchstart = (e) => openPictureMode(newVid)
        newDiv.appendChild(newVid)
        newDiv.appendChild(newSpan)
        videos.appendChild(newDiv)
        Dish();

        socket.emit('sendname', {to:socket_id, from:clientId, name: myName})
        socket.on('sendname', function(data){
            var nameSpan = document.getElementById(data.from).lastChild;
            nameSpan.innerHTML= data.name;
            if(!check[data.from]){
                check[data.from] = {check: true};
                socket.emit('sendname',{to:data.from, from:clientId, name: myName})
            }
        })
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
    location.href = "/";
}

/**
 * Enable/disable microphone
 */
function toggleMute() {
    if(!audioAvailable){return}

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
    if(!videoAvailable){return}
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

function toggleChat() {
    var chatbtn = document.getElementById("chatbtn");
    var chatSlash = document.getElementById("chat-slash");
    var chatbox = document.getElementById("chatbox");

    if(chatbtn.style.display === "none"){
        chatbtn.style.display = "inline-block";
        chatSlash.style.display = "none";
        chatbox.style.backgroundColor = "#FFFFFF";
    }else{
        chatbtn.style.display = "none";
        chatSlash.style.display = "inline-block";
        chatbox.style.backgroundColor = "#d93025";
    }

    var chat_wrap = document.getElementById("chat_wrap");
    var videos = document.getElementById("videos");
    if(chat_wrap.className === "chat_wrap"){
        chat_wrap.className = "chat_wrap chat_off";
        videos.className = "video_chatoff";
    }else{
        chat_wrap.className = "chat_wrap";
        videos.className = "";
    }
}

while(isOverflown(document.getElementById('videos'))){
    console.log('here');
    Dish();
}

function isOverflown(element) {
    return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
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




///////////////////////////////////////////////////////////////////////

// Area:
function Area(Increment, Count, Width, Height, Margin = 10) {
    let i = w = 0;
    let h = Increment * 0.75 + (Margin * 2);
    while (i < (Count)) {
        if ((w + Increment) > Width) {
            w = 0;
            h = h + (Increment * 0.75) + (Margin * 2);
        }
        w = w + Increment + (Margin * 2);
        i++;
    }
    if (h > Height) return false;
    else return Increment;
}
// Dish:
function Dish() {

    // variables:
    let Margin = 2;
    let Scenary = document.getElementById('videos');
    let Width = Scenary.offsetWidth - (Margin * 2);
    let Height = Scenary.offsetHeight - (Margin * 2);
    let Cameras = document.getElementsByClassName('vid');
    let max = 0;

    // loop (i recommend you optimize this)
    let i = 1;
    while (i < 5000) {
        let w = Area(i, Cameras.length, Width, Height, Margin);
        if (w === false) {
            max = i - 1;
            break;
        }
        i++;
    }

    // set styles
    max = max - (Margin * 2);
    setWidth(max, Margin);
}

// Set Width and Margin 
function setWidth(width, margin) {
    let Cameras = document.getElementsByClassName('vid');
    for (var s = 0; s < Cameras.length; s++) {
        Cameras[s].style.width = width + "px";
        Cameras[s].style.margin = margin + "px";
        Cameras[s].style.height = (width * 0.75) + "px";
    }
}

// Load and Resize Event
window.addEventListener("load", function (event) {
    Dish();
    window.onresize = Dish;
}, false);