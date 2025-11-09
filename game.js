/**
 * PHARAOH'S CURSE
 * A remake of the 1983 Atari classic
 */

// Room definitions (will expand to 16 total)
const ROOMS = {
    1: `
########################
#.....K................#
#......................#
#..#####R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R..............#
#.......R....M.........#
#P......R............D.#
########################
########################
    `.trim(),

    2: `
########################
#......................#
#...........K..........#
#...$$$$$R.............#
#...######R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R............#
#.........R....M.......#
#P........R..........D.#
########################
########################
    `.trim(),

    3: `
########################
#.....K................#
#......R...............#
#..####R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#......R...............#
#P.....R...F....M......#
#......R.............D.#
########################
########################
    `.trim(),

    4: `
########################
#P..................K..#
#......................#
#.....#####............#
#......................#
#..........#####.......#
#......................#
#.#####................#
#........######........#
#......................#
#......................#
#......................#
#......................#
#......................#
#......................#
#......................#
#....................D.#
########################
########################
    `.trim()
};

class PharaohsCurseScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PharaohsCurseScene' });
    }

    init() {
        // Game state - preserve across room changes
        this.currentRoom = this.currentRoom || 1;
        this.lives = this.lives || 3;
        this.score = 0;
        this.hasKey = this.hasKey || false; // Preserve key across rooms
        this.treasuresCollected = this.treasuresCollected || 0;
        this.totalTreasures = 0;

        // Player state
        this.runTime = 0;
        this.canJump = false;
        this.isOnRope = false;
        this.playerStartX = 0;
        this.playerStartY = 0;
    }

    preload() {
        // Graphics will be generated procedurally
    }

    create() {
        // Game constants
        this.tileSize = 32;

        // Create graphics textures
        this.createTextures();

        // Setup physics world FIRST before creating any physics objects
        this.physics.world.gravity.y = 800;

        // Parse and create current room (sets playerStartX/Y and creates platforms)
        this.loadRoom(this.currentRoom);

        // Create player AFTER loading room so we have spawn position
        this.createPlayer();

        // IMMEDIATELY setup collisions before any physics step runs
        this.setupCollisions();

        // Input
        this.setupControls();

        // Camera
        this.setupCamera();

        // UI
        this.createUI();
    }

    createTextures() {
        // Wall/Platform
        if (!this.textures.exists('wall')) {
            const g = this.add.graphics();
            g.fillStyle(0xD2691E, 1); // Chocolate brown
            g.fillRect(0, 0, this.tileSize, this.tileSize);
            g.lineStyle(2, 0x8B4513, 1); // Saddle brown
            g.strokeRect(0, 0, this.tileSize, this.tileSize);
            // Add hieroglyph-like marks
            g.lineStyle(1, 0xFFD700, 0.3);
            g.strokeRect(8, 8, 16, 16);
            g.generateTexture('wall', this.tileSize, this.tileSize);
            g.destroy();
        }

        // Rope - extends beyond tile to ensure continuous appearance
        if (!this.textures.exists('rope')) {
            const g = this.add.graphics();
            // Draw rope lines extending beyond tile boundaries to overlap
            g.lineStyle(8, 0xD2B48C, 1); // Tan - thick main rope
            g.lineBetween(16, -2, 16, 34); // Extend 2px beyond top and bottom
            g.lineStyle(3, 0x8B7355, 1); // Darker tan - shadow lines
            g.lineBetween(12, -2, 12, 34);
            g.lineBetween(20, -2, 20, 34);
            g.generateTexture('rope', this.tileSize, this.tileSize);
            g.destroy();
        }

        // Key
        if (!this.textures.exists('key')) {
            const g = this.add.graphics();
            g.fillStyle(0xFFD700, 1); // Gold
            g.fillCircle(12, 12, 8);
            g.fillRect(12, 12, 12, 4);
            g.fillRect(20, 10, 2, 2);
            g.fillRect(20, 14, 2, 2);
            g.generateTexture('key', 28, 28);
            g.destroy();
        }

        // Door
        if (!this.textures.exists('door')) {
            const g = this.add.graphics();
            g.fillStyle(0x8B4513, 1); // Saddle brown
            g.fillRect(0, 0, this.tileSize, this.tileSize);
            g.lineStyle(2, 0xFFD700, 1);
            g.strokeRect(2, 2, this.tileSize - 4, this.tileSize - 4);
            // Door handle
            g.fillStyle(0xFFD700, 1);
            g.fillCircle(this.tileSize - 8, this.tileSize / 2, 3);
            g.generateTexture('door', this.tileSize, this.tileSize);
            g.destroy();
        }

        // Treasure/Scarab
        if (!this.textures.exists('treasure')) {
            const g = this.add.graphics();
            g.fillStyle(0xFFD700, 1);
            g.fillCircle(14, 14, 12);
            g.fillStyle(0xFF8C00, 1); // Dark orange
            g.fillCircle(14, 14, 8);
            g.fillStyle(0xFFD700, 1);
            g.fillCircle(14, 14, 4);
            g.generateTexture('treasure', 28, 28);
            g.destroy();
        }

        // Player
        if (!this.textures.exists('player')) {
            const g = this.add.graphics();
            g.fillStyle(0x00CED1, 1); // Turquoise (explorer)
            g.fillRect(6, 0, 16, 28);
            g.fillCircle(14, 6, 6); // Head
            g.fillStyle(0xFFE4B5, 1); // Skin tone
            g.fillCircle(14, 6, 4);
            g.generateTexture('player', 28, 28);
            g.destroy();
        }

        // Mummy
        if (!this.textures.exists('mummy')) {
            const g = this.add.graphics();
            g.fillStyle(0xF5F5DC, 1); // Beige (bandages)
            g.fillRect(6, 0, 16, 28);
            g.fillCircle(14, 6, 6);
            g.fillStyle(0x8B0000, 1); // Dark red eyes
            g.fillCircle(10, 6, 2);
            g.fillCircle(18, 6, 2);
            g.generateTexture('mummy', 28, 28);
            g.destroy();
        }

        // Pharaoh
        if (!this.textures.exists('pharaoh')) {
            const g = this.add.graphics();
            g.fillStyle(0xFFD700, 1); // Gold
            g.fillRect(6, 0, 16, 28);
            g.fillCircle(14, 6, 6);
            g.fillStyle(0x8B4513, 1); // Brown face
            g.fillCircle(14, 6, 4);
            // Crown
            g.fillStyle(0xFFD700, 1);
            g.fillTriangle(8, 0, 20, 0, 14, -6);
            g.generateTexture('pharaoh', 28, 32);
            g.destroy();
        }

        // Winged Avatar
        if (!this.textures.exists('winged')) {
            const g = this.add.graphics();
            g.fillStyle(0x4B0082, 1); // Indigo
            g.fillCircle(14, 14, 8);
            // Wings
            g.fillStyle(0x8A2BE2, 1); // Blue violet
            g.fillEllipse(4, 14, 12, 8);
            g.fillEllipse(24, 14, 12, 8);
            g.generateTexture('winged', 32, 28);
            g.destroy();
        }

        // Trap trigger
        if (!this.textures.exists('trap')) {
            const g = this.add.graphics();
            g.fillStyle(0x8B0000, 1); // Dark red
            g.fillRect(0, 24, this.tileSize, 8);
            g.lineStyle(1, 0xFF0000, 1);
            g.strokeRect(0, 24, this.tileSize, 8);
            g.generateTexture('trap', this.tileSize, this.tileSize);
            g.destroy();
        }
    }

    loadRoom(roomNumber) {
        const roomText = ROOMS[roomNumber];
        const lines = roomText.split('\n').filter(line => line.trim().length > 0);

        this.levelHeight = lines.length * this.tileSize;
        this.levelWidth = Math.max(...lines.map(line => line.length)) * this.tileSize;

        // Create groups fresh (scene.restart already destroyed everything)
        this.platforms = this.physics.add.staticGroup();
        this.ropes = this.add.group();
        this.keys = this.physics.add.group();
        this.doors = this.physics.add.group();
        this.treasures = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.traps = this.physics.add.group();

        // Parse room
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                const char = line[x];
                const pixelX = x * this.tileSize + this.tileSize / 2;
                const pixelY = y * this.tileSize + this.tileSize / 2;

                switch (char) {
                    case '#':
                        this.createWall(pixelX, pixelY);
                        break;
                    case 'R':
                        this.createRope(pixelX, pixelY);
                        break;
                    case 'K':
                        this.createKey(pixelX, pixelY);
                        break;
                    case 'D':
                        this.createDoor(pixelX, pixelY);
                        break;
                    case '$':
                        this.createTreasure(pixelX, pixelY);
                        break;
                    case 'M':
                        this.createMummy(pixelX, pixelY);
                        break;
                    case 'F':
                        this.createPharaoh(pixelX, pixelY);
                        break;
                    case 'W':
                        this.createWingedAvatar(pixelX, pixelY);
                        break;
                    case 'T':
                        this.createTrap(pixelX, pixelY);
                        break;
                    case 'P':
                        this.playerStartX = pixelX;
                        this.playerStartY = pixelY;
                        break;
                }
            }
        }

        // Set world bounds
        this.physics.world.setBounds(0, 0, this.levelWidth, this.levelHeight);
    }

    createWall(x, y) {
        const wall = this.platforms.create(x, y, 'wall');
        wall.setDisplaySize(this.tileSize, this.tileSize);
        wall.refreshBody();
    }

    createRope(x, y) {
        const rope = this.add.sprite(x, y, 'rope');
        rope.setDisplaySize(this.tileSize, this.tileSize);
        rope.setData('isRope', true);
        this.ropes.add(rope);
    }

    createKey(x, y) {
        const key = this.physics.add.sprite(x, y, 'key');
        key.body.setAllowGravity(false);
        key.body.moves = false;
        this.keys.add(key);
    }

    createDoor(x, y) {
        const door = this.physics.add.sprite(x, y, 'door');
        door.body.setAllowGravity(false);
        door.body.moves = false;
        door.setData('nextRoom', this.getNextRoom());
        this.doors.add(door);
    }

    createTreasure(x, y) {
        const treasure = this.physics.add.sprite(x, y, 'treasure');
        treasure.body.setAllowGravity(false);
        treasure.body.moves = false;
        this.treasures.add(treasure);
        this.totalTreasures++;
    }

    createMummy(x, y) {
        const mummy = this.physics.add.sprite(x, y, 'mummy');
        mummy.body.setAllowGravity(false); // Disable until collision setup
        mummy.setBounce(0);
        mummy.setCollideWorldBounds(true);
        mummy.setData('type', 'mummy');
        mummy.setData('initialVelocity', 60); // Store for later
        this.enemies.add(mummy);
    }

    createPharaoh(x, y) {
        const pharaoh = this.physics.add.sprite(x, y, 'pharaoh');
        pharaoh.body.setAllowGravity(false); // Disable until collision setup
        pharaoh.setBounce(0);
        pharaoh.setCollideWorldBounds(true);
        pharaoh.setData('type', 'pharaoh');
        pharaoh.setData('initialVelocity', 80); // Store for later
        this.enemies.add(pharaoh);
    }

    createWingedAvatar(x, y) {
        const winged = this.physics.add.sprite(x, y, 'winged');
        winged.body.setAllowGravity(false);
        winged.setVelocityX(100);
        winged.setData('type', 'winged');
        this.enemies.add(winged);
    }

    createTrap(x, y) {
        const trap = this.physics.add.sprite(x, y, 'trap');
        trap.body.setAllowGravity(false);
        this.traps.add(trap);
    }

    getNextRoom() {
        // Simple room progression for now
        if (this.currentRoom < 4) return this.currentRoom + 1;
        return 1; // Loop back to room 1 after room 4
    }

    createPlayer() {
        this.player = this.physics.add.sprite(
            this.playerStartX || 100,
            this.playerStartY || 100,
            'player'
        );
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);
    }

    setupCollisions() {
        // Player collision with platforms - store reference so we can disable it while climbing
        this.playerPlatformCollider = this.physics.add.collider(this.player, this.platforms);

        // Enemy collisions - set up individually and enable gravity
        this.enemies.getChildren().forEach((enemy) => {
            this.physics.add.collider(enemy, this.platforms);

            // Enable gravity and set velocity after collision is set up
            if (enemy.getData('type') === 'mummy' || enemy.getData('type') === 'pharaoh') {
                enemy.body.setAllowGravity(true);
                const vel = enemy.getData('initialVelocity');
                enemy.setVelocityX(vel);
            }
        });

        // Overlaps
        this.physics.add.overlap(this.player, this.keys, this.collectKey, null, this);
        this.physics.add.overlap(this.player, this.doors, this.tryOpenDoor, null, this);
        this.physics.add.overlap(this.player, this.treasures, this.collectTreasure, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.traps, this.hitTrap, null, this);
    }

    setupControls() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.shiftKey = this.input.keyboard.addKey('SHIFT');
        this.rKey = this.input.keyboard.addKey('R');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
    }

    setupCamera() {
        this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setBackgroundColor('#1a0f0a');
    }

    createUI() {
        // Lives
        this.livesText = this.add.text(16, 16, `Lives: ${this.lives}`, {
            fontSize: '20px',
            fill: '#FF0000',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.livesText.setScrollFactor(0).setDepth(1000);

        // Room number
        this.roomText = this.add.text(16, 46, `Room: ${this.currentRoom}`, {
            fontSize: '20px',
            fill: '#FFD700',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.roomText.setScrollFactor(0).setDepth(1000);

        // Key status
        this.keyText = this.add.text(16, 76, `Key: ${this.hasKey ? '🔑' : '❌'}`, {
            fontSize: '20px',
            fill: '#FFFFFF',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.keyText.setScrollFactor(0).setDepth(1000);

        // Treasures
        this.treasureText = this.add.text(16, 106, `Treasures: ${this.treasuresCollected}`, {
            fontSize: '20px',
            fill: '#FFD700',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.treasureText.setScrollFactor(0).setDepth(1000);
    }

    collectKey(player, key) {
        this.hasKey = true;
        key.destroy();
        this.keyText.setText(`Key: 🔑`);
    }

    tryOpenDoor(player, door) {
        if (this.hasKey) {
            const nextRoom = door.getData('nextRoom');
            this.changeRoom(nextRoom);
        }
    }

    collectTreasure(player, treasure) {
        treasure.destroy();
        this.treasuresCollected++;
        this.treasureText.setText(`Treasures: ${this.treasuresCollected}`);
        // Extra life every 5 treasures
        if (this.treasuresCollected % 5 === 0) {
            this.lives++;
            this.livesText.setText(`Lives: ${this.lives}`);
        }
    }

    hitEnemy(player, enemy) {
        const enemyType = enemy.getData('type');

        if (enemyType === 'winged') {
            // Winged avatar teleports player
            this.hasKey = false;
            this.keyText.setText(`Key: ❌`);
            const randomRoom = Phaser.Math.Between(1, 3);
            this.changeRoom(randomRoom);
        } else {
            // Regular enemy - lose a life
            this.loseLife();
        }
    }

    hitTrap(player, trap) {
        this.loseLife();
    }

    loseLife() {
        this.lives--;
        this.livesText.setText(`Lives: ${this.lives}`);

        if (this.lives <= 0) {
            this.gameOver();
        } else {
            // Respawn in current room
            this.scene.restart();
        }
    }

    gameOver() {
        this.physics.pause();
        const gameOverText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'GAME OVER\n\nPress R to Restart',
            {
                fontSize: '48px',
                fill: '#FF0000',
                backgroundColor: '#000000',
                padding: { x: 20, y: 20 },
                align: 'center'
            }
        );
        gameOverText.setOrigin(0.5);
        gameOverText.setScrollFactor(0).setDepth(2000);
    }

    changeRoom(roomNumber) {
        this.currentRoom = roomNumber;
        this.scene.restart();
    }

    update(time, delta) {
        // Restart game
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.currentRoom = 1;
            this.scene.restart();
            return;
        }

        // Check if on rope
        this.checkRopeProximity();

        // Player movement
        const speed = 200;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.runTime += delta;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.runTime += delta;
        } else {
            this.player.setVelocityX(0);
            this.runTime = 0;
        }

        // Running-before-jumping mechanic
        this.canJump = this.runTime > 300; // Must run for 300ms before jumping

        // Rope climbing
        if (this.isOnRope) {
            this.player.setVelocityY(0);
            this.player.body.setAllowGravity(false);

            // Disable platform collision while climbing so player can pass through gaps
            if (this.playerPlatformCollider) {
                this.playerPlatformCollider.active = false;
            }

            if (this.cursors.up.isDown) {
                this.player.setVelocityY(-150);
            } else if (this.cursors.down.isDown) {
                this.player.setVelocityY(150);
            }
        } else {
            this.player.body.setAllowGravity(true);

            // Re-enable platform collision when not on rope
            if (this.playerPlatformCollider) {
                this.playerPlatformCollider.active = true;
            }

            // Jump (only if running and on ground)
            if (this.spaceKey.isDown && this.player.body.touching.down && this.canJump) {
                this.player.setVelocityY(-400);
            }
        }

        // Enemy AI - patrol back and forth
        this.enemies.getChildren().forEach((enemy) => {
            if (enemy.body && (enemy.body.blocked.left || enemy.body.blocked.right)) {
                enemy.setVelocityX(-enemy.body.velocity.x);
            }
        });

        // Check if player fell off world
        if (this.player.y > this.levelHeight + 100) {
            this.loseLife();
        }
    }

    checkRopeProximity() {
        this.isOnRope = false;

        this.ropes.getChildren().forEach(rope => {
            // Check horizontal distance only - allows climbing entire vertical rope
            const horizontalDistance = Math.abs(this.player.x - rope.x);

            if (horizontalDistance < 20) {
                this.isOnRope = true;
            }
        });
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a0f0a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: PharaohsCurseScene
};

const game = new Phaser.Game(config);
