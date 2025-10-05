////////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//    Byggt á sýnisforriti í C fyrir OpenGL, höfundur óþekktur.
//
//     Bíll sem keyrir í hringi í umhverfi með húsum.  Hægt að
//    breyta sjónarhorni áhorfanda með því að slá á 1, 2, ..., 8.
//    Einnig hægt að breyta hæð áhorfanda með upp/niður örvum.
//    Leiðrétt útgáfa fyrir réttan snúning í MV.js
//
//    Hjálmtýr Hafsteinsson, september 2025
////////////////////////////////////////////////////////////////////
var canvas;
var gl;

// position of the track
var TRACK_RADIUS = 100.0;
var TRACK_INNER = 90.0;
var TRACK_OUTER = 110.0;
var TRACK_PTS = 100;
var CAR2_RADIUS = 95.0;

var BLUE = vec4(0.0, 0.0, 1.0, 1.0);
var RED = vec4(1.0, 0.0, 0.0, 1.0);
var GRAY = vec4(0.4, 0.4, 0.4, 1.0);
var GREEN = vec4(0.0, 1.0, 0.0, 1.0);
var YELLOW = vec4(1.0, 1.0, 0.0, 1.0);
var BROWN = vec4(0.5, 0.25, 0.0, 1.0);
var LIGHTBLUE = vec4(0.5, 1.0, 1.0, 1.0);
var BLACK = vec4(0.0, 0.0, 0.0, 1.0);

var numCubeVertices  = 36;
var numPyramidVertices  = 12;
var numTrackVertices  = 2*TRACK_PTS + 2;

// Variables for the random size of houses
var MIN_SIZE = 5.0;
var MAX_SIZE = 12.0;

// Array for house data
var houses = [];

// variables for moving car
var carDirection = 0.0;
var carXPos = 100.0;
var carYPos = 0.0;
var height = 0.0;
var car2Direction = 180.0;
var car2XPos = -95.0;
var car2YPos = 0.0;

// Variables for player viewpoint
var playerPosX = 0.0;
var playerPosY = 0.0;
var playerDirX = 1.0;
var playerDirY = 0.0;
var playerYaw = 0.0; // horizontal look
var moveSpeed = 1.0;
var playerPitch = 0.0; // vertical look
var playerDirZ = 0.0;

var keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

// current viewpoint
var view = 1;

var colorLoc;
var mvLoc;
var pLoc;
var proj;

var cubeBuffer;
var trackBuffer;
var vPosition;
var pyramidBuffer;

// the 36 vertices of the cube
var cVertices = [
    // front side:
    vec3( -0.5,  0.5,  0.5 ), vec3( -0.5, -0.5,  0.5 ), vec3(  0.5, -0.5,  0.5 ),
    vec3(  0.5, -0.5,  0.5 ), vec3(  0.5,  0.5,  0.5 ), vec3( -0.5,  0.5,  0.5 ),
    // right side:
    vec3(  0.5,  0.5,  0.5 ), vec3(  0.5, -0.5,  0.5 ), vec3(  0.5, -0.5, -0.5 ),
    vec3(  0.5, -0.5, -0.5 ), vec3(  0.5,  0.5, -0.5 ), vec3(  0.5,  0.5,  0.5 ),
    // bottom side:
    vec3(  0.5, -0.5,  0.5 ), vec3( -0.5, -0.5,  0.5 ), vec3( -0.5, -0.5, -0.5 ),
    vec3( -0.5, -0.5, -0.5 ), vec3(  0.5, -0.5, -0.5 ), vec3(  0.5, -0.5,  0.5 ),
    // top side:
    vec3(  0.5,  0.5, -0.5 ), vec3( -0.5,  0.5, -0.5 ), vec3( -0.5,  0.5,  0.5 ),
    vec3( -0.5,  0.5,  0.5 ), vec3(  0.5,  0.5,  0.5 ), vec3(  0.5,  0.5, -0.5 ),
    // back side:
    vec3( -0.5, -0.5, -0.5 ), vec3( -0.5,  0.5, -0.5 ), vec3(  0.5,  0.5, -0.5 ),
    vec3(  0.5,  0.5, -0.5 ), vec3(  0.5, -0.5, -0.5 ), vec3( -0.5, -0.5, -0.5 ),
    // left side:
    vec3( -0.5,  0.5, -0.5 ), vec3( -0.5, -0.5, -0.5 ), vec3( -0.5, -0.5,  0.5 ),
    vec3( -0.5, -0.5,  0.5 ), vec3( -0.5,  0.5,  0.5 ), vec3( -0.5,  0.5, -0.5 )
];

