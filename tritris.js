// tritris.js

// Constants
const GRID_WIDTH = 6;
const GRID_DEPTH = 6;
const GRID_HEIGHT = 20;
const CUBE_SIZE = 1.0;
const FALL_SPEED = 0.5; // units per second

// WebGL variables
let gl, program;
let vPosition, vColor, uModelViewMatrix, uProjectionMatrix;
let grid = []; // 3D array: grid[y][x][z]
let currentPiece;
let score = 0;
let isGameOver = false;
let lastTime = 0;

// Camera and projection
let modelViewMatrix = mat4();
let projectionMatrix = perspective(75, 1.0, 0.1, 100.0);
let cameraPosition = vec3(10, 10, 10);
let cameraTarget = vec3(GRID_WIDTH / 2 - 0.5, GRID_HEIGHT / 2 - 0.5, GRID_DEPTH / 2 - 0.5);
let cameraUp = vec3(0, 1, 0);

// Mouse control for camera rotation
let isMouseDown = false;
let lastMouseX = 0, lastMouseY = 0;
let yaw = -Math.PI / 4, pitch = Math.PI / 4;

// Piece types
const pieceTypes = [
    // Straight triomino: along y-axis
    { positions: [[0,0,0], [0,1,0], [0,2,0]], color: vec4(1, 0, 0, 1) },
    // L-shaped triomino
    { positions: [[0,0,0], [0,1,0], [1,0,0]], color: vec4(0, 1, 0, 1) }
];

// Cube vertices and indices
const cubeVertices = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    // Back face
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5, -0.5,
    // Top face
    -0.5,  0.5, -0.5, -0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5,  0.5, -0.5,
    // Bottom face
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    // Right face
     0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5
]);

const cubeIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,        // front
    4, 5, 6, 4, 6, 7,        // back
    8, 9, 10, 8, 10, 11,     // top
    12, 13, 14, 12, 14, 15,  // bottom
    16, 17, 18, 16, 18, 19,  // right
    20, 21, 22, 20, 22, 23   // left
]);

// Shared cube vertex buffer
let cubeVertexBuffer = null;

function init() {
    // Initialize WebGL
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Initialize shaders
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    if (program === -1) {
        alert("Shader initialization failed");
        return;
    }
    gl.useProgram(program);

    // Get attribute and uniform locations
    vPosition = gl.getAttribLocation(program, 'vPosition');
    vColor = gl.getAttribLocation(program, 'vColor');
    uModelViewMatrix = gl.getUniformLocation(program, 'modelViewMatrix');
    uProjectionMatrix = gl.getUniformLocation(program, 'projectionMatrix');

    // Set projection matrix
    projectionMatrix = perspective(75, canvas.width / canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));

    // Update camera
    updateCamera();

    // Initialize grid
    for (let y = 0; y < GRID_HEIGHT; y++) {
        grid[y] = [];
        for (let x = 0; x < GRID_WIDTH; x++) {
            grid[y][x] = new Array(GRID_DEPTH).fill(false);
        }
    }

    // Create box
    createBox();

    // Create shared cube vertex buffer
    cubeVertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cubeVertices), gl.STATIC_DRAW);

    // Create cube index buffer
    window.cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, window.cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

    // Spawn first piece
    spawnPiece();

    // Event listeners
    document.addEventListener('keydown', onKeyDown);
    canvas.addEventListener('mousedown', e => {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    canvas.addEventListener('mouseup', () => isMouseDown = false);
    canvas.addEventListener('mousemove', e => {
        if (isMouseDown) {
            const dx = e.clientX - lastMouseX;
            const dy = e.clientY - lastMouseY;
            yaw -= dx * 0.002;
            pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - dy * 0.002));
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            updateCamera();
        }
    });
    window.addEventListener('resize', onWindowResize);

    // Start animation
    requestAnimationFrame(animate);
}

