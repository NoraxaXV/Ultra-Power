"use strict";
console.log("hello!");
// Global Static class to keep track of input
class Input {
    constructor() {
        throw new TypeError('Input is a static class and cannot be instatianted.');
    }
}
// Current State of the player's animation
var AnimState;
(function (AnimState) {
    AnimState[AnimState["STATE_WALKING"] = 0] = "STATE_WALKING";
    AnimState[AnimState["STATE_ATTACKING"] = 1] = "STATE_ATTACKING";
})(AnimState || (AnimState = {}));
;
var Directions;
(function (Directions) {
    Directions["Down"] = "down";
    Directions["Up"] = "up";
    Directions["Left"] = "left";
    Directions["Right"] = "right";
})(Directions || (Directions = {}));
var LPCAnims;
(function (LPCAnims) {
    LPCAnims["spell_cast"] = "spell_cast";
    LPCAnims["thrust"] = "thrust";
    LPCAnims["walk"] = "walk";
    LPCAnims["slash"] = "slash";
    LPCAnims["shoot"] = "shoot";
})(LPCAnims || (LPCAnims = {}));
class Player {
    constructor(sprite, textureName, loadOversizeAnims = false) {
        this.sprite = sprite;
        this.textureName = textureName;
        this.animState = AnimState.STATE_WALKING;
        this.animParameters = {
            direction: Directions.Down
        };
        this.attackRate = 1;
        this.speed = 8;
        this.createLpcAnimDatabase(textureName, [
            { name: 'spell_cast', numOfFrames: 7, loop: 1 },
            { name: 'thrust', numOfFrames: 8, loop: 1 },
            { name: 'walk', numOfFrames: 9, loop: -1 },
            { name: 'slash', numOfFrames: 6, loop: 1 },
            { name: 'shoot', numOfFrames: 13, loop: 1 },
        ], loadOversizeAnims);
    }
    // Create a database of animations for our sprite
    createLpcAnimDatabase(textureName, listOfAnims, loadOverizeAnims) {
        // This is to account for the blank spots since not all anims take up a full row
        var maxRowSize = 24;
        var oversizeAnimName = '';
        var directions = ["up", "left", "down", "right"];
        var lastIndex = 0;
        for (let i = 0; i < listOfAnims.length; i++) {
            let currAnim = listOfAnims[i];
            for (let d = 0; d < 4; d++) {
                let reel = [];
                for (let r = lastIndex; r < lastIndex + maxRowSize; r++) {
                    if (r < currAnim.numOfFrames + lastIndex) {
                        reel.push(r);
                    }
                }
                lastIndex += maxRowSize;
                // console.log(`${ textureName }_${ currAnim.name }_${directions[d]} = ${reel}`);
                // Anims are set using the following pattern: name_animation_direction (eg: wizard_walk_up)
                if (!currAnim.hasOverize) {
                    if (!game.anims.create({ key: `${textureName}_${currAnim.name}_${directions[d]}`, frames: game.anims.generateFrameNumbers(textureName, { frames: reel }), repeat: currAnim.loop })) {
                        throw new Error(`Create anim failed!`);
                    }
                }
                else if (oversizeAnimName === '') {
                    oversizeAnimName = currAnim.name;
                }
                else
                    console.warn('Can only have one anim marked as hasOversize, the anim ' + currAnim.name + 'will fail to load');
            }
        }
    }
    update(time, delta) {
        this.getNextAnimatorState();
        this.animate();
        this.move(delta);
    }
    move(delta) {
        this.sprite.setVelocity(0, 0);
        // Horizontal Movement
        if (Input.cursors.left.isDown) {
            this.sprite.setVelocityX(-this.speed * delta);
            this.animParameters.direction = Directions.Left;
        }
        else if (Input.cursors.right.isDown) {
            this.sprite.setVelocityX(this.speed * delta);
            this.animParameters.direction = Directions.Right;
        }
        // Vertical Movement
        if (Input.cursors.up.isDown) {
            this.sprite.setVelocityY(-this.speed * delta);
            this.animParameters.direction = Directions.Up;
        }
        else if (Input.cursors.down.isDown) {
            this.sprite.setVelocityY(this.speed * delta);
            this.animParameters.direction = Directions.Down;
        }
    }
    // updates the animator state machine
    getNextAnimatorState() {
        switch (this.animState) {
            case AnimState.STATE_WALKING:
                if (Input.keyboard.checkDown(Input.attackKey, this.attackRate * 1000)) {
                    this.animState = AnimState.STATE_ATTACKING;
                }
                break;
            case AnimState.STATE_ATTACKING:
                if (this.sprite.anims.getProgress() >= 1) {
                    this.animState = AnimState.STATE_WALKING;
                }
                break;
        }
    }
    // Updates the player's animation based on his animation state
    animate() {
        switch (this.animState) {
            case AnimState.STATE_WALKING:
                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnims.walk);
                else
                    this.sprite.anims.stop();
                break;
            case AnimState.STATE_ATTACKING:
                this.playAnim(LPCAnims.thrust);
                break;
            default: throw new Error('Invalid Anim State!');
        }
    }
    playAnim(name, ignoreIfPlaying = true) {
        this.sprite.play(`${this.textureName}_${name}_${this.animParameters.direction}`, ignoreIfPlaying);
    }
}
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
        // our two characters
        this.load.spritesheet('player', 'assets/RPG_assets.png', { frameWidth: 16, frameHeight: 16 });
        // Load the image twice: once for regular anims and second for oversize
        // Anims are in 64x64 boxes with 24 boxes per row
        this.load.spritesheet('wizard', 'assets/LPC_black_wizard_m.png', { frameWidth: 64, frameHeight: 64 });
        // Oversize anims start on frame 168
        this.load.spritesheet('wizard_oversize', 'assets/LPC_black_wizard_m.png', { frameWidth: 64 * 3, frameHeight: 64 * 3 });
    }
    ;
    create() {
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
        this.createMap();
        this.createPlayer();
        Input.cursors = this.input.keyboard.createCursorKeys();
        Input.keyboard = this.input.keyboard;
        Input.attackKey = Input.keyboard.addKey('SPACE', true);
    }
    createMap() {
        this.map = this.make.tilemap({ key: 'map' });
        const tiles = this.map.addTilesetImage('spritesheet', 'tiles');
        this.grass = this.map.createStaticLayer('Grass', tiles, 0, 0);
        this.obstacles = this.map.createStaticLayer('Obstacles', tiles, 0, 0);
        this.obstacles.setCollisionByExclusion([-1]);
    }
    createPlayer() {
        this.player = new Player(this.physics.add.sprite(50, 100, 'wizard', 0), 'wizard');
        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;
        this.player.sprite.setCollideWorldBounds(true);
    }
    update(time, delta) {
        this.player.update(time, delta);
    }
}
;
var config = {
    type: Phaser.AUTO,
    parent: 'content',
    width: 640,
    height: 480,
    zoom: 1,
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
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