// vertices for pyramid (roof of house)
var pVertices = [
    vec3(  0.0,  0.0,  1.0 ), vec3( -0.5, -0.5,  0.0 ), vec3(  0.5, -0.5,  0.0 ),
    vec3(  0.0,  0.0,  1.0 ), vec3(  0.5, -0.5,  0.0 ), vec3(  0.5,  0.5,  0.0 ),
    vec3(  0.0,  0.0,  1.0 ), vec3(  0.5,  0.5,  0.0 ), vec3( -0.5,  0.5,  0.0 ),
    vec3(  0.0,  0.0,  1.0 ), vec3( -0.5,  0.5,  0.0 ), vec3( -0.5, -0.5,  0.0 )
];

// vertices of the track
var tVertices = [];


window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 1.0, 0.7, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    createTrack();
    
    // VBO for the track
    trackBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, trackBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(tVertices), gl.STATIC_DRAW );

    // VBO for the cube
    cubeBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(cVertices), gl.STATIC_DRAW );

    // VBO for the pyramid
    pyramidBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, pyramidBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pVertices), gl.STATIC_DRAW );


    vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    colorLoc = gl.getUniformLocation( program, "fColor" );
    
    mvLoc = gl.getUniformLocation( program, "modelview" );

    // set projection
    pLoc = gl.getUniformLocation( program, "projection" );
    proj = perspective( 50.0, 1.0, 1.0, 500.0 );
    gl.uniformMatrix4fv(pLoc, false, flatten(proj));

    // House data
    houses = [
        { x: -20.0, y: 50.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: 0.0, y: 70.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: 20.0, y: -10.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: 40.0, y: 120.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: -30.0, y: -50.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: 10.0, y: -60.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: -20.0, y: 75.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) },
        { x: -40.0, y: 140.0, type: Math.floor(Math.random() * 4) + 1, size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE) }
    ];

    document.getElementById("Viewpoint").innerHTML = "1: Fjarlægt sjónarhorn";
    document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;

    // Event listener for keyboard
    window.addEventListener("keydown", function(e){
        switch( e.keyCode ) {
            case 48:    // 0: player viewpoint
                view = 0;
                document.getElementById("Viewpoint").innerHTML = "0: Sjónarhorn leikmanns";
                break;
            case 49:	// 1: distant and stationary viewpoint
                view = 1;
                document.getElementById("Viewpoint").innerHTML = "1: Fjarlægt sjónarhorn";
                break;
            case 50:	// 2: panning camera inside the track
                view = 2;
                document.getElementById("Viewpoint").innerHTML = "2: Horfa á bílinn innan úr hringnum";
                break;
            case 51:	// 3: panning camera inside the track
                view = 3;
                document.getElementById("Viewpoint").innerHTML = "3: Horfa á bílinn fyrir utan hringinn";
                break;
            case 52:	// 4: driver's point of view
                view = 4;
                document.getElementById("Viewpoint").innerHTML = "4: Sjónarhorn ökumanns";
                break;
            case 53:	// 5: drive around while looking at a house
                view = 5;
                document.getElementById("Viewpoint").innerHTML = "5: Horfa alltaf á eitt hús innan úr bílnum";
                break;
            case 54:	// 6: Above and behind the car
                view = 6;
                document.getElementById("Viewpoint").innerHTML = "6: Fyrir aftan og ofan bílinn";
                break;
            case 55:	// 7: from another car in front
                view = 7;
                document.getElementById("Viewpoint").innerHTML = "7: Horft aftur úr bíl fyrir framan";
                break;
            case 56:	// 8: from beside the car
                view = 8;
                document.getElementById("Viewpoint").innerHTML = "8: Til hliðar við bílinn";
                break;
            
            case 38:    // up arrow
                height += 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;
                break;
            case 40:    // down arrow
                height -= 2.0;
                document.getElementById("Height").innerHTML = "Viðbótarhæð: "+ height;
                break;
        }
    } );

    // Event listener for WASD
    window.addEventListener("keydown", function(e){
        switch( e.keyCode ) {
            case 87:
                keys.w = true;
                break;
            case 65:
                keys.a = true;
                break;
            case 83:
                keys.s = true;
                break;
            case 68:
                keys.d = true;
                break;
        }
    });

    window.addEventListener("keyup", function(e){
        switch( e.keyCode ) {
            case 87:
                keys.w = false;
                break;
            case 65:
                keys.a = false;
                break;
            case 83:
                keys.s = false;
                break;
            case 68:
                keys.d = false;
                break;
        }
    });

    // Event listener for mouse movement
    window.addEventListener("mousemove", function(e){
        if (view == 0) {
            // horizontal
            playerYaw -= e.movementX * 0.4; 
            if (playerYaw < 0) playerYaw += 360;
            if (playerYaw >= 360) playerYaw -= 360;

            // vertical
            playerPitch -= e.movementY * 0.4;
            if (playerPitch > 89) playerPitch = 89;
            if (playerPitch < -89) playerPitch = -89;
            
            var cosPitch = Math.cos(radians(playerPitch));
            playerDirX = Math.cos(radians(playerYaw)) * cosPitch;
            playerDirY = Math.sin(radians(playerYaw)) * cosPitch;
            playerDirZ = Math.sin(radians(playerPitch));
        }
    });


    render();
}


