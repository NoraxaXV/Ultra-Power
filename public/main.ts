import * as Phaser from 'phaser';
class Player {

}

class Map {
	tiles: Phaser.Tilemaps.Tilemap;
	obstacles: Phaser.Tilemaps.Tileset;
	grass: Phaser.Tilemaps.Tileset;
}

class Game {

	constructor(public map: Map, public player: Player)
	{

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

	};

	create() {
		this.scene.start('WorldScene');
	};
};

class WorldScene extends Phaser.Scene {
	constructor() {
		super('WorldScene');
	}

	preload() {

	}

	create() {
		this.createMap();

		// Create Animations
		this.createLpcAnimDatabase([
			new Anim('spell_cast', 7),
			new Anim('thrust', 8),
			new Anim('walk', 9),
			new Anim('slash', 6),
			new Anim('shoot', 13),
		]);

		this.createPlayer();

		this.cursors = this.input.keyboard.createCursorKeys();

	}

	createMap() {
		const map = this.make.tilemap({ key: 'map' });
		this.tiles = map.addTilesetImage('spritesheet', 'tiles');

		this.grass = map.createStaticLayer('Grass', this.tiles, 0, 0);
		this.obstacles = map.createStaticLayer('Obstacles', this.tiles, 0, 0);
		this.obstacles.setCollisionByExclusion([-1]);
	}

	createPlayer() {
		this.player = this.physics.add.sprite(50, 100, 'player', 6);
		this.physics.world.bounds.width = this.map.widthInPixels;
		this.physics.world.bounds.height = this.map.heightInPixels;
		this.player.setCollideWorldBounds(true);
	}

	createLpcAnimDatabase(listOfAnims) {
		let lpcReels = {};

		var maxRowSize = 24;
		var directions = ["up", "right", "down", "left"];

		var lastIndex = 0;
		for (let i = 0; i < listOfAnims.length; i++) {
			let anim = listOfAnims[i];
			let newReel = {}
			let startIndex = lastIndex + 1;

			for (let d = 0; d < 4; d++) {
				newReel[directions[d]] = [];
				for (let r = lastIndex; r < lastIndex + maxRowSize; r++) {
					if (r < anim.numOfFrames + lastIndex) {
						newReel[directions[d]].push(r);
					}
				}
				lastIndex += maxRowSize;
			}

			let lpcReels[anim.name] = newReel;
		}

		return let lpcReels;
	}

	update(time, delta) {
		this.player.body.setVelocity(0);

		// Horizontal Movement
		if (this.cursors.left.isDown) {
			this.player.body.setVelocityX(-80);
		} else if (this.cursors.right.isDown) {
			this.player.setVelocityX(80);
		}

		// Vertical Movement
		if (this.cursors.up.isDown) {

		}
	}
};

var config = {
	type: Phaser.AUTO,
	parent: 'content',
	width: 640,
	height: 480,
	zoom: 2,
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