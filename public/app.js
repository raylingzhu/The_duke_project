//making the board, with * representing an empty spot
var board = 
[["*","*","*","*","*","*"]
,["*","*","*","*","*","*"]
,["*","*","*","*","*","*"]
,["*","*","*","*","*","*"]
,["*","*","*","*","*","*"]
,["*","*","*","*","*","*"]];

var game = { //game object, which keeps track of gamestate
    nocheck : true,
    playerturn : "player1",
    setupcomplete : false,
    divinationmode : false,
    teleportmode : false,
    online : false,
    offline: false,
    duchess: false
}


game.changeturns = function(){
    if(this.playerturn == 'player1'){
        this.playerturn = 'player2';
    }
    else{
        this.playerturn ='player1'
    }
}



//Initial setup section for online
const socket = io();
var room = "";
var inroomid = -1;

function onlinemode(verifier){
    if(verifier == true){
        game.online = true;
        //making the nessasary elements invisible (restart button and the other players tiles)
        var button = document.getElementById('restartbutton');
        button.parentNode.removeChild(button); //yes miss, i understand that i am telling a parent to kill their child here, look away(they'll make a new one dont worry)
        if(inroomid == 1){//if they are player 1
            document.getElementById("duke2").classList.remove("displayed");
            document.getElementById("f12").classList.remove("displayed");
            document.getElementById("f22").classList.remove("displayed");
        }
        else{//for player 2
            document.getElementById("duke1").classList.remove("displayed");
            document.getElementById("f11").classList.remove("displayed");
            document.getElementById("f21").classList.remove("displayed");
        }

    }
    else{
        game.online = false;
        var restartbutton = document.createElement("button");
        restartbutton.id = "restartbutton";
        restartbutton.onclick = 'restart()';
        restartbutton.innerHTML = "restart";
        var temp = document.getElementById("startdiv");
        temp.appendChild(restartbutton);
        restart();
    }
}

document.querySelector('#createroom').onclick = function(){
    if((game.online == false)&&(game.offline == false)){ //ensuring they are not already in a game(offline or online)
        const text = document.querySelector('#inputbox').value;
        socket.emit('create_room_request', text);
    }
    else{
        alert("You are already in a game/room, please reload/restart game before attempting to join a new room.");
    }
}

document.querySelector('#joinroom').onclick = function(){
    if((game.online == false)&&(game.offline == false)){
        const text = document.querySelector('#inputbox').value;
        socket.emit('join_room', text);
    }
    else{
        alert("You are already in a game/room, please reload game before attempting to join a new room.");
    }
}

document.querySelector('#joinrandom').onclick = function(){
    if((game.online == false)&&(game.offline == false)){
        socket.emit('join_r_room');
    }
    else{
        alert("You are already in a game/room, please reload game before attempting to join a new room.");
    }
}

socket.on('playerroom', function(message){//veryfying the room player is in
    room = message;
})

socket.on('playerid', function(message){ //when it gets an id update
    inroomid = message;
    if(inroomid == -1){
        alert("Sorry, the room is unable to be joined(full or not created).");
    }
    else{
        alert("You are now in room '" + room + "' as player " + inroomid);
        onlinemode(true);
    }
})


socket.on('roomerror', function(message){ //when it gets an error update
    alert(message);
})

socket.on('roomdisband', function(){
    alert("Room '" + room + "' has been disbanded, as the other player has left.")
    room = "";
    inroomid = "";
    onlinemode(false);
})

socket.on('full', function(){
    alert("All rooms are full(or none exist), try making a room and wait for someone else to join.")
})

socket.on('opponent move', function(movementarray){
        //movement array containing the tile name of the moved tile and the location it moved to(location as an array [y,x])
        //then basically an altered version of the drag n drop movement of the tile will be used to place the tile
        var passedtileid = movementarray[0];
        var newlocation = movementarray[1];
        var selectedtile = listoftiles[passedtileid]; //getting the dragged tile object
        var tile_elem = document.getElementById(passedtileid);
        document.getElementById("s"+newlocation[0].toString()+newlocation[1].toString()).appendChild(tile_elem);
        var validity = makemove(selectedtile,newlocation); //validity does not actually matter here, as the move has already been verified on the other end
        if(selectedtile.ownership == "player1"){
            checkforchecks(listoftiles["duke2"], listoftiles["duke1"]);
        }
        else{
            checkforchecks(listoftiles["duke1"], listoftiles["duke2"]);
        }
})

socket.on('opponent_capture', function(movementarray){
        //movement array containing the tile name of the moved tile and the location it moved to(location as an array [y,x])
        //then basically an altered version of the drag n drop movement of the tile will be used to place the tile
        var passedtileid = movementarray[0];
        var newlocation = movementarray[1];
        var selectedtile = listoftiles[passedtileid]; //getting the dragged tile object
        var validity = makemove(selectedtile,newlocation); //validity does not actually matter here, as the move has already been verified on the other end
        if(selectedtile.ownership == "player1"){
            checkforchecks(listoftiles["duke2"], listoftiles["duke1"]);
        }
        else{
            checkforchecks(listoftiles["duke1"], listoftiles["duke2"]);
        }
})

socket.on("opponent_tp", function(movementarray){
    var passedtileid = movementarray[0];
    var newlocation = movementarray[1];
    var teleporttile = listoftiles[movementarray[2]]
    var selectedtile = listoftiles[passedtileid]; //getting the dragged tile object
    var tile_elem = document.getElementById(passedtileid);
    document.getElementById("s"+newlocation[0].toString()+newlocation[1].toString()).appendChild(tile_elem);

    if((board[newlocation[0]-1][newlocation[1]-1] != '*') && (board[newlocation[0]-1][newlocation[1]-1].ownership != selectedtile.ownership)){
        //the above checks if movement can capture a tile
        //may need to add additional parameters(for the above if statement) for checkmate section later on
        var capturedtile = board[newlocation[0]-1][newlocation[1]-1];
        capture(capturedtile);
        game.changeturns();
        board[selectedtile.y-1][selectedtile.x-1] = "*"; //removing tile from previous location on the board
        board[newlocation[0]-1][newlocation[1]-1] = selectedtile; //moving the selected tile on the board
        selectedtile.y = newlocation[0];
        selectedtile.x = newlocation[1];
    }
    else if((board[newlocation[0]-1][newlocation[1]-1] == '*')){
        game.changeturns();
        board[selectedtile.y-1][selectedtile.x-1] = "*"; //removing tile from previous location on the board
        board[newlocation[0]-1][newlocation[1]-1] = selectedtile; //moving the selected tile on the board
        selectedtile.y = newlocation[0];
        selectedtile.x = newlocation[1];
    }

    if(selectedtile.ownership == "player1"){
        checkforchecks(listoftiles["duke2"], listoftiles["duke1"]);
    }
    else{
        checkforchecks(listoftiles["duke1"], listoftiles["duke2"]);
    }
    listoftiles[teleporttile].fliptile();
})

socket.on('opponent_place', function(movementarray){
    var passedtileid = movementarray[0];
    var newlocation = movementarray[1];
    var tile_elem = document.getElementById(passedtileid);
    document.getElementById("s"+newlocation[0].toString()+newlocation[1].toString()).appendChild(tile_elem);

    if(tile_elem.classList.contains('displayed') == false){
        tile_elem.classList.add("displayed");
    }

    var validity = makeplacement(listoftiles[passedtileid],newlocation);

    if(game.setupcomplete == true){
        game.changeturns();
    }

    if((listoftiles['duke1'].y != 'unplaced')&&(listoftiles['duke2'].y != 'unplaced')&&(listoftiles['f11'].y != 'unplaced')&&(listoftiles['f12'].y != 'unplaced')&&(listoftiles['f21'].y != 'unplaced')&&(listoftiles['f22'].y != 'unplaced')){
        //first checking if the starting tiles have been placed with the if statement in the above if statement
        var allplaced = true
        for(let keys in listoftiles){
            if(document.getElementById(listoftiles[keys].name).classList.contains('displayed')){ 
                if(listoftiles[keys].y == 'unplaced'){
                    //for all displayed tiles, it is checking if they are also placed on the board, if there is one that is not, the placement section is not over
                    allplaced = false;
                }
            }
        }
        if (allplaced == true){
            game.setupcomplete = true;
        }
    }

    console.log(board);
})

socket.on('opponent_duchess', function(movementarray){
    var passedtileid = movementarray[0];
    var newlocation = movementarray[1];
    var tile_elem = document.getElementById(passedtileid);
    document.getElementById("s"+newlocation[0].toString()+newlocation[1].toString()).appendChild(tile_elem);

    if(tile_elem.classList.contains('displayed') == false){
        tile_elem.classList.add("displayed");
    }

    var validity = makeplacement(listoftiles[passedtileid],newlocation);

    listoftiles["duke"+passedtileid[2]].fliptile();
    game.changeturns();
    console.log(board);
})




//Tile creation section below

//Making the tile class
class tile{
    constructor(y_coords, x_coords, ownership, type, name){

        this.y = y_coords       //Note that the y_coords will be counted as if starting from the top of the board(as to match the conventions of the "board" array)
        this.x = x_coords
        this.ownership = ownership
        this.type = type
        this.facingup = true
        this.name = name        //Calling it name instead of id to avoid confusion between element and object when reading
    }
    fliptile(){
        if(this.facingup == true){
            this.facingup = false;
        }
        else{
            this.facingup = true;
        }
        var elementid = this.name;
        var flippedtileelement = document.querySelector('#'+elementid);
        var flippedcontent = flippedtileelement.querySelector('.tile_inner');
        flippedcontent.classList.toggle('is_flipped');
    }
}


//Making the objects for player 1
var duke1 = new tile("unplaced","unplaced","player1", "duke", "duke1");
duke1.possiblemove = function(board) {
    movelist = [];
    if (this.facingup == true){ //if it is going horizontal
        var tilex = 0;
        for(a = 1 ; a <= 6-this.x ; a++){ //loop for space to the right
            tilex = this.x + a;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                a = 9;
            }
        }
        for(b = 1 ; b <= this.x-1 ; b++){ //loop for space to the left
            tilex = this.x - b;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                b = 9;
            }

        }
    }
    else{ //if it is going vertical
        var tiley = 0;
        for(a = 1 ; a <= 6-this.y ; a++){ //loop for space down
            tiley = this.y + a;
            movelist.push([tiley,this.x]);
            if(board[tiley - 1][this.x - 1] == "*"){
            }
            else{
                a = 9;
            }
        }
        for(b = 1 ; b <= this.y-1 ; b++){ //loops for space up
            tiley = this.y - b;
            movelist.push([tiley,this.x]);
            if(board[tiley - 1][this.x-1] == "*"){
            }
            else{
                b = 9;
            }

        }
    }
    return movelist;
}