// create the vertices that form the car track
function createTrack() {

    var theta = 0.0;
    for( var i=0; i<=TRACK_PTS; i++ ) {
        var p1 = vec3(TRACK_OUTER*Math.cos(radians(theta)), TRACK_OUTER*Math.sin(radians(theta)), 0.0);
        var p2 = vec3(TRACK_INNER*Math.cos(radians(theta)), TRACK_INNER*Math.sin(radians(theta)), 0.0) 
        tVertices.push( p1 );
        tVertices.push( p2 );
        theta += 360.0/TRACK_PTS;
    }
}

// Draw a rectangular prism at (x, y), base at z=baseZ, scaled (sX, sY, sZ), color col
function drawPrism( x, y, baseZ, sX, sY, sZ, col, mv ) {
    gl.uniform4fv( colorLoc, col );
    var mv1 = mult( mv, translate( x, y, baseZ ) );
    mv1 = mult( mv1, scalem( sX, sY, sZ ) );
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}

// Draw a pyramid at (x, y), base at z=baseZ, scaled (sX, sY, sZ), color col
function drawPyramid( x, y, baseZ, sX, sY, sZ, col, mv ) {
    gl.uniform4fv( colorLoc, col );
    var mv1 = mult( mv, translate( x, y, baseZ ) );
    mv1 = mult( mv1, scalem( sX, sY, sZ ) );
    gl.bindBuffer( gl.ARRAY_BUFFER, pyramidBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numPyramidVertices );
}

// House Type 1: Basic red cube
function houseType1( x, y, size, mv ) {
    drawPrism(x, y, size / 2, size, size, size, RED, mv);
    // Roof
    drawPyramid(x, y, size, size, size, size / 2, YELLOW, mv);
}

// House Type 2: Tall lightblue rectangular house
function houseType2( x, y, size, mv ) {
    drawPrism(x, y, size, size, size, size * 2, LIGHTBLUE, mv);
}