function createBox() {
    const vertices = [];
    const colors = [];
    const color = vec4(1, 1, 1, 0.2);
    const w = GRID_WIDTH * CUBE_SIZE, h = GRID_HEIGHT * CUBE_SIZE, d = GRID_DEPTH * CUBE_SIZE;

    // Bottom edges (y=0)
    vertices.push(...[0,0,0, w,0,0, w,0,0, w,0,d, w,0,d, 0,0,d, 0,0,d, 0,0,0]);
    // Top edges (y=h)
    vertices.push(...[0,h,0, w,h,0, w,h,0, w,h,d, w,h,d, 0,h,d, 0,h,d, 0,h,0]);
    // Vertical edges
    vertices.push(...[0,0,0, 0,h,0, w,0,0, w,h,0, w,0,d, w,h,d, 0,0,d, 0,h,d]);
    for (let i = 0; i < 24; i++) colors.push(...color);

    const vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    const cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    window.boxBuffers = { vBuffer, cBuffer, vertexCount: vertices.length / 3 };
}

function renderCube(position, color) {
    const modelView = mult(modelViewMatrix, translate(add(position, vec3(0.5, 0.5, 0.5))));
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelView));
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    const cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    const colors = [];
    for (let i = 0; i < 24; i++) colors.push(...color);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, window.cubeIndexBuffer);
    gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);
    gl.deleteBuffer(cBuffer);
}

class Piece {
    constructor(positions, color) {
        this.positions = positions.slice();
        this.color = color;
        this.position = vec3(Math.floor(GRID_WIDTH / 2), GRID_HEIGHT - 3, Math.floor(GRID_DEPTH / 2));
    }

    move(dx, dy, dz) {
        this.position = add(this.position, vec3(dx, dy, dz));
    }

    rotate(axis, direction) {
        const rad = direction * Math.PI / 2;
        let matrix;
        if (axis === 'x') matrix = rotateX(rad * 180 / Math.PI);
        else if (axis === 'y') matrix = rotateY(rad * 180 / Math.PI);
        else matrix = rotateZ(rad * 180 / Math.PI);
        this.positions = this.positions.map(pos => {
            const vec = mult(matrix, vec4(...pos, 1));
            return [Math.round(vec[0]), Math.round(vec[1]), Math.round(vec[2])];
        });
    }

    render() {
        this.positions.forEach(pos => {
            const cubePos = add(this.position, vec3(...pos));
            renderCube(cubePos, this.color);
        });
    }
}

function spawnPiece() {
    const typeIndex = Math.floor(Math.random() * pieceTypes.length);
    const type = pieceTypes[typeIndex];
    currentPiece = new Piece(type.positions, type.color);
    if (!isValidPosition(currentPiece)) {
        console.log("Spawn failed at position:", currentPiece.position, "with positions:", currentPiece.positions);
        isGameOver = true;
        alert('Game Over! Score: ' + score);
    }
}

function isValidPosition(piece) {
    return piece.positions.every(pos => {
        const x = Math.round(piece.position[0] + pos[0]);
        const y = Math.round(piece.position[1] + pos[1]);
        const z = Math.round(piece.position[2] + pos[2]);
        const valid = x >= 0 && x < GRID_WIDTH &&
                      y >= 0 && y < GRID_HEIGHT &&
                      z >= 0 && z < GRID_DEPTH &&
                      (!grid[y][x][z] || grid[y][x][z] === false);
        if (!valid) {
            console.log("Invalid position: x=", x, "y=", y, "z=", z);
        }
        return valid;
    });
}

function onKeyDown(event) {
    if (isGameOver) return;
    switch (event.key) {
        case 'ArrowLeft': tryMove(-1, 0, 0); break;
        case 'ArrowRight': tryMove(1, 0, 0); break;
        case 'ArrowUp': tryMove(0, 0, -1); break;
        case 'ArrowDown': tryMove(0, 0, 1); break;
        case 'a': tryRotate('x', 1); break;
        case 'z': tryRotate('x', -1); break;
        case 's': tryRotate('y', 1); break;
        case 'x': tryRotate('y', -1); break;
        case 'd': tryRotate('z', 1); break;
        case 'c': tryRotate('z', -1); break;
        case ' ': dropPiece(); break;
    }
}

function tryMove(dx, dy, dz) {
    const oldPosition = currentPiece.position.slice();
    currentPiece.move(dx, dy, dz);
    if (!isValidPosition(currentPiece)) {
        currentPiece.position = oldPosition;
    }
}

function tryRotate(axis, direction) {
    const oldPositions = currentPiece.positions.slice();
    currentPiece.rotate(axis, direction);
    if (!isValidPosition(currentPiece)) {
        currentPiece.positions = oldPositions;
    }
}

