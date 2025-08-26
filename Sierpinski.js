"use strict";

var canvas;
var gl;

var points = [];

var NumTimesToSubdivide = 3;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Initialize our data for the Sierpinski Gasket
    //

    // First, initialize the corners of our gasket with three points.

    var vertices = [
        vec2( -1, -1),
        vec2(  1, -1),
        vec2(  1, 1 ),
        vec2( -1, 1 )
    ];

    divideSquare( vertices[0], vertices[1], vertices[2], vertices[3],
                    NumTimesToSubdivide);

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
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    render();
};

function square( a, b, c, d )
{
    points.push( a, b, c );
    points.push( a, c, d );
}

function divideSquare(a, b, c, d, count) {
    if (count === 0) {
        square(a, b, c, d);
    } else {
        // Calculate the step for subdivision
        var stepX = (b[0] - a[0]) / 3;
        var stepY = (d[1] - a[1]) / 3;

        --count;
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                // Skip the center square
                if (i === 1 && j === 1) continue;

                // Calculate corners of the sub-square
                var x0 = a[0] + i * stepX;
                var y0 = a[1] + j * stepY;
                var x1 = x0 + stepX;
                var y1 = y0;
                var x2 = x1;
                var y2 = y0 + stepY;
                var x3 = x0;
                var y3 = y2;

                divideSquare(
                    vec2(x0, y0),
                    vec2(x1, y1),
                    vec2(x2, y2),
                    vec2(x3, y3),
                    count
                );
            }
        }
    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, points.length );
}
