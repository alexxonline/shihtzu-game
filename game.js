// Shih Tzu City Adventure - Phaser 3 game
// Player walks/jumps right through a city while avoiding incoming birds.

const VIEW_W = 960;
const VIEW_H = 540;
const WORLD_W = 5400;
const GROUND_Y = 470;       // Top surface of the ground physics body
const GROUND_THICKNESS = 60;
const ROAR_RANGE = 280;     // Birds within this many pixels of the dog get knocked out by a roar

// Sprite sheet frame sizes (sheets are laid out as a 6x3 grid)
const SHIH_W = Math.floor(1590 / 6);   // 265
const SHIH_H = Math.floor(864 / 3);    // 288
const BIRD_W = Math.floor(1380 / 6);   // 230
const BIRD_H = Math.floor(864 / 3);   // 288

const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW_W,
    height: VIEW_H,
    backgroundColor: '#87ceeb',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 1400 }, debug: false }
    },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ---------- Module-scoped game state ----------
let player;
let birds;
let bags;
let cursors;
let wasd;
let scoreText;
let livesText;
let pointsText;
let centerText;
let lastBirdTime = 0;
let nextBirdDelay = 1500;
let lastBagTime = 0;
let nextBagDelay = 2500;
let gameState = 'playing';
let lives = 3;
let points = 0;
let invulnerable = false;
let isRoaring = false;

function preload() {
    this.load.image('city', 'assets/background_city.png');
    this.load.image('shihtzu_sheet', 'assets/sprites_shihtzu.png');
    this.load.image('bird_sheet', 'assets/sprites_enemybird.png');
    this.load.image('pedigree_bag', 'assets/pedigree_bag.png');
}

// Register a custom frame on a loaded image
function addFrame(scene, key, name, col, row, w, h) {
    scene.textures.get(key).add(name, 0, col * w, row * h, w, h);
}