function dropPiece() {
    while (isValidPosition(currentPiece)) {
        currentPiece.move(0, -1, 0);
    }
    currentPiece.move(0, 1, 0);
    landPiece();
}

function landPiece() {
    currentPiece.positions.forEach(pos => {
        const x = Math.round(currentPiece.position[0] + pos[0]);
        const y = Math.round(currentPiece.position[1] + pos[1]);
        const z = Math.round(currentPiece.position[2] + pos[2]);
        const vBuffer = gl.createBuffer();
        const cBuffer = gl.createBuffer();
        const vertices = [];
        cubeVertices.forEach((v, i) => {
            vertices.push(v); // Use base cube vertices
        });
        const colors = [];
        for (let i = 0; i < 24; i++) colors.push(...currentPiece.color);
        gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);
        grid[y][x][z] = { vBuffer, cBuffer, color: currentPiece.color };
    });
    checkFullLayers();
    spawnPiece();
}

function checkFullLayers() {
    for (let y = 0; y < GRID_HEIGHT; y++) {
        let full = true;
        for (let x = 0; x < GRID_WIDTH; x++) {
            for (let z = 0; z < GRID_DEPTH; z++) {
                if (!grid[y][x][z]) {
                    full = false;
                    break;
                }
            }
            if (!full) break;
        }
        if (full) {
            removeLayer(y);
            score += GRID_WIDTH * GRID_DEPTH;
            document.getElementById('score').innerText = `Score: ${score}`;
            y--; // Re-check this layer
        }
    }
}

function removeLayer(layer) {
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let z = 0; z < GRID_DEPTH; z++) {
            if (grid[layer][x][z]) {
                gl.deleteBuffer(grid[layer][x][z].vBuffer);
                gl.deleteBuffer(grid[layer][x][z].cBuffer);
                grid[layer][x][z] = false;
            }
        }
    }
    for (let y = layer; y < GRID_HEIGHT - 1; y++) {
        for (let x = 0; x < GRID_WIDTH; x++) {
            for (let z = 0; z < GRID_DEPTH; z++) {
                grid[y][x][z] = grid[y + 1][x][z];
            }
        }
    }
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let z = 0; z < GRID_DEPTH; z++) {
            grid[GRID_HEIGHT - 1][x][z] = false;
        }
    }
}

function updateCamera() {
    const radius = 20;
    cameraPosition = add(cameraTarget, vec3(
        radius * Math.cos(pitch) * Math.sin(yaw),
        radius * Math.sin(pitch),
        radius * Math.cos(pitch) * Math.cos(yaw)
    ));
    modelViewMatrix = lookAt(cameraPosition, cameraTarget, cameraUp);
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Render box
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));
    gl.bindBuffer(gl.ARRAY_BUFFER, window.boxBuffers.vBuffer);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, window.boxBuffers.cBuffer);
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
    gl.drawArrays(gl.LINES, 0, window.boxBuffers.vertexCount);

    // Render grid cubes
    for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let z = 0; z < GRID_DEPTH; z++) {
            if (grid[y][x][z]) {
                const modelView = mult(modelViewMatrix, translate(add(vec3(x, y, z), vec3(0.5, 0.5, 0.5))));
                gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelView));
                gl.bindBuffer(gl.ARRAY_BUFFER, grid[y][x][z].vBuffer);
                gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(vPosition);
                gl.bindBuffer(gl.ARRAY_BUFFER, grid[y][x][z].cBuffer);
                gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(vColor);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, window.cubeIndexBuffer);
                gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);
            }
        }
    }
}

    // Render current piece
    if (currentPiece && !isGameOver) {
        currentPiece.render();
    }
}

function animate(time) {
    if (!lastTime) lastTime = time;
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    if (!isGameOver) {
        const fallDistance = FALL_SPEED * delta;
        currentPiece.move(0, -fallDistance, 0);
        if (!isValidPosition(currentPiece)) {
            currentPiece.move(0, fallDistance, 0);
            currentPiece.move(0, -1, 0);
            if (!isValidPosition(currentPiece)) {
                currentPiece.move(0, 1, 0);
                landPiece();
            }
        }
    }

    render();
    requestAnimationFrame(animate);
}

function onWindowResize() {
    const canvas = gl.canvas;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    projectionMatrix = perspective(75, canvas.width / canvas.height, 0.1, 100.0);
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
}

init();