// House Type 3: Wide green flat house
function houseType3( x, y, size, mv ) {
    drawPrism(x, y, size / 2, size * 2, size, size, GREEN, mv);
}

// House Type 4: Yellow base with brown pyramidal roof
function houseType4( x, y, size, mv ) {
    // Base
    drawPrism(x, y, size / 2, size, size, size, YELLOW, mv);
    // Roof
    drawPyramid(x, y, size, size, size, size / 2, BROWN, mv);
}

// draw a house in location (x, y) of size size
function house( x, y, type, size, mv ) {
    // Draw based on type
    switch(type) {
        case 1: houseType1(x, y, size, mv); break;
        case 2: houseType2(x, y, size, mv); break;
        case 3: houseType3(x, y, size, mv); break;
        case 4: houseType4(x, y, size, mv); break;
    }
}

function drawBridge( theta, mv ) {
    var x = TRACK_RADIUS * Math.cos(radians(theta));
    var y = TRACK_RADIUS * Math.sin(radians(theta));
    
    // Rotate to align with track
    var mv1 = mult(mv, translate(x, y, 0.0));
    mv1 = mult(mv1, rotateZ(theta + 90));
    
    // Left pillar (inside track, radius < 90)
    drawPrism(0.0, -15.0, 2.5, 10.0, 5.0, 8.0, BLACK, mv1);
    
    // Right pillar (outside track, radius > 110)
    drawPrism(0.0, 15.0, 2.5, 10.0, 5.0, 8.0, BLACK, mv1);
    
    // Top slab (spans track, above cars)
    drawPrism(0.0, 0.0, 8.0, 10.0, 35.0, 4.0, BLACK, mv1);
}

// draw the circular track and a few houses (i.e. red cubes)
function drawScenery( mv ) {

    // draw track
    gl.uniform4fv( colorLoc, GRAY );
    gl.bindBuffer( gl.ARRAY_BUFFER, trackBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );

    gl.uniformMatrix4fv(mvLoc, false, flatten(mv));
    gl.drawArrays( gl.TRIANGLE_STRIP, 0, numTrackVertices );


    // Draw houses
    for (var i = 0; i < houses.length; i++) {
        var h = houses[i];
        house(h.x, h.y, h.type, h.size, mv);
    }

    // Draw a bridge
    drawBridge(90, mv);
}


