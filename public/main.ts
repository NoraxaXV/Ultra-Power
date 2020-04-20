console.log("hello!");


// Global Static class to keep track of input
class Input {
    static keyboard: Phaser.Input.Keyboard.KeyboardPlugin;
    static cursors: Phaser.Types.Input.Keyboard.CursorKeys;
    static attackKey: Phaser.Input.Keyboard.Key;

    constructor()
    {
        throw new TypeError('Input is a static class and cannot be instatianted.');
    }


}



enum LPCAnim
{
    spell_cast = 'spell_cast',
    thrust = 'thrust',
    walk = 'walk',
    slash = 'slash',
    shoot = 'shoot',
    none = 'none'
}

class AnimData
{
    
    name: LPCAnim
    numOfFrames: number
    loop?: number;
    hasOverize?: boolean;
}

var loadedSprites: LPCSprite[] = [];

class LPCSprite {

    // Static funcions and properties
    static loadedSprites: LPCSprite[] = [];

    static animData: AnimData[] = [
        { name: LPCAnim.spell_cast, numOfFrames: 7, loop: 1 },
        { name: LPCAnim.thrust, numOfFrames: 8, loop: 1 },
        { name: LPCAnim.walk, numOfFrames: 9, loop: -1 },
        { name: LPCAnim.slash, numOfFrames: 6, loop: 1 },
        { name: LPCAnim.shoot, numOfFrames: 13, loop: 1 },
    ]

    static load(load: Phaser.Loader.LoaderPlugin, spriteToLoad: LPCSprite) {

        // Load the image twice: once for regular anims and second for oversize

        // Anims are in 64x64 boxes with 24 boxes per row
        load.spritesheet(spriteToLoad.name, spriteToLoad.fileUrl, { frameHeight: 64, frameWidth: 64 });

        if (spriteToLoad.oversizeAnim != null)
        {
            // Oversize anims start on frame 56 (total size is 8x11 grid)
            load.spritesheet(spriteToLoad.name+'_oversize', spriteToLoad.fileUrl, { frameHeight: 64* 3, frameWidth: 64 * 3, startFrame: 56 });
        }

        this.loadedSprites.push(spriteToLoad);
    }

    static animCache: (false | Phaser.Animations.Animation)[]  = [];

