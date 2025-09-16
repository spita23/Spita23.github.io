////////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Hnútalitarinn notar "uniform" tímabreytu til að færa y-hnit
//     hnútanna á reglulegan hátt.  Einnig hægt að breyta lit með
//     músarsmelli.
//
//    Hjálmtýr Hafsteinsson, september 2025
////////////////////////////////////////////////////////////////////
var gl;
var points;

var color = vec4( 1.0, 0.0, 0.0, 1.0 );
var locColor;
var locTime;
var iniTime;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    
    // Three Vertices
    
    var vertices = [ vec2( -0.5, -0.5 ), vec2( 0.0, 0.5 ), vec2( 0.5, -0.5 ) ];

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    
    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    var bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    locColor = gl.getUniformLocation( program, "rcolor" );
    gl.uniform4fv( locColor, flatten(color) );
    
    locTime = gl.getUniformLocation( program, "time" );

    iniTime = Date.now();
    
    canvas.addEventListener("mousedown", function(e){
        var col = vec4( Math.random(), Math.random(), Math.random(), 1.0 );
        gl.uniform4fv( locColor, flatten(col) );
    } );

    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    var msek = Date.now() - iniTime;
    gl.uniform1f( locTime, msek );
    
    gl.drawArrays( gl.TRIANGLES, 0, 3 );
    
    window.requestAnimFrame(render);
}
