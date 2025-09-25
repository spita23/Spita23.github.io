var canvas;
var gl;

var numVertices  = 36;

var points = [];
var colors = [];

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var theta_left = 45.0;
var theta_right = 0.0;
var dir_left = -1;
var dir_right = 0;
var angular_speed = 90.0; // gráður á sekúndu

var prevTime = 0;

var matrixLoc;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    colorCube();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    matrixLoc = gl.getUniformLocation( program, "transform" );

    //event listeners for mouse
    canvas.addEventListener("mousedown", function(e){
        movement = true;
        origX = e.offsetX;
        origY = e.offsetY;
        e.preventDefault();         // Disable drag and drop
    } );

    canvas.addEventListener("mouseup", function(e){
        movement = false;
    } );

    canvas.addEventListener("mousemove", function(e){
        if(movement) {
    	    spinY = ( spinY + (origX - e.offsetX) ) % 360;
            spinX = ( spinX + (origY - e.offsetY) ) % 360;
            origX = e.offsetX;
            origY = e.offsetY;
        }
    } );
    
    render();
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d) 
{
    var vertices = [
        vec3( -0.5, -0.5,  0.5 ),
        vec3( -0.5,  0.5,  0.5 ),
        vec3(  0.5,  0.5,  0.5 ),
        vec3(  0.5, -0.5,  0.5 ),
        vec3( -0.5, -0.5, -0.5 ),
        vec3( -0.5,  0.5, -0.5 ),
        vec3(  0.5,  0.5, -0.5 ),
        vec3(  0.5, -0.5, -0.5 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];

    //vertex color assigned by the index of the vertex
    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        colors.push(vertexColors[a]);
        
    }
}


function render()
{
    var currentTime = new Date().getTime();
    var dt = 0;
    if (prevTime != 0) {
        dt = (currentTime - prevTime) / 1000.0;
    }
    prevTime = currentTime;

    // Uppfæra hornin
    theta_left += dir_left * angular_speed * dt;
    theta_right += dir_right * angular_speed * dt;

    // Athuga mörk fyrir vinstri
    if (dir_left > 0 && theta_left >= 45) {
        theta_left = 45;
        dir_left = -1;
    } else if (dir_left < 0 && theta_left <= 0) {
        theta_left = 0;
        dir_right = 1;
        dir_left = 0;
    }

    // Athuga mörk fyrir hægri
    if (dir_right > 0 && theta_right >= 45) {
        theta_right = 45;
        dir_right = -1;
    } else if (dir_right < 0 && theta_right <= 0) {
        theta_right = 0;
        dir_left = 1;
        dir_right = 0;
    }

    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var mv = mat4();
    mv = mult( mv, rotateX(spinX) );
    mv = mult( mv, rotateY(spinY) ) ;

    // Vinstra band
    var pivot_left = vec3(-0.10, 0.5, 0.0);
    var mv1 = mv;
    mv1 = mult(mv1, translate(pivot_left[0], pivot_left[1], pivot_left[2]));
    mv1 = mult(mv1, rotateZ(-theta_left));
    mv1 = mult(mv1, translate(0.0, -0.5, 0.0));
    mv1 = mult(mv1, scalem(0.05, 1.0, 0.05));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Vinstri teningur
    mv1 = mv;
    mv1 = mult(mv1, translate(pivot_left[0], pivot_left[1], pivot_left[2]));
    mv1 = mult(mv1, rotateZ(-theta_left));
    mv1 = mult(mv1, translate(0.0, -1.1, 0.0));
    mv1 = mult(mv1, scalem(0.2, 0.2, 0.2));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Hægra band
    var pivot_right = vec3(0.10, 0.5, 0.0);
    mv1 = mv;
    mv1 = mult(mv1, translate(pivot_right[0], pivot_right[1], pivot_right[2]));
    mv1 = mult(mv1, rotateZ(theta_right));
    mv1 = mult(mv1, translate(0.0, -0.5, 0.0));
    mv1 = mult(mv1, scalem(0.05, 1.0, 0.05));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Hægri teningur
    mv1 = mv;
    mv1 = mult(mv1, translate(pivot_right[0], pivot_right[1], pivot_right[2]));
    mv1 = mult(mv1, rotateZ(theta_right));
    mv1 = mult(mv1, translate(0.0, -1.1, 0.0));
    mv1 = mult(mv1, scalem(0.2, 0.2, 0.2));
    gl.uniformMatrix4fv(matrixLoc, false, flatten(mv1));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    requestAnimFrame( render );
}