function create() {
    // Reset state on restart
    lives = 3;
    points = 0;
    invulnerable = false;
    isRoaring = false;
    gameState = 'playing';
    lastBirdTime = 0;
    nextBirdDelay = 1500;
    lastBagTime = 0;
    nextBagDelay = 2500;

    // -------- Register frames from sprite sheets --------
    // Shih tzu sheet rows: 0=idle/walk, 1=jump/fall/sit, 2=bark/hurt
    addFrame(this, 'shihtzu_sheet', 'idle_1', 0, 0, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'idle_2', 1, 0, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'run_1',  2, 0, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'run_2',  3, 0, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'run_3',  4, 0, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'run_4',  5, 0, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'jump_1', 0, 1, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'jump_2', 1, 1, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'fall_1', 2, 1, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'fall_2', 3, 1, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'hurt_1', 3, 2, SHIH_W, SHIH_H);
    addFrame(this, 'shihtzu_sheet', 'roar_1', 0, 2, SHIH_W, SHIH_H);

    // Bird sheet rows: 0=idle/walk, 1=jump/fall/attack, 2=hurt
    addFrame(this, 'bird_sheet', 'b_idle_1', 0, 0, BIRD_W, BIRD_H);
    addFrame(this, 'bird_sheet', 'b_idle_2', 1, 0, BIRD_W, BIRD_H);
    addFrame(this, 'bird_sheet', 'b_fly_1',  2, 0, BIRD_W, BIRD_H);
    addFrame(this, 'bird_sheet', 'b_fly_2',  3, 0, BIRD_W, BIRD_H);
    addFrame(this, 'bird_sheet', 'b_fly_3',  4, 0, BIRD_W, BIRD_H);
    addFrame(this, 'bird_sheet', 'b_fly_4',  5, 0, BIRD_W, BIRD_H);
    addFrame(this, 'bird_sheet', 'b_hurt_1', 0, 2, BIRD_W, BIRD_H);

    // -------- Background (tiled across the world) --------
    // Source bg is 2172x724. We scale to view height (540) and tile horizontally.
    const bgScale = VIEW_H / 724;
    this.add.tileSprite(0, 0, WORLD_W, VIEW_H, 'city')
        .setOrigin(0, 0)
        .setTileScale(bgScale, bgScale);

    // -------- World & ground --------
    this.physics.world.setBounds(0, 0, WORLD_W, VIEW_H);

    // Invisible ground collider that runs the length of the world.
    // The visual ground comes from the city background's sidewalk strip.
    const ground = this.add.rectangle(
        WORLD_W / 2,
        GROUND_Y + GROUND_THICKNESS / 2,
        WORLD_W,
        GROUND_THICKNESS,
        0x000000,
        0
    );
    this.physics.add.existing(ground, true);

    // -------- Animations --------
    this.anims.create({
        key: 'shihtzu-idle',
        frames: [
            { key: 'shihtzu_sheet', frame: 'idle_1' },
            { key: 'shihtzu_sheet', frame: 'idle_2' }
        ],
        frameRate: 3,
        repeat: -1
    });
    this.anims.create({
        key: 'shihtzu-run',
        frames: [
            { key: 'shihtzu_sheet', frame: 'run_1' },
            { key: 'shihtzu_sheet', frame: 'run_2' },
            { key: 'shihtzu_sheet', frame: 'run_3' },
            { key: 'shihtzu_sheet', frame: 'run_4' }
        ],
        frameRate: 12,
        repeat: -1
    });
    this.anims.create({
        key: 'bird-fly',
        frames: [
            { key: 'bird_sheet', frame: 'b_fly_1' },
            { key: 'bird_sheet', frame: 'b_fly_2' },
            { key: 'bird_sheet', frame: 'b_fly_3' },
            { key: 'bird_sheet', frame: 'b_fly_4' }
        ],
        frameRate: 10,
        repeat: -1
    });

    // -------- Player --------
    player = this.physics.add.sprite(120, GROUND_Y - 80, 'shihtzu_sheet', 'idle_1');
    player.setScale(0.32);
    // Tighten hit box to roughly match the visible dog (sprite has lots of transparent margin)
    player.body.setSize(150, 200);
    player.body.setOffset((SHIH_W - 150) / 2, SHIH_H - 300);
    player.setCollideWorldBounds(true);
    player.anims.play('shihtzu-idle');

    this.physics.add.collider(player, ground);

    // -------- Birds (enemies) --------
    birds = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(player, birds, hitBird, null, this);

    // -------- Pedigree bags (pickups) --------
    bags = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(player, bags, collectBag, null, this);

    // -------- Goal flag at right edge --------
    const flagX = WORLD_W - 80;
    this.add.rectangle(flagX, GROUND_Y - 80, 6, 160, 0x444444).setOrigin(0.5, 0.5);
    this.add.triangle(flagX + 3, GROUND_Y - 140, 0, 0, 70, 18, 0, 36, 0xff3344).setOrigin(0, 0);

    // -------- Camera --------
    this.cameras.main.setBounds(0, 0, WORLD_W, VIEW_H);
    this.cameras.main.startFollow(player, true, 0.15, 0.1);
    this.cameras.main.setDeadzone(120, 100);

    // -------- HUD --------
    const hudStyle = {
        font: 'bold 20px Segoe UI, Arial',
        fill: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
    };
    scoreText  = this.add.text(16, 14, 'Distance: 0 m', hudStyle).setScrollFactor(0).setDepth(100);
    livesText  = this.add.text(16, 42, 'Lives: 3',      hudStyle).setScrollFactor(0).setDepth(100);
    pointsText = this.add.text(16, 70, 'Score: 0',      hudStyle).setScrollFactor(0).setDepth(100);

    centerText = this.add.text(VIEW_W / 2, VIEW_H / 2, '', {
        font: 'bold 56px Segoe UI, Arial',
        fill: '#ffeb3b',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    // -------- Input --------
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });

    this.input.keyboard.on('keydown-R', () => {
        if (gameState === 'playing') {
            roar.call(this);
        } else {
            this.scene.restart();
        }
    });
}

