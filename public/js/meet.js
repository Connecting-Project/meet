'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var displayStream;
var pc;
var remoteStream;
var turnReady;
var clientId;

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var temp = location.href.split("?");
var data = temp[1].split(":");
var room = data[1];
        
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect();

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', function(room, id) {
  console.log('Created room ' + room);
  clientId = id;
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room, id) {
  console.log('joined: ' + room);
  clientId = id;
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('Client received message:', message);
  if (message === 'got user media') {
    maybeStart();
  } else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

const Chat = (function(){
  var myName = prompt("닉네임을 입력해주세요.", Math.random().toString(36).substr(2,11));
  while(true){
    if(myName.trim() === ""){
      alert('닉네임을 입력해주세요.');
      var myName = prompt("닉네임을 입력해주세요.", Math.random().toString(36).substr(2,11));
    }else{
      break;
    }
  }
  // init 함수
  function init() {
      // enter 키 이벤트
      $(document).on('keydown', 'div.input-div textarea', function(e){
          if(e.keyCode == 13 && !e.shiftKey) {
              e.preventDefault();
              const message = $(this).val();

              // 메시지 전송
              sendMessage(message);
              // 입력창 clear
              clearTextarea();
          }
      });
  }

  // 메세지 태그 생성
  function createMessageTag(LR_className, senderName, message) {
      // 형식 가져오기
      let chatLi = $('div.chat.format ul li').clone();

      // 값 채우기
      chatLi.addClass(LR_className);
      chatLi.find('.sender span').text(senderName);
      chatLi.find('.message span').text(message);

      return chatLi;
  }

  // 메세지 태그 append
  function appendMessageTag(LR_className, senderName, message) {
      const chatLi = createMessageTag(LR_className, senderName, message);

      $('div.chat:not(.format) ul').append(chatLi);

      // 스크롤바 아래 고정
      $('div.chat').scrollTop($('div.chat').prop('scrollHeight'));
  }

  // 메세지 전송
  function sendMessage(message) {
      // 서버에 전송하는 코드로 후에 대체
      const data = {
          "room":room,
          "senderName":myName,
          "message":message,
          "clientId":clientId,
      };
      socket.emit("sendchat", data);
  }

  // 메세지 입력박스 내용 지우기
  function clearTextarea() {
      $('div.input-div textarea').val('');
  }

  // 메세지 수신
  function receive(data) {
      const LR = (data.clientId !== clientId)? "left" : "right";
      appendMessageTag( LR, data.senderName, data.message);
  }

  
  return {
    'init': init,
    'receive': receive,
  };
})();

$(function(){
  Chat.init();
  socket.on('receivechat',function(data){
    console.log(data);
    Chat.receive(data);
  });
});


////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
// var remoteVideo = document.querySelector('#remoteVideo');
var displayVideo = document.querySelector('#displayVideo');

navigator.mediaDevices.getUserMedia({
  audio: true,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {

  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
}

var constraints = {
  video: true,
  audio: true,
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  var remotevideo = document.createElement('video');
  remoteStream = event.stream;
  remotevideo.srcObject = remoteStream;
  remotevideo.autoplay=true;
  remotevideo.muted = true;
  remotevideo.playsInline = true;

  document.querySelector('#videos').appendChild(remotevideo);


}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}

//////////////////////////////////////////////////////////

var outbtn = document.getElementById("outbtn");
var outbox = document.getElementById("outbox");

function clickMicrophone() {
    var micbtn = document.getElementById("micbtn");
    var micbtnSlash = document.getElementById("micbtn-slash");
    var micbox = document.getElementById("micbox");
    
    if(micbtn.style.display === "none"){
        micbtn.style.display = "inline-block";
        micbtnSlash.style.display = "none";
        micbox.style.backgroundColor = "#FFFFFF";

        localStream.getTracks().forEach(function(track) {
          if(track.readyState === 'live' && track.kind === "audio"){
              track.enabled = true;
          }
      });

    }else{

        micbtn.style.display = "none";
        micbtnSlash.style.display = "inline-block";
        micbtnSlash.style.color = "#FFFFFF";
        micbox.style.backgroundColor = "#d93025";

        localStream.getTracks().forEach(function(track) {
            if(track.readyState === 'live' && track.kind === "audio"){
                track.enabled = false;
            }
        });
    }
    
}

function clickVideo() {
    var videobtn = document.getElementById("videobtn");
    var videobox = document.getElementById("videobox");
    var videoSlash = document.getElementById("video-slash");

    if(videobtn.style.display === "none"){
        videobtn.style.display = "inline-block";
        videoSlash.style.display = "none";
        videobox.style.backgroundColor = "#FFFFFF";

        
        localStream.getTracks().forEach(function(track) {
          if(track.readyState === "live" && track.kind === "video"){
            track.enabled = true;
          }
        });
    }else{
      
      videobtn.style.display = "none";
      videoSlash.style.display = "inline-block";
      videoSlash.style.color = "#FFFFFF";
      videobox.style.backgroundColor = "#d93025";
      
      localStream.getTracks().forEach(function(track) {
        if(track.readyState === "live" && track.kind === "video"){
          track.enabled = false;
        }
      });

        
    }
}

function clickDisplay() {
 console.log();
navigator.mediaDevices.getDisplayMedia({
	audio: true,
	video: true
}).then(function(stream){
  console.log('Adding Display stream.');
  displayStream = stream;
  displayVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    maybeStart();
  }
	//success
}).catch(function(e){
  alert('getDisplayMedia() error: '+ e.name)
	//error;
});

}


function clickOutbtn() {
  if(pc){
    isStarted = false;
    pc.close();
    window.close();
  }else{
    isStarted = false;
    window.close();
  }
}

