console.log("hello!");


// Currnet State of the player's animation
enum AnimState
{
    STATE_WALKING
};

class Player
{
    animState: AnimState = AnimState.STATE_WALKING;

    constructor(public sprite: Phaser.Physics.Arcade.Sprite, public textureName: string)
    {
        this.createLpcAnimDatabase(textureName, [
            { name: 'spell_cast', numOfFrames: 7 },
            { name: 'thrust', numOfFrames: 8 },
            { name: 'walk', numOfFrames: 9 },
            { name: 'slash', numOfFrames: 6 },
            { name: 'shoot', numOfFrames: 13 },
        ]);

    }

    // Create a database of animations for our sprite
    createLpcAnimDatabase(textureName: string, listOfAnims: { name: string, numOfFrames: number }[]) {

        // This is to account for the blank spots since not all anims take up a full row
        var maxRowSize = 24;

        var directions = ["up", "right", "down", "left"];

        var lastIndex = 0;
        for (let i = 0; i < listOfAnims.length; i++) {
            let currAnim = listOfAnims[i];
            let newReel: any = {}

            for (let d = 0; d < 4; d++) {
                newReel[directions[d]] = [];
                for (let r = lastIndex; r < lastIndex + maxRowSize; r++) {
                    if (r < currAnim.numOfFrames + lastIndex) {
                        newReel[directions[d]].push(r);
                    }
                }
                lastIndex += maxRowSize;

                // Anims are set using the following pattern: name_animation_direction (eg: wizard_walk_up)
                if (!game.anims.create({ key: `${textureName}_${currAnim.name}_${directions[d]}`, frames: game.anims.generateFrameNumbers(textureName, newReel[directions[d]]) })) {
                    throw new Error(`Create anim failed! key=${textureName}_${currAnim.name}_${directions[d]}`);
                }
            }
        }
    }
    // Updates the player's animation based on his animation state
    updateAnimation()
    {
        switch (this.animState) {

            case AnimState.STATE_WALKING:
                // Update the animation last and give left/right animations precedence over up/down animations
                if (this.sprite.body.velocity.x < 0) {
                    this.sprite.anims.play(this.textureName + '_walk_left', true);
                } else if (this.sprite.body.velocity.x > 0) {
                    this.sprite.anims.play(this.textureName + '_walk_right', true);
                } else if (this.sprite.body.velocity.y < 0) {
                    this.sprite.anims.play(this.textureName + '_walk_up', true);
                } else if (this.sprite.body.velocity.y > 0) {
                    this.sprite.anims.play(this.textureName + '_walk_down', true);
                } else {
                    this.sprite.anims.stop();
                }
                break;
            default: throw new Error('Invalid Anim State!');
        }
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
        this.load.spritesheet('wizard', 'assets/LPC_black_wizard_m.png', { frameWidth: 64, frameHeight: 64 });
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
    cursors: Phaser.Types.Input.Keyboard.CursorKeys;

    constructor()
    {
		super('WorldScene');
	}

    preload()
    {
	}

    create() {

        this.createMap();

        // Create Animations

        this.player = this.createPlayer();

        this.cursors = this.input.keyboard.createCursorKeys();
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
        this.player = new Player(this.physics.add.sprite(50, 100, 'wizard', 0), 'wizard');


        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;

        this.player.sprite.setCollideWorldBounds(true);

        return this.player; 
	}

    
    update(time: number, delta: number) {

        this.player.sprite.setVelocity(0, 0);

		// Horizontal Movement
		if (this.cursors.left.isDown) {
            this.player.sprite.setVelocityX(-80);
		} else if (this.cursors.right.isDown) {
            this.player.sprite.setVelocityX(80);
		}

		// Vertical Movement
        if (this.cursors.up.isDown) {
            this.player.sprite.setVelocityY(-80);
        } else if (this.cursors.down.isDown) {
            this.player.sprite.setVelocityY(80);
        }

        this.player.updateAnimation();
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