var canvas;
var gl;

// Þarf hámarksfjölda punkta til að taka frá pláss í grafíkminni
var maxNumPoints = 200;  
var index = 0;

window.onload = function init() {

    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.95, 1.0, 1.0, 1.0 );

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*maxNumPoints, gl.DYNAMIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    
    canvas.addEventListener("mousedown", function(e){

        gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        
        //center of triangle
        var cx = 2*e.offsetX/canvas.width-1;
        var cy = 2*(canvas.height-e.offsetY)/canvas.height-1;
        // triangle size
        var size = 0.1;

        // Calculate vertices of new triangle
        for (var i = 0; i < 3; i++) {
            var angle = Math.PI/2 + i * 2 * Math.PI / 3; // start at 90°
            var x = cx + size * Math.cos(angle);
            var y = cy + size * Math.sin(angle);
            var t = vec2(x, y);
            // Add new point behind the others
            gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index + i), flatten(t));
        }
index += 3;        
    });

    render();
}


function render() {
    
    gl.clear( gl.COLOR_BUFFER_BIT );
    gl.drawArrays( gl.TRIANGLES, 0, index );

    window.requestAnimFrame(render);
}