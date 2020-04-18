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

// Current State of the player's animation
enum AnimState
{
    STATE_WALKING,
    STATE_ATTACKING
};

enum Directions
{
    Down = 'down',
    Up = 'up',
    Left = 'left',
    Right = 'right'

}
enum LPCAnims
{
    spell_cast = 'spell_cast',
    thrust = 'thrust',
    walk = 'walk',
    slash = 'slash',
    shoot = 'shoot'
}

interface AnimData
{
    name: LPCAnims
    numOfFrames: number
    loop?: number;
    hasOverize?: boolean;
}
class Player
{
    animState: AnimState = AnimState.STATE_WALKING;
    animParameters = {
        direction: Directions.Down
    };
    attackAnim: LPCAnims;
    attackRate = 1;
    speed = 8;

    constructor(public sprite: Phaser.Physics.Arcade.Sprite, public textureName: string, oversizeName: LPCAnims = null)
    {
        this.createLpcAnimDatabase(textureName, [
            { name: LPCAnims.spell_cast, numOfFrames: 7, loop: 1 },
            { name: LPCAnims.thrust, numOfFrames: 8, loop: 1 },
            { name: LPCAnims.walk, numOfFrames: 9, loop: -1 },
            { name: LPCAnims.slash, numOfFrames: 6, loop: 1 },
            { name: LPCAnims.shoot, numOfFrames: 13, loop: 1 },
        ], oversizeName);
    }
    
    // Create a database of animations for our sprite
    createLpcAnimDatabase(textureName: string, listOfAnims: AnimData[], oversizeName: LPCAnims = null) {
        // This is to account for the blank spots since not all anims take up a full row
        var maxRowSize = 24;
        var directions = ["up", "left", "down", "right"];
        var lastIndex = 0;
        var lastOversizeIndex = 56;

        for (let i = 0; i < listOfAnims.length; i++) {
            let currAnim = listOfAnims[i];
            let isOversize = currAnim.name === oversizeName;

            // Go through each of the four directions
            for (let d = 0; d < 4; d++)
            {
                let reel: number[] = [];

                if (!isOversize)
                {
                    // Handles regular anims
                    for (let r = lastIndex; r < lastIndex + maxRowSize; r++)
                    {
                        if (r < currAnim.numOfFrames + lastIndex)
                        {
                            reel.push(r);
                        }
                    }

                    

                    // console.log(`${ textureName }_${ currAnim.name }_${directions[d]} = ${reel}`);
                    // Anims are set using the following pattern: name_animation_direction (eg: wizard_walk_up)
                    if (!game.anims.create({ key: `${textureName}_${currAnim.name}_${directions[d]}`, frames: game.anims.generateFrameNumbers(textureName, { frames: reel }), repeat: currAnim.loop }))
                    {
                        throw new Error(`Create anim failed, invalid key! animKey = ${textureName}_${currAnim.name}_${directions[d]}`);
                    }
                }
                else
                {
                    // Handles special oversize anims
                    for (let r = lastOversizeIndex; r < lastOversizeIndex + 8; r++)
                    {
                        reel.push(r);
                    }
                    lastOversizeIndex += 8;
                    
                    let animKey = `${textureName}_${currAnim.name}_${directions[d]}`;
                    let loadName = textureName + '_oversize';

                    console.log(`creating oversize ${animKey} with anim reel ${reel} and textureName ${loadName}`);
                    // Handle oversize anims
                    if (!game.anims.create({ key: animKey, frames: game.anims.generateFrameNumbers(loadName, { frames: reel }), repeat: currAnim.loop, defaultTextureKey: loadName }))
                    {
                        throw new Error(`Create anim failed, invalid key! animKey = ${textureName}_${currAnim.name}_${directions[d]}`);
                    }
                }

                // Always increment even if we loaded oversize to ignore gaps
                lastIndex += maxRowSize;
            }
            
        }
    }

    update(time: number, delta: number)
    {
        this.getNextAnimatorState();
        this.animate();
        this.move(delta);
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
    getNextAnimatorState()
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
    animate()
    {
        switch (this.animState) {

            case AnimState.STATE_WALKING:
                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnims.walk, true);
                else
                    this.sprite.anims.stop();
                break;

            case AnimState.STATE_ATTACKING:
                this.playAnim(LPCAnims.slash, true);
                break;

            default: throw new Error('Invalid Anim State!');
        }
    }

    playAnim(name: LPCAnims, ignoreIfPlaying = true) {
        let fullName = `${this.textureName}_${name}_${this.animParameters.direction}`;

        console.log(fullName);

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

		// our two characters
        this.load.spritesheet('player', 'assets/RPG_assets.png', { frameWidth: 16, frameHeight: 16 });

        // Load the image twice: once for regular anims and second for oversize

        // Anims are in 64x64 boxes with 24 boxes per row
        this.load.spritesheet('wizard', 'assets/LPC_black_wizard_m.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('kirito', 'assets/kirito_new.png', { frameWidth: 64, frameHeight: 64 });

        // Oversize anims start on frame 56 (total size is 8x11 grid)
        this.load.spritesheet('wizard_oversize', 'assets/LPC_black_wizard_m.png', { frameWidth: 64 * 3, frameHeight: 64 * 3 });
        this.load.spritesheet('kirito_oversize', 'assets/kirito_new.png', { frameWidth: 64 *3, frameHeight: 64 *3 });
	};

	create() {
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
        this.player = new Player(this.physics.add.sprite(50, 100, 'kirto', 0), 'kirito', LPCAnims.slash);


        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;

        this.player.sprite.setCollideWorldBounds(true);

	}

    
    update(time: number, delta: number)
    {
        this.player.update(time, delta);
	}
};

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