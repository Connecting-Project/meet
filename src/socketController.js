
peers = {}


module.exports = (io) => {
    io.on('connect', (socket) => {

        socket.on('create or join', function (room) {
            console.log('Received request to create or join room ' + room);
            var clientsInRoom = io.sockets.adapter.rooms[room];
            var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
            console.log('Room ' + room + ' now has ' + numClients + ' client(s)');
            peers[socket.id] = socket

            if (numClients === 0) {
                socket.join(room);
                console.log('Client ID ' + socket.id + ' created room ' + room);
                socket.emit('created', room, socket.id);

            } else {
                console.log('Client ID ' + socket.id + ' joined room ' + room);
                io.sockets.in(room).emit('join', room);
                socket.join(room);
                socket.emit('joined', room, socket.id);
                io.sockets.in(room).emit('ready');

                console.log('a client is connected')

                // Initiate the connection process as soon as the client connects


                // Asking all other clients to setup the peer connection receiver

                socket.broadcast.to(room).emit('initReceive', socket.id)
                
            }
        });



        /**
         * relay a peerconnection signal to a specific socket
         */
        socket.on('signal', data => {
            // console.log('sending signal from ' + socket.id + ' to ', data)
            if (!peers[data.socket_id]) return
            peers[data.socket_id].emit('signal', {
                socket_id: socket.id,
                signal: data.signal,
            })
        })

        /**
         * remove the disconnected peer connection from all other connected clients
         */
        socket.on('disconnect', () => {
            // console.log('socket disconnected ' + socket.id)
            socket.broadcast.emit('removePeer', socket.id)
            delete peers[socket.id]
        })

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */

         socket.on('initSend', (init_socket_id) => {
            // console.log('INIT SEND by ' + socket.id + ' for ' + init_socket_id)
            peers[init_socket_id].emit('initSend', socket.id)
        })

        socket.on('sendchat',function(data){
            io.sockets.in(data.room).emit('receivechat', data)
          });

    })
}