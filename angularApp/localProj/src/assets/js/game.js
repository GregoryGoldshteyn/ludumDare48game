config = {
    type: Phaser.AUTO,
    width: 832,
    height: 600,
    parent: 'game-div',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {y:0},
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const tileHeight = 64;
const tileWidth = 64;

// Keyboard things
var downKey;
var upKey;

var map;
var text;
var sy = 0;
var score = 0;
var mapWidth = 13;
var mapHeight = 11;
var distance = 0;
var fallSpeed = 4;

var spider;

var outsidetileprobs = [6,6,7,7,7,7,8,9,9,9,9];
for(i = 0; i < 3000; i += 1){
    outsidetileprobs.push(0);
    outsidetileprobs.push(1);
}

console.log(outsidetileprobs);

var insidetileprobs = [3,4];

var game = new Phaser.Game(config);

function preload() {
    this.load.image('tiles', 'assets/img/StoneTileSet2.png');
    this.load.bitmapFont('nokia16', 'assets/fonts/nokia16.png', 'assets/fonts/nokia16.xml');
    this.load.spritesheet('spider', 'assets/img/Spider.png', { frameWidth: tileWidth, frameHeight: tileHeight});
}

function create() {
    initKeyboard();

    downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

    var mapData = [];

    initMapData(mapData);

    map = this.make.tilemap({ data: mapData, tileWidth: tileWidth, tileHeight: tileHeight });

    var tileset = map.addTilesetImage('tiles');
    var layer = map.createLayer(0, tileset, 0, 0);

    text = this.add.bitmapText(16, 8, 'nokia16').setScrollFactor(0);

    spider = this.physics.add.sprite(400,400,'spider');

    spider.setScrollFactor(0);

    this.anims.create({
        key: 'spiderWalk',
        frames: this.anims.generateFrameNumbers('spider', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'spiderAttack',
        frames: this.anims.generateFrameNumbers('spider', { start: 3, end: 6 }),
        frameRate: 10,
        repeat: -1
    });
}

function update(time, delta) {
    handleKeyInputs();
    scrollMap();
    spider.anims.play('spiderWalk', true)
}

function initKeyboard(){
    
}

function initMapData(mapData){
    for (var y = 0; y < mapHeight; y++) {
        var row = [];
        for (var x = 0; x < mapWidth; x++) {
            //  Scatter the tiles so we get more mud and less stones
            var tileIndex = generateTileForRow(x);

            row.push(tileIndex);
        }
        mapData.push(row);
    }
}

function handleKeyInputs()
{
    if(downKey.isDown){
        if (fallSpeed < 8) {
            fallSpeed += 0.1;
        }
        fallSpeed = 8;
    }
    else if (upKey.isDown) {
        if(fallSpeed > 2){
            fallSpeed -= 0.1;
        }
        fallSpeed = 2;
    }
    else{
        fallSpeed = 4;
    }
}

function scrollMap()
{
    sy += Math.floor(fallSpeed);

    text.setText("Fall Speed: " + Math.floor(fallSpeed));

    // Every tileHeight, delete the tile from the top of the screen and generate a new one at the bottom
    if (sy >= tileHeight) {
        var tile;
        var prev;

        for (var x = 0; x < mapWidth; x++) {
            for (var y = 1; y < mapHeight; y++) {
                tile = map.getTileAt(x, y);
                prev = map.getTileAt(x, y - 1);

                prev.index = tile.index;

                if (y === mapHeight - 1) {
                    tile.index = generateTileForRow(x)
                    //tile.index = Phaser.Math.RND.weightedPick(outsidetileprobs);
                }
            }
        }

        score += 1;

        //text.setText("Score: " + score);

        sy = 0;
    }

    game.scene.getScenes(isActive = true)[0].cameras.main.scrollY = sy
}

function generateTileForRow(x){
    if(x < 2 || x > 10){
        return Phaser.Math.RND.weightedPick(outsidetileprobs);
    }
    if(x > 2 && x < 10) {
        return Phaser.Math.RND.weightedPick(insidetileprobs);
    }
    if(x == 2){
        return 2;
    }
    if(x == 10){
        return 5;
    }
    return 0;
}