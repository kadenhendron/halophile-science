// Connect nav items to bacteria colonies with dynamic lines
(function() {
    'use strict';

    let lines = [];
    let navItems = [];
    let coloniesData = [];
    let lineShown = []; // Track which lines have been shown
    let previousColonyCount = 0; // Track colony count to detect new colonies

    function init() {
        // Only run on home page
        if (!document.getElementById('home__dish')) {
            return;
        }

        // Get nav items
        const nav = document.querySelector('nav');
        if (!nav) return;
        
        navItems = Array.from(nav.querySelectorAll('a'));
        
        // Create line container
        const lineContainer = document.createElement('div');
        lineContainer.id = 'colony-lines-container';
        document.body.appendChild(lineContainer);

        // Create line elements for each nav item
        navItems.forEach((item, index) => {
            const line = document.createElement('div');
            line.className = 'colony-line';
            line.dataset.navIndex = index;
            lineContainer.appendChild(line);
            lines.push(line);
            lineShown.push(false); // Initially not shown
        });

        // Wait for bacteria animation to initialize and create colonies
        setTimeout(() => {
            updateLines();
            
            // Update on resize
            window.addEventListener('resize', handleResize);
           // Check frequently for new colonies
            setInterval(() => {
                const currentColonyCount = window.bacteriaColonies ? window.bacteriaColonies.length : 0;
                
                // If new colony detected, immediately update to try to assign it
                if (currentColonyCount > previousColonyCount) {
                    previousColonyCount = currentColonyCount;
                    updateLines();
                } else {
                    // Otherwise just update positions
                    previousColonyCount = currentColonyCount;
                }
            }, 200); // Check every 200ms for new colonies
            
            // Also update periodically for
            // Periodic update to catch colony position changes
            setInterval(updateLines, 1000);
        }, 500);
    }

    function handleResize() {
        // Reset all lines to initial state
        resetLines();
        // Then update with new positions
        updateLines();
    }

    function resetLines() {
        // Reset tracking
        lineShown = lineShown.map(() => false);
        previousColonyCount = 0;
        
        // Instantly hide lines (no fade out) by disabling transitions
        lines.forEach(line => {
            line.style.transition = 'none';
            line.style.opacity = '0';
            line.classList.remove('visible');
        });
        
        // Instantly hide nav ::after elements
        navItems.forEach(navItem => {
            navItem.classList.remove('line-visible');
        });
    }

    function updateLines() {
        // Get colony positions from the bacteria canvas
        coloniesData = getColonyPositions();
        
        if (coloniesData.length === 0) {
            return;
        }

        // Track which colonies have been assigned and their positions
        const assignments = {};

        navItems.forEach((navItem, index) => {
            const navRect = navItem.getBoundingClientRect();
            
            // Determine which side center of the nav item to use
            const navPoint = getNavPoint(navItem, index);
            const navX = navPoint.x;
            const navY = navPoint.y;
            
            // Find nearest unused colony that doesn't create crossing lines
            const colony = findNearestColony(navX, navY, assignments, index, navPoint);
            if (!colony) return;
            
            assignments[index] = colony;
            
            const colonyX = colony.x;
            const colonyY = colony.y;
            
            // Calculate rectangle dimensions
            const left = Math.min(navX, colonyX);
            const top = Math.min(navY, colonyY);
            const width = Math.abs(colonyX - navX);
            const height = Math.abs(colonyY - navY);
            
            // Determine which borders to show based on relative position
            const borders = getBorderStyle(navX, navY, colonyX, colonyY);
            
            // Apply styles to line
            const line = lines[index];
            line.style.left = left + 'px';
            line.style.top = top + 'px';
            line.style.width = width + 'px';
            line.style.height = height + 'px';
            line.style.borderTop = borders.top;
            line.style.borderRight = borders.right;
            line.style.borderBottom = borders.bottom;
            line.style.borderLeft = borders.left;
            
            // Fade in the line if it's being shown for the first time
            if (!lineShown[index]) {
                lineShown[index] = true;
                // Small delay to allow position to be set before fading in
                setTimeout(() => {
                    line.style.transition = ''; // Re-enable transitions
                    line.style.opacity = ''; // Clear inline opacity to allow CSS transition
                    line.classList.add('visible');
                    // Also fade in the ::after on mobile
                    navItem.classList.add('line-visible');
                }, 50);
            }
        });
    }

    function getNavPoint(navItem, index) {
        const rect = navItem.getBoundingClientRect();
        
        // Check if we're on mobile (window width < 960px)
        const isMobile = window.innerWidth < 960;
        
        if (isMobile) {
            // On mobile, nav items are stacked vertically with ::after lines
            // pointing to the right with different widths
            const afterWidths = [1, 4, 5, 2]; // em values for each nav item
            
            // Get the computed font size from the nav item
            const computedStyle = window.getComputedStyle(navItem);
            const fontSize = parseFloat(computedStyle.fontSize);
            const afterWidthPx = afterWidths[index] * fontSize - 2;
            
            // Start at the end of the ::after line (right edge + after width)
            return {
                x: rect.right + afterWidthPx,
                y: rect.top + rect.height / 2
            };
        }
        
        // Desktop: Top nav items (index 0, 1): use center of bottom side
        // Bottom nav items (index 2, 3): use center of top side
        
        if (index === 0 || index === 1) {
            // Top nav items → center of bottom edge
            return {
                x: rect.left + rect.width / 2,
                y: rect.bottom
            };
        } else {
            // Bottom nav items → center of top edge
            return {
                x: rect.left + rect.width / 2,
                y: rect.top
            };
        }
    }

    function findNearestColony(navX, navY, assignments, currentIndex, navPoint) {
        let nearestColony = null;
        let minDistance = Infinity;

        coloniesData.forEach(colony => {
            // Skip if already used
            if (Object.values(assignments).includes(colony)) return;
            
            // Check if this colony would cause crossing with already assigned colonies
            if (!isValidColonyForNav(colony, currentIndex, assignments, navPoint)) return;
            
            const distance = Math.sqrt(
                Math.pow(colony.x - navX, 2) + Math.pow(colony.y - navY, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestColony = colony;
            }
        });

        return nearestColony;
    }

    function isValidColonyForNav(colony, navIndex, assignments, navPoint) {
        // Check if we're on mobile (window width < 960px)
        const isMobile = window.innerWidth < 960;
        
        if (isMobile) {
            // Check if colony is within the viewport
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Colony must be on screen
            if (colony.x < 0 || colony.x > viewportWidth || colony.y < 0 || colony.y > viewportHeight) {
                return false;
            }
            
            // On mobile, colony must be to the right of where the line starts
            if (colony.x < navPoint.x) return false;
            
            // On mobile, nav items are stacked vertically: 0, 1, 2, 3 from top to bottom
            // A button should never point to a colony below what a lower button is pointing to
            
            // Button 0 (top) can't point below button 1's colony
            if (navIndex === 0 && assignments[1]) {
                if (colony.y > assignments[1].y) return false;
            }
            
            // Button 1 can't point below button 2's colony
            if (navIndex === 1 && assignments[2]) {
                if (colony.y > assignments[2].y) return false;
            }
            
            // Button 2 can't point below button 3's colony
            if (navIndex === 2 && assignments[3]) {
                if (colony.y > assignments[3].y) return false;
            }
            
            // Conversely, lower buttons can't point above higher buttons' colonies
            // UNLESS the colony is to the left of the higher button's starting point
            
            // Button 1 can't point above button 0's colony (unless colony is left of button 0's start)
            if (navIndex === 1 && assignments[0]) {
                // Get button 0's nav point
                const button0Point = getNavPoint(navItems[0], 0);
                // Only restrict if colony is not to the left of button 0's starting point
                if (colony.y < assignments[0].y && colony.x >= button0Point.x) {
                    return false;
                }
            }
            
            // Button 2 can't point above button 1's colony (unless colony is left of button 1's start)
            if (navIndex === 2 && assignments[1]) {
                const button1Point = getNavPoint(navItems[1], 1);
                if (colony.y < assignments[1].y && colony.x >= button1Point.x) {
                    return false;
                }
            }
            
            // Button 3 (bottom) can't point above button 2's colony (unless colony is left of button 2's start)
            if (navIndex === 3 && assignments[2]) {
                const button2Point = getNavPoint(navItems[2], 2);
                if (colony.y < assignments[2].y && colony.x >= button2Point.x) {
                    return false;
                }
            }
            
            return true;
        }
        
        // Desktop: Nav indices: 0=top-left, 1=top-right, 2=bottom-left, 3=bottom-right
        
        // Top-left (0): should be in top-left quadrant
        if (navIndex === 0) {
            // Can't be lower than bottom-left's colony (if assigned)
            if (assignments[2] && colony.y > assignments[2].y) return false;
            // Can't be further right than top-right's colony (if assigned)
            if (assignments[1] && colony.x > assignments[1].x) return false;
        }
        
        // Top-right (1): should be in top-right quadrant
        if (navIndex === 1) {
            // Can't be lower than bottom-right's colony (if assigned)
            if (assignments[3] && colony.y > assignments[3].y) return false;
            // Can't be further left than top-left's colony (if assigned)
            if (assignments[0] && colony.x < assignments[0].x) return false;
        }
        
        // Bottom-left (2): should be in bottom-left quadrant
        if (navIndex === 2) {
            // Can't be higher than top-left's colony (if assigned)
            if (assignments[0] && colony.y < assignments[0].y) return false;
            // Can't be further right than bottom-right's colony (if assigned)
            if (assignments[3] && colony.x > assignments[3].x) return false;
        }
        
        // Bottom-right (3): should be in bottom-right quadrant
        if (navIndex === 3) {
            // Can't be higher than top-right's colony (if assigned)
            if (assignments[1] && colony.y < assignments[1].y) return false;
            // Can't be further left than bottom-left's colony (if assigned)
            if (assignments[2] && colony.x < assignments[2].x) return false;
        }
        
        return true;
    }

    function getBorderStyle(navX, navY, colonyX, colonyY) {
        const borders = {
            top: 'none',
            right: 'none',
            bottom: 'none',
            left: 'none'
        };

        const border = '2px solid #c1272d';

        // Colony is to the right of nav
        if (colonyX > navX) {
            borders.left = border;
            // Colony is below nav
            if (colonyY > navY) {
                borders.bottom = border;
            } else {
                // Colony is above nav
                borders.top = border;
            }
        } else {
            // Colony is to the left of nav
            borders.right = border;
            // Colony is below nav
            if (colonyY > navY) {
                borders.bottom = border;
            } else {
                // Colony is above nav
                borders.top = border;
            }
        }

        return borders;
    }

    function getColonyPositions() {
        // Access colony data from bacteria.js
        // We need to get the canvas and calculate colony positions
        const canvas = document.getElementById('bacteria-canvas');
        if (!canvas) return [];

        const canvasRect = canvas.getBoundingClientRect();
        
        // Try to access colonies from the bacteria.js scope
        // Since we can't directly access the closure, we'll need to modify bacteria.js
        // or calculate based on visible patterns on the canvas
        
        // For now, we'll return sample positions that can be updated
        // In practice, colonies should be exposed or calculated
        
        // Check if colonies are exposed on window
        if (window.bacteriaColonies && window.bacteriaColonies.length > 0) {
            return window.bacteriaColonies.map(colony => ({
                x: canvasRect.left + colony.x,
                y: canvasRect.top + colony.y
            }));
        }
        
        // Fallback: calculate approximate positions
        // This is a placeholder - actual colony positions should come from bacteria.js
        const centerX = canvasRect.left + canvasRect.width / 2;
        const centerY = canvasRect.top + canvasRect.height / 2;
        const radius = canvasRect.width * 0.3;
        
        const positions = [];
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI * 2 / 4) + Math.PI / 4;
            positions.push({
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            });
        }
        
        return positions;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
