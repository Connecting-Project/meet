
var roomname = document.getElementById('roomname');
var searchbtn = document.getElementById('searchbtn');

searchbtn.addEventListener('click', searchRoom);
roomname.addEventListener("keydown", EnterSearch);

function searchRoom() {
    if(roomname.value === "" || roomname.value.trim() === ""){
        alert("방 이름을 입력해주세요.");
    }else{
        // window.open("main.html?name:"+roomname.value);
        location.href="main.html?name:"+roomname.value;
    }
}

function EnterSearch(e) {
    if(e.keyCode === 13){
        e.preventDefault();
        searchRoom();
    }
}