function update(time) {
    if (gameState !== 'playing') return;

    const speed = 230;
    const onGround = player.body.blocked.down || player.body.touching.down;

    if (isRoaring) {
        player.setVelocityX(0);
    } else {
        // ---- Horizontal movement ----
        const goLeft  = cursors.left.isDown  || wasd.left.isDown;
        const goRight = cursors.right.isDown || wasd.right.isDown;

        if (goLeft && !goRight) {
            player.setVelocityX(-speed);
            player.setFlipX(true);
        } else if (goRight && !goLeft) {
            player.setVelocityX(speed);
            player.setFlipX(false);
        } else {
            player.setVelocityX(0);
        }

        // ---- Jumping ----
        const jumpPressed =
            Phaser.Input.Keyboard.JustDown(cursors.up) ||
            Phaser.Input.Keyboard.JustDown(cursors.space) ||
            Phaser.Input.Keyboard.JustDown(wasd.up);

        if (jumpPressed && onGround) {
            player.setVelocityY(-620);
        }

        // ---- Animation state ----
        if (!onGround) {
            player.anims.stop();
            if (player.body.velocity.y < 0) {
                player.setTexture('shihtzu_sheet', 'jump_1');
            } else {
                player.setTexture('shihtzu_sheet', 'fall_1');
            }
        } else if (player.body.velocity.x !== 0) {
            if (player.anims.currentAnim?.key !== 'shihtzu-run' || !player.anims.isPlaying) {
                player.anims.play('shihtzu-run', true);
            }
        } else {
            if (player.anims.currentAnim?.key !== 'shihtzu-idle' || !player.anims.isPlaying) {
                player.anims.play('shihtzu-idle', true);
            }
        }
    }

    // ---- Bird spawning ----
    if (time - lastBirdTime > nextBirdDelay) {
        spawnBird.call(this);
        lastBirdTime = time;
        // Slightly randomized cadence; speeds up as the player progresses.
        const progress = Phaser.Math.Clamp(player.x / WORLD_W, 0, 1);
        const minDelay = 700 - progress * 200;
        const maxDelay = 1700 - progress * 600;
        nextBirdDelay = Phaser.Math.Between(minDelay, maxDelay);
    }

    // ---- Cull off-screen birds ----
    birds.children.each((b) => {
        if (b.x < player.x - VIEW_W) {
            b.destroy();
        }
    });

    // ---- Bag spawning ----
    if (time - lastBagTime > nextBagDelay) {
        spawnBag.call(this);
        lastBagTime = time;
        nextBagDelay = Phaser.Math.Between(1800, 4500);
    }

    // ---- Cull off-screen bags ----
    bags.children.each((b) => {
        if (b.x < player.x - VIEW_W) {
            b.destroy();
        }
    });

    // ---- HUD ----
    const meters = Math.max(0, Math.floor((player.x - 120) / 20));
    scoreText.setText('Distance: ' + meters + ' m');

    // ---- Win condition ----
    if (player.x >= WORLD_W - 110) {
        gameState = 'won';
        player.setVelocityX(0);
        centerText.setText('YOU MADE IT!\nPress R to play again');
    }
}

function spawnBird() {
    const spawnX = player.x + VIEW_W * 0.7 + Phaser.Math.Between(0, 200);
    const spawnY = Phaser.Math.Between(140, GROUND_Y - 60);

    const bird = birds.create(spawnX, spawnY, 'bird_sheet', 'b_fly_1');
    bird.setScale(0.22);
    bird.body.setAllowGravity(false);
    bird.body.setSize(150, 220);
    bird.body.setOffset((BIRD_W - 150) / 2, (BIRD_H - 220) / 2);

    const speed = Phaser.Math.Between(170, 280);
    bird.setVelocityX(-speed);
    // Birds fly left toward the player; flip the sprite so they face left.
    bird.setFlipX(false);
    // Gentle vertical bob
    bird.setVelocityY(Phaser.Math.Between(-30, 30));

    bird.anims.play('bird-fly');
}

function spawnBag() {
    const spawnX = player.x + VIEW_W * 0.6 + Phaser.Math.Between(0, 400);
    if (spawnX > WORLD_W - 150) return;

    const bag = bags.create(spawnX, 0, 'pedigree_bag');
    bag.body.setAllowGravity(false);

    // Half the shih tzu's rendered height
    const targetHeight = SHIH_H * player.scale * 0.5;
    bag.setScale(targetHeight / bag.height);

    // Sit on the ground
    bag.y = GROUND_Y - bag.displayHeight / 2;
    bag.body.updateFromGameObject();
}

function collectBag(playerSprite, bag) {
    bag.destroy();
    points += 1;
    pointsText.setText('Score: ' + points);
}

function roar() {
    if (isRoaring) return;
    isRoaring = true;

    player.setVelocityX(0);
    player.anims.stop();
    player.setTexture('shihtzu_sheet', 'roar_1');

    // Knock out only birds within ROAR_RANGE of the dog
    birds.children.each((b) => {
        const dist = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
        if (dist <= ROAR_RANGE) {
            b.body.enable = false;
            b.anims.stop();
            b.setTexture('bird_sheet', 'b_hurt_1');
            this.tweens.add({
                targets: b,
                alpha: 0,
                y: b.y - 30,
                angle: 90,
                duration: 450,
                onComplete: () => b.destroy()
            });
        }
    });

    this.time.delayedCall(550, () => {
        isRoaring = false;
    });
}

function hitBird(playerSprite, bird) {
    if (invulnerable || gameState !== 'playing') return;

    bird.destroy();
    lives -= 1;
    livesText.setText('Lives: ' + lives);

    // Knock-back + i-frames
    playerSprite.setVelocityY(-300);
    playerSprite.setVelocityX(playerSprite.flipX ? 180 : -180);
    playerSprite.setTint(0xff5555);
    invulnerable = true;
    this.time.delayedCall(900, () => {
        invulnerable = false;
        playerSprite.clearTint();
    });

    if (lives <= 0) {
        gameState = 'gameover';
        playerSprite.setVelocityX(0);
        playerSprite.setTexture('shihtzu_sheet', 'hurt_1');
        playerSprite.anims.stop();
        centerText.setText('GAME OVER\nPress R to retry');
    }
}