var f11 =  new tile("unplaced","unplaced","player1", "footman", "f11");
f11.possiblemove = function(board){
    movelist = [];
    if (this.facingup == true){ //coding in the individual possible coordinates
        var upcoord = this.y - 1; 
        var downcoord = this.y + 1;
        var rightcoord = this.x + 1;
        var leftcoord = this.x - 1;
        if(this.y != 1){
            movelist.push([upcoord,this.x]);
        }
        if(this.y != 6){
            movelist.push([downcoord,this.x]);
        }
        if(this.x != 6){
            movelist.push([this.y,rightcoord]);
        }
        if(this.x != 1){
            movelist.push([this.y,leftcoord]);
        }

    }
    else{//coding in the individual possible coordinates
        var upleft = [this.y-1,this.x-1];
        var upright = [this.y-1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        var downright = [this.y+1,this.x+1];


        if((this.x != 1) || (this.x != 6) || (this.y != 1) || (this.y !=6)){
            movelist.push(upleft,upright,downleft,downright);
        }
        else if (this.x = 1){
            if(this.y = 1){
                movelist.push(downright);
            }
            else if (this.y = 6){
                movelist.push(upright);
            }
            else{
                movelist.push(upright,downright);
            }
        }
        else if (this.x = 6){
            if(this.y = 1){
                movelist.push(downleft);
            }
            else if (this.y = 6){
                movelist.push(upleft);
            }
            else{
                movelist.push(upleft,downleft);
            }
        }
        else if (this.y = 1){
            movelist.push(downleft,downright);
        }
        else if (this.y = 6){
            movelist.push(upleft,upright);
        }

        if(this.y >=3){ //testing if anything is blocking the upward movement
            if(board[this.y-2][this.x-1] == "*"){
                movelist.push([this.y-2,this.x]);
            }
        }


    }
    return movelist;
}


var f21 =  new tile("unplaced","unplaced","player1", "footman", "f21");
f21.possiblemove = function(board){
    movelist = [];
    if (this.facingup == true){
        var upcoord = this.y - 1; 
        var downcoord = this.y + 1;
        var rightcoord = this.x + 1;
        var leftcoord = this.x - 1;
        if(this.y != 1){
            movelist.push([upcoord,this.x]);
        }
        if(this.y != 6){
            movelist.push([downcoord,this.x]);
        }
        if(this.x != 6){
            movelist.push([this.y,rightcoord]);
        }
        if(this.x != 1){
            movelist.push([this.y,leftcoord]);
        }

    }
    else{
        var upleft = [this.y-1,this.x-1];
        var upright = [this.y-1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        var downright = [this.y+1,this.x+1];


        if((this.x != 1) || (this.x != 6) || (this.y != 1) || (this.y !=6)){
            movelist.push(upleft,upright,downleft,downright);
        }
        else if (this.x = 1){
            if(this.y = 1){
                movelist.push(downright);
            }
            else if (this.y = 6){
                movelist.push(upright);
            }
            else{
                movelist.push(upright,downright);
            }
        }
        else if (this.x = 6){
            if(this.y = 1){
                movelist.push(downleft);
            }
            else if (this.y = 6){
                movelist.push(upleft);
            }
            else{
                movelist.push(upleft,downleft);
            }
        }
        else if (this.y = 1){
            movelist.push(downleft,downright);
        }
        else if (this.y = 6){
            movelist.push(upleft,upright);
        }

        if(this.y >=3){
            if(board[this.y-2][this.x-1] == "*"){
                movelist.push([this.y-2,this.x]);
            }
        }

        
    }
    return movelist;
}


var as1 =  new tile("unplaced","unplaced","player1", "asassin", "as1");
as1.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        for(a = 2; a <= this.y - 1 ; a++){ //for the upwards movement
            var upjump = this.y - a; //movement detection inclusive of the tile with the other piece on it
            movelist.push([upjump, this.x]);
            if(board[upjump-1][this.x -1] == "*"){ 
            }
            else{
                a = this.y
            }
        }

        for(b = 2 ; b <= Math.min(6-this.x, 6-this.y); b++){ //for the down right movement
            var downrjump = [this.y+b, this.x+b];
            movelist.push(downrjump);
            if(board[this.y+b-1][this.x+b-1] == "*"){
            }
            else{
                b = 6
            }
        }

        for(c = 2; c <= Math.min(this.x-1, 6-this.y); c++){ //for the down left movement
            var downljump = [this.y+c, this.x-c];
            movelist.push(downljump);
            if(board[this.y+c-1][this.x-c-1] == "*"){
            }
            else{
                c = 6
            }
        }
    }
    else{//doing the opposite movements
        for(d = 2; d <= 6-this.y ; d++){ //movement for straight down
            var downjump = this.y + d;
            movelist.push([downjump,this.x]);
            if(board[downjump-1][this.x-1] == "*"){
            }
            else{
                d = 6;
            }
        }
        for(e=2; e <= Math.min(6-this.x, this.y-1); e++){//for up right movement
            var uprjump = [this.y-e,this.x+e];
            movelist.push(uprjump);
            if(board[this.y-e-1][this.x+e-1] == "*"){}
            else{
                e = 6
            }
        }
        for(f=2 ; f <= Math.min(this.y-1, this.x-1) ; f++){
            var upljump = [this.y - f, this.x - f];
            movelist.push(upljump);
            if(board[this.y-f-1][this.x-f-1] == "*"){}
            else{
                f = 6;
            }
        }
    }
    return movelist;
}


var bo1 =  new tile("unplaced","unplaced","player1", "bowman", "bo1");
bo1.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        //for the closeby movements
        var upcoord = [this.y-1, this.x];
        var rightcoord = [this.y,this.x+1];
        var leftcoord = [this.y,this.x-1];

        //for the jumps
        var rightjump = [this.y,this.x + 2];
        var leftjump = [this.y,this.x - 2];
        var downjump = [this.y+2,this.x];

        movelist.push(upcoord,rightcoord,leftcoord,rightjump,leftjump,downjump);
        //impossible coordinates(outside of the board) cannot be accessed, so it is ok for them to be included in the movelist array 
        //even though such coordinates are illegal to move to, it would be impossible for the player to place the tiles on such squares anyways as they are outside of the board
    }
    else{
        var upcoord = [this.y-1, this.x];
        var downright = [this.y+1, this.x+1]; 
        var downleft = [this.y+1, this.x-1];

        //strikezones
        var upstrike = ['s',this.y-2,this.x];
        var uprightstrike = ['s', this.y-1,this.x+1];
        var upleftstrike = ['s', this.y-1, this.x-1];

        movelist.push(upcoord,downright,downleft,upstrike,uprightstrike,upleftstrike);
    }
    return movelist;
}


var ch1 =  new tile("unplaced","unplaced","player1", "champion", "ch1");
ch1.possiblemove = function(){ //Hardcoding the movements in
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1, this.x];
        var rightcoord = [this.y, this.x+1];
        var downcoord = [this.y+1, this.x];
        var leftcoord = [this.y , this.x-1];

        var upjump = [this.y - 2, this.x];
        var rightjump = [this.y,this.x+2];
        var downjump = [this.y+2, this.x];
        var leftjump = [this.y,this.x-2];
        movelist.push(upcoord,rightcoord,downcoord,leftcoord,upjump,rightjump,downjump,leftjump);

    }
    else{
        var upjump = [this.y - 2, this.x];
        var rightjump = [this.y,this.x+2];
        var downjump = [this.y+2, this.x];
        var leftjump = [this.y,this.x-2];
    
        var upstrike = ['s',this.y-1, this.x];
        var rightstrike = ['s',this.y, this.x+1];
        var downstrike = ['s',this.y+1, this.x];
        var leftstrike = ['s',this.y , this.x-1];

        movelist.push(upstrike,rightstrike,downstrike,leftstrike,upjump,rightjump,downjump,leftjump);
    }
    return movelist;
}


var dr1 =  new tile("unplaced","unplaced","player1", "dragoon", "dr1");
dr1.possiblemove = function(board){ //Hardcoding the movements in
    movelist = [];
    if(this.facingup == true){
        var rightcoord = [this.y, this.x+1];
        var leftcoord = [this.y , this.x-1];

        var upstrike = ["s", this.y -2, this.x];
        var uprightstrike = ["s", this.y-2, this.x+2];
        var upleftstrike = ["s", this.y-2, this.x-2];

        movelist.push(rightcoord,leftcoord,upstrike,uprightstrike,upleftstrike);
    }
    else{
        var upcoord = [this.y-1, this.x]; //hard coding in the movements for the upward moves
        movelist.push(upcoord);
        if((this.y-2 >= 0)&&(board[this.y-2][this.x-1] == "*")){
            upcoord = [this.y-2, this.x];
            movelist.push(upcoord);
        }

        var upright = [this.y-2, this.x+1];
        var upleft = [this.y-2,this.x-1];
        movelist.push(upright,upleft);

        for(a=1 ; a<= Math.min(6-this.y , 6-this.x) ; a++){// down right slide
            var downright = [this.y + a, this.x + a];
            movelist.push(downright);
            if(board[this.y+a-1][this.x+a-1] == "*"){}
            else{
                a = 6;
            }
        }
        for(b=1;b<=Math.min(6-this.y, this.x-1) ; b++){//down left slide
            var downleft = [this.y+b, this.x-b];
            movelist.push(downleft);
            if(board[this.y+b-1][this.x-b-1] == "*"){}
            else{
                b = 6;
            }
        }
    }
    return movelist;
}


