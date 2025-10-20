var canvas;
var gl;

var numVertices  = 36;

var points = [];
var normals = [];

var movement = false;     // Do we rotate?
var spinX = 0;
var spinY = 0;
var origX;
var origY;

var zDist = -3.0;

var fovy = 50.0;
var near = 0.2;
var far = 100.0;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4(0.7, 0.2, 0.2, 1.0);   // Darker red for ambient
var materialDiffuse = vec4(0.9, 0.3, 0.3, 1.0);   // Bright red for diffuse
var materialSpecular = vec4(1.0, 0.5, 0.5, 1.0);   // Reddish specular highlight
var materialShininess = 50.0;

var mv, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;

var normalMatrix, normalMatrixLoc;

var eye;
var at = vec3(0.0, 0.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    normalCube();

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    modelViewMatrixLoc = gl.getUniformLocation( program, "modelViewMatrix" );
    projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    gl.uniform4fv( gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct) );	
    gl.uniform4fv( gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, "shininess"), materialShininess );

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

    // Event listener for mousewheel
    window.addEventListener("wheel", function(e){
        if( e.deltaY > 0.0 ) {
            zDist += 0.2;
        } else {
            zDist -= 0.2;
        }
    }  );  
    
    render();
}

function normalCube()
{
    quad( 1, 0, 3, 2, 0 );
    quad( 2, 3, 7, 6, 1 );
    quad( 3, 0, 4, 7, 2 );
    quad( 6, 5, 1, 2, 3 );
    quad( 4, 5, 6, 7, 4 );
    quad( 5, 4, 0, 1, 5 );
}

function quad(a, b, c, d, n) 
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];

    var faceNormals = [
        vec4( 0.0, 0.0,  1.0, 0.0 ),  // front
        vec4(  1.0, 0.0, 0.0, 0.0 ),  // right
        vec4( 0.0, -1.0, 0.0, 0.0 ),  // down
        vec4( 0.0,  1.0, 0.0, 0.0 ),  // up
        vec4( 0.0, 0.0, -1.0, 0.0 ),  // back
        vec4( -1.0, 0.0, 0.0, 0.0 )   // left
    ];

    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        normals.push(faceNormals[n]);
        
    }
}


function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    projectionMatrix = perspective( fovy, 1.0, near, far );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    mv = lookAt( vec3(0.0, 0.0, zDist), at, up );
    mv = mult( mv, rotateX(spinX) );
    mv = mult( mv, rotateY(spinY) ) ;

    // Draw each part of the KALLAX
    // Left side
    var mv1 = mult( mv, translate( -0.45, 0.0, 0.0 ) );
    mv1 = mult( mv1, scalem( 0.1, 1.0, 0.2 ) );
    normalMatrix = [
        vec3(mv1[0][0], mv1[0][1], mv1[0][2]),
        vec3(mv1[1][0], mv1[1][1], mv1[1][2]),
        vec3(mv1[2][0], mv1[2][1], mv1[2][2])
    ];
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Right side
    mv1 = mult( mv, translate( 0.45, 0.0, 0.0 ) );
    mv1 = mult( mv1, scalem( 0.1, 1.0, 0.2 ) );
    normalMatrix = [
        vec3(mv1[0][0], mv1[0][1], mv1[0][2]),
        vec3(mv1[1][0], mv1[1][1], mv1[1][2]),
        vec3(mv1[2][0], mv1[2][1], mv1[2][2])
    ];
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Top
    mv1 = mult( mv, translate( 0.0, 0.45, 0.0 ) );
    mv1 = mult( mv1, scalem( 1.0, 0.1, 0.2 ) );
    normalMatrix = [
        vec3(mv1[0][0], mv1[0][1], mv1[0][2]),
        vec3(mv1[1][0], mv1[1][1], mv1[1][2]),
        vec3(mv1[2][0], mv1[2][1], mv1[2][2])
    ];
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Bottom
    mv1 = mult( mv, translate( 0.0, -0.45, 0.0 ) );
    mv1 = mult( mv1, scalem( 1.0, 0.1, 0.2 ) );
    normalMatrix = [
        vec3(mv1[0][0], mv1[0][1], mv1[0][2]),
        vec3(mv1[1][0], mv1[1][1], mv1[1][2]),
        vec3(mv1[2][0], mv1[2][1], mv1[2][2])
    ];
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Vertical divider
    mv1 = mult( mv, translate( 0.0, 0.0, 0.0 ) );
    mv1 = mult( mv1, scalem( 0.1, 0.8, 0.2 ) );
    normalMatrix = [
        vec3(mv1[0][0], mv1[0][1], mv1[0][2]),
        vec3(mv1[1][0], mv1[1][1], mv1[1][2]),
        vec3(mv1[2][0], mv1[2][1], mv1[2][2])
    ];
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    // Horizontal divider
    mv1 = mult( mv, translate( 0.0, 0.0, 0.0 ) );
    mv1 = mult( mv1, scalem( 0.8, 0.1, 0.2 ) );
    normalMatrix = [
        vec3(mv1[0][0], mv1[0][1], mv1[0][2]),
        vec3(mv1[1][0], mv1[1][1], mv1[1][2]),
        vec3(mv1[2][0], mv1[2][1], mv1[2][2])
    ];
    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(mv1));
    gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(normalMatrix));
    gl.drawArrays( gl.TRIANGLES, 0, numVertices );

    requestAnimFrame( render );
}