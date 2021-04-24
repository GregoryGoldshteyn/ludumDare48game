class MainGameScene extends Phaser.Scene
{
    tileHeight = 64;
    tileWidth = 64;

    downKey;
    upKey;

    canAttack = true;

    clickContext = {
        "canAttack" : true,
        "wizard" : null
    }

    map;
    text;
    sy = 0;
    score = 0;
    mapWidth = 13;
    mapHeight = 11;
    distance = 0;
    fallSpeed = 4;

    spider;
    wizard;

    missileParticles;

    outsidetileprobs = [6,6,7,7,7,7,8,9,9,9,9];
    insidetileprobs = [3,4];

    constructor()
    {
        super();
        for (var i = 0; i < 3000; i += 1) {
            this.outsidetileprobs.push(0);
            this.outsidetileprobs.push(1);
        }
    }

    preload() {
        this.load.image('tiles', 'assets/img/StoneTileSet2.png');
        this.load.bitmapFont('nokia16', 'assets/fonts/nokia16.png', 'assets/fonts/nokia16.xml');
        this.load.spritesheet('spider', 'assets/img/Spider.png', { frameWidth: this.tileWidth, frameHeight: this.tileHeight});
        this.load.spritesheet('wizard', 'assets/img/Wizard.png', { frameWidth: this.tileWidth, frameHeight: this.tileHeight });

        this.load.image('blankScreen', 'assets/img/BlankScreen.png');
        this.load.image('mask', 'assets/img/Mask1.png');
    }

    create() {
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.canAttack = true;

        var mapData = [];

        this.initMapData(mapData);

        this.map = this.make.tilemap({ data: mapData, tileWidth: this.tileWidth, tileHeight: this.tileHeight });

        var tileset = this.map.addTilesetImage('tiles');
        var layer = this.map.createLayer(0, tileset, 0, 0);

        this.text = this.add.bitmapText(16, 8, 'nokia16').setScrollFactor(0);

        this.spider = this.physics.add.sprite(544,300,'spider');
        this.wizard = this.physics.add.sprite(416,300,'wizard');

        this.spider.setScrollFactor(0);
        this.wizard.setScrollFactor(0);

        const light = this.make.sprite({
            x: 0,
            y: 0,
            key: 'mask',
            add: false
        });

        this.input.on('pointermove', function (pointer) {

            light.x = pointer.x;
            light.y = pointer.y;

        });

        const blankScreen = this.add.image(0, 0, 'blankScreen');

        screen.mask = new Phaser.Display.Masks.BitmapMask(this, light);

        // Attacking logic
        this.clickContext.wizard = this.wizard;
        this.input.on('pointerdown', function f(){
            if (this.canAttack === true) {
                this.wizard.anims.play('wizardAttack', true);
            }
        }, this.clickContext);

        // Animation inits
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
        this.anims.create({
            key: 'wizardFall',
            frames: this.anims.generateFrameNumbers('wizard', { start: 0, end: 2 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'wizardFastTransition',
            frames: this.anims.generateFrameNumbers('wizard', { start: 3, end: 5 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'wizardFast',
            frames: this.anims.generateFrameNumbers('wizard', { start: 6, end: 8 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'wizardSlowTransition',
            frames: this.anims.generateFrameNumbers('wizard', { start: 9, end: 11 }),
            frameRate: 10,
            repeat: 0
        });
        this.anims.create({
            key: 'wizardSlow',
            frames: this.anims.generateFrameNumbers('wizard', { start: 12, end: 14 }),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'wizardAttack',
            frames: this.anims.generateFrameNumbers('wizard', { start: 15, end: 18 }),
            frameRate: 10,
            yoyo: true,
            repeat: 0
        });
    }

    update(time, delta) {
        this.handleKeyInputs();
        this.scrollMap();
        //wizard.anims.play('wizardFall', true);
    }

    initMapData(mapData){
        for (var y = 0; y < this.mapHeight; y++) {
            var row = [];
            for (var x = 0; x < this.mapWidth; x++) {
                //  Scatter the tiles so we get more mud and less stones
                var tileIndex = this.generateTileForRow(x);

                row.push(tileIndex);
            }
            mapData.push(row);
        }
    }

    handleKeyInputs()
    {
        if (this.downKey.isDown){
            this.clickContext.canAttack = false;
            // If wizard is not transitioning or fast falling, play transition animation
            if (this.wizard.anims.getName() !== 'wizardFastTransition' && this.wizard.anims.getName() !== 'wizardFast'){
                this.wizard.anims.play('wizardFastTransition', true);
            }
            else{
                this.wizard.playAfterRepeat('wizardFast');
                if (this.wizard.anims.getName() == 'wizardFast'){
                    this.fallSpeed = 8;
                }
            }
        }
        else if (this.upKey.isDown) {
            this.clickContext.canAttack = false;
            // If wizard is not transitioning or slow falling, play transition animation
            if (this.wizard.anims.getName() !== 'wizardSlowTransition' && this.wizard.anims.getName() !== 'wizardSlow') {
                this.wizard.anims.play('wizardSlowTransition', true);
            }
            else {
                this.wizard.playAfterRepeat('wizardSlow');
                if (this.wizard.anims.getName() == 'wizardSlow') {
                    this.fallSpeed = 2;
                }
            }
        }
        else{
            if (this.wizard.anims.getName() === 'wizardFast') {
                this.wizard.playReverse('wizardFastTransition', true);
            }
            if (this.wizard.anims.getName() === 'wizardSlow') {
                this.wizard.playReverse('wizardSlowTransition', true);
            }
            this.wizard.playAfterRepeat('wizardFall', true);
            if (this.wizard.anims.getName() == 'wizardFall'){
                this.clickContext.canAttack = true;
                this.fallSpeed = 4;
            }
        }
    }

    scrollMap()
    {
        this.sy += Math.floor(this.fallSpeed);

        this.text.setText("Fall Speed: " + Math.floor(this.fallSpeed));

        // Every tileHeight, delete the tile from the top of the screen and generate a new one at the bottom
        if (this.sy >= this.tileHeight) {
            var tile;
            var prev;

            for (var x = 0; x < this.mapWidth; x++) {
                for (var y = 1; y < this.mapHeight; y++) {
                    tile = this.map.getTileAt(x, y);
                    prev = this.map.getTileAt(x, y - 1);

                    prev.index = tile.index;

                    if (y === this.mapHeight - 1) {
                        tile.index = this.generateTileForRow(x)
                        //tile.index = Phaser.Math.RND.weightedPick(outsidetileprobs);
                    }
                }
            }

            this.score += 1;

            //text.setText("Score: " + score);

            this.sy = 0;
        }

        this.cameras.main.scrollY = this.sy;
    }

    generateTileForRow(x){
        if(x < 2 || x > 10){
            return Phaser.Math.RND.weightedPick(this.outsidetileprobs);
        }
        if(x > 2 && x < 10) {
            return Phaser.Math.RND.weightedPick(this.insidetileprobs);
        }
        if(x == 2){
            return 2;
        }
        if(x == 10){
            return 5;
        }
        return 0;
    }

}

const config = {
    type: Phaser.WEBGL,
    width: 832,
    height: 600,
    parent: 'game-div',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [MainGameScene]
};

const game = new Phaser.Game(config);