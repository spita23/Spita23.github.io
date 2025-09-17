/////////////////////////////////////////////////////////////////
//    Sýnidæmi í Tölvugrafík
//     Ferningur (teningur) skoppar um gluggann og af spaða.
//     Notandi getur breytt hraða teningsins með upp/niður örvum
//     og hreyft spaðann með músinni.
//
//    Hjálmtýr Hafsteinsson, september 2025
/////////////////////////////////////////////////////////////////
var canvas;
var gl;

// Núverandi staðsetning miðju ferningsins
var box = vec2(0.0, 0.0);

// Gefa ferningnum slembistefnu í upphafi
var dX = Math.random()*0.02-0.01;
var dY = Math.random()*0.02-0.01;

// Svæðið er frá -maxX til maxX og -maxY til maxY
var maxX = 1.0;
var maxY = 1.0;

// Hálf breidd/hæð ferningsins
var boxRad = 0.05;

// Spaði
var paddleWidth = 0.2; 
var paddleHeight = 0.04; 
var paddleX = 0.0; 
var paddleY = -0.88; 

// Gögn fyrir tening og spaða
var vertices = [
    // Teningur
    vec2(-0.05, -0.05), 
    vec2(0.05, -0.05),  
    vec2(0.05, 0.05),   
    vec2(-0.05, 0.05),  
    // Spaði
    vec2(-0.1, -0.9),   
    vec2(-0.1, -0.86),  
    vec2(0.1, -0.86),   
    vec2(0.1, -0.9)     
];

var colors = [
    // Litir fyrir tening (rautt)
    vec4(1.0, 0.0, 0.0, 1.0), 
    vec4(1.0, 0.0, 0.0, 1.0), 
    vec4(1.0, 0.0, 0.0, 1.0), 
    vec4(1.0, 0.0, 0.0, 1.0), 
    // Litir fyrir spaða (blátt)
    vec4(0.0, 0.0, 1.0, 1.0), 
    vec4(0.0, 0.0, 1.0, 1.0), 
    vec4(0.0, 0.0, 1.0, 1.0), 
    vec4(0.0, 0.0, 1.0, 1.0)  
];

// Músarstýring
var mouseX;
var movement = false;

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);
    
    // Load vertex data
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.DYNAMIC_DRAW);
    
    // Associate out shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // Load color data
    var colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
    
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    locBox = gl.getUniformLocation(program, "boxPos");

    // Meðhöndlun örvalykla
    window.addEventListener("keydown", function(e) {
        switch (e.keyCode) {
            case 38: // Upp ör
                dX *= 1.1;
                dY *= 1.1;
                break;
            case 40: // Niður ör
                dX /= 1.1;
                dY /= 1.1;
                break;
        }
    });

    // Event listeners for mouse (paddle control)
    canvas.addEventListener("mousedown", function(e) {
        movement = true;
        mouseX = e.offsetX;
    });

    canvas.addEventListener("mouseup", function(e) {
        movement = false;
    });

    canvas.addEventListener("mousemove", function(e) {
        if (movement) {
            var xmove = 2 * (e.offsetX - mouseX) / canvas.width;
            mouseX = e.offsetX;
            // Update paddle vertices
            for (var i = 4; i < 8; i++) {
                vertices[i][0] += xmove;
            }
            // Ensure paddle stays within bounds
            paddleX += xmove;
            if (paddleX - paddleWidth / 2 < -maxX) {
                paddleX = -maxX + paddleWidth / 2;
                for (var i = 4; i < 8; i++) {
                    vertices[i][0] = vertices[i][0] - xmove + (-maxX + paddleWidth / 2 - paddleX);
                }
            }
            if (paddleX + paddleWidth / 2 > maxX) {
                paddleX = maxX - paddleWidth / 2;
                for (var i = 4; i < 8; i++) {
                    vertices[i][0] = vertices[i][0] - xmove + (maxX - paddleWidth / 2 - paddleX);
                }
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(vertices));
        }
    });

    render();
}

function render() {
    // Check for collision with paddle
    if (box[1] - boxRad <= paddleY + paddleHeight / 2 && // Ball's bottom edge hits paddle's top
        box[1] + boxRad >= paddleY - paddleHeight / 2 && // Ball's top edge is above paddle's bottom
        box[0] >= paddleX - paddleWidth / 2 &&           // Ball's x is within paddle's left edge
        box[0] <= paddleX + paddleWidth / 2 &&           // Ball's x is within paddle's right edge
        dY < 0) {                                        // Ball is moving downward
        dY = -dY; // Reverse y-direction
        
    }

    // Láta ferninginn skoppa af veggjunum
    if (Math.abs(box[0] + dX) > maxX - boxRad) dX = -dX;
    if (Math.abs(box[1] + dY) > maxY - boxRad) dY = -dY;

    // Uppfæra staðsetningu
    box[0] += dX;
    box[1] += dY;
    
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.uniform2fv(locBox, flatten(box));

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
    
    gl.drawArrays(gl.TRIANGLE_FAN, 4, 4);

    window.requestAnimFrame(render);
}