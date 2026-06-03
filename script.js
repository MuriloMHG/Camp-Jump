const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreLabel = document.getElementById('scoreLabel');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScore = document.getElementById('finalScore');

if (window.NexusGameSDK) {                                                                                                                                                    
        window.NexusGameSDK.init({                                                                                                                                                
            gameSlug: 'camp-jump', // Alterado para o slug correto do Camp Jump                                                                                                   
            onAuth: (auth) => {                                                                                                                                                   
                console.log("Conectado ao Nexus Hub!", auth);                                                                                                                     
            }                                                                                                                                                                     
        });                                                                                                                                                                       
    }

const AUDIO_ASSETS = {
    background_music: 'assets/audio/background_music.mp3',
    jump: 'assets/audio/jump.wav',
    hiHurt: 'assets/audio/hitHurt.wav',
    game_over: 'assets/audio/game_over.mp3'
}

const ASSET_PATHS = {
    background: 'assets/background.png',
    playerIdle: 'assets/Imagens 2d Boneco/Parado.png',
    playerJump: 'assets/Imagens 2d Boneco/Pulando.png',
    playerRun1: 'assets/Imagens 2d Boneco/Andando1.png',
    playerRun2: 'assets/Imagens 2d Boneco/Andando2.png',
    clouds: [
    'assets/clouds/Clouds.png',
    'assets/clouds/Clouds.png'
    ],
    trees: [
    'assets/trees/forest1.png',
    'assets/trees/forest2.png'
    ],
    grounds: [
    'assets/grounds/ground1.png',
    'assets/grounds/ground2.png',
    'assets/grounds/ground3.png'
    ],
    obstacles: [
    'assets/Obstacles/Box.png', // 141x198
    'assets/Obstacles/Cone.png' // 215x215
    ]
};

const CONFIG = {
    gravity: 2200,
    jumpForce: 880,
    groundHeight: 160,
    baseSpeed: 540,
    maxSpeed: 1100,
    acceleration: 8,
    obstacleSpawnMin: 0.85,
    obstacleSpawnMax: 1.65,
    cloudSpawnMin: 2.2,
    cloudSpawnMax: 4.5,
    groundTileWidth: 550,
    forestHeight: 350,
    forestOverlap: 150,
    forestFallbackWidth: 720,
    showHitboxes: false,
    scoreRate: 12,
    playerWidth: 150,
    playerHeight: 150,
    obstacleMinWidth: 56,
    obstacleMaxWidth: 78,
    obstacleMinHeight: 55,
    obstacleMaxHeight: 100
};

const imageCache = new Map();

function loadImage(src) {
    return new Promise((resolve) => {
        if (!src) return resolve(null);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

class Input {
    constructor() {
        this.jumpQueued = false;
        this.toggleHitboxQueued = false;
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
            e.preventDefault();
            this.jumpQueued = true;
            }
        });
    }

    consumeJump() {
        const value = this.jumpQueued;
        this.jumpQueued = false;
        return value;
    }

    consumeToggleHitbox() {
        const value = this.toggleHitboxQueued;
        this.toggleHitboxQueued = false;
        return value;
    }
}

class ParallaxItem {
    constructor({ x, y, width, height, speedFactor, image, color, kind }) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.speedFactor = speedFactor;
        this.image = image;
        this.color = color;
        this.kind = kind;
    }

    update(dt, speed) {
        this.x -= speed * this.speedFactor * dt;
    }

    draw() {
        if (this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            return;
        }
    }
}

class ForestTile {
  constructor(x, image, width, height) {
    this.x = x;
    this.image = image;
    this.width = width;
    this.height = height;
  }

  update(dt, speed) {
    this.x -= speed * dt;
  }

  draw(y) {
    if (this.image) {
      ctx.drawImage(this.image, this.x, y, this.width, this.height);
      return;
    }
  }
}

class GroundTile {
    constructor(x, image) {
        this.x = x;
        this.image = image;
        this.width = CONFIG.groundTileWidth;
        this.height = CONFIG.groundHeight;
    }

