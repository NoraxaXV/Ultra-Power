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

    static load(load: Phaser.Loader.LoaderPlugin, spriteToLoad: LPCSprite): void
    {

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

    static createAnimationDatabase(): void
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

// All states shared by all entities
enum States {
    STATE_WALKING,
    STATE_ATTACKING
};

enum Directions {
    Down = 'down',
    Up = 'up',
    Left = 'left',
    Right = 'right'
}

// An Entity contains the functionality players and monsters share: the ablity to move, attack, etc..
abstract class Entity
{
    static entities: Entity[] = [];
    static updateAllEntities(timeStamp: number, delta: number): void
    {
        var ts = timeStamp;
        var d = delta;
        this.entities.forEach((entity) => { entity.update(ts, d) });
    }
    constructor(public sprite: Phaser.Physics.Arcade.Sprite, public speed: number = 1)
    {
        this.textureName = sprite.texture.key;
        Entity.entities.push(this);
    }

    state: States = States.STATE_WALKING;
    stateData =  {
        direction: Directions.Down
    }

    protected textureName: string;
    protected playAnim(name: LPCAnim, ignoreIfPlaying = true): string
    {
        let fullName = `${this.textureName}_${name}_${this.stateData.direction}`;
        this.sprite.play(fullName, ignoreIfPlaying);
        return fullName;
    }

    move(direction: Phaser.Math.Vector2, delta: number): void
    {
        let movement = direction.normalize().scale(delta * this.speed);
        this.sprite.setVelocity(movement.x, movement.y);
        this.updateDirection();
    }

    // Updates the currently facing animation direction
    private updateDirection(): Directions
    {
        let currentVelocity = this.sprite.body.velocity;
        if (currentVelocity.x == 0 && currentVelocity.y == 0)
        {
            return this.stateData.direction;
        }
        let angle = currentVelocity.angle() * (180 / Math.PI);

        if (angle <= 45 || angle >= 315) {
            this.stateData.direction = Directions.Right;
        } else if (angle > 45 && angle < 135) {
            this.stateData.direction = Directions.Down;
        } else if (angle >= 135 && angle <= 225) {
            this.stateData.direction = Directions.Left;
        } else if (angle > 225 && angle < 315) {
            this.stateData.direction = Directions.Up;
        } else {
            console.log(`${this.textureName}: angle=${angle}`);
        }

        return this.stateData.direction;
    }

    abstract getNextState(): States;
    abstract updateState(delta: number): void;

    update(timeStamp: number, delta: number): void
    {
        this.getNextState();
        this.updateState(delta);
    };

    
}
// Global player
let player: Player;

class Player extends Entity
{
    stateData:{ direction: Directions; };
    constructor(sprite: Phaser.Physics.Arcade.Sprite, public attackAnim: LPCAnim, speed: number = 1)
    {
        super(sprite, speed);
    }

    attackRate = 1;

    // Checks for changes to the state
    getNextState(): States
    {
        switch (this.state)
        {
            case States.STATE_WALKING:
                if (Input.keyboard.checkDown(Input.attackKey, this.attackRate * 1000))
                {
                    this.state = States.STATE_ATTACKING;
                }
                break;
            case States.STATE_ATTACKING:
                if (this.sprite.anims.getProgress() >= 1)
                {
                    this.state = States.STATE_WALKING;
                }
                break;
            default: throw new Error(`State ${this.state} not implemented!`);

        }
        return this.state;
    }

    // Updates the player's animation based on his animation state
    updateState(delta: number): void
    {
        switch (this.state) {
            case States.STATE_WALKING:
                let movement = new Phaser.Math.Vector2(0, 0);

                // Horizontal movement
                if (Input.cursors.left.isDown) {
                    movement.x = -1;
                } else if (Input.cursors.right.isDown) {
                    movement.x = 1;
                }
                // Vertical Movement
                if (Input.cursors.up.isDown) {
                    movement.y = -1;
                } else if (Input.cursors.down.isDown) {
                    movement.y = 1;
                }

                this.move(movement, delta);

                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnim.walk, true);
                else
                    this.sprite.anims.stop();

                break;

            case States.STATE_ATTACKING:
                this.playAnim(this.attackAnim, true);

                break;

            default: throw new Error(`State ${this.state} not implemented!`);
        }
    }
}

class Monster extends Entity
{
    constructor(sprite: Phaser.Physics.Arcade.Sprite, speed: number = 1)
    {
        super(sprite, speed);
    }

    
    getNextState(): States
    {
        switch (this.state)
        {
            case States.STATE_WALKING:
                break;
            default: throw new Error(`State ${this.state} not implemented!`);
        }
        return this.state;
    }

    updateState(delta: number): void
    {
        switch (this.state) {
            case States.STATE_WALKING:
                let toPlayer = player.sprite.getCenter().subtract(this.sprite.getCenter());
                this.move(toPlayer, delta);

                if (this.sprite.body.velocity.x !== 0 || this.sprite.body.velocity.y !== 0)
                    this.playAnim(LPCAnim.walk, true);

                break;
            default: throw new Error(`State ${this.state} not implemented!`);
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

        LPCSprite.load(this.load, { name: 'fighter', fileUrl: 'assets/fighter.png', oversizeAnim: LPCAnim.slash });
        LPCSprite.load(this.load, { name: 'wizard', fileUrl: 'assets/LPC_black_wizard_m.png', oversizeAnim: LPCAnim.thrust });
        LPCSprite.load(this.load, { name: 'archer', fileUrl: 'assets/archer.png' });
        LPCSprite.load(this.load, { name: 'skeleton', fileUrl: 'assets/skeleton.png' });
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
        this.player = new Player(this.physics.add.sprite(50, 100, 'fighter', 0), LPCAnim.slash, 8);
        player = this.player;

        let skelly = new Monster(this.physics.add.sprite(50, 100, 'skeleton', 0), 4);
        this.physics.world.bounds.width = this.map.widthInPixels;
        this.physics.world.bounds.height = this.map.heightInPixels;

        this.player.sprite.setCollideWorldBounds(true);

	}

    
    update(timeStamp: number, deltaInMs: number)
    {
        Entity.updateAllEntities(timeStamp, deltaInMs);
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