var ge1 =  new tile("unplaced","unplaced","player1", "general", "ge1");
ge1.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1, this.x];
        var downcoord = [this.y+1, this.x];
        movelist.push(upcoord,downcoord);
        if((this.x<=5)&&(board[this.y-1][this.x] == "*")){//for right move
            var rightcoord = [this.y, this.x+2];
            movelist.push(rightcoord);
        }
        if((this.x-2 >= 0)&&(board[this.y-1][this.x-2] == "*")){//for left move
            var leftcoord = [this.y, this.x-2]
            movelist.push(leftcoord);
        }

        var upright = [this.y-2, this.x-1]; 
        var upleft = [this.y-2, this.x+1];
        movelist.push(upright,upleft);
    }
    else{
        var upcoord = [this.y-1, this.x];
        var rightcoord = [this.y, this.x+1];
        var leftcoord = [this.y, this.x-1];
        movelist.push(upcoord,rightcoord,leftcoord);

        var upright = [this.y-2, this.x-1]; 
        var upleft = [this.y-2, this.x+1];
        movelist.push(upright,upleft);
        if((this.x<=5)&&(board[this.y-1][this.x] == "*")){//for right move
            rightcoord = [this.y, this.x + 2];
            movelist.push(rightcoord);
        }
        if((this.x-2 >= 0)&&(board[this.y-1][this.x-2] == "*")){
            leftcoord = [this.y, this.x-2];
            movelist.push(leftcoord)
        }
    }
    return movelist;
}
ge1.tpsquare = function(){
    movelist = [];
    if(this.facingup == false){
        leftcoord = [this.y,this.x-1];
        rightcoord = [this.y,this.x+1];
        downleft = [this.y+1,this.x-1];
        downright = [this.y+1,this.x+1];
        downcoord = [this.y+1,this.x];
        movelist.push(leftcoord,rightcoord,downcoord,downleft,downright);
    }
    return movelist;
}



var kn1 =  new tile("unplaced","unplaced","player1", "knight", "kn1");
kn1.possiblemove = function(board){ //hard coding in the face 1 movements
    movelist = [];
    if(this.facingup == true){
        var upright = [this.y-2,this.x+1]; 
        var upleft = [this.y-2,this.x-1];
        var rightcoord = [this.y, this.x+1];
        var leftcoord = [this.y,this.x-1];
        var downcoord = [this.y+1, this.x];
        movelist.push(upright,upleft,rightcoord,leftcoord,downcoord);
        if((this.y <= 5)&&(board[this.y][this.x-1] == "*")){
            downcoord = [this.y +2, this.x];
            movelist.push(downcoord);
        }
    }
    else{
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        movelist.push(downright,downleft);
        if((this.y <=5)&&(this.x <= 5)&&(board[this.y][this.x] =="*")){ //test if down right is blocked
            downright = [this.y+2, this.x+2];
            movelist.push(downright);
        }
        if((this.y <=5)&&(this.x-2 >= 0)&&(board[this.y][this.x]-2 == "*")){
            downleft = [this.y+2, this.x-2];
            movelist.push(downleft);
        }

        for(a=1 ; a <= this.y-1 ;a++){ //for upward slide movement
            var upcoord = [this.y-a,this.x];
            movelist.push(upcoord);
            if(board[this.y-a-1][this.x-1] == "*"){}
            else{
                a = 6;
            }
        }
    }
    return movelist;
}


var ma1 =  new tile("unplaced","unplaced","player1", "marshall", "ma1");
ma1.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        var tilex = 0;
        for(a = 1 ; a <= 6-this.x ; a++){ //loop for space to the right
            tilex = this.x + a;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                a = 6;
            }
        }
        for(b = 1 ; b <= this.x-1 ; b++){ //loop for space to the left
            tilex = this.x - b;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                b = 6;
            }

        }
        var upright = [this.y-2,this.x+2];
        var upleft = [this.y-2,this.x-2];
        var downcoord = [this.y+2,this.x];
        movelist.push(upright,upleft,downcoord);
    }
    else{
        var upcoord = [this.y-1,this.x];
        var upright = [this.y-1,this.x+1];
        var upleft = [this.y-1, this.x-1];
        var rightcoord = [this.y,this.x+1];
        var leftcoord = [this.y,this.x-1];
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        movelist.push(upcoord,upright,upleft,rightcoord,leftcoord,downright,downleft);
        if((this.x<=5)&&(board[this.y -1][this.x] =="*")){//checking right side movement
            rightcoord = [this.y,this.x+2];
            movelist.push(rightcoord);
        }
        if((this.x-2 >= 0)&&(board[this.y-1][this.x-2] == "*")){
            leftcoord = [this.y,this.x-2];
            movelist.push(leftcoord);
        }
    }
    return movelist;
}
ma1.tpsquare = function(){
    movelist = [];
    if(this.facingup == false){
        upcoord = [this.y-1,this.x];
        upright = [this.y-1,this.x+1];
        upleft = [this.y-1,this.x-1];
        movelist.push(upcoord,upright,upleft);
    }
    return movelist;
}


var pi1 = new tile("unplaced","unplaced","player1", "pikeman", "pi1");
pi1.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        var upright = [this.y-1,this.x+1];
        var upleft = [this.y-1,this.x-1];
        movelist.push(upright,upleft);

        if((this.y-2>=0)&&(this.x<=5)&&(board[this.y-2][this.x] == "*")){//for right up to see if anything is in the way
            upright = [this.y-2, this.x +2];
            movelist.push(upright);
        }
        if((this.x-2>=0)&&(this.y-2>=0)&&(board[this.y -2][this.x-2] == "*")){//for left up to see if anything blocking
            upleft = [this.y-2,this.x-2];
            movelist.push(upleft);
        }
    }
    else{
        var upcoord = [this.y-1,this.x];
        var downcoord = [this.y+1,this.x];
        var uprightstrike = ["s",this.y-2,this.x+1];
        var upleftstrike = ["s", this.y-2, this.x-1];
        movelist.push(upcoord,downcoord,uprightstrike,upleftstrike);

        if((this.y <=5)&&(board[this.y][this.x-1] == "*")){//testing if it can go down 2
            downcoord = [this.y+2,this.x];
            movelist.push(downcoord);
        }
    }
    return movelist;
}


var pr1 = new tile("unplaced","unplaced","player1", "priest", "pr1");
pr1.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        for(a=1 ; a<= Math.min(this.y-1, 6-this.x) ; a++){//for up right slide
            var upright = [this.y-a,this.x+a];
            movelist.push(upright);
            if(board[this.y-a-1][this.x+a-1] == "*"){}
            else{
                a = 6;
            }
        }
        for(b=1 ; b<= Math.min(this.y-1,this.x-1) ; b++){//for up left slide
            var upleft = [this.y-b,this.x-b];
            movelist.push(upleft);
            if(board[this.y-b-1][this.x-b-1] == "*"){}
            else{
                b = 6
            }
        }
        for(c=1 ; c<= Math.min(6 - this.y, 6 - this.x) ; c++){//for down right slide
            var downright = [this.y+c,this.x+c];
            movelist.push(downright);
            if(board[this.y+c-1][this.x+c-1] == "*"){}
            else{
                c = 6;
            }
        }
        for(d=1 ; d<= Math.min(6-this.y, this.x-1) ; d++){//for down left slide
            var downleft = [this.y+d,this.x-d];
            movelist.push(downleft);
            if(board[this.y+d-1][this.x-d-1] == "*"){}
            else{
                d = 6;
            }
        }
    }
    else{
        var upright = [this.y-1,this.x+1];
        var upleft = [this.y-1, this.x-1];
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        var uprightjump = [this.y-2,this.x+2];
        var upleftjump = [this.y-2,this.x-2];
        var downrightjump = [this.y+2,this.x+2];
        var downleftjump = [this.y+2,this.x-2];
        movelist.push(upright,upleft,downright,downleft,uprightjump,upleftjump,downrightjump,downleftjump);
    }
    return movelist;
}


var se1 = new tile("unplaced","unplaced","player1", "seer", "se1");
se1.possiblemove = function(){
    movelist = [];
    if(this.facingup==true){
        var upcoord = [this.y-2, this.x]; 
        var upright = [this.y-1, this.x+1];
        var rightcoord = [this.y, this.x+2];
        var downright = [this.y+1,this.x+1];
        var downcoord = [this.y+2,this.x];
        var downleft = [this.y+1,this.x-1];
        var leftcoord = [this.y,this.x-2];
        var upleft = [this.y-1,this.x-1];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    else{
        var upcoord = [this.y-1, this.x]; 
        var upright = [this.y-2, this.x+2];
        var rightcoord = [this.y, this.x+1];
        var downright = [this.y+2,this.x+2];
        var downcoord = [this.y+1,this.x];
        var downleft = [this.y+2,this.x-2];
        var leftcoord = [this.y,this.x-1];
        var upleft = [this.y-2,this.x-2];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    return movelist;
}



var lo1 = new tile("unplaced","unplaced","player1", "longbow", "lo1");
lo1.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1,this.x];
        var rightcoord = [this.y,this.x+1];
        var downcoord = [this.y+1,this.x];
        var leftcoord = [this.y,this.x-1];
        movelist.push(upcoord,rightcoord,downcoord,leftcoord);
    }
    else{
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        movelist.push(downright,downleft);

        var upstrike = ["s",this.y-2,this.x];
        var upstrike2 = ["s",this.y-3,this.x];
        movelist.push(upstrike,upstrike2);
    }
    return movelist;
}


var wi1 = new tile("unplaced","unplaced","player1", "wizard", "wi1");
wi1.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1, this.x]; 
        var upright = [this.y-1, this.x+1];
        var rightcoord = [this.y, this.x+1];
        var downright = [this.y+1,this.x+1];
        var downcoord = [this.y+1,this.x];
        var downleft = [this.y+1,this.x-1];
        var leftcoord = [this.y,this.x-1];
        var upleft = [this.y-1,this.x-1];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    else{
        var upcoord = [this.y-2, this.x]; 
        var upright = [this.y-2, this.x+2];
        var rightcoord = [this.y, this.x+2];
        var downright = [this.y+2,this.x+2];
        var downcoord = [this.y+2,this.x];
        var downleft = [this.y+2,this.x-2];
        var leftcoord = [this.y,this.x-2];
        var upleft = [this.y-2,this.x-2];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    return movelist;
}


var or1 =  new tile("unplaced","unplaced","player1", "oracle", "or1");
or1.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var upright = [this.y-1,this.x+1];
        var upleft = [this.y-1,this.x-1];
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        movelist.push(upright,upleft,downright,downleft);
    }
    return movelist;
}


