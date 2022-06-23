const express = require('express')
const path = require('path')
const http = require('http')
const PORT = process.env.PORT || 3000   
//note, the port 3000 is the development port, once the server is on heroku or any hosting service, it will use their ports, hence the 'or' sign used
const socketio = require('socket.io')
const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(express.static(path.join(__dirname, 'public')))

//serverwork
server.listen(PORT, function(){
    console.log("server on")
})

var listofrooms = []; //going to contain individual 2 player arrays as rooms
var listofroomnames = []; //containing the names of each room, corresponding to the above array

//connection making :)
io.on('connection', function(socket){
    console.log('a client has connected')

    let socketid = -1;

    socket.on('create_room_request', function(message){//when a room request is made
        let alreadymade = false
        for(const i in listofroomnames){
            if(listofroomnames[i] == message){
                alreadymade = true
                break
            }
        }
        if(alreadymade == false){
            console.log("making room '" + message + "'")
            listofroomnames.push(message);
            listofrooms.push([socket,null]); 
            //note, socket referrs to the individual pathways to THIS specific client, therefore by appending it to an array, we can access connection to the player
            socketid = 1;
            socket.emit('playerroom', message);
            socket.emit('playerid', socketid);
        }
        else{
            message = "Room with this name already exists, please choose another name."
            socket.emit('roomerror', message);
        }
    })
    
    socket.on('join_room', function(message){ //when a join request is gotten
        for(const i in listofroomnames){
            if(listofroomnames[i] == message){
                if(listofrooms[i][1] == null){
                    listofrooms[i][1] = socket; //creating a way to distinguish between the two sockets in the room
                    socketid = 2;
                    socket.emit('playerroom', message);
                    socket.emit('playerid', socketid);
                    break
                }
            }
        }
        if(socketid == -1){
            socket.emit('playerid', socketid); //still sent back to tell player that they did not join successfully
        }
        
    })

    socket.on('join_r_room', function(){ //when a join request is gotten
        for(const i in listofroomnames){
            if(listofrooms[i][1] == null){
                listofrooms[i][1] = socket; //creating a way to distinguish between the two sockets in the room
                socketid = 2;
                roomname = listofroomnames[i];
                socket.emit('playerroom', roomname);
                socket.emit('playerid', socketid);
                break
            }
        }
        if(socketid == -1){
            socket.emit('full');
        }
        
    })

    socket.on('disconnect', function(){ //section to disconnect players and dispand lobby of game when a player in lobby leaves
        remove = -1;
        for(const i in listofrooms){
            if(listofrooms[i][0].connected == false){
                remove = i; //room index required to be removed
                break;
            }
            else if(listofrooms[i][1].disconnected != null){
                if(listofrooms[i][1].connected == false){
                    remove = i; //room index required to be removed
                    break;
                }
            }
        }
        if (remove != -1){//not all disconnects are from players that are playing online, thus needs to check if any even left
            //removes the room name and room, and disconnects any player left playing
            //first sending a disconnect message to any remaining player though
            if(listofrooms[remove][0].connected == false){
                if(listofrooms[remove][1] != null){
                    listofrooms[remove][1].emit('roomdisband');//sending a disband notice to the other player in room
                }
            }
            else{//no need to check because player 1 will always be filled if player 2 leaves, as player 1 is always filled for all rooms
                listofrooms[remove][0].emit('roomdisband');//sending a disband notice to the other player in room
            }
            listofroomnames.splice(remove,1);
            listofrooms.splice(remove,1);
        }
    })

    socket.on("makemove", function(datasent){ //just a connection between the two
        for(var room in listofrooms){
            if(listofrooms[room][0] == socket){
                listofrooms[room][1].emit('opponent move', datasent);
                break;
            }
            else if(listofrooms[room][1] == socket){
                listofrooms[room][0].emit('opponent move', datasent);
                break;
            }
            
        }
    })
    
    socket.on("maketeleport", function(datasent){ //just a connection between the two
        for(var room in listofrooms){
            if(listofrooms[room][0] == socket){
                listofrooms[room][1].emit('opponent_tp', datasent);
                break;
            }
            else if(listofrooms[room][1] == socket){
                listofrooms[room][0].emit('opponent_tp', datasent);
                break;
            }
            
        }
    })

    socket.on("placetile", function(datasent){ //just a connection between the two
        for(var room in listofrooms){
            if(listofrooms[room][0] == socket){
                listofrooms[room][1].emit('opponent_place', datasent);
                break;
            }
            else if(listofrooms[room][1] == socket){
                listofrooms[room][0].emit('opponent_place', datasent);
                break;
            }
            
        }
    })

    socket.on("makecapture", function(datasent){ //just a connection between the two
        for(var room in listofrooms){
            if(listofrooms[room][0] == socket){
                listofrooms[room][1].emit('opponent_capture', datasent);
                break;
            }
            else if(listofrooms[room][1] == socket){
                listofrooms[room][0].emit('opponent_capture', datasent);
                break;
            }
            
        }
    })

    socket.on("placeduchess", function(datasent){ //just a connection between the two
        for(var room in listofrooms){
            if(listofrooms[room][0] == socket){
                listofrooms[room][1].emit('opponent_duchess', datasent);
                break;
            }
            else if(listofrooms[room][1] == socket){
                listofrooms[room][0].emit('opponent_duchess', datasent);
                break;
            }
            
        }
    })
})





//socket.emit(title, data) sends message through socket to the connected client