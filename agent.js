// Agent Class - represents individual slime mold agents
// These create the exploratory "tentacles" that probe the environment
class Agent {
    constructor(x, y, angle = null) {
        this.x = x;
        this.y = y;
        this.angle = angle !== null ? angle : Math.random() * Math.PI * 2;
        this.fitness = 0; // RL fitness score
        this.lastFoodDistance = Infinity;
    }
    
    // RL: Calculate reward based on proximity to food sources
    calculateReward() {
        let minDistToFood = Infinity;
        let secondMinDistToFood = Infinity;
        let nearestFood = null;
        let secondNearestFood = null;
        
        // Find two nearest food sources
        for (let food of foodPieces) {
            const dist = Math.sqrt((this.x - food.x) ** 2 + (this.y - food.y) ** 2);
            if (dist < minDistToFood) {
                secondMinDistToFood = minDistToFood;
                secondNearestFood = nearestFood;
                minDistToFood = dist;
                nearestFood = food;
            } else if (dist < secondMinDistToFood) {
                secondMinDistToFood = dist;
                secondNearestFood = food;
            }
        }
        
        // Check trail strength at current position
        const idx = getIdx(this.x, this.y);
        const trailStrength = idx >= 0 ? trailMap[idx] : 0;
        
        // Convergence factor: stronger optimization over time
        const convergence = Math.min(simulationSteps / 3000, 1.0);
        
        // Calculate reward
        let reward = 0;
        
        // Positive reward for being near food (exponential decay)
        if (minDistToFood < 100) {
            reward += (100 - minDistToFood) / 10;
        }
        
        // Increasing reward for staying on established trails (convergence)
        if (trailStrength > 30) {
            reward += 5 + (convergence * 10); // Up to +15 bonus for mature trails
        } else if (trailStrength > 10) {
            reward += 2;
        }
        
        // Penalty for moving away from food
        if (minDistToFood > this.lastFoodDistance) {
            reward -= 2 + (convergence * 3); // Increasing penalty over time
        } else if (minDistToFood < this.lastFoodDistance) {
            reward += 3; // Bonus for moving toward food
        }
        
        // Strong penalty for being far from food (increases with convergence)
        if (minDistToFood > 150) {
            const penalty = (minDistToFood - 150) / 15;
            reward -= penalty * (1 + convergence * 2);
        }
        
        // Penalty for spanning unnecessarily long distances
        // If trying to connect two distant foods when closer ones exist
        if (secondNearestFood && minDistToFood > 80 && secondMinDistToFood < minDistToFood * 0.6) {
            reward -= 8 * convergence; // Penalize inefficient long connections
        }
        
        this.lastFoodDistance = minDistToFood;
        this.fitness += reward * 0.1; // Accumulate fitness over time
        
        return reward;
    }

    sense(offsetAngle) {
        const sensorAngle = this.angle + offsetAngle;
        const sensorX = this.x + Math.cos(sensorAngle) * SENSOR_DIST;
        const sensorY = this.y + Math.sin(sensorAngle) * SENSOR_DIST;
        
        // Sample trail and food in the sensor area
        let sum = 0;
        let count = 0;
        
        // Larger sampling area for better gradient detection
        for (let ox = -2; ox <= 2; ox++) {
            for (let oy = -2; oy <= 2; oy++) {
                const idx = getIdx(sensorX + ox, sensorY + oy);
                if (idx >= 0) {
                    // Convergence: increase trail following over time
                    const convergence = Math.min(simulationSteps / 3000, 1.0);
                    const baseTrailWeight = 0.3 + (convergence * 1.2); // 0.3 -> 1.5
                    const trailWeight = Math.min(trailMap[idx] * baseTrailWeight, 80);
                    sum += trailWeight + foodMap[idx] * FOOD_ATTRACTION;
                    count++;
                }
            }
        }
        return count > 0 ? sum / count : 0;
    }

    update() {
        // RL: Calculate reward before movement
        const rewardBefore = this.calculateReward();
        
        // SENSE in three directions (mimics the slime mold's ability to sense chemical gradients)
        const weightForward = this.sense(0);
        const weightLeft = this.sense(-SENSOR_ANGLE);
        const weightRight = this.sense(SENSOR_ANGLE);

        // Exploration randomness (the pulsing, exploratory nature)
        // RL: Reduce randomness if fitness is low (agent is lost)
        const explorationFactor = this.fitness > -10 ? 0.6 : 0.3;
        const randomSteer = (Math.random() - 0.5) * explorationFactor;

        // ROTATE based on sensory data
        // Initially more random (sheet expansion)
        // Then more directed (network formation)
        const totalSignal = weightForward + weightLeft + weightRight;
        
        // RL: If fitness is very negative, bias toward food sources
        if (this.fitness < -20) {
            // Lost agent - find nearest food and turn toward it
            let nearestFood = null;
            let minDist = Infinity;
            for (let food of foodPieces) {
                const dist = Math.sqrt((this.x - food.x) ** 2 + (this.y - food.y) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    nearestFood = food;
                }
            }
            if (nearestFood) {
                const targetAngle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
                this.angle += (targetAngle - this.angle) * 0.3; // Gradual turn toward food
            }
        } else if (totalSignal < 80) {
            // Low signal = exploratory phase, maximum outward expansion
            if (Math.random() < 0.6) {
                this.angle += (Math.random() - 0.5) * ROTATION_ANGLE * 4;
            }
        }
        
        if (weightForward > weightLeft && weightForward > weightRight) {
            // Good path ahead - keep going
            this.angle += randomSteer * 0.5;
        } else if (weightForward < weightLeft && weightForward < weightRight) {
            // Weak signal ahead - explore
            this.angle += (Math.random() < 0.5 ? -1 : 1) * ROTATION_ANGLE + randomSteer;
        } else if (weightRight > weightLeft) {
            // Stronger on right - turn right
            this.angle += ROTATION_ANGLE + randomSteer;
        } else if (weightLeft > weightRight) {
            // Stronger on left - turn left
            this.angle -= ROTATION_ANGLE + randomSteer;
        } else {
            // Equal - random exploration
            this.angle += randomSteer;
        }

        // MOVE forward (the cytoplasm streaming)
        let newX = this.x + Math.cos(this.angle) * STEP_SIZE;
        let newY = this.y + Math.sin(this.angle) * STEP_SIZE;

        // Boundary check - stay within the circular agar plate
        if (isInCircle(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Hit edge - turn back inward and move away from edge
            const dx = this.x - width/2;
            const dy = this.y - height/2;
            this.angle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 0.8;
            this.fitness -= 10; // RL: Strong penalty for hitting boundary
            
            // Move inward away from the boundary
            newX = this.x + Math.cos(this.angle) * STEP_SIZE;
            newY = this.y + Math.sin(this.angle) * STEP_SIZE;
            if (isInCircle(newX, newY)) {
                this.x = newX;
                this.y = newY;
            }
        }

        // RL: Calculate reward after movement and adjust behavior
        const rewardAfter = this.calculateReward();
        const rewardDelta = rewardAfter - rewardBefore;
        
        // RL: Adjust deposit amount based on fitness
        // Agents on good paths deposit more, lost agents deposit less
        let depositMultiplier = 1.0;
        if (this.fitness > 10) {
            depositMultiplier = 1.5; // Reward good paths with stronger trails
        } else if (this.fitness < -10) {
            depositMultiplier = 0.3; // Weak trails from lost agents
        }

        // DEPOSIT trail (marking the path for reinforcement)
        // Successful paths get reinforced by many agents passing through
        const idx = getIdx(this.x, this.y);
        if (idx >= 0) {
            const depositAmount = DEPOSIT_AMOUNT * depositMultiplier;
            trailMap[idx] = Math.min(trailMap[idx] + depositAmount, 255);
        }
    }
}