var du1 =  new tile("unplaced","unplaced","player1", "duchess", "du1");
du1.possiblemove = function(board){
    movelist = [];
    var rightcoord = [this.y,this.x+1];
    var leftcoord = [this.y,this.x-1];
    movelist.push(rightcoord,leftcoord);
    if((this.y <= 5)&&(board[this.y][this.x-1] == "*")){
        var downcoord = [this.y+2,this.x];
        movelist.push(downcoord);
    }
    return movelist
}
du1.tpsquare = function(){
    movelist = [];
    farleft = [this.y, this.x-2];
    leftcoord = [this.y,this.x-1];
    rightcoord = [this.y,this.x+1];
    farright = [this.y,this.x+2];
    movelist.push(farleft,leftcoord,rightcoord,farright);
    return movelist;
}



//Making the objects for player 2
var duke2 = new tile("unplaced","unplaced","player2", "duke", "duke2");
duke2.possiblemove = function(board) {
    movelist = [];
    if (this.facingup == true){ //if it is going horizontal
        var tilex = 0;
        for(a = 1 ; a <= 6-this.x ; a++){ //loop for space to the right
            tilex = this.x + a;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                a = 9;
            }
        }
        for(b = 1 ; b <= this.x-1 ; b++){ //loop for space to the left
            tilex = this.x - b;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                b = 9;
            }

        }
    }
    else{ //if it is going vertical
        var tiley = 0;
        for(a = 1 ; a <= 6-this.y ; a++){ //loop for space down
            tiley = this.y + a;
            movelist.push([tiley,this.x]);
            if(board[tiley - 1][this.x - 1] == "*"){
            }
            else{
                a = 9;
            }
        }
        for(b = 1 ; b <= this.y-1 ; b++){ //loops for space up
            tiley = this.y - b;
            movelist.push([tiley,this.x]);
            if(board[tiley - 1][this.x-1] == "*"){
            }
            else{
                b = 9;
            }

        }
    }
    return movelist;
};


var f12 =  new tile("unplaced","unplaced","player2", "footman", "f12");
f12.possiblemove = function(board){
    movelist = [];
    if (this.facingup == true){
        var upcoord = this.y - 1; 
        var downcoord = this.y + 1;
        var rightcoord = this.x + 1;
        var leftcoord = this.x - 1;
        if(this.y != 1){
            movelist.push([upcoord,this.x]);
        }
        if(this.y != 6){
            movelist.push([downcoord,this.x]);
        }
        if(this.x != 6){
            movelist.push([this.y,rightcoord]);
        }
        if(this.x != 1){
            movelist.push([this.y,leftcoord]);
        }

    }
    else{
        var upleft = [this.y-1,this.x-1];
        var upright = [this.y-1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        var downright = [this.y+1,this.x+1];


        if((this.x != 1) || (this.x != 6) || (this.y != 1) || (this.y !=6)){
            movelist.push(upleft,upright,downleft,downright);
        }
        else if (this.x = 1){
            if(this.y = 1){
                movelist.push(downright);
            }
            else if (this.y = 6){
                movelist.push(upright);
            }
            else{
                movelist.push(upright,downright);
            }
        }
        else if (this.x = 6){
            if(this.y = 1){
                movelist.push(downleft);
            }
            else if (this.y = 6){
                movelist.push(upleft);
            }
            else{
                movelist.push(upleft,downleft);
            }
        }
        else if (this.y = 1){
            movelist.push(downleft,downright);
        }
        else if (this.y = 6){
            movelist.push(upleft,upright);
        }

        if(this.y <= 4){
            if(board[this.y][this.x-1] == "*"){
                movelist.push([this.y+2,this.x]);
            }
        }

        
    }
    return movelist;
};


var f22 =  new tile("unplaced","unplaced","player2", "footman", "f22");
f22.possiblemove = function(board){
    movelist = [];
    if (this.facingup == true){
        var upcoord = this.y - 1; 
        var downcoord = this.y + 1;
        var rightcoord = this.x + 1;
        var leftcoord = this.x - 1;
        if(this.y != 1){
            movelist.push([upcoord,this.x]);
        }
        if(this.y != 6){
            movelist.push([downcoord,this.x]);
        }
        if(this.x != 6){
            movelist.push([this.y,rightcoord]);
        }
        if(this.x != 1){
            movelist.push([this.y,leftcoord]);
        }

    }
    else{
        var upleft = [this.y-1,this.x-1];
        var upright = [this.y-1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        var downright = [this.y+1,this.x+1];


        if((this.x != 1) || (this.x != 6) || (this.y != 1) || (this.y !=6)){
            movelist.push(upleft,upright,downleft,downright);
        }
        else if (this.x = 1){
            if(this.y = 1){
                movelist.push(downright);
            }
            else if (this.y = 6){
                movelist.push(upright);
            }
            else{
                movelist.push(upright,downright);
            }
        }
        else if (this.x = 6){
            if(this.y = 1){
                movelist.push(downleft);
            }
            else if (this.y = 6){
                movelist.push(upleft);
            }
            else{
                movelist.push(upleft,downleft);
            }
        }
        else if (this.y = 1){
            movelist.push(downleft,downright);
        }
        else if (this.y = 6){
            movelist.push(upleft,upright);
        }

        if(this.y <= 4){
            if(board[this.y][this.x-1] == "*"){
                movelist.push([this.y+2,this.x]);
            }
        }

        
    }
    return movelist;
};


var as2 =  new tile("unplaced","unplaced","player2", "asassin", "as2");
as2.possiblemove = function(board){
    movelist = [];
    if(this.facingup == false){  //opposite to player 1's function as it is facing opposite direction
        for(a = 2; a <= this.y - 1 ; a++){ //for the upwards movement
            var upjump = this.y - a; //movement detection inclusive of the tile with the other piece on it
            movelist.push([upjump, this.x]);
            if(board[this.y-a-1][this.x -1] == "*"){ 
            }
            else{
                a = this.y
            }
        }

        for(b = 2 ; b <= Math.min(6-this.x, 6-this.y); b++){ //for the down right movement
            var downrjump = [this.y+b, this.x+b];
            movelist.push(downrjump);
            if(board[this.y+b-1][this.x+b-1] == "*"){
            }
            else{
                b = 6
            }
        }

        for(c = 2; c <= Math.min(this.x-1, 6-this.y); c++){ //for the down left movement
            var downljump = [this.y+c, this.x-c];
            movelist.push(downljump);
            if(board[this.y+c-1][this.x-c-1] == "*"){
            }
            else{
                c = 6
            }
        }
    }
    else{//doing the opposite movements
        for(d = 2; d <= 6-this.y ; d++){ //movement for straight down
            var downjump = this.y + d;
            movelist.push([downjump,this.x]);
            if(board[downjump-1][this.x-1] == "*"){
            }
            else{
                d = 6;
            }
        }
        for(e=2; e <= Math.min(6-this.x, this.y-1); e++){//for up right movement
            var uprjump = [this.y-e,this.x+e];
            movelist.push(uprjump);
            if(board[this.y-e-1][this.x+e-1] == "*"){}
            else{
                e = 6
            }
        }
        for(f=2 ; f <= Math.min(this.y-1, this.x-1) ; f++){
            var upljump = [this.y - f, this.x - f];
            movelist.push(upljump);
            if(board[this.y-f-1][this.x-f-1] == "*"){}
            else{
                f = 6;
            }
        }
    }
    return movelist;
}



var bo2 =  new tile("unplaced","unplaced","player2", "bowman", "bo2");
bo2.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        //for the closeby movements
        var upcoord = [this.y+1, this.x];
        var rightcoord = [this.y,this.x+1];
        var leftcoord = [this.y,this.x-1];

        //for the jumps
        var rightjump = [this.y,this.x + 2];
        var leftjump = [this.y,this.x - 2];
        var downjump = [this.y-2,this.x];

        movelist.push(upcoord,rightcoord,leftcoord,rightjump,leftjump,downjump);
        //impossible coordinates(outside of the board) cannot be accessed, so it is ok for them to be included in the movelist array 
        //even though such coordinates are illegal to move to, it would be impossible for the player to place the tiles on such squares anyways as they are outside of the board
    }
    else{
        var upcoord = [this.y+1, this.x];
        var downright = [this.y-1, this.x+1]; 
        var downleft = [this.y-1, this.x-1];

        //strikezones
        var upstrike = ['s',this.y+2,this.x];
        var uprightstrike = ['s', this.y+1,this.x+1];
        var upleftstrike = ['s', this.y+1, this.x-1];

        movelist.push(upcoord,downright,downleft,upstrike,uprightstrike,upleftstrike);
    }
    return movelist;
}



var ch2 =  new tile("unplaced","unplaced","player2", "champion", "ch2");
ch2.possiblemove = function(){ //Hardcoding the movements in
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1, this.x];
        var rightcoord = [this.y, this.x+1];
        var downcoord = [this.y+1, this.x];
        var leftcoord = [this.y , this.x-1];

        var upjump = [this.y - 2, this.x];
        var rightjump = [this.y,this.x+2];
        var downjump = [this.y+2, this.x];
        var leftjump = [this.y,this.x-2];
        movelist.push(upcoord,rightcoord,downcoord,leftcoord,upjump,rightjump,downjump,leftjump);

    }
    else{
        var upjump = [this.y - 2, this.x];
        var rightjump = [this.y,this.x+2];
        var downjump = [this.y+2, this.x];
        var leftjump = [this.y,this.x-2];
    
        var upstrike = ['s',this.y-1, this.x];
        var rightstrike = ['s',this.y, this.x+1];
        var downstrike = ['s',this.y+1, this.x];
        var leftstrike = ['s',this.y , this.x-1];

        movelist.push(upstrike,rightstrike,downstrike,leftstrike,upjump,rightjump,downjump,leftjump);
    }
    return movelist;
}