    static createAnimationDatabase()
    {
        this.loadedSprites.forEach((sprite: LPCSprite) => {
            let listOfAnims = this.animData;
            let oversizeName = sprite.oversizeAnim;
            let textureName = sprite.name;

            // This is to account for the blank spots since not all anims take up a full row
            let maxRowSize = (oversizeName != null)? 24: 13;
            let directions = ["up", "left", "down", "right"];
            let lastIndex = 0;
            let lastOversizeIndex = 56;

            for (let i = 0; i < listOfAnims.length; i++) {
                let currAnim = listOfAnims[i];
                let isOversize = currAnim.name === oversizeName;
                

                // Go through each of the four directions
                for (let d = 0; d < 4; d++) {
                    let reel: number[] = [];
                    let loadName: string = textureName;

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

                    let anim = game.anims.create({ key: `${textureName}_${currAnim.name}_${directions[d]}`, frames: game.anims.generateFrameNumbers(loadName, { frames: reel }), repeat: currAnim.loop, defaultTextureKey: loadName })
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

    // Instance
    constructor(public name: string, public fileUrl: string)
    {
    }

    oversizeAnim?: LPCAnim = null
}

// Current State of the player's animation
enum AnimState {
    STATE_WALKING,
    STATE_ATTACKING
};

enum Directions {
    Down = 'down',
    Up = 'up',
    Left = 'left',
    Right = 'right'
}

class Player
{
    animState: AnimState = AnimState.STATE_WALKING;
    animParameters = {
        direction: Directions.Down
    };

    attackRate = 1;
    speed = 8;
    textureName: string;

    constructor(public sprite: Phaser.Physics.Arcade.Sprite, public attackAnim: LPCAnim)
    {
        this.textureName = sprite.texture.key;
    }
    

    update(time: number, delta: number)
    {
        this.getNextState();
        this.updateState(delta);
    }

    move(delta: number)
    {
        this.sprite.setVelocity(0, 0);

        // Horizontal Movement
        if (Input.cursors.left.isDown) {
            this.sprite.setVelocityX(-this.speed * delta);
            this.animParameters.direction = Directions.Left;
        } else if (Input.cursors.right.isDown) {
            this.sprite.setVelocityX(this.speed * delta);
            this.animParameters.direction = Directions.Right;
        }

        // Vertical Movement
        if (Input.cursors.up.isDown) {
            this.sprite.setVelocityY(-this.speed * delta);
            this.animParameters.direction = Directions.Up;
        } else if (Input.cursors.down.isDown) {
            this.sprite.setVelocityY(this.speed * delta);
            this.animParameters.direction = Directions.Down;
        }
    }

    // updates the animator state machine
    getNextState()
    {
        switch (this.animState)
        {
            case AnimState.STATE_WALKING:
                if (Input.keyboard.checkDown(Input.attackKey, this.attackRate * 1000))
                {
                    this.animState = AnimState.STATE_ATTACKING;
                }
                break;
            case AnimState.STATE_ATTACKING:
                if (this.sprite.anims.getProgress() >= 1)
                {
                    this.animState = AnimState.STATE_WALKING;
                }
                break;
        }
        
    }

    // Updates the player's animation based on his animation state
    updateState(delta: number)
    {
        switch (this.animState) {

            case AnimState.STATE_WALKING:
                this.move(delta);

                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnim.walk, true);
                else
                    this.sprite.anims.stop();
                break;

            case AnimState.STATE_ATTACKING:
                this.playAnim(this.attackAnim, true);
                break;

            default: throw new Error('Invalid Anim State!');
        }
    }

    playAnim(name: LPCAnim, ignoreIfPlaying = true) {
        let fullName = `${this.textureName}_${name}_${this.animParameters.direction}`;
        this.sprite.play(fullName, ignoreIfPlaying);
        return fullName;
    }
}

class TileMap
{
    map: Phaser.Tilemaps.Tilemap;
    obstacles: Phaser.Tilemaps.StaticTilemapLayer;
    grass: Phaser.Tilemaps.StaticTilemapLayer;

    constructor(scene: Phaser.Scene, config: Phaser.Types.Tilemaps.TilemapConfig )
    {
        this.map = scene.make.tilemap(config);
    }
}



class BootScene extends Phaser.Scene {

	constructor() {
		super('BootScene');
	};

	preload() {
		// map tiles
        this.load.image('tiles', 'assets/map/spritesheet.png');

		// map in json format
        this.load.tilemapTiledJSON('map', 'assets/map/map.json');

        LPCSprite.load(this.load, { name: 'fighter', fileUrl: 'assets/fighter.png', oversizeAnim: LPCAnim.slash });
        LPCSprite.load(this.load, { name: 'wizard', fileUrl: 'assets/LPC_black_wizard_m.png', oversizeAnim: LPCAnim.thrust });
        LPCSprite.load(this.load, { name: 'archer', fileUrl: 'assets/archer.png' });
	};

    create() {
        LPCSprite.createAnimationDatabase();
		this.scene.start('WorldScene');
	};
};

class WorldScene extends Phaser.Scene {

    map: Phaser.Tilemaps.Tilemap;
    grass: Phaser.Tilemaps.StaticTilemapLayer;
    obstacles: Phaser.Tilemaps.StaticTilemapLayer;

    player: Player;

    constructor()
    {
		super('WorldScene');
	}

    preload()
    {
	}

    create() {
        this.createMap();
        this.createPlayer();

        Input.cursors = this.input.keyboard.createCursorKeys();
        Input.keyboard = this.input.keyboard;
        Input.attackKey = Input.keyboard.addKey('SPACE', true, false);
	}

    createMap()
    {
        this.map = this.make.tilemap({ key: 'map' });
        const tiles = this.map.addTilesetImage('spritesheet', 'tiles');

        this.grass = this.map.createStaticLayer('Grass', tiles, 0, 0);
        this.obstacles = this.map.createStaticLayer('Obstacles', tiles, 0, 0);
        this.obstacles.setCollisionByExclusion([-1]);
	}

    createPlayer()
    {
        this.player = new Player(this.physics.add.sprite(50, 100, 'archer', 0), LPCAnim.shoot);


        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;

        this.player.sprite.setCollideWorldBounds(true);

	}

    
    update(time: number, delta: number)
    {
        this.player.update(time, delta);
	}
};

var config: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	parent: 'content',
	width: 640,
	height: 480,
    zoom: 1.5,
    render: {
        pixelArt: true
    },
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