"use strict";
// Global Static class to keep track of input
class Input {
    constructor() {
        throw new TypeError('Input is a static class and cannot be instatianted.');
    }
}
var LPCAnim;
(function (LPCAnim) {
    LPCAnim["spell_cast"] = "spell_cast";
    LPCAnim["thrust"] = "thrust";
    LPCAnim["walk"] = "walk";
    LPCAnim["slash"] = "slash";
    LPCAnim["shoot"] = "shoot";
    LPCAnim["none"] = "none";
})(LPCAnim || (LPCAnim = {}));
class AnimData {
    constructor() {
        this.loop = -1;
        this.duration = 500;
    }
}
class LPCSprite {
    // Instance
    constructor(name, fileUrl) {
        this.name = name;
        this.fileUrl = fileUrl;
        this.oversizeAnim = null;
    }
    static load(load, spriteToLoad) {
        // Load the image twice: once for regular anims and second for oversize
        // Anims are in 64x64 boxes with 24 boxes per row
        load.spritesheet(spriteToLoad.name, spriteToLoad.fileUrl, { frameHeight: 64, frameWidth: 64 });
        if (spriteToLoad.oversizeAnim != null) {
            // Oversize anims start on frame 56 (total size is 8x11 grid)
            load.spritesheet(spriteToLoad.name + '_oversize', spriteToLoad.fileUrl, { frameHeight: 64 * 3, frameWidth: 64 * 3, startFrame: 56 });
        }
        this.loadedSprites.push(spriteToLoad);
    }
    static createAnimationDatabase() {
        this.loadedSprites.forEach((sprite) => {
            let listOfAnims = this.animData;
            let oversizeName = sprite.oversizeAnim;
            let textureName = sprite.name;
            // This is to account for the blank spots since not all anims take up a full row
            let maxRowSize = (oversizeName != null) ? 24 : 13;
            let directions = ["up", "left", "down", "right"];
            let lastIndex = 0;
            let lastOversizeIndex = 56;
            for (let i = 0; i < listOfAnims.length; i++) {
                let currAnim = listOfAnims[i];
                let isOversize = currAnim.name === oversizeName;
                // Go through each of the four directions
                for (let d = 0; d < 4; d++) {
                    let reel = [];
                    let loadName = textureName;
                    if (!isOversize) {
                        // Handles regular anims
                        for (let r = lastIndex; r < lastIndex + maxRowSize; r++) {
                            if (r < currAnim.numOfFrames + lastIndex) {
                                reel.push(r);
                            }
                        }
                    }
                    else {
                        // Handle oversize anims
                        loadName = textureName + '_oversize';
                        // Handles special oversize anims
                        for (let r = lastOversizeIndex; r < lastOversizeIndex + currAnim.numOfFrames; r++) {
                            reel.push(r);
                        }
                        lastOversizeIndex += 8;
                    }
                    // console.log(`${ textureName }_${ currAnim.name }_${directions[d]} = ${reel}`);
                    // Anims are set using the following pattern: name_animation_direction (eg: wizard_walk_up)
                    // console.log(`creating ${textureName}_${currAnim.name}_${directions[d]} with anim reel ${reel} and textureName ${loadName}`);
                    let anim = game.anims.create({
                        key: `${textureName}_${currAnim.name}_${directions[d]}`, duration: currAnim.duration, frames: game.anims.generateFrameNumbers(loadName, { frames: reel }), repeat: currAnim.loop, defaultTextureKey: loadName
                    });
                    this.animCache.push(anim);
                    if (anim == false) {
                        throw new Error(`Create anim failed, invalid key! animKey = ${textureName}_${currAnim.name}_${directions[d]}`);
                    }
                    // Always increment even if we loaded oversize to ignore gaps
                    lastIndex += maxRowSize;
                }
            }
        });
    }
}
// Static funcions and properties
LPCSprite.loadedSprites = [];
LPCSprite.animData = [
    { name: LPCAnim.spell_cast, numOfFrames: 7, loop: 1, duration: 500 },
    { name: LPCAnim.thrust, numOfFrames: 8, loop: 1, duration: 500 },
    { name: LPCAnim.walk, numOfFrames: 9, loop: -1, duration: 500 },
    { name: LPCAnim.slash, numOfFrames: 6, loop: 1, duration: 500 },
    { name: LPCAnim.shoot, numOfFrames: 13, loop: 1, duration: 500 },
];
LPCSprite.animCache = [];
// All states shared by all entities
var States;
(function (States) {
    States["STATE_WALKING"] = "walking";
    States["STATE_ATTACKING"] = "attacking";
    States["STATE_DOING_DAMAGE"] = "doing damage";
})(States || (States = {}));
;
var Directions;
(function (Directions) {
    Directions["Down"] = "down";
    Directions["Up"] = "up";
    Directions["Left"] = "left";
    Directions["Right"] = "right";
})(Directions || (Directions = {}));
// Global factory creates sprites
let physicsFactory;
// An Entity contains the functionality players and monsters share: the ablity to move, attack, etc..
class Entity {
    constructor(x, y, key, config) {
        this.state = States.STATE_WALKING;
        this.stateData = {
            direction: Directions.Down
        };
        this.sprite = physicsFactory.sprite(x, y, key, 0);
        this.textureName = key;
        this.health = (config.health) ? config.health : 100;
        this.speed = (config.speed) ? config.speed : 1;
        this.attackRange = (config.attackRange) ? config.attackRange : 10;
        this.attackFOV = (config.attackRange) ? config.attackRange : 90;
        this.sprite.name = (config.name) ? config.name : key + (Entity.entities.push(this) - 1);
        this.sprite.setCollideWorldBounds((config.collideWorldBounds) ? config.collideWorldBounds : false);
        this.sprite.setCircle(this.sprite.width * this.sprite.scale);
        this.dump();
    }
    static updateAllEntities(timeStamp, delta) {
        var ts = timeStamp;
        var d = delta;
        this.entities.forEach((entity) => { entity.update(ts, d); });
    }
    playAnim(name, ignoreIfPlaying = true) {
        let fullName = `${this.textureName}_${name}_${this.stateData.direction}`;
        this.sprite.play(fullName, ignoreIfPlaying);
        return fullName;
    }
    checkForCollision(gameScene, objects) {
        objects.getChildren().forEach((object) => {
        });
    }
    move(direction, delta) {
        let movement = direction.normalize().scale(delta * this.speed);
        this.sprite.setVelocity(movement.x, movement.y);
        this.updateDirection();
    }
    takeDamage(amount) {
    }
    dump() {
        console.log(`${this.sprite.name}:
    Texture: ${this.textureName}
    Health: ${this.health}
    Speed: ${this.speed}
    Attack Range: ${this.attackRange}
    Attack FOV: ${this.attackFOV}
    Anim State: ${this.state}
    State Data: ${JSON.stringify(this.stateData)}
    Sprite: ${JSON.stringify(this.sprite.toJSON())}
`);
    }
    // Updates the currently facing animation direction
    updateDirection() {
        let currentVelocity = this.sprite.body.velocity;
        if (currentVelocity.x == 0 && currentVelocity.y == 0) {
            return this.stateData.direction;
        }
        let angle = currentVelocity.angle() * (180 / Math.PI);
        if (angle <= 45 || angle >= 315) {
            this.stateData.direction = Directions.Right;
        }
        else if (angle > 45 && angle < 135) {
            this.stateData.direction = Directions.Down;
        }
        else if (angle >= 135 && angle <= 225) {
            this.stateData.direction = Directions.Left;
        }
        else if (angle > 225 && angle < 315) {
            this.stateData.direction = Directions.Up;
        }
        else {
            console.log(`${this.textureName}: angle=${angle}`);
        }
        return this.stateData.direction;
    }
    update(timeStamp, delta) {
        this.getNextState();
        this.updateState(delta);
    }
    ;
}
Entity.entities = [];
// Global player
let player;
class Player extends Entity {
    constructor(x, y, key, config) {
        super(x, y, key, config);
        this.attackRate = 1;
        this.attackAnim = config.attackAnim;
    }
    // Checks for changes to the state
    getNextState() {
        switch (this.state) {
            case States.STATE_WALKING:
                if (Input.keyboard.checkDown(Input.attackKey, this.attackRate * 1000)) {
                    this.state = States.STATE_ATTACKING;
                }
                break;
            case States.STATE_ATTACKING:
                if (this.sprite.anims.getProgress() >= 1) {
                    this.state = States.STATE_DOING_DAMAGE;
                }
                break;
            case States.STATE_DOING_DAMAGE:
                if (Input.keyboard.checkDown(Input.attackKey, this.attackRate * 1000)) {
                    this.state = States.STATE_ATTACKING;
                }
                else {
                    this.state = States.STATE_WALKING;
                }
                break;
            default: throw new Error(`State ${this.state} not implemented!`);
        }
        return this.state;
    }
    // Updates the player's animation based on his animation state
    updateState(delta) {
        switch (this.state) {
            case States.STATE_WALKING:
                let movement = new Phaser.Math.Vector2(0, 0);
                // Horizontal movement
                if (Input.cursors.left.isDown) {
                    movement.x = -1;
                }
                else if (Input.cursors.right.isDown) {
                    movement.x = 1;
                }
                // Vertical Movement
                if (Input.cursors.up.isDown) {
                    movement.y = -1;
                }
                else if (Input.cursors.down.isDown) {
                    movement.y = 1;
                }
                this.move(movement, delta);
                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnim.walk, true);
                else
                    this.sprite.anims.stop();
                break;
            case States.STATE_ATTACKING:
                this.sprite.setVelocity(0, 0);
                this.playAnim(this.attackAnim, true);
                break;
            case States.STATE_DOING_DAMAGE:
                Monster.all.forEach((monster) => {
                    monster.takeDamage(1);
                });
                break;
            default: throw new Error(`State ${this.state} not implemented!`);
        }
    }
}
class Monster extends Entity {
    constructor(x, y, key, config) {
        super(x, y, key, config);
        this.stateData = { direction: Directions.Down, distToPlayer: Number.POSITIVE_INFINITY };
        this.minDistToPlayer = config.minDistToPlayer;
        Monster.monsterGroup.add(this.sprite);
        Monster.all.push(this);
    }
    takeDamage(amount) {
        this.health -= amount;
        console.log('Monster took damage! health = ' + this.health);
    }
    getNextState() {
        this.stateData.distToPlayer = player.sprite.getCenter().subtract(this.sprite.getCenter()).lengthSq();
        switch (this.state) {
            case States.STATE_WALKING:
                if (this.stateData.distToPlayer < this.minDistToPlayer * this.minDistToPlayer) {
                    this.state = States.STATE_ATTACKING;
                }
                break;
            case States.STATE_ATTACKING:
                if (this.stateData.distToPlayer > this.minDistToPlayer * this.minDistToPlayer) {
                    this.state = States.STATE_WALKING;
                }
                else if (this.sprite.anims.getProgress() >= 1) {
                    this.state = States.STATE_DOING_DAMAGE;
                }
                break;
            case States.STATE_DOING_DAMAGE:
                if (this.stateData.distToPlayer < this.minDistToPlayer * this.minDistToPlayer) {
                    this.state = States.STATE_ATTACKING;
                }
                else {
                    this.state = States.STATE_WALKING;
                }
                break;
            default: throw new Error(`State ${this.state} not implemented!`);
        }
        return this.state;
    }
    updateState(delta) {
        switch (this.state) {
            case States.STATE_WALKING:
                let toPlayer = player.sprite.getCenter().subtract(this.sprite.getCenter());
                this.move(toPlayer, delta);
                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnim.walk, true);
                break;
            case States.STATE_ATTACKING:
                this.sprite.setVelocity(0, 0);
                this.playAnim(LPCAnim.slash, true);
                break;
            case States.STATE_DOING_DAMAGE:
                console.log('monster damage!');
                break;
            default: throw new Error(`State ${this.state} not implemented!`);
        }
    }
}
Monster.all = [];
class TileMap {
    constructor(scene, config) {
        this.map = scene.make.tilemap(config);
    }
}
class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }
    ;
    preload() {
        // map tiles
        this.load.image('tiles', 'assets/map/spritesheet.png');
        // map in json format
        this.load.tilemapTiledJSON('map', 'assets/map/map.json');
        LPCSprite.load(this.load, { name: 'fighter', fileUrl: 'assets/fighter.png', oversizeAnim: LPCAnim.slash });
        LPCSprite.load(this.load, { name: 'wizard', fileUrl: 'assets/LPC_black_wizard_m.png', oversizeAnim: LPCAnim.thrust });
        LPCSprite.load(this.load, { name: 'archer', fileUrl: 'assets/archer.png' });
        LPCSprite.load(this.load, { name: 'skeleton', fileUrl: 'assets/skeleton.png' });
    }
    ;
    create() {
        LPCSprite.createAnimationDatabase();
        this.scene.start('WorldScene');
    }
    ;
}
;
class WorldScene extends Phaser.Scene {
    constructor() {
        super('WorldScene');
    }
    preload() {
    }
    create() {
        physicsFactory = new Phaser.Physics.Arcade.Factory(this.physics.world);
        this.createMap();
        this.createPlayer();
        this.createMonsters();
        Input.cursors = this.input.keyboard.createCursorKeys();
        Input.keyboard = this.input.keyboard;
        Input.attackKey = Input.keyboard.addKey('SPACE', true, false);
    }
    createMap() {
        this.map = this.make.tilemap({ key: 'map' });
        const tiles = this.map.addTilesetImage('spritesheet', 'tiles');
        this.grass = this.map.createStaticLayer('Grass', tiles, 0, 0);
        this.obstacles = this.map.createStaticLayer('Obstacles', tiles, 0, 0);
        this.obstacles.setCollisionByExclusion([-1]);
        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;
    }
    createPlayer() {
        this.player = new Player(50, 100, 'fighter', { name: '', speed: 8, attackAnim: LPCAnim.slash, collideWorldBounds: true });
        player = this.player;
    }
    createMonsters() {
        Monster.monsterGroup = new Phaser.Physics.Arcade.Group(this.physics.world, this);
        let randPos = new Phaser.Math.Vector2();
        for (var i = 0; i < 5; i++) {
            randPos = Phaser.Math.RandomXY(randPos, 300);
            new Monster(randPos.x + 150, randPos.y + 150, 'skeleton', { speed: Math.random() * 9 + 1, minDistToPlayer: 50, collideWorldBounds: true });
        }
    }
    update(timeStamp, deltaInMs) {
        Entity.updateAllEntities(timeStamp, deltaInMs);
    }
}
;
var config = {
    type: Phaser.AUTO,
    parent: 'content',
    width: 640,
    height: 480,
    zoom: 1.5,
    render: {
        pixelArt: true,
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: { y: 0 }
        }
    },
    scene: [
        BootScene,
        WorldScene
    ]
};
var game = new Phaser.Game(config);
//# sourceMappingURL=main.js.map