var dr2 =  new tile("unplaced","unplaced","player2", "dragoon", "dr2");
dr2.possiblemove = function(board){ //Hardcoding the movements in
    movelist = [];
    if(this.facingup == true){
        var rightcoord = [this.y, this.x+1];
        var leftcoord = [this.y , this.x-1];

        var upstrike = ["s", this.y + 2, this.x];
        var uprightstrike = ["s", this.y+2, this.x+2];
        var upleftstrike = ["s", this.y+2, this.x-2];

        movelist.push(rightcoord,leftcoord,upstrike,uprightstrike,upleftstrike);
    }
    else{
        var upcoord = [this.y+1, this.x]; //hard coding in the movements for the upward moves
        movelist.push(upcoord);
        if((this.y <+ 5)&&(board[this.y][this.x-1] == "*")){
            upcoord = [this.y+2, this.x];
            movelist.push(upcoord);
        }

        var upright = [this.y+2, this.x+1];
        var upleft = [this.y+2,this.x-1];
        movelist.push(upright,upleft);

        for(a=1 ; a<= Math.min(this.y-1, 6-this.x) ; a++){// down right slide
            var downright = [this.y - a, this.x + a];
            movelist.push(downright);
            if(board[this.y-a-1][this.x+a-1] == "*"){}
            else{
                a = 6;
            }
        }
        for(b=1;b<=Math.min(this.y-1, this.x-1) ; b++){//down left slide
            var downleft = [this.y - b, this.x-b];
            movelist.push(downleft);
            if(board[this.y-b-1][this.x-b-1] == "*"){}
            else{
                b = 6;
            }
        }
    }
    return movelist;
}


var ge2 =  new tile("unplaced","unplaced","player2", "general", "ge2");
ge2.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y+1, this.x];
        var downcoord = [this.y-1, this.x];
        movelist.push(upcoord,downcoord);
        if((this.x <= 5)&&(board[this.y-1][this.x] == "*")){//for right move
            var rightcoord = [this.y, this.x+2];
            movelist.push(rightcoord);
        }
        if((this.x-2 >= 0)&&(board[this.y-1][this.x-2] == "*")){//for left move
            var leftcoord = [this.y, this.x-2]
            movelist.push(leftcoord);
        }

        var upright = [this.y+2, this.x-1]; 
        var upleft = [this.y+2, this.x+1];
        movelist.push(upright,upleft);
    }
    else{
        var upcoord = [this.y+1, this.x];
        var rightcoord = [this.y, this.x+1];
        var leftcoord = [this.y, this.x-1];
        movelist.push(upcoord,rightcoord,leftcoord);

        var upright = [this.y+2, this.x-1]; 
        var upleft = [this.y+2, this.x+1];
        movelist.push(upright,upleft);
        
        if((this.x <= 5)&&(board[this.y-1][this.x] == "*")){//for right move
            rightcoord = [this.y, this.x + 2];
            movelist.push(rightcoord);
        }
        if((this.x-2 >= 0)&&(board[this.y-1][this.x-2] == "*")){
            leftcoord = [this.y, this.x-2];
            movelist.push(leftcoord)
        }
    }
    return movelist;
}
ge2.tpsquare = function(){
    movelist = [];
    if(this.facingup == false){
        leftcoord = [this.y,this.x-1];
        rightcoord = [this.y,this.x+1];
        downleft = [this.y-1,this.x-1];
        downright = [this.y-1,this.x+1];
        downcoord = [this.y-1,this.x];
        movelist.push(leftcoord,rightcoord,downcoord,downleft,downright);
    }
    return movelist;
}

var kn2 =  new tile("unplaced","unplaced","player2", "knight", "kn2");
kn2.possiblemove = function(board){ //hard coding in the face 1 movements
    movelist = [];
    if(this.facingup == true){
        var upright = [this.y+2,this.x+1]; 
        var upleft = [this.y+2,this.x-1];
        var rightcoord = [this.y, this.x+1];
        var leftcoord = [this.y,this.x-1];
        var downcoord = [this.y-1, this.x];
        movelist.push(upright,upleft,rightcoord,leftcoord,downcoord);
        if((this.y-2 >= 0) && (board[this.y-2][this.x-1] == "*")){
            downcoord = [this.y-2, this.x];
            movelist.push(downcoord);
        }
    }
    else{
        var downright = [this.y-1,this.x+1];
        var downleft = [this.y-1,this.x-1];
        movelist.push(downright,downleft);
        if((this.y-2 >= 0)&&(this.x<=5)&&(board[this.y-2][this.x] =="*")){ //test if down right is blocked
            downright = [this.y-2, this.x+2];
            movelist.push(downright);
        }
        if((this.y-2>=0)&&(this.x-2>=0)&&(board[this.y-2][this.x-2] == "*")){
            downleft = [this.y-2, this.x-2];
            movelist.push(downleft);
        }

        for(a=1 ; a <= 6-this.y ;a++){ //for upward slide movement
            var upcoord = [this.y+a,this.x];
            movelist.push(upcoord);
            if((this.y+a-1<=5)&&(board[this.y+a-1][this.x-1] == "*")){}
            else{
                a = 6;
            }
        }
    }
    return movelist;
}


var ma2 =  new tile("unplaced","unplaced","player2", "marshall", "ma2");
ma2.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var tilex = 0;
        for(a = 1 ; a <= 6-this.x ; a++){ //loop for space to the right
            tilex = this.x + a;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                a = 6;
            }
        }
        for(b = 1 ; b <= this.x-1 ; b++){ //loop for space to the left
            tilex = this.x - b;
            movelist.push([this.y,tilex]);
            if(board[this.y -1][tilex-1] == "*"){
            }
            else{
                b = 6;
            }

        }
        var upright = [this.y+2,this.x+2];
        var upleft = [this.y+2,this.x-2];
        var downcoord = [this.y-2,this.x];
        movelist.push(upright,upleft,downcoord);
    }
    else{
        var upcoord = [this.y+1,this.x];
        var upright = [this.y+1,this.x+1];
        var upleft = [this.y+1, this.x-1];
        var rightcoord = [this.y,this.x+1];
        var leftcoord = [this.y,this.x-1];
        var downright = [this.y-1,this.x+1];
        var downleft = [this.y-1,this.x-1];
        movelist.push(upcoord,upright,upleft,rightcoord,leftcoord,downright,downleft);
        if((this.x <= 5)&&(board[this.y-1][this.x] =="*")){//checking right side movement
            rightcoord = [this.y,this.x+2];
            movelist.push(rightcoord);
        }
        if((this.x-2 >= 0)&&(board[this.y-1][this.x-2] == "*")){
            leftcoord = [this.y,this.x-2];
            movelist.push(leftcoord);
        }
    }
    return movelist;
}
ma2.tpsquare = function(){
    movelist = [];
    if(this.facingup == false){
        upcoord = [this.y+1,this.x];
        upright = [this.y+1,this.x+1];
        upleft = [this.y+1,this.x-1];
        movelist.push(upcoord,upright,upleft);
    }
    return movelist;
}

var pi2 = new tile("unplaced","unplaced","player2", "pikeman", "pi2");
pi2.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        var upright = [this.y+1,this.x+1];
        var upleft = [this.y+1,this.x-1];
        movelist.push(upright,upleft);

        if((this.y <= 5)&&(this.x <= 5)&&(board[this.y][this.x] == "*")){//for right up, so see if anything is in the way
            upright = [this.y+2, this.x+2];
            movelist.push(upright);
        }
        if((this.y <= 5)&&(this.x-2 >= 0)&&(board[this.y][this.x-2] == "*")){//for left up to see if anything blocking
            upleft = [this.y+2,this.x-2];
            movelist.push(upleft);
        }
    }
    else{
        var upcoord = [this.y+1,this.x];
        var downcoord = [this.y-1,this.x];
        var uprightstrike = ["s",this.y+2,this.x+1];
        var upleftstrike = ["s", this.y+2, this.x-1];
        movelist.push(upcoord,downcoord,uprightstrike,upleftstrike);

        if((this.y-2 >= 0)&&(board[this.y-2][this.x-1] == "*")){//testing if it can go down 2
            downcoord = [this.y-2,this.x];
            movelist.push(downcoord);
        }
    }
    return movelist;
}


var pr2 = new tile("unplaced","unplaced","player2", "priest", "pr2");
pr2.possiblemove = function(board){
    movelist = [];
    if(this.facingup == true){
        for(a=1 ; a<= Math.min(this.y-1, 6-this.x) ; a++){//for up right slide
            var upright = [this.y-a,this.x+a];
            movelist.push(upright);
            if(board[this.y-a-1][this.x+a-1] == "*"){}
            else{
                a = 6;
            }
        }
        for(b=1 ; b<= Math.min(this.y-1,this.x-1) ; b++){//for up left slide
            var upleft = [this.y-b,this.x-b];
            movelist.push(upleft);
            if(board[this.y-b-1][this.x-b-1] == "*"){}
            else{
                b = 6
            }
        }
        for(c=1 ; c<= Math.min(6 - this.y, 6 - this.x) ; c++){//for down right slide
            var downright = [this.y+c,this.x+c];
            movelist.push(downright);
            if(board[this.y+c-1][this.x+c-1] == "*"){}
            else{
                c = 6;
            }
        }
        for(d=1 ; d<= Math.min(6-this.y, this.x-1) ; d++){//for down left slide
            var downleft = [this.y+d,this.x-d];
            movelist.push(downleft);
            if(board[this.y+d-1][this.x-d-1] == "*"){}
            else{
                d = 6;
            }
        }
    }
    else{
        var upright = [this.y-1,this.x+1];
        var upleft = [this.y-1, this.x-1];
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        var uprightjump = [this.y-2,this.x+2];
        var upleftjump = [this.y-2,this.x-2];
        var downrightjump = [this.y+2,this.x+2];
        var downleftjump = [this.y+2,this.x-2];
        movelist.push(upright,upleft,downright,downleft,uprightjump,upleftjump,downrightjump,downleftjump);
    }
    return movelist;
}


