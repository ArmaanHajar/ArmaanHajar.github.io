// Diffuse the trail map (creates smooth, vein-like structures)
// This simulates the pulsing/flowing nature of the cytoplasm
function diffuseTrails() {
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = y * width + x;
            
            // 3x3 blur kernel (cytoplasm flows and spreads)
            const sum = (
                trailMap[i] + 
                trailMap[i - 1] + trailMap[i + 1] +
                trailMap[i - width] + trailMap[i + width] +
                trailMap[i - width - 1] + trailMap[i - width + 1] +
                trailMap[i + width - 1] + trailMap[i + width + 1]
            );
            
            tempMap[i] = sum / 9;
        }
    }
    
    // Blend diffused map back with decay
    // Decay removes unsuccessful paths (pruning)
    // Reinforced paths stay strong because many agents travel them
    for (let i = 0; i < trailMap.length; i++) {
        trailMap[i] = tempMap[i] * DIFFUSE_RATE + trailMap[i] * (1 - DIFFUSE_RATE);
        
        // Apply decay - unsuccessful paths fade away
        // Paths to food get constantly reinforced so they persist
        // Convert decay speed (1-10) to decay factor (0.999-0.990)
        const decayFactor = 1 - (DECAY_SPEED * 0.001);
        trailMap[i] *= decayFactor;
        
        // Progressive pruning - weak trails disappear
        // Convergence: more aggressive pruning over time
        const convergence = Math.min(simulationSteps / 3000, 1.0);
        const pruningThreshold = 2 + (convergence * 8); // Weak paths need more reinforcement over time
        
        if (trailMap[i] < pruningThreshold) {
            const pruningRate = 0.97 - (convergence * 0.1); // More aggressive over time
            trailMap[i] *= pruningRate;
        }
        if (trailMap[i] < 0.3) {
            trailMap[i] = 0; // Complete removal
        }
    }
}

// Simulation Loop
function loop() {
    if (!running) {
        animationId = null;
        return;
    }
    
    simulationSteps++;
    
    // Update all agents
    agents.forEach(agent => agent.update());
    
    // Diffuse and decay trails
    diffuseTrails();

    // Render the scene
    render();

    animationId = requestAnimationFrame(loop);
}

// Render function
function render() {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    
    for (let i = 0; i < trailMap.length; i++) {
        const trailVal = trailMap[i];
        const foodVal = foodMap[i];
        const pxIndex = i * 4;
        
        // Render food sources (beige/cream like oat flakes)
        if (foodVal > 200) {
            // Oat color - cream/beige
            data[pxIndex] = 245;
            data[pxIndex + 1] = 235;
            data[pxIndex + 2] = 210;
            data[pxIndex + 3] = 255;
        }
        // Render slime mold network
        else if (trailVal > 2) {
            // Varying appearance based on trail strength:
            // - Weak values (2-40): translucent fan-shaped sheet
            // - Medium values (40-100): forming veins
            // - Strong values (100+): thick bright veins
            const intensity = Math.min(trailVal / 160, 1);
            
            // Create translucent sheet effect for early expansion
            // Then bright veins as network forms
            let brightness, alpha;
            if (trailVal < 40) {
                // Translucent sheet phase
                brightness = 0.4 + (trailVal / 40) * 0.3;
                alpha = 0.6;
            } else if (trailVal < 100) {
                // Vein formation phase
                brightness = 0.5 + ((trailVal - 40) / 60) * 0.4;
                alpha = 0.8;
            } else {
                // Mature thick veins
                brightness = Math.pow(Math.min(trailVal / 160, 1), 0.5);
                alpha = 1.0;
            }
            
            // Bright yellow color like real Physarum
            data[pxIndex] = Math.floor(255 * brightness);     // R
            data[pxIndex + 1] = Math.floor(250 * brightness); // G (yellow)
            data[pxIndex + 2] = Math.floor(50 * brightness);  // B (yellow, not green)
            data[pxIndex + 3] = Math.floor(255 * alpha);
        }
        // Dark agar background
        else {
            data[pxIndex] = 5;
            data[pxIndex + 1] = 5;
            data[pxIndex + 2] = 5;
            data[pxIndex + 3] = 255;
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
    
    // Draw glowing effect at food locations when wrapped by mold
    foodPieces.forEach(food => {
        // Check if mold has reached this food
        const idx = getIdx(food.x, food.y);
        if (idx >= 0 && trailMap[idx] > 50) {
            // Mold wrapping around the oat - create bright node
            const gradient = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, food.radius * 1.8);
            gradient.addColorStop(0, 'rgba(255, 255, 180, 0.95)');
            gradient.addColorStop(0.3, 'rgba(255, 250, 120, 0.7)');
            gradient.addColorStop(0.6, 'rgba(255, 245, 80, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 240, 50, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(food.x, food.y, food.radius * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    
    // Draw glowing nodes at mold sources (the central mass)
    moldSources.forEach(source => {
        const gradient = ctx.createRadialGradient(source.x, source.y, 0, source.x, source.y, source.radius * 1.3);
        gradient.addColorStop(0, 'rgba(255, 255, 150, 1)');
        gradient.addColorStop(0.4, 'rgba(255, 250, 100, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 240, 80, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 230, 60, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(source.x, source.y, source.radius * 1.3, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw static scene (when not running)
function drawStaticScene() {
    // Dark agar background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);
    
    // Draw mold sources - "small yellow fuzzy patch, like a droplet of bright mustard paint"
    moldSources.forEach(source => {
        // Fuzzy outer edge
        const gradient = ctx.createRadialGradient(source.x, source.y, 0, source.x, source.y, source.radius * 1.4);
        gradient.addColorStop(0, 'rgba(255, 255, 120, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 250, 100, 0.9)');
        gradient.addColorStop(0.8, 'rgba(255, 240, 80, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 230, 60, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(source.x, source.y, source.radius * 1.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Bright glossy core
        ctx.fillStyle = 'rgba(255, 255, 140, 1)';
        ctx.beginPath();
        ctx.arc(source.x, source.y, source.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw food pieces - "small beige islands"
    foodPieces.forEach(food => {
        // Oat flake appearance
        const gradient = ctx.createRadialGradient(food.x, food.y, 0, food.x, food.y, food.radius);
        gradient.addColorStop(0, 'rgba(250, 240, 220, 1)');
        gradient.addColorStop(0.7, 'rgba(240, 230, 205, 1)');
        gradient.addColorStop(1, 'rgba(220, 210, 185, 0.8)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add slight texture/irregularity to oats
        ctx.strokeStyle = 'rgba(200, 190, 170, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
    });
}
