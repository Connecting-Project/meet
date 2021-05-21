
var roomname = document.getElementById('roomname');
var searchbtn = document.getElementById('searchbtn');

searchbtn.addEventListener('click', searchRoom);

function searchRoom() {
    if(roomname.value === "" || roomname.value.trim() === ""){
        alert("방 이름을 입력해주세요.");
    }else{
        window.open("main.html?name:"+roomname.value);
    }
}