var se2 = new tile("unplaced","unplaced","player2", "seer", "se2");
se2.possiblemove = function(){
    movelist = [];
    if(this.facingup==true){
        var upcoord = [this.y-2, this.x]; 
        var upright = [this.y-1, this.x+1];
        var rightcoord = [this.y, this.x+2];
        var downright = [this.y+1,this.x+1];
        var downcoord = [this.y+2,this.x];
        var downleft = [this.y+1,this.x-1];
        var leftcoord = [this.y,this.x-2];
        var upleft = [this.y-1,this.x-1];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    else{
        var upcoord = [this.y-1, this.x]; 
        var upright = [this.y-2, this.x+2];
        var rightcoord = [this.y, this.x+1];
        var downright = [this.y+2,this.x+2];
        var downcoord = [this.y+1,this.x];
        var downleft = [this.y+2,this.x-2];
        var leftcoord = [this.y,this.x-1];
        var upleft = [this.y-2,this.x-2];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    return movelist;
}


var lo2 = new tile("unplaced","unplaced","player2", "longbow", "lo2");
lo2.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1,this.x];
        var rightcoord = [this.y,this.x+1];
        var downcoord = [this.y+1,this.x];
        var leftcoord = [this.y,this.x-1];
        movelist.push(upcoord,rightcoord,downcoord,leftcoord);
    }
    else{
        var downright = [this.y-1,this.x+1];
        var downleft = [this.y-1,this.x-1];
        movelist.push(downright,downleft);

        var upstrike = ["s",this.y+2,this.x];
        var upstrike2 = ["s",this.y+3,this.x];
        movelist.push(upstrike,upstrike2);
    }
    return movelist;
}


var wi2 = new tile("unplaced","unplaced","player2", "wizard", "wi2");
wi2.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var upcoord = [this.y-1, this.x]; 
        var upright = [this.y-1, this.x+1];
        var rightcoord = [this.y, this.x+1];
        var downright = [this.y+1,this.x+1];
        var downcoord = [this.y+1,this.x];
        var downleft = [this.y+1,this.x-1];
        var leftcoord = [this.y,this.x-1];
        var upleft = [this.y-1,this.x-1];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    else{
        var upcoord = [this.y-2, this.x]; 
        var upright = [this.y-2, this.x+2];
        var rightcoord = [this.y, this.x+2];
        var downright = [this.y+2,this.x+2];
        var downcoord = [this.y+2,this.x];
        var downleft = [this.y+2,this.x-2];
        var leftcoord = [this.y,this.x-2];
        var upleft = [this.y-2,this.x-2];
        movelist.push(upcoord,upright,rightcoord,downright,downcoord,downleft,leftcoord,upleft);
    }
    return movelist;
}


var or2 =  new tile("unplaced","unplaced","player2", "oracle", "or2");
or2.possiblemove = function(){
    movelist = [];
    if(this.facingup == true){
        var upright = [this.y-1,this.x+1];
        var upleft = [this.y-1,this.x-1];
        var downright = [this.y+1,this.x+1];
        var downleft = [this.y+1,this.x-1];
        movelist.push(upright,upleft,downright,downleft);
    }
    return movelist;
}



var du2 =  new tile("unplaced","unplaced","player2", "duchess", "du2");
du2.possiblemove = function(board){
    movelist = [];
    var rightcoord = [this.y,this.x+1];
    var leftcoord = [this.y,this.x-1];
    movelist.push(rightcoord,leftcoord);
    if((this.y-2 >= 0)&&(board[this.y-2][this.x-1] == "*")){
        var downcoord = [this.y-2,this.x];
        movelist.push(downcoord);
    }
    return movelist;
}
du2.tpsquare = function(){
    movelist = [];
    farleft = [this.y, this.x-2];
    leftcoord = [this.y,this.x-1];
    rightcoord = [this.y,this.x+1];
    farright = [this.y,this.x+2];
    movelist.push(farleft,leftcoord,rightcoord,farright);
    return movelist;
}


const listoftiles = { //helps assosciate the element ids with objects
    "duke1" : duke1,
    "f11": f11,
    "f21": f21,
    "as1": as1,
    "bo1": bo1,
    "ch1": ch1,
    "dr1": dr1,
    "ge1": ge1,
    "kn1": kn1,
    "ma1": ma1,
    "pi1": pi1,
    "pr1": pr1,
    "se1": se1,
    "lo1": lo1,
    "wi1": wi1,
    "or1": or1,
    "du1": du1,

    "duke2" : duke2,
    "f12": f12,
    "f22": f22,
    "as2": as2,
    "bo2": bo2,
    "ch2": ch2,
    "dr2": dr2,
    "ge2": ge2,
    "kn2": kn2,
    "ma2": ma2,
    "pi2": pi2,
    "pr2": pr2,
    "se2": se2,
    "lo2": lo2,
    "wi2": wi2,
    "or2": or2,
    "du2": du2
};


//Below arrays keep track of dead/unplaced tiles for the generation of newer tiles
var unplaced1 = ["as1","bo1","ch1","dr1","ge1","kn1","ma1","pi1","pr1","se1","lo1","wi1","or1","du1"];
var unplaced2 = ["as2","bo2","ch2","dr2","ge2","kn2","ma2","pi2","pr2","se2","lo2","wi2","or2","du2"];











//Below are the key gameplay functions
function generatetile(player){//'player' passed in as either 1 or 2 as a string, used to generate a random tile for adding
    var array = [];
    if(player == "1"){
        array = unplaced1
    }
    else{
        array = unplaced2
    }
    if(array.length > 0){
        var index = Math.floor(Math.random() * array.length);//gives a random index for the array of unplaced tiles
        //var newtile = array[index];
        var newtile = "bo1";
        if(player == "1"){
            unplaced1.splice(index,1); //removes the tile that was just generated
        }
        else{
            unplaced2.splice(index,1); 
        }
        return newtile //returns the string id of the tile generated
    }
    else{
        alert("No tiles left in the bag");
    }
    return "none";
}



function addtile(){
    if(game.online == true){
        if(parseInt(game.playerturn[6]) != inroomid){ 
            return;
        }
    }

    var turn = game.playerturn[6] //playerturn states player turn as either "player1" or "player2", overall 'turn' would be the integer of whose turn it is
    if(game.setupcomplete == true){ //checks if the button is able to be clicked
        if(listoftiles["duke"+turn].y != "unplaced"){ //checking if the duke is on the board
            var possiblesquares = possibleplacement(listoftiles["duke"+turn]);
            if(possiblesquares.length > 0 ){//if there are free spots next to the duke(if placement are able to be made)
                var newtile = generatetile(game.playerturn[6]);
                if(newtile == "none"){
                }
                else{
                    game.setupcomplete = false;
                    var element = document.getElementById(newtile);
                    element.classList.add("displayed");
                    game.changeturns();
                }
            }
        }
    }
}



function oracle(){ //other features of this ability is accounted for in the dragend event listener
    if(game.online == true){
        if(parseInt(game.playerturn[6]) != inroomid){
            return;
        }
    }
    
    //looks at 3 tiles, choose 1 to place, replace the rest
    var oracletiles = [];
    var turn = game.playerturn[6] //playerturn states player turn as either "player1" or "player2", overall 'turn' would be the integer of whose turn it is
    if((game.setupcomplete == true)&&(game.teleportmode == false)){
            if(listoftiles["or"+turn].facingup == false){//if the player controls an oracle and is ready to use ability
                var possiblesquares = possibleplacement(listoftiles["duke"+turn]);
                if(possiblesquares.length > 0 ){//if there are free spots next to the duke(if placement are able to be made)
                    if(turn == "1"){
                        if(unplaced1.length >= 3){//checking if there are 3 tiles left in the bag to be deployed
                            game.setupcomplete = false;
                            game.divinationmode = true;
                            for( i=0 ; i<3 ; i++){
                                var index = Math.floor(Math.random() * unplaced1.length);//gives a random index for the array of unplaced tiles
                                oracletiles.push(unplaced1[index]);
                                unplaced1.splice(index,1);
                            }
                        }
                        else{
                            alert("Not enough tiles left for ability")
                            return;
                        }
                    }
                    else{
                        if(unplaced2.length >=3 ){
                            game.setupcomplete = false;
                            game.divinationmode = true;
                            for( i=0 ; i<3 ; i++){
                                var index = Math.floor(Math.random() * unplaced2.length);//gives a random index for the array of unplaced tiles
                                oracletiles.push(unplaced2[index]);
                                unplaced1.splice(index,1);
                            }
                        }
                        else{
                            alert("Not enough tiles left for ability")
                            return;
                        }
                    }
                    for(a=0 ; a<3 ; a++){
                        var element = document.getElementById(oracletiles[a]);
                        element.classList.add("displayed");
                    }
                    listoftiles["or"+turn].fliptile();
                    game.changeturns();
                }

            }
    }
}



function duchess(){
    if(game.online == true){
        if(parseInt(game.playerturn[6]) != inroomid){ 
            return;
        }
    }

    if((game.setupcomplete == true)&&(game.teleportmode == false)){
        var turn = game.playerturn[6]
        if(listoftiles["du" + turn].y != "unplaced"){//checking if the player has a duchess on board
            var possiblesquares = possibleplacement(listoftiles["duke"+turn]);
            if(possiblesquares.length >= 1){
                listoftiles["duke"+turn].fliptile();
                game.setupcomplete = false;
                //below shows resetting the duchess tile's object location
                listoftiles["du" + turn].y = "unplaced";
                listoftiles["du" + turn].x = "unplaced";
                //below shows iterating through the board array to remove the duchess
                for(row = 0 ; row <= board.length-1; row++){
                    for(column = 0 ; column<=board[row].length-1; column++){
                        if(board[row][column] == listoftiles["du"+turn]){//if the coordinate found is for the duchess
                            board[row][column] = "*";
                            key = "du"+turn;
                            const startingbox = document.querySelector('#containerbox'); 
                            startingbox.appendChild(document.getElementById(key)); //placing the duchess tile back into the starting box
                        }
                    }
                }
                game.duchess = true;
                game.changeturns();
                alert("Please place the duchess in the desired position adjacent to the duke");
            }
            else{
                alert("No space for ability to be used");
            }
        }
    }
}

function nextmovevalidity(selectedtile, newlocation){//teleport will not be a part of this section
    
       var possiblesquares = selectedtile.possiblemove(board); 
        console.log(possiblesquares);
        //possiblesquares will be an array containing integer coordinatea to where a legal movement can be made, stored in the form [y,x] (y = horizontal value, x = vertical value)

        var possiblestrike = [];



        //filtering the movement from the strikes
        for(a=0 ; a<possiblesquares.length;a++){
            if(possiblesquares[a][0] == 's'){
                possiblestrike.push(possiblesquares[a]);
            }
        }

        

        for(a=0 ; a<= possiblesquares.length-1; a++){
            if((newlocation[0] == possiblesquares[a][0])&&(newlocation[1] == possiblesquares[a][1])){
                return 'validmove';//to end the function
            }
        }
        for(a=0 ; a<= possiblestrike.length-1; a++){
            if((newlocation[0] == possiblestrike[a][1])&&(newlocation[1] == possiblestrike[a][2])){
                return 'validmove'
            }
        }
    return 'invalidmove';
}