    update(dt, speed) {
        this.x -= speed * dt;
    }

    draw(groundY) {
        if (this.image) {
            ctx.drawImage(this.image, this.x, groundY, this.width, this.height);
            return;
    }

    }
}

class Player {
    constructor(images) {
        this.images = images;
        this.width = CONFIG.playerWidth;
        this.height = CONFIG.playerHeight;
        this.x = 140;
        this.y = 0;
        this.velY = 0;
        this.isOnGround = true;
        this.frameTimer = 0;
        this.runFrame = 0;
    }

    reset(groundY) {
        this.width = CONFIG.playerWidth;
        this.height = CONFIG.playerHeight;
        this.x = 140;
        this.y = groundY - this.height + 12;
        this.velY = 0;
        this.isOnGround = true;
        this.frameTimer = 0;
        this.runFrame = 0;
    }

    jump() {
        if (!this.isOnGround) return;
        this.velY = -CONFIG.jumpForce;
        this.isOnGround = false;
    }

    update(dt, groundY) {
        this.velY += CONFIG.gravity * dt;
        this.y += this.velY * dt;

        const floorY = groundY - this.height + 70;
        if (this.y >= floorY) {
            this.y = floorY;
            this.velY = 0;
            this.isOnGround = true;
        }

        if (this.isOnGround) {
            this.frameTimer += dt;
            if (this.frameTimer >= 0.12) {
            this.frameTimer = 0;
            this.runFrame = (this.runFrame + 1) % 2;
            }
        }
    }

    getHitbox() {
        return {
            x: this.x + 36,
            y: this.y + 15,
            width: this.width - 80,
            height: this.height - 40
        };
    }

    draw() {
        const image = this.isOnGround
            ? (this.runFrame === 0 ? this.images.run1 : this.images.run2)
            : this.images.jump;

        if (image) {
            ctx.drawImage(image, this.x, this.y, this.width, this.height);
            return;
        }

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(this.x + 22, this.y + 20, 52, 72);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 62, this.y + 34, 8, 8);
    }
}

class Obstacle {
    constructor({ x, y, width, height, image, type }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.image = image;
    this.type = type;
    }

    update(dt, speed) {
    this.x -= speed * dt;
    }

    draw() {
    if (this.image) {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        return;
    }

    }

    getHitbox() {
        if (this.type === 'cone'){
            return{
                x: this.x + this.width * 0.18,
                y: this.y + this.height * 0.15,
                width: this.width * 0.64,
                height: this.height * 0.80
            }
        }
        return {
            x: this.x + this.width * 0.10,
            y: this.y + this.height * 0.12,
            width: this.width * 0.80,
            height: this.height * 0.82
        };
    }
}

class AudioManager {
  constructor(paths) {
    this.sounds = {};
    this.music = null;

    this.paths = paths;
  }

  async load() {
    for (const key in this.paths) {
        const audio = new Audio(this.paths[key]);
        audio.preload = "auto";

        if (key === "background_music") {
            audio.loop = true;
            audio.volume = 0.35;
            this.music = audio;
        } else {
            audio.volume = 0.6;
            this.sounds[key] = audio;
        }
    }
  }

  play(name) {
    const sound = this.sounds[name];
    if (!sound) return;

    const clone = sound.cloneNode();
    clone.volume = sound.volume;
    clone.play();
  }

  stopAudio(name){
    const audio = this.sounds[name];
    if(!audio) return;
    const clone = sound.cloneNode();
    clone.volume = audio.volume;
    clone.stop();
  }

  playMusic() {
    if (this.music) {
      this.music.currentTime = 0;
      this.music.play();
    }
  }

  stopMusic() {
    if (this.music) {
      this.music.pause();
    }
  }
}

