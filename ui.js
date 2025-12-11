// Update UI
function updateUI() {
    const btnMold = document.getElementById('btn-mold');
    const btnFood = document.getElementById('btn-food');
    const btnRun = document.getElementById('btn-run');
    const stats = document.getElementById('stats');
    
    if (mode === 'mold') {
        btnMold.classList.add('active-mode');
        btnFood.classList.remove('active-mode');
    } else {
        btnFood.classList.add('active-mode');
        btnMold.classList.remove('active-mode');
    }
    
    if (running) {
        btnRun.textContent = '⏸️ Pause';
        btnRun.classList.add('running');
    } else {
        btnRun.textContent = '▶️ Run';
        btnRun.classList.remove('running');
    }
    
    stats.textContent = `Agents: ${agents.length} | Food: ${foodPieces.length} | Sources: ${moldSources.length}`;
}

// Interaction - canvas click
canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (!isInCircle(x, y)) return; // Outside the plate

    if (mode === 'mold') {
        // Place mold source - starts as a small yellow fuzzy patch
        moldSources.push({x, y, radius: 18});
        
        // Spawn agents densely - they will form a sheet-like expansion
        // Initially expand radially in all directions (not targeting specific oats)
        for(let i = 0; i < NUM_AGENTS_PER_SOURCE; i++) {
            const angle = (i / NUM_AGENTS_PER_SOURCE) * Math.PI * 2; // Evenly distributed angles
            const radius = Math.random() * 15; // Start clustered
            const agentX = x + Math.cos(angle) * radius;
            const agentY = y + Math.sin(angle) * radius;
            agents.push(new Agent(agentX, agentY, angle)); // Agents radiate outward
        }
        
        // Create initial compact yellow mass
        for(let dy = -18; dy <= 18; dy++) {
            for(let dx = -18; dx <= 18; dx++) {
                const dist = Math.sqrt(dx*dx + dy*dy);
                if(dist <= 18) {
                    const idx = getIdx(x + dx, y + dy);
                    if(idx >= 0) {
                        // Lower initial intensity to encourage spreading
                        const intensity = 1 - (dist / 18) * 0.5;
                        trailMap[idx] = Math.max(trailMap[idx], 120 + intensity * 80);
                    }
                }
            }
        }
    } else {
        // Place food source (oat flake)
        const foodRadius = 12;
        foodPieces.push({x, y, radius: foodRadius});
        
        // Create chemical gradient from the oat
        // The slime mold senses these chemicals and grows toward them
        const gradientRadius = 40; // Chemical diffusion area
        for(let dy = -gradientRadius; dy <= gradientRadius; dy++) {
            for(let dx = -gradientRadius; dx <= gradientRadius; dx++) {
                const dist = Math.sqrt(dx*dx + dy*dy);
                if(dist <= gradientRadius) {
                    const idx = getIdx(x + dx, y + dy);
                    if(idx >= 0) {
                        // Strong gradient near food, weaker farther away
                        let strength;
                        if(dist <= foodRadius) {
                            strength = 255; // Oat itself
                        } else {
                            // Chemical gradient (exponential decay)
                            strength = 150 * Math.exp(-dist / 15);
                        }
                        foodMap[idx] = Math.max(foodMap[idx], strength);
                    }
                }
            }
        }
    }
    
    updateUI();
    if (!running) drawStaticScene();
});

// Button handlers
document.getElementById('btn-mold').onclick = () => { 
    mode = 'mold'; 
    updateUI();
};

document.getElementById('btn-food').onclick = () => { 
    mode = 'food'; 
    updateUI();
};

document.getElementById('btn-run').onclick = () => {
    running = !running;
    updateUI();
    if (running && !animationId) {
        loop();
    }
};