function checkforchecks(enemyduke, allyduke){
    //gets the location of ally duke first
    var allypos = [allyduke.y,allyduke.x]; 
    var enemypos = [enemyduke.y,enemyduke.x];
    var validity = "invalidmove";

    for(row = 0 ; row <= board.length-1; row++){
        for(column = 0 ; column<=board[row].length-1; column++){
            if(board[row][column] != "*"){
                
                if(board[row][column].ownership != allyduke.ownership){
                    validity = nextmovevalidity(board[row][column], allypos);
                }
                else if(board[row][column].ownership != enemyduke.ownership){
                    validity = nextmovevalidity(board[row][column], enemypos);
                }

                if(validity == "validmove"){
                    column = 5;
                    row = 5;
                }
            }
        }
    }
    
    changeborder(validity);
}

function changeborder(validity){
    if(validity == "validmove"){
        alert("in check");
    }
}


function capture(capturedtile){//for the capturing of tiles
    for(row = 0 ; row <= board.length-1; row++){
        for(column = 0 ; column<=board[row].length-1; column++){
            if(board[row][column] == capturedtile){
                board[row][column] = "*";
                key = capturedtile.name;
                document.getElementById(key).classList.remove('displayed');//making the captured tile invisible
                const startingbox = document.querySelector('#containerbox'); 
                startingbox.appendChild(document.getElementById(key)); //placing the captured tile back into the starting box
                if(capturedtile.name == "duke1"){
                    alert("Player 2 Wins!");
                }
                else if(capturedtile.name == "duke2"){
                    alert("Player 1 Wins!");
                }
            }
        }
    }
}



//creating the function that highlights the possible placement areas around the player's duke
function possibleplacement(dukeobject){//passes the duke tile object
    movelist = [];
    var upcoord = [dukeobject.y-1,dukeobject.x];
    var downcoord = [dukeobject.y+1,dukeobject.x];
    var leftcoord = [dukeobject.y,dukeobject.x-1];
    var rightcoord = [dukeobject.y,dukeobject.x+1];

    if(dukeobject.y != 1){
        if(board[dukeobject.y-1-1][dukeobject.x-1] == "*"){
            movelist.push(upcoord);
        }
    }
    if(dukeobject.y != 6){
        if(board[dukeobject.y+1-1][dukeobject.x-1] == "*"){
            movelist.push(downcoord);
        }
    }
    if(dukeobject.x != 1){
        if(board[dukeobject.y-1][dukeobject.x-1-1] == "*"){
            movelist.push(leftcoord);
        }
    }   
    if(dukeobject.x != 6){
        if(board[dukeobject.y-1][dukeobject.x-1+1] == "*"){
            movelist.push(rightcoord);
        }
    }
    return movelist;
}



//Creating the movement function(that compares the possible move of a tile with the dragged location by the player, as well as handling captures of tiles) 
//makes the movement on the board first
function makemove(selectedtile, newlocation){//teleport will not be a part of this section
    if(selectedtile.ownership == game.playerturn){
        var possiblesquares = selectedtile.possiblemove(board); 
        console.log(possiblesquares);
        //possiblesquares will be an array containing integer coordinatea to where a legal movement can be made, stored in the form [y,x] (y = horizontal value, x = vertical value)

        var possiblestrike = [];



        //filtering the movement from the strikes
        for(a=0 ; a<possiblesquares.length;a++){
            if(possiblesquares[a][0] == 's'){
                possiblestrike.push(possiblesquares[a]);
            }
        }

        

        for(a=0 ; a<= possiblesquares.length-1; a++){
            if((newlocation[0] == possiblesquares[a][0])&&(newlocation[1] == possiblesquares[a][1])){
                if((board[newlocation[0]-1][newlocation[1]-1] != '*') && (board[newlocation[0]-1][newlocation[1]-1].ownership != selectedtile.ownership)){
                    //the above checks if movement can capture a tile
                    //may need to add additional parameters(for the above if statement) for checkmate section later on
                    var capturedtile = board[newlocation[0]-1][newlocation[1]-1];
                    capture(capturedtile);
                    game.changeturns();
                    board[selectedtile.y-1][selectedtile.x-1] = "*"; //removing tile from previous location on the board
                    board[newlocation[0]-1][newlocation[1]-1] = selectedtile; //moving the selected tile on the board
                    selectedtile.y = newlocation[0];
                    selectedtile.x = newlocation[1];
                    selectedtile.fliptile();
                    return 'validmove';//to end the function
                }
                else if((board[newlocation[0]-1][newlocation[1]-1] == '*')){
                    //the above checks if the new location is free of allies(opposing tiles checked above)
                    game.changeturns();
                    board[selectedtile.y-1][selectedtile.x-1] = "*"; //removing tile from previous location on the board
                    board[newlocation[0]-1][newlocation[1]-1] = selectedtile; //moving the selected tile on the board
                    selectedtile.y = newlocation[0];
                    selectedtile.x = newlocation[1];
                    selectedtile.fliptile();
                    return 'validmove';//to end the function
                }
            }
        }
        for(a=0 ; a<= possiblestrike.length-1; a++){
            if((newlocation[0] == possiblestrike[a][1])&&(newlocation[1] == possiblestrike[a][2])){
                if((board[newlocation[0]-1][newlocation[1]-1] != '*') && (board[newlocation[0]-1][newlocation[1]-1].ownership != selectedtile.ownership)){
                    var capturedtile = board[newlocation[0]-1][newlocation[1]-1];
                    capture(capturedtile);
                    game.changeturns();
                    selectedtile.fliptile();
                    return "validstrike";
                }
            }
        }
    }
    return 'invalidmove';
}



//creating the placement function that checks if the tiles are placed properly
//makes the placement on the board if the placement is legal
function makeplacement(selectedtile,newlocation){
    if(selectedtile.type == 'duke'){
        if(board[newlocation[0]-1][newlocation[1]-1] == "*"){
            board[newlocation[0]-1][newlocation[1]-1] = selectedtile;
            selectedtile.y = newlocation[0];
            selectedtile.x = newlocation[1];
            return "validmove";
        }
    }
    else if(listoftiles['duke'+selectedtile.ownership[6]].y != 'unplaced'){//seeing if the selected tile's duke is placed first
        var possiblemove = possibleplacement(listoftiles['duke'+selectedtile.ownership[6]]);//returning the areas around player's duke that is free
        for(a=0 ; a<possiblemove.length; a++){
            if((newlocation[0] == possiblemove[a][0])&&(newlocation[1] == possiblemove[a][1])){
                board[newlocation[0]-1][newlocation[1]-1] = selectedtile;
                selectedtile.y = newlocation[0];
                selectedtile.x = newlocation[1];
                return "validmove";
            }
        }
    }
    return "invalidmove";
}



function maketeleport(selectedtile,newlocation,teleporttile){ //note: selected tile as an object and teleport tile as a string ID
    if(game.online == true){
        if(parseInt(game.playerturn[6]) != inroomid){ 
            return;
        }
    }
    if(selectedtile.ownership == game.playerturn){
        var possiblesquares = listoftiles[teleporttile].tpsquare(); 
        selectedtilelocation = [selectedtile.y,selectedtile.x];
        able = false;
        for(a=0; a<possiblesquares.length; a++){
            if((selectedtilelocation[0] == possiblesquares[a][0])&&(selectedtilelocation[1] == possiblesquares[a][1])){
                able = true;
            }
        }
        if(able == true){
            for(b=0; b<possiblesquares.length; b++){
                if((newlocation[0] == possiblesquares[b][0])&&(newlocation[1] == possiblesquares[b][1])){//if the new location is also witbin the telepoirt space
                    if((board[newlocation[0]-1][newlocation[1]-1] != '*') && (board[newlocation[0]-1][newlocation[1]-1].ownership != selectedtile.ownership)){
                        //the above checks if movement can capture a tile
                        //may need to add additional parameters(for the above if statement) for checkmate section later on
                        var capturedtile = board[newlocation[0]-1][newlocation[1]-1];
                        capture(capturedtile);
                        game.changeturns();
                        board[selectedtile.y-1][selectedtile.x-1] = "*"; //removing tile from previous location on the board
                        board[newlocation[0]-1][newlocation[1]-1] = selectedtile; //moving the selected tile on the board
                        selectedtile.y = newlocation[0];
                        selectedtile.x = newlocation[1];
                        game.teleportmode = false;
                        return 'validmove';//to end the function
                    }
                    else if((board[newlocation[0]-1][newlocation[1]-1] == '*')){
                        game.changeturns();
                        board[selectedtile.y-1][selectedtile.x-1] = "*"; //removing tile from previous location on the board
                        board[newlocation[0]-1][newlocation[1]-1] = selectedtile; //moving the selected tile on the board
                        selectedtile.y = newlocation[0];
                        selectedtile.x = newlocation[1];
                        game.teleportmode = false;
                        return 'validmove';//to end the function
                    }
                }
            }
        }
    }
    game.teleportmode = false;
    return "invalidmove";
}


//creating the drag and drop
const draggable = document.querySelectorAll('.tile');
const square = document.querySelectorAll('.square');
//for the click to move feature of the game
var movedtile = "none";
var teleporttile = "none";