class Game {
    constructor() {
        this.input = new Input();
        this.assets = {
            background: null,
            playerIdle: null,
            playerJump: null,
            playerRun1: null,
            playerRun2: null,
            clouds: [],
            forestStrips: [],
            grounds: [],
            obstacles: []
        };
        this.audio = new AudioManager(AUDIO_ASSETS);
        this.audioHitHurt = AUDIO_ASSETS.hiHurt;
        this.player = null;
        this.obstacles = [];
        this.clouds = [];
        this.forestTiles = [];
        this.groundTiles = [];
        this.lastTime = 0;
        this.isStarted = false;
        this.isGameOver = false;
        this.score = 0;
        this.showHitboxes = CONFIG.showHitboxes;
        this.speed = CONFIG.baseSpeed;
        this.obstacleTimer = 0;
        this.nextObstacleSpawn = rand(CONFIG.obstacleSpawnMin, CONFIG.obstacleSpawnMax);
        this.cloudTimer = 0;
        this.nextCloudSpawn = rand(CONFIG.cloudSpawnMin, CONFIG.cloudSpawnMax);
    }

    async init() {
        await this.audio.load();
        await this.loadAssets();
        this.player = new Player({
            idle: this.assets.playerIdle,
            jump: this.assets.playerJump,
            run1: this.assets.playerRun1,
            run2: this.assets.playerRun2
        });
        this.resize();
        this.reset();
        window.addEventListener('resize', () => this.resize());
        requestAnimationFrame((time) => this.loop(time));
    }

    async loadAssets() {
        this.assets.background = await loadImage(ASSET_PATHS.background);
        this.assets.playerIdle = await loadImage(ASSET_PATHS.playerIdle);
        this.assets.playerJump = await loadImage(ASSET_PATHS.playerJump);
        this.assets.playerRun1 = await loadImage(ASSET_PATHS.playerRun1);
        this.assets.playerRun2 = await loadImage(ASSET_PATHS.playerRun2);
        this.assets.clouds = await Promise.all(ASSET_PATHS.clouds.map(loadImage));
        this.assets.forestStrips = await Promise.all(ASSET_PATHS.trees.map(loadImage));
        this.assets.grounds = await Promise.all(ASSET_PATHS.grounds.map(loadImage));
        this.assets.obstacles = await Promise.all(ASSET_PATHS.obstacles.map(loadImage));
    }

    resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        this.groundY = canvas.height - CONFIG.groundHeight;

        if (this.player) {
            this.player.reset(this.groundY);
        }

