// Bacterial colony growth animation for petri dish - Pixel-based
(function() {
    'use strict';

    // Wait for DOM to be ready
    function init() {
        const dishElement = document.getElementById('home__dish');
        if (!dishElement) {
            console.log('Bacteria: home__dish element not found');
            return;
        }
        console.log('Bacteria: Starting animation on dish element', dishElement);

        // Create and append canvas
        const canvas = document.createElement('canvas');
        canvas.id = 'bacteria-canvas';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.borderRadius = '50%';
        dishElement.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let imageData, pixels, width, height, centerX, centerY, radius, scale;
        const referenceSize = 800; // All config values are relative to 800x800
        
        // Set canvas resolution
        function resizeCanvas() {
            const rect = dishElement.getBoundingClientRect();
            // Use width for both dimensions since dish is circular (aspect-ratio: 1)
            const size = rect.width;
            canvas.width = size;
            canvas.height = size;
            width = size;
            height = size;
            centerX = width / 2;
            centerY = height / 2;
            radius = width / 2;
            scale = width / referenceSize; // Calculate scale factor
            
            imageData = ctx.createImageData(width, height);
            pixels = imageData.data;
            console.log('Bacteria: Canvas sized to', canvas.width, 'x', canvas.height);
        }
        
        // Wait a moment for the dish to be fully laid out
        setTimeout(() => {
            resizeCanvas();
            startAnimation();
        }, 100);

        window.addEventListener('resize', () => {
            resizeCanvas();
            // Restart animation on resize
            colonies = [];
            activePixels = new Map();
            for (let i = 0; i < config.initialColonies; i++) {
                createRandomColony();
            }
        });

        // Color configuration - lerp from start to end
        // const startColor = { r: 0, g: 128, b: 128 };    // Dark teal (oldest)
        // const startColor = { r: 100, g: 255, b: 230 };    // Bright aquamarine (newest)
        // const endColor = { r: 100, g: 255, b: 230 };    // Bright aquamarine (newest)
        const startColor = { r: 119, g: 183, b: 176 };    // Bright aquamarine (newest)
        const endColor = { r: 181, g: 213, b: 210 };    // Bright aquamarine (newest)

        // Helper function to lerp between two colors
        function lerpColor(color1, color2, t) {
            return {
                r: Math.round(color1.r + (color2.r - color1.r) * t),
                g: Math.round(color1.g + (color2.g - color1.g) * t),
                b: Math.round(color1.b + (color2.b - color1.b) * t)
            };
        }

        // Configuration
        const config = {
            initialColonies: 1,
            minGrowthRate: 2, // min pixels to grow per frame
            maxGrowthRate: 5, // max pixels to grow per frame
            minMaxGenerations: 3, // minimum max generations for a colony
            maxMaxGenerations: 40, // maximum max generations for a colony
            minSpawnInterval: 3000, // min time between spawns (ms)
            maxSpawnInterval: 5000, // max time between spawns (ms)
            dotRadius: 3, // radius of each bacteria dot
            growthDistance: 4, // spacing between dots (in pixels)
        };

        // Colony tracking
        let colonies = [];
        let activePixels = new Map(); // Track occupied pixel coordinates with their colony and age
        let lastSpawnTime = Date.now();
        let nextSpawnInterval = config.minSpawnInterval + Math.random() * (config.maxSpawnInterval - config.minSpawnInterval);

        // Helper to check if pixel is within circular boundary
        function isInDish(x, y) {
            const dx = x - centerX;
            const dy = y - centerY;
            return (dx * dx + dy * dy) < (radius * radius);
        }

        // Snap position to grid based on growthDistance
        function snapToGrid(x, y) {
            const gridSize = config.growthDistance * scale;
            return {
                x: Math.round(x / gridSize) * gridSize,
                y: Math.round(y / gridSize) * gridSize
            };
        }

        // Helper to get pixel index
        function getPixelIndex(x, y) {
            return (Math.floor(y) * width + Math.floor(x)) * 4;
        }

        // Helper to add pixel to tracking (doesn't draw)
        // Returns true if added, false if blocked by younger or same-age dot
        function addPixel(x, y, generation, colony) {
            // Snap to grid
            const gridPos = snapToGrid(x, y);
            x = gridPos.x;
            y = gridPos.y;
            
            if (!isInDish(x, y) || x < 0 || x >= width || y < 0 || y >= height) return { success: false };
            
            const key = `${Math.floor(x)},${Math.floor(y)}`;
            const existing = activePixels.get(key);
            
            // If position is occupied, check if we can replace with younger dot
            if (existing) {
                if (generation >= existing.generation) {
                    return { success: false }; // Existing dot is younger or same generation
                }
                // Remove old pixel from its colony
                const oldColony = existing.colony;
                oldColony.pixels = oldColony.pixels.filter(p => 
                    Math.floor(p.x) !== Math.floor(x) || Math.floor(p.y) !== Math.floor(y)
                );
            }
            
            // Add new pixel
            activePixels.set(key, { generation, colony, x, y });
            return { success: true, x, y };
        }

        // Helper to draw a single pixel with generation and opacity
        function drawPixel(x, y, generation, maxGenerations) {
            const t = Math.max(0, Math.min(generation / maxGenerations, 1)); // normalize generation to 0-1
            const color = lerpColor(startColor, endColor, t);
            
            // Calculate opacity - surrounded dots are opaque, edge dots are transparent
            const opacity = isSurrounded(x, y) ? 1.0 : 0.3;
            
            // Draw a circle for each dot
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, config.dotRadius * scale, 0, Math.PI * 2);
            ctx.fill();
        }

        // Check if pixel is occupied
        function isOccupied(x, y) {
            const gridPos = snapToGrid(x, y);
            const key = `${Math.floor(gridPos.x)},${Math.floor(gridPos.y)}`;
            return activePixels.has(key);
        }

        // Check if a pixel is surrounded by neighbors (for opacity calculation)
        function isSurrounded(x, y) {
            const spacing = config.growthDistance * scale;
            const directions = [
                [spacing, 0], [-spacing, 0], [0, spacing], [0, -spacing],
                [spacing, spacing], [-spacing, -spacing], [spacing, -spacing], [-spacing, spacing]
            ];
            
            // Check if all adjacent positions are occupied
            let surroundedCount = 0;
            for (const [dx, dy] of directions) {
                if (isOccupied(x + dx, y + dy)) {
                    surroundedCount++;
                }
            }
            
            // Consider surrounded if at least 6 out of 8 neighbors exist
            return surroundedCount >= 6;
        }

        // Colony class - now grows pixel by pixel
        class Colony {
            constructor(x, y) {
                // Snap starting position to grid
                const gridPos = snapToGrid(x, y);
                x = gridPos.x;
                y = gridPos.y;
                
                this.centerX = x; // Store colony center for circular bias
                this.centerY = y;
                this.pixels = [{ x, y, generation: 0 }];
                this.growthFront = [{ x, y, generation: 0 }]; // Pixels that can expand
                this.isGrowing = true;
                this.maxGenerations = config.minMaxGenerations + Math.random() * (config.maxMaxGenerations - config.minMaxGenerations);
                this.growthRate = config.minGrowthRate + Math.random() * (config.maxGrowthRate - config.minGrowthRate);
                
                // Add initial pixel to tracking
                addPixel(x, y, 0, this);
            }

            grow() {
                if (!this.isGrowing || this.growthFront.length === 0) {
                    this.isGrowing = false;
                    return;
                }

                const newGrowthFront = [];
                const pixelsToGrow = Math.min(this.growthRate, this.growthFront.length);
                
                // Randomly select pixels from growth front to expand
                for (let i = 0; i < pixelsToGrow; i++) {
                    if (this.growthFront.length === 0) break;
                    
                    const randomIndex = Math.floor(Math.random() * this.growthFront.length);
                    const pixel = this.growthFront[randomIndex];
                    
                    // Don't grow from pixels that have reached max generations
                    if (pixel.generation >= this.maxGenerations * .9) {
                        this.growthFront.splice(randomIndex, 1);
                        continue;
                    }
                    
                    const newGeneration = pixel.generation + 1;
                    
                    // Calculate distance from colony center for circular bias
                    const distFromCenter = Math.sqrt(
                        Math.pow(pixel.x - this.centerX, 2) + Math.pow(pixel.y - this.centerY, 2)
                    );
                    const maxRadius = this.maxGenerations * config.growthDistance * scale;
                    const distanceRatio = distFromCenter / maxRadius;
                    
                    // Skip expansion based on circular bias (higher chance to skip at edges)
                    if (Math.random() < distanceRatio * 0.4) {
                        this.growthFront.splice(randomIndex, 1);
                        continue;
                    }
                    
                    // Try to expand in random adjacent directions with larger spacing
                    const spacing = config.growthDistance * scale; // Space dots apart (scaled)
                    const allDirections = [
                        [spacing, 0], [-spacing, 0], [0, spacing], [0, -spacing],
                        [spacing, spacing], [-spacing, -spacing], [spacing, -spacing], [-spacing, spacing]
                    ];
                    
                    // Shuffle and limit to 3-5 random directions for irregular growth
                    allDirections.sort(() => Math.random() - 0.5);
                    const numDirections = 3 + Math.floor(Math.random() * 3); // 3-5 directions
                    const directions = allDirections.slice(0, numDirections);
                    
                    let expanded = false;
                    for (const [dx, dy] of directions) {
                        const newX = pixel.x + dx;
                        const newY = pixel.y + dy;
                        
                        const result = addPixel(newX, newY, newGeneration, this);
                        if (result.success) {
                            const newPixel = { x: result.x, y: result.y, generation: newGeneration };
                            this.pixels.push(newPixel);
                            newGrowthFront.push(newPixel);
                            expanded = true;
                            break; // Only expand in one direction per pixel per frame
                        }
                    }
                    
                    // If this pixel expanded, keep it in growth front, otherwise remove it
                    if (expanded) {
                        // Keep this pixel in the growth front for future expansion
                    } else {
                        this.growthFront.splice(randomIndex, 1);
                    }
                }
                
                // Add new growth front pixels
                this.growthFront.push(...newGrowthFront);
                
                // If no more room to grow, stop
                if (this.growthFront.length === 0) {
                    this.isGrowing = false;
                }
            }

            draw() {
                // Draw all pixels in this colony
                this.pixels.forEach(pixel => {
                    drawPixel(pixel.x, pixel.y, pixel.generation, this.maxGenerations);
                });
            }

        }

        function createRandomColony() {
            let x, y, attempts = 0;
            const maxAttempts = 100;
            
            do {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * (radius * 0.8);
                x = Math.floor(centerX + Math.cos(angle) * distance);
                y = Math.floor(centerY + Math.sin(angle) * distance);
                attempts++;
            } while (attempts < maxAttempts && (isOccupied(x, y) || !isInDish(x, y)));

            if (attempts < maxAttempts) {
                colonies.push(new Colony(x, y));
            }
        }

        function isDishFull() {
            const totalPixels = Math.PI * radius * radius;
            return activePixels.size > totalPixels * 0.75;
        }

        function startAnimation() {
            // Initialize starting colonies
            for (let i = 0; i < config.initialColonies; i++) {
                createRandomColony();
            }

            // Animation loop
            function animate() {
                // Clear canvas each frame
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Grow colonies
                colonies.forEach(colony => {
                    colony.grow();
                });

                // Draw all colonies
                colonies.forEach(colony => {
                    colony.draw();
                });

                // Try to spawn new colony
                const now = Date.now();
                if (!isDishFull() && now - lastSpawnTime > nextSpawnInterval) {
                    createRandomColony();
                    lastSpawnTime = now;
                    // Set next random spawn interval
                    nextSpawnInterval = config.minSpawnInterval + Math.random() * (config.maxSpawnInterval - config.minSpawnInterval);
                }

                // Export colony positions to global scope for colony-lines.js
                exportColonyPositions();

                requestAnimationFrame(animate);
            }

            animate();
        }

        // Export colony positions for use by colony-lines.js
        function exportColonyPositions() {
            const canvasRect = canvas.getBoundingClientRect();
            window.bacteriaColonies = colonies.map(colony => ({
                x: colony.centerX,
                y: colony.centerY
            }));
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