draggable.forEach(function(draggable){
    draggable.addEventListener('dragstart', function(){
        draggable.classList.add('dragged'); //when dragged, give it the dragged class
        currentsquare = draggable.parentElement.id;
        if (currentsquare != "containerbox"){
            currentsquarex = (currentsquare[2]) - 1;
            currentsquarey = (currentsquare[1]) - 1;
            board[currentsquarey][currentsquarex] = '*';
        }

    })
    draggable.addEventListener('dragend', function(){ 
        var finalsquare = draggable.parentElement.id;
        var selectedtileID = '';
        var selectedtile = '';
        selectedtileID = draggable.id;
        selectedtile = listoftiles[selectedtileID]; //getting the dragged tile object
        if(selectedtile.y != 'unplaced'){ //checking if tile has been placed yet
            if((game.setupcomplete == true)&&(game.teleportmode == false)){ //checking if all starting tiles have been placed and if the game is not set to teleport
                if (finalsquare != "containerbox"){
                    if(game.online == true){
                        if(parseInt(selectedtile.ownership[6]) != inroomid){
                            draggable.classList.remove('dragged');
                            var originalsquareID = "s"+(selectedtile.y.toString()+selectedtile.x.toString());//constructing the id of the original square
                            const originalsquare = document.getElementById(originalsquareID);
                            originalsquare.appendChild(draggable);//putting the tile back to its original spot
                            return;
                        }
                    }
                    var newlocation = [parseInt(finalsquare[1]),parseInt(finalsquare[2])];
                    var validity = makemove(selectedtile,newlocation);
                    if ((validity == 'invalidmove') || (validity == "validstrike")){ //need to place it back in it's original location in the case of wrong move or strike
                        var originalsquareID = "s"+(selectedtile.y.toString()+selectedtile.x.toString());//constructing the id of the original square
                        const originalsquare = document.getElementById(originalsquareID);
                        originalsquare.appendChild(draggable);//putting the tile back to its original spot
                        if(validity == "validstrike"){
                            var data = [selectedtileID,newlocation];
                            socket.emit("makecapture", data);
                        }
                    }
                    if(validity == "validmove"){
                        if(selectedtile.ownership == "player1"){
                            checkforchecks(listoftiles["duke2"], listoftiles["duke1"]);
                        }
                        else{
                            checkforchecks(listoftiles["duke1"], listoftiles["duke2"]);
                        }
                        if(game.online == true){
                            var data = [selectedtileID,newlocation];
                            socket.emit("makemove", data);
                        }
                    }
                }
                else{
                    var originalsquareID = "s"+(selectedtile.y.toString()+selectedtile.x.toString());//constructing the id of the original square
                        const originalsquare = document.getElementById(originalsquareID);
                        originalsquare.appendChild(draggable);//putting the tile back to its original spot
                }
            }
            else if(game.teleportmode == true){
                if (finalsquare != "containerbox"){
                    var newlocation = [parseInt(finalsquare[1]),parseInt(finalsquare[2])];
                    var validity = maketeleport(selectedtile,newlocation,teleporttile);
                    if (validity == 'invalidmove'){ //need to place it back in it's original location in the case of wrong move or strike
                        var originalsquareID = "s"+(selectedtile.y.toString()+selectedtile.x.toString());//constructing the id of the original square
                        const originalsquare = document.getElementById(originalsquareID);
                        originalsquare.appendChild(draggable);//putting the tile back to its original spot
                    }
                    else{
                        if(selectedtile.ownership == "player1"){
                            checkforchecks(listoftiles["duke2"], listoftiles["duke1"]);
                        }
                        else{
                            checkforchecks(listoftiles["duke1"], listoftiles["duke2"]);
                        }
                        listoftiles[teleporttile].fliptile();
                        if(game.online == true){
                            var datasent = [selectedtileID,newlocation,teleporttile.name];
                            socket.emit("maketeleport", datasent);
                        }
                    }
                }
                else{
                    var originalsquareID = "s"+(selectedtile.y.toString()+selectedtile.x.toString());//constructing the id of the original square
                        const originalsquare = document.getElementById(originalsquareID);
                        originalsquare.appendChild(draggable);//putting the tile back to its original spot
                }
            }
            else{
                var originalsquareID = "s"+(selectedtile.y.toString()+selectedtile.x.toString());//constructing the id of the original square
                const originalsquare = document.getElementById(originalsquareID);
                originalsquare.appendChild(draggable);//putting the tile back to its original spot
            }
        }

        else{//for the placement of tiles(for when unplaced tiles are dragged from)
            if(finalsquare != 'containerbox'){
                if((game.setupcomplete == false)&&(game.divinationmode == false)&&(game.teleportmode == false)){//checks if its in the setup phase/place tile phase
                    var newlocation = [parseInt(finalsquare[1]),parseInt(finalsquare[2])];
                    var validity = makeplacement(selectedtile,newlocation);
                    if (validity == 'invalidmove'){ //need to place it back in it's original location
                        const startingbox = document.querySelector('#containerbox');
                        startingbox.appendChild(draggable);//putting the tile back to the starting box
                    }
                    else{
                        if(game.online == true){
                            if(game.duchess == true){
                                datasent = [selectedtileID,newlocation];
                                socket.emit("placeduchess", datasent);
                                game.duchess = false;
                                
                            }
                            else{
                                datasent = [selectedtileID,newlocation];
                                socket.emit("placetile", datasent);
                            }
                        }
                    }
                    if((listoftiles['duke1'].y != 'unplaced')&&(listoftiles['duke2'].y != 'unplaced')&&(listoftiles['f11'].y != 'unplaced')&&(listoftiles['f12'].y != 'unplaced')&&(listoftiles['f21'].y != 'unplaced')&&(listoftiles['f22'].y != 'unplaced')){
                        //first checking if the starting tiles have been placed with the if statement in the above if statement
                        var allplaced = true
                        for(let keys in listoftiles){
                            if(document.getElementById(listoftiles[keys].name).classList.contains('displayed')){ 
                                if(listoftiles[keys].y == 'unplaced'){
                                    //for all displayed tiles, it is checking if they are also placed on the board, if there is one that is not, the placement section is not over
                                    allplaced = false;
                                }
                            }
                        }
                        if (allplaced == true){
                            game.setupcomplete = true;
                        }
                    }
                    console.log(board);
                }
                else if((game.divinationmode == true)&&(game.setupcomplete == false)){
                    var newlocation = [parseInt(finalsquare[1]),parseInt(finalsquare[2])];
                    var validity = makeplacement(selectedtile,newlocation);
                    if (validity == 'invalidmove'){ //need to place it back in it's original location
                        const startingbox = document.querySelector('#containerbox');
                        startingbox.appendChild(draggable);//putting the tile back to the starting box
                    }
                    else if(validity == "validmove"){
                        game.divinationmode = false;
                        game.setupcomplete = true;
                        var tile = document.querySelectorAll('.tile');
                        tile.forEach(function(tile){//making the undragged draggables invisible on bench
                            if((tile.parentElement.id == "containerbox")&&(tile.classList.contains("displayed"))){
                                tile.classList.remove("displayed");
                            }
                        });
                        if(game.online == true){
                            var datasent = [selectedtileID,newlocation];
                            socket.emit("placetile", board);
                        }
                        
                    }
                }
            }
        }
        draggable.classList.remove('dragged');//to display it after it gets put back
    })
    draggable.addEventListener("dblclick", function(){
        if((draggable.id == "or1")||(draggable.id =="or2")){
            if(game.playerturn == listoftiles[draggable.id].ownership){//if the player that owns the tile is able to play
                oracle();
            }
        }
        else if((draggable.id == "du1")||(draggable.id =="du2")){
            if(game.playerturn == listoftiles[draggable.id].ownership){//if the player that owns the tile is able to play
                duchess();
            }
        }
        else if((draggable.id == "du1")||(draggable.id == "du2")||(draggable.id =="ge1")||(draggable.id =="ge2")||(draggable.id =="ma1")||(draggable.id =="ma2")){//doesn't currently work dor duchess as parameter clashes with previous
            if(game.playerturn == listoftiles[draggable.id].ownership){//if the player that owns the tile is able to play
                if(game.setupcomplete == true){ //mandatory check to see whether the game is able to be played
                    if(game.teleportmode == false){
                        game.teleportmode = true; //this tells the movement section to use the teleport ranges of the tile to check for the movement of tiles
                        alert("teleport mode on");
                        teleporttile = draggable.id;
                    }
                }
            }
        }
    })
})


square.forEach(function(square){
    square.addEventListener('dragover', function(e){
        e.preventDefault();
        const draggable = document.querySelector('.dragged'); 
        square.appendChild(draggable); //since only one tile can have the dragged class at once, this just gets the dragged tile and appends it to the dragged over square
    })
    square.addEventListener('dragenter', function(e){
        e.preventDefault();
        square.classList.toggle("hovered");
        
    })
    square.addEventListener('dragleave', function(e){
        e.preventDefault();

        square.classList.toggle("hovered");
        
        
    })
    square.addEventListener('drop', function(e){
        e.preventDefault();

        square.classList.remove("hovered");
    })
})

function restart(){
    board = 
    [["*","*","*","*","*","*"]
    ,["*","*","*","*","*","*"]
    ,["*","*","*","*","*","*"]
    ,["*","*","*","*","*","*"]
    ,["*","*","*","*","*","*"]
    ,["*","*","*","*","*","*"]];

    for(let keys in listoftiles){
        listoftiles[keys].y = 'unplaced';
        listoftiles[keys].x = 'unplaced';
        listoftiles[keys].facingup = true;
    }

    unplaced1 = ["as1","bo1","ch1","dr1","ge1","kn1","ma1","pi1","se1","lo1","wi1","or1","du1"];
    unplaced2 = ["as2","bo2","ch2","dr2","ge2","kn2","ma2","pi2","se2","lo2","wi2","or2","du2"];

    movedtile = "none";
    teleporttile = "none";
    game.playerturn = "player1";
    game.setupcomplete = false;
    game.divinationmode = false;
    game.nocheck = true;
    game.teleportmode = false;
    game.online = false;
    game.offline = false;

    //resetting the tiles
    draggable.forEach(function(draggable){
        var contents = draggable.querySelector('.tile_inner')
        if(contents.classList.contains("is_flipped") == true){ //checks if tiles are flipped, and flipping them back onto their main side
            contents.classList.toggle("is_flipped");
        }

        if(draggable.classList.contains("displayed") == true){
            draggable.classList.remove('displayed');
        }

        if (draggable.id == "duke1" || draggable.id == "f11" || draggable.id == "f21" || draggable.id == "duke2" || draggable.id == "f12" || draggable.id == "f22" ){
            draggable.classList.add('displayed'); //making every image other than the starting ones invisible
        } 
        else{
            draggable.classList.remove('displayed');
        }
    })



    draggable.forEach(function(draggable){
        const startingbox = document.querySelector('#containerbox'); 
        startingbox.appendChild(draggable);
    })

    }