        this.createGround();
        this.createForestLayer();
    }

    createGround() {
        this.groundTiles = [];
        const totalTiles = Math.ceil(canvas.width / CONFIG.groundTileWidth) + 3;
        for (let i = 0; i < totalTiles; i++) {
            this.groundTiles.push(new GroundTile(i * CONFIG.groundTileWidth, pick(this.assets.grounds)));
        }
    }

    createForestLayer() {
        this.forestTiles = [];

        const forestHeight = CONFIG.forestHeight;
        const fallbackWidth = CONFIG.forestFallbackWidth;
        const overlap = CONFIG.forestOverlap;

        const totalTiles = Math.ceil(canvas.width / Math.max(1, fallbackWidth - overlap)) + 4;

        for (let i = 0; i < totalTiles; i++) {
            const image = pick(this.assets.forestStrips);
            const width = image
                ? Math.max(1, image.width * (forestHeight / image.height))
                : fallbackWidth;

            const x = i === 0
                ? 0
                : this.forestTiles[i - 1].x + this.forestTiles[i - 1].width - overlap;

            this.forestTiles.push(new ForestTile(x, image, width, forestHeight));
        }
    }

    reset() {
        this.isStarted = false;
        this.isGameOver = false;
        this.score = 0;
        this.speed = CONFIG.baseSpeed;
        this.obstacles = [];
        this.clouds = [];
        this.obstacleTimer = 0;
        this.nextObstacleSpawn = rand(CONFIG.obstacleSpawnMin, CONFIG.obstacleSpawnMax);
        this.cloudTimer = 0;
        this.nextCloudSpawn = rand(CONFIG.cloudSpawnMin, CONFIG.cloudSpawnMax);
        this.createGround();
        this.createForestLayer();
        this.player.reset(this.groundY);
        scoreLabel.textContent = '0000';
        gameOverOverlay.classList.add('hidden');
        startOverlay.classList.remove('hidden');
    }

    start() {
        this.audio.playMusic();
        this.isStarted = true;
        this.isGameOver = false;
        startOverlay.classList.add('hidden');
        gameOverOverlay.classList.add('hidden');
    }

    gameOver() {                                                                                                                                                              
            this.isGameOver = true;                                                                                                                                               
            this.audio.stopMusic();                                                                                                                                               
            this.audio.play('game_over');                                                                                                                                         
                                                                                                                                                                                  
            // Exibe as telas de fim de jogo do seu script                                                                                                                        
            if (gameOverOverlay) gameOverOverlay.style.display = 'flex';                                                                                                          
            if (finalScore) finalScore.textContent = Math.floor(this.score);                                                                                                      
                                                                                                                                                                                  
            // ==========================================                                                                                                                         
            // ADICIONE ESTE BLOCO AQUI ABAIXO:                                                                                                                                   
            // ==========================================                                                                                                                         
            if (window.NexusGameSDK) {                                                                                                                                            
                const pontuacaoFinal = Math.floor(this.score);                                                                                                                    
                window.NexusGameSDK.submitScore(pontuacaoFinal, {                                                                                                                 
                    levelReached: "fase_final" // metadados opcionais se quiser salvar no banco                                                                                   
                });                                                                                                                                                               
                console.log("Score de Camp Jump enviado ao Nexus:", pontuacaoFinal);                                                                                              
            }                                                                                                                                                                     
            // ==========================================                                                                                                                         
        }

    spawnObstacle() {
        const isCone = Math.random() < 0.5;
        const width = isCone ? randInt(52, 64) : randInt(60, 82);
        const height = isCone ? randInt(68, 94) : randInt(54, 74);
        const image = this.assets.obstacles[isCone ? 1 : 0] || null;
        const obstacle = new Obstacle({
            x: canvas.width + randInt(0, 120),
            y: this.groundY - height + 50,
            width,
            height,
            image,
            type: isCone ? 'cone' : 'box'
        });
        this.obstacles.push(obstacle);
    }

    spawnCloud() {
        const width = randInt(120, 220);
        const height = width * 0.6;
        this.clouds.push(new ParallaxItem({
            x: canvas.width + 30,
            y: randInt(40, Math.max(50, canvas.height * 0.28)),
            width,
            height,
            speedFactor: rand(0.10, 0.18),
            image: pick(this.assets.clouds),
            color: '#fff',
            kind: 'cloud'
        }));
    }

    update(dt) {
        if (this.input.consumeToggleHitbox()) {
            this.showHitboxes = !this.showHitboxes;
        }

        if (this.input.consumeJump()) {
            if (!this.isStarted && !this.isGameOver) {
            this.start();
            if(this.player.isOnGround){this.audio.play('jump')};
            this.player.jump();
            } else if (this.isGameOver) {
            this.reset();
            this.start();
            if(this.player.isOnGround){this.audio.play('jump')};
            this.player.jump();
            } else {
            if(this.player.isOnGround){this.audio.play('jump')};
            this.player.jump();
            }
        }

        if (!this.isStarted || this.isGameOver) return;

        this.speed = Math.min(CONFIG.maxSpeed, this.speed + CONFIG.acceleration * dt * 12);
        this.score += CONFIG.scoreRate * dt * (this.speed / CONFIG.baseSpeed);
        scoreLabel.textContent = String(Math.floor(this.score)).padStart(4, '0');

        this.player.update(dt, this.groundY);

        for (const tile of this.groundTiles) {
            tile.update(dt, this.speed);
        }
        for (const obstacle of this.obstacles) {
            obstacle.update(dt, this.speed);
        }
        for (const cloud of this.clouds) {
            cloud.update(dt, this.speed);
        }
        for (const tile of this.forestTiles) {
            tile.update(dt, this.speed * 0.35);
        }

        // Recycle ground tiles
        this.groundTiles.sort((a, b) => a.x - b.x);
        const firstTile = this.groundTiles[0];
        const lastTile = this.groundTiles[this.groundTiles.length - 1];
        if (firstTile.x + firstTile.width <= 0) {
            firstTile.x = lastTile.x + lastTile.width - 2;
            firstTile.image = pick(this.assets.grounds);
        }

        //Recycle trees tiles
        this.forestTiles.sort((a, b) => a.x - b.x);
        const firstForest = this.forestTiles[0];
        const lastForest = this.forestTiles[this.forestTiles.length - 1];
        const overlap = CONFIG.forestOverlap;

        if (firstForest.x + firstForest.width <= 0) {
            const image = pick(this.assets.forestStrips);
            const height = CONFIG.forestHeight;
            const width = image
                ? Math.max(1, image.width * (height / image.height))
                : CONFIG.forestFallbackWidth;

            firstForest.x = lastForest.x + lastForest.width - overlap;
            firstForest.image = image;
            firstForest.width = width;
            firstForest.height = height;
        }

        this.obstacles = this.obstacles.filter(o => o.x + o.width > -40);
        this.clouds = this.clouds.filter(c => c.x + c.width > -50);

        this.obstacleTimer += dt;
        this.cloudTimer += dt;

        if (this.obstacleTimer >= this.nextObstacleSpawn) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
            const difficultyReduction = Math.min(0.35, this.score / 6000);
            this.nextObstacleSpawn = rand(
            Math.max(0.6, CONFIG.obstacleSpawnMin - difficultyReduction),
            Math.max(1.05, CONFIG.obstacleSpawnMax - difficultyReduction)
            );
        }

        if (this.cloudTimer >= this.nextCloudSpawn) {
            this.spawnCloud();
            this.cloudTimer = 0;
            this.nextCloudSpawn = rand(CONFIG.cloudSpawnMin, CONFIG.cloudSpawnMax);
        }


        const p = this.player.getHitbox();
        for (const obstacle of this.obstacles) {
            const o = obstacle.getHitbox();
            const collides = p.x < o.x + o.width &&
                            p.x + p.width > o.x &&
                            p.y < o.y + o.height &&
                            p.y + p.height > o.y;
            if (collides) {
                this.audio.play('hiHurt');
                this.gameOver();
                break;
            }
        }
    }

    drawBackground() {
        if (this.assets.background) {
            ctx.drawImage(this.assets.background, 0, 0, canvas.width, canvas.height);
            return;
        }
    }

    draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        this.drawBackground();

        for (const cloud of this.clouds) cloud.draw();

        const forestY = this.groundY - 275; // ajuste fino visual
        for (const tile of this.forestTiles) {
            tile.draw(forestY);
        }

        // Shadow strip near horizon
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(0, this.groundY - 14, canvas.width, 24);

        for (const tile of this.groundTiles) {
            tile.draw(this.groundY);
        }

        for (const obstacle of this.obstacles) {
            obstacle.draw();
        }

        this.player.draw();

        if (this.showHitboxes) {
            ctx.save();
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
            const p = this.player.getHitbox();
            ctx.strokeRect(p.x, p.y, p.width, p.height);

            ctx.strokeStyle = 'rgba(80, 200, 255, 0.9)';
            for (const obstacle of this.obstacles) {
                const o = obstacle.getHitbox();
                ctx.strokeRect(o.x, o.y, o.width, o.height);
            }
            ctx.restore();
        }
    }

    loop(timestamp) {
        const dt = Math.min(0.025, (timestamp - this.lastTime) / 1000 || 0);
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        requestAnimationFrame((time) => this.loop(time));
    }
}

function cloudSafeDraw(entity) {
    entity.draw();
}

const game = new Game();
game.init();