document.getElementById('btn-auto-setup').onclick = () => {
    // Clear existing setup
    agents = [];
    foodPieces = [];
    moldSources = [];
    trailMap.fill(0);
    foodMap.fill(0);
    
    // Place mold in center
    const centerX = width / 2;
    const centerY = height / 2;
    
    moldSources.push({x: centerX, y: centerY, radius: 18});
    
    // Spawn agents
    for(let i = 0; i < NUM_AGENTS_PER_SOURCE; i++) {
        const angle = (i / NUM_AGENTS_PER_SOURCE) * Math.PI * 2;
        const radius = Math.random() * 15;
        const agentX = centerX + Math.cos(angle) * radius;
        const agentY = centerY + Math.sin(angle) * radius;
        agents.push(new Agent(agentX, agentY, angle));
    }
    
    // Create initial mold mass
    for(let dy = -18; dy <= 18; dy++) {
        for(let dx = -18; dx <= 18; dx++) {
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist <= 18) {
                const idx = getIdx(centerX + dx, centerY + dy);
                if(idx >= 0) {
                    const intensity = 1 - (dist / 18) * 0.6;
                    trailMap[idx] = Math.max(trailMap[idx], 150 + intensity * 70);
                }
            }
        }
    }
    
    // Place food randomly around the plate
    const numFood = parseInt(document.getElementById('foodCount').value);
    const plateRadius = width / 2 - 40; // Keep food away from edges
    const minDistBetweenFood = 60; // Minimum distance between food pieces
    const minDistFromCenter = 80; // Keep food away from center mold
    
    let attempts = 0;
    const maxAttempts = 1000;
    
    while(foodPieces.length < numFood && attempts < maxAttempts) {
        attempts++;
        
        // Random angle and distance
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistFromCenter + Math.random() * (plateRadius - minDistFromCenter);
        
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        // Check if position is valid (not too close to other food)
        let validPosition = true;
        for(let food of foodPieces) {
            const dx = x - food.x;
            const dy = y - food.y;
            if(Math.sqrt(dx*dx + dy*dy) < minDistBetweenFood) {
                validPosition = false;
                break;
            }
        }
        
        if(validPosition && isInCircle(x, y)) {
            const foodRadius = 12;
            foodPieces.push({x, y, radius: foodRadius});
            
            // Create chemical gradient
            const gradientRadius = 40;
            for(let dy = -gradientRadius; dy <= gradientRadius; dy++) {
                for(let dx = -gradientRadius; dx <= gradientRadius; dx++) {
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if(dist <= gradientRadius) {
                        const idx = getIdx(x + dx, y + dy);
                        if(idx >= 0) {
                            let strength;
                            if(dist <= foodRadius) {
                                strength = 255;
                            } else {
                                strength = 150 * Math.exp(-dist / 15);
                            }
                            foodMap[idx] = Math.max(foodMap[idx], strength);
                        }
                    }
                }
            }
        }
    }
    
    updateUI();
    drawStaticScene();
};

window.clearSim = () => { 
    agents = [];
    foodPieces = [];
    moldSources = [];
    trailMap.fill(0);
    foodMap.fill(0);
    simulationSteps = 0;
    running = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    updateUI();
    drawStaticScene();
};

// Initialize
updateUI();
drawStaticScene();

// Reset parameters to defaults
function resetParameters() {
    // Reset config values
    NUM_AGENTS_PER_SOURCE = DEFAULT_NUM_AGENTS;
    STEP_SIZE = DEFAULT_STEP_SIZE;
    SENSOR_DIST = DEFAULT_SENSOR_DIST;
    DEPOSIT_AMOUNT = DEFAULT_DEPOSIT_AMOUNT;
    DECAY_SPEED = DEFAULT_DECAY_SPEED;
    FOOD_ATTRACTION = DEFAULT_FOOD_ATTRACTION;
    
    // Reset sliders
    document.getElementById('agentCount').value = DEFAULT_NUM_AGENTS;
    document.getElementById('agentCountValue').textContent = DEFAULT_NUM_AGENTS.toString();
    
    document.getElementById('stepSize').value = DEFAULT_STEP_SIZE;
    document.getElementById('stepSizeValue').textContent = DEFAULT_STEP_SIZE.toFixed(1);
    
    document.getElementById('sensorDist').value = DEFAULT_SENSOR_DIST;
    document.getElementById('sensorDistValue').textContent = DEFAULT_SENSOR_DIST.toString();
    
    document.getElementById('depositAmount').value = DEFAULT_DEPOSIT_AMOUNT;
    document.getElementById('depositAmountValue').textContent = DEFAULT_DEPOSIT_AMOUNT.toString();
    
    document.getElementById('decaySpeed').value = DEFAULT_DECAY_SPEED;
    document.getElementById('decaySpeedValue').textContent = DEFAULT_DECAY_SPEED.toString();
    
    document.getElementById('foodAttraction').value = DEFAULT_FOOD_ATTRACTION;
    document.getElementById('foodAttractionValue').textContent = DEFAULT_FOOD_ATTRACTION.toFixed(1);
}

// Slider event listeners
document.getElementById('agentCount').addEventListener('input', (e) => {
    NUM_AGENTS_PER_SOURCE = parseInt(e.target.value);
    document.getElementById('agentCountValue').textContent = NUM_AGENTS_PER_SOURCE;
});

document.getElementById('stepSize').addEventListener('input', (e) => {
    STEP_SIZE = parseFloat(e.target.value);
    document.getElementById('stepSizeValue').textContent = STEP_SIZE.toFixed(1);
});

document.getElementById('sensorDist').addEventListener('input', (e) => {
    SENSOR_DIST = parseInt(e.target.value);
    document.getElementById('sensorDistValue').textContent = SENSOR_DIST;
});

document.getElementById('depositAmount').addEventListener('input', (e) => {
    DEPOSIT_AMOUNT = parseInt(e.target.value);
    document.getElementById('depositAmountValue').textContent = DEPOSIT_AMOUNT;
});

document.getElementById('decaySpeed').addEventListener('input', (e) => {
    DECAY_SPEED = parseInt(e.target.value);
    document.getElementById('decaySpeedValue').textContent = DECAY_SPEED;
});

document.getElementById('foodAttraction').addEventListener('input', (e) => {
    FOOD_ATTRACTION = parseFloat(e.target.value);
    document.getElementById('foodAttractionValue').textContent = FOOD_ATTRACTION.toFixed(1);
});

document.getElementById('foodCount').addEventListener('input', (e) => {
    document.getElementById('foodCountValue').textContent = e.target.value;
});