// draw car as two blue cubes
function drawCar(x, y, angle, color, mv ) {

    // set color to blue
    gl.uniform4fv( colorLoc, color );
    
    gl.bindBuffer( gl.ARRAY_BUFFER, cubeBuffer );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );

    var mv1 = mv;
    mv1 = mult( mv1, translate( x, y, 0.0 ) );
    mv1 = mult( mv1, rotateZ( angle ) );

    // Lower body of the car
    var mv2 = mult( mv1, scalem( 10.0, 3.0, 2.0 ) );
    mv2 = mult( mv2, translate( 0.0, 0.0, 0.5 ) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv2));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );

    // Upper part of the car
    mv1 = mult( mv1, scalem( 4.0, 3.0, 2.0 ) );
    mv1 = mult( mv1, translate( -0.2, 0.0, 1.5 ) );
    gl.uniformMatrix4fv(mvLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numCubeVertices );
}
    

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update car 1 position
    carDirection += 1.0;
    if ( carDirection > 360.0 ) carDirection = 0.0;

    carXPos = (TRACK_RADIUS+5) * Math.sin( radians(carDirection) );
    carYPos = (TRACK_RADIUS+5) * Math.cos( radians(carDirection) );

    // Update car 2 position
    car2Direction += -1.0;
    if ( car2Direction < 0.0 ) car2Direction += 360.0;
    car2XPos = CAR2_RADIUS * Math.sin( radians(car2Direction) );
    car2YPos = CAR2_RADIUS * Math.cos( radians(car2Direction) );

    // Update player position
    if (view === 0) {
        if (keys.w) {
            playerPosX += playerDirX * moveSpeed;
            playerPosY += playerDirY * moveSpeed;
        }
        if (keys.s) {
            playerPosX -= playerDirX * moveSpeed;
            playerPosY -= playerDirY * moveSpeed;
        }
        if (keys.d) {
            playerPosX += playerDirY * moveSpeed;
            playerPosY -= playerDirX * moveSpeed;
        }
        if (keys.a) {
            playerPosX -= playerDirY * moveSpeed;
            playerPosY += playerDirX * moveSpeed;
        }
    }

    var mv = mat4();
    switch( view ) {
        case 0:
            // Player viewpoint
            mv = lookAt(
                vec3(playerPosX, playerPosY, 5+height),
                vec3(playerPosX + playerDirX, playerPosY + playerDirY, 5+height + playerDirZ),
                vec3(0.0, 0.0, 1.0)
            );
            drawScenery( mv );
            drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
            drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
            break;
        case 1:
            // Distant and stationary viewpoint
	    mv = lookAt( vec3(250.0, 0.0, 100.0+height), vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 1.0) );
	    drawScenery( mv );
	    drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 2:
	    // Static viewpoint inside the track; camera follows car
	    mv = lookAt( vec3(75.0, 0.0, 5.0+height), vec3(carXPos, carYPos, 0.0), vec3(0.0, 0.0, 1.0 ) );
	    drawScenery( mv );
	    drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 3:
	    // Static viewpoint outside the track; camera follows car
	    mv = lookAt( vec3(125.0, 0.0, 5.0+height), vec3(carXPos, carYPos, 0.0), vec3(0.0, 0.0, 1.0 ) );
	    drawScenery( mv );
	    drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 4:
	    // Driver's point of view.
	    mv = lookAt( vec3(-3.0, 0.0, 5.0+height), vec3(12.0, 0.0, 2.0+height), vec3(0.0, 0.0, 1.0 ) );
	    mv = mult( mv, rotateZ( carDirection ) );
	    mv = mult( mv, translate(-carXPos, -carYPos, 0.0) );
	    drawScenery( mv );
        drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 5:
	    // Drive around while looking at a house at (40, 120)
	    mv = rotateY( -carDirection );
	    mv = mult( mv, lookAt( vec3(3.0, 0.0, 5.0+height), vec3(40.0-carXPos, 120.0-carYPos, 0.0), vec3(0.0, 0.0, 1.0 ) ) );
	    mv = mult( mv, rotateZ( carDirection ) );
	    mv = mult( mv, translate(-carXPos, -carYPos, 0.0) );
	    drawScenery( mv );
        drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 6:
	    // Behind and above the car
	    mv = lookAt( vec3(-12.0, 0.0, 6.0+height), vec3(15.0, 0.0, 4.0), vec3(0.0, 0.0, 1.0 ) );
	    mv = mult( mv, rotateZ( carDirection ) );
	    mv = mult( mv, translate(-carXPos, -carYPos, 0.0) );
	    drawScenery( mv );
        drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 7:
	    // View backwards looking from another car
	    mv = lookAt( vec3(25.0, 5.0, 5.0+height), vec3(0.0, 0.0, 2.0), vec3(0.0, 0.0, 1.0 ) );
	    mv = mult( mv, rotateZ( carDirection ) );
	    mv = mult( mv, translate(-carXPos, -carYPos, 0.0) );
	    drawScenery( mv );
        drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	case 8:
	    // View from beside the car
	    mv = lookAt( vec3(2.0, 20.0, 5.0+height), vec3(2.0, 0.0, 2.0), vec3(0.0, 0.0, 1.0 ) );
	    mv = mult( mv, rotateZ( carDirection ) );
	    mv = mult( mv, translate(-carXPos, -carYPos, 0.0) );
	    drawScenery( mv );
        drawCar( carXPos, carYPos, -carDirection, BLUE, mv );
        drawCar( car2XPos, car2YPos, -car2Direction, RED, mv );
	    break;
	    
    }
    
    
    requestAnimFrame( render );
}
