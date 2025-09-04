// WebGL Setup Functions
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initWebGL(gl) {
    // handles position
    const vertexShaderSource = `
        attribute vec2 aPosition;
        void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `;

    // handles color
    const fragmentShaderSource = `
        precision mediump float;
        uniform vec4 uColor;
        void main() {
            gl_FragColor = uColor;
        }
    `;

    // creates and compiles shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Error linking program:', gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);

    // get attribute and uniform locations
    const aPositionLocation = gl.getAttribLocation(program, 'aPosition');
    const uColorLocation = gl.getUniformLocation(program, 'uColor');

    // draw rectangle
    function drawRect(x, y, width, height, color) {
        const vertices = new Float32Array([
            x, y,                   // bottom-left
            x + width, y,           // bottom-right
            x, y + height,          // top-left   
            x + width, y + height   // top-right
        ]);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPositionLocation);
        gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(uColorLocation, color);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // draw triangle
    function drawTriangle(vertices, color) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(aPositionLocation);
        gl.vertexAttribPointer(aPositionLocation, 2, gl.FLOAT, false, 0, 0);
        gl.uniform4fv(uColorLocation, color);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Game state
    const stripHeight = 2.0 / 5;
    const borderHeight = 0.01;
    const totalStrips = 7; // 5 roads + 2 edges
    const totalBorders = 6; // borders between roads and edges
    const canvasHeight = 2.0; // from -1.0 to 1.0 in clip space
    const adjustedStripHeight = (canvasHeight - (totalBorders * borderHeight)) / totalStrips;
    const roadColor = [0.0, 0.0, 0.0, 1.0]; // black for roads
    const edgeColor = [0.5, 0.5, 0.5, 1.0]; // gray for edges
    const borderColor = [1.0, 1.0, 1.0, 1.0]; // white for borders
    const frogSize = 0.1;
    let frogX = 0.0;
    let frogY = -0.9; // start at bottom edge
    let facingUp = true;
    let score = 0;
    const tolerance = 0.05; // tolerance for edge detection, used for auto turning and score
    let gameActive = true;

    // Car data
    const carWidth = 0.3;
    const carSpeed = 0.005; // change speed to adjust difficulty
    const stripCenters = Array.from({ length: totalStrips }, (_, i) => 
        -1.0 + (adjustedStripHeight / 2) + i * (adjustedStripHeight + borderHeight));
    // Cars on the 3 road strips (index 1, 3, 5)
    const cars = [
        { x: 0.0, y: stripCenters[1], speed: -carSpeed + 0.004}, // bottom road, left slow
        { x: -1.0, y: stripCenters[1], speed: -carSpeed + 0.004 },  // bottom road, left slow
        { x: -1.0, y: stripCenters[2], speed: carSpeed +0.002},  // second road, right
        { x: 1.0, y: stripCenters[3], speed: -carSpeed -0.001 },  // third road, left
        { x: 0.3, y: stripCenters[4], speed: carSpeed -0.002 },  // fourth road, right
        { x: -0.5, y: stripCenters[5], speed: -carSpeed }   // top road, left

    ];
    const carColor = [1.0, 0.0, 0.0, 1.0]; // red for cars

    function updateScore() {
        document.getElementById('score').textContent = `Score: ${score}`;
    }

    function updatePosition() {
        document.getElementById('position').textContent = `Position: (x: ${frogX.toFixed(2)}, y: ${frogY.toFixed(2)})`;
    }

    function gameOver() {
        document.getElementById('score').style.display = 'none';
        document.getElementById('position').style.display = 'none';
        document.getElementById('finalScore').textContent = score;
        document.getElementById('gameOver').style.display = 'block';
        gameActive = false;
        cancelAnimationFrame(animationFrameId); // Stop the game loop
    }

    // Collision detection
    function checkCollisions() {
        const frogLeft = frogX - frogSize;
        const frogRight = frogX + frogSize;
        const frogBottom = frogY - (frogSize * 1.5) / 2; // Adjust for triangle height
        const frogTop = frogY + (frogSize * 1.5) / 2;

        for (const car of cars) {
            const carLeft = car.x;
            const carRight = car.x + carWidth;
            const carBottom = car.y - (adjustedStripHeight / 2);
            const carTop = car.y + (adjustedStripHeight / 2);

            if (frogRight > carLeft && frogLeft < carRight && frogTop > carBottom && frogBottom < carTop) {
                gameOver();
                return;
            }
        }
    }

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        const stepY = adjustedStripHeight; // jump size for up/down
        const stepX = 0.05; // smooth movement step for left/right
        if (event.key === 'ArrowUp' && frogY < 1.0 - (adjustedStripHeight / 2)) {
            frogY += stepY; // jump to next strip
        } else if (event.key === 'ArrowDown' && frogY > -1.0 + (adjustedStripHeight / 2)) {
            frogY -= stepY; // jump to previous strip
        } else if (event.key === 'ArrowLeft') {
            frogX -= stepX; // smooth left movement
        } else if (event.key === 'ArrowRight') {
            frogX += stepX; // smooth right movement
        }
        // clamp x to canvas bounds
        frogX = Math.max(-1.0, Math.min(1.0, frogX));
        // snap frogY to nearest strip boundary
        const stripCenters = Array.from({ length: totalStrips }, (_, i) => 
            -1.0 + (adjustedStripHeight / 2) + i * (adjustedStripHeight + borderHeight));
        frogY = stripCenters.reduce((closest, center) =>
            Math.abs(center - frogY) < Math.abs(closest - frogY) ? center : closest);
        updatePosition();
    });

    // Render function
    function render() {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Draw roads and edges 
        drawRect(-1.0, stripCenters[0] - (adjustedStripHeight / 2), 2.0, adjustedStripHeight, edgeColor); // bottom edge
        for (let i = 0; i < totalStrips - 1; i++) {
            if (i > 0) {
                drawRect(-1.0, (stripCenters[i-1] + stripCenters[i]) / 2, 2.0, borderHeight, borderColor); // border
            }
            if (i < totalStrips - 2) {
                drawRect(-1.0, stripCenters[i + 1] - (adjustedStripHeight / 2), 2.0, adjustedStripHeight, roadColor); // roads
            }
        }
        drawRect(-1.0, stripCenters[6] - (adjustedStripHeight / 2), 2.0, adjustedStripHeight, edgeColor); // top edge

        // Update and draw cars
        for (const car of cars) {
            car.x += car.speed;
            if (car.x + carWidth < -1.0) car.x = 1.0; // re-emerge from right if off left
            if (car.x > 1.0) car.x = -1.0; // re-emerge from left if off right
            drawRect(car.x, car.y - (adjustedStripHeight / 2), carWidth, adjustedStripHeight, carColor);
        }

        // Auto turn frog at edges 
        const bottomEdge = -1.0 + (adjustedStripHeight / 2);
        const topEdge = 1.0 - (adjustedStripHeight / 2);
        if (Math.abs(frogY - topEdge) <= tolerance && facingUp) { 
            facingUp = false; // turn around at top edge if right-side up
            score += 1;
            updateScore(); 
        } else if (Math.abs(frogY - bottomEdge) <= tolerance && !facingUp) { 
            facingUp = true; // turn around at bottom edge if bottom-side up
            score += 1;
            updateScore();
        }
        if (score >= 10) {
            gameOver();
            return; // exit render loop
        }

        // Check for collisions
        checkCollisions();

        // Draw frog with correct orientation if game is active
        if (gameActive) {
            const frogVertices = facingUp ? new Float32Array([
                frogX - frogSize, frogY,
                frogX + frogSize, frogY,
                frogX, frogY + (frogSize * 1.5)
            ]) : new Float32Array([
                frogX - frogSize, frogY + (frogSize * 1.5),
                frogX + frogSize, frogY + (frogSize * 1.5),
                frogX, frogY
            ]);
            const frogColor = [0.0, 1.0, 0.0, 1.0]; // green color for frog
            drawTriangle(frogVertices, frogColor);
        }

        updatePosition();
        requestAnimationFrame(render);
    }

    // Start the render loop
    const animationFrameId = requestAnimationFrame(render);
}

// Export for potential module use (optional, if using modules later)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initWebGL };
}