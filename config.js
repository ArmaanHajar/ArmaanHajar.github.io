// Config - tuned for realistic Physarum behavior
// Default values (used for reset)
const DEFAULT_NUM_AGENTS = 18000;
const DEFAULT_STEP_SIZE = 3.0;
const DEFAULT_SENSOR_DIST = 30;
const DEFAULT_DEPOSIT_AMOUNT = 6;
const DEFAULT_DECAY_SPEED = 5;
const DEFAULT_FOOD_ATTRACTION = 10.0;

let NUM_AGENTS_PER_SOURCE = DEFAULT_NUM_AGENTS; // Massive number of agents for full plate coverage
let SENSOR_ANGLE = 0.45; // Slightly narrower for more forward movement
let SENSOR_DIST = DEFAULT_SENSOR_DIST; // Very long sensing to find distant food
let ROTATION_ANGLE = 0.4;
let STEP_SIZE = DEFAULT_STEP_SIZE; // Very fast movement to reach entire plate
let DEPOSIT_AMOUNT = DEFAULT_DEPOSIT_AMOUNT; // Lower deposit to encourage more spreading
let DECAY_SPEED = DEFAULT_DECAY_SPEED; // Trail decay speed (1=slowest, 10=fastest)
let DIFFUSE_RATE = 0.7; // High diffusion for maximum spreading
let FOOD_ATTRACTION = DEFAULT_FOOD_ATTRACTION; // Very strong attraction to pull agents to distant food

// Canvas setup
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const width = canvas.width;
const height = canvas.height;

// State
let agents = [];
let trailMap = new Float32Array(width * height);
let tempMap = new Float32Array(width * height);
let foodMap = new Float32Array(width * height);
let foodPieces = [];
let moldSources = []; // Starting positions
let mode = 'mold';
let running = false;
let animationId = null;
let simulationSteps = 0; // Track convergence progress

// Helpers
const getIdx = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= width || iy < 0 || iy >= height) return -1;
    return iy * width + ix;
};

const isInCircle = (x, y) => {
    const dx = x - width/2;
    const dy = y - height/2;
    return dx*dx + dy*dy <= (width/2 - 10)**2;
};
