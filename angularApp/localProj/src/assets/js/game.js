const screenWidth = 832;
const screenHeight = 600;

const UIDepth = 2;
const occluderDepth = 1;

class MainGameScene extends Phaser.Scene
{
    tileHeight = 64;
    tileWidth = 64;

    downKey;
    upKey;

    canAttack = true;

    clickContext = {
        "canAttack" : true,
        "wizard" : null,
        "scene" : null
    }

    map;
    text;
    sy = 0;
    score = 0;
    mapWidth = 13;
    mapHeight = 11;
    distance = 0;
    fallSpeed = 4;
    depth = 0;

    lightMaskGraphics = {};
    lightMaskList = [];

    maskScreen;
    blankScreen;

    spider;
    wizard;
    reticle;
    playerMissiles;

    missileParticles;

    outsidetileprobs = [6,6,7,7,7,7,8,9,9,9,9];
    insidetileprobs = [3,4];

    constructor()
    {
        super();

        // Make it several thousands times more likely to get regular stones over gems
        for (var i = 0; i < 3000; i += 1) {
            this.outsidetileprobs.push(0);
            this.outsidetileprobs.push(1);
        }

        this.clickContext.scene = this;
    }

    preload() {
        this.load.image('tiles', 'assets/img/StoneTileSet2.png');
        this.load.bitmapFont('nokia16', 'assets/fonts/nokia16.png', 'assets/fonts/nokia16.xml');
        this.load.spritesheet('spider', 'assets/img/Spider.png', { frameWidth: this.tileWidth, frameHeight: this.tileHeight});
        this.load.spritesheet('bat', 'assets/img/Bat1.png', { frameWidth: this.tileWidth, frameHeight: this.tileHeight });
        this.load.spritesheet('wizard', 'assets/img/Wizard.png', { frameWidth: this.tileWidth, frameHeight: this.tileHeight });
        this.load.spritesheet('missile', 'assets/img/Missile.png', { frameWidth: 32, frameHeight: 32 });
        
        this.load.image('reticle', 'assets/img/Reticle.png');
        this.load.image('blankScreen', 'assets/img/BlackScreen.png');
    }

    create() {
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);

        this.createBackground();
        this.createUI();
        this.createMouseLogic();
        this.createAnimations();
        this.createPlayer();
        this.createOccluder();

        this.addToLightMaskObject(this.wizard, 'large');
    }

    update(time, delta) {
        this.handleKeyInputs();
        this.scrollMap();
        this.handleCreateLightMask();
        //wizard.anims.play('wizardFall', true);
    }

    Missile = new Phaser.Class({
        Extends: Phaser.GameObjects.Sprite,

        initialize:
        function Missile(scene) {
            Phaser.GameObjects.Sprite.call(this, scene, 0, 0, 'missile');
            this.anims.play('missile', true);
            this.setScrollFactor(0);
            this.speed = 0.3;
            this.direction = 0;
            this.xSpeed = 0;
            this.ySpeed = 0;
            this.setSize(16, 16, true);
            scene.addToLightMaskObject(this, 'mid');
        },

        fire: function (shooter, target) {
            this.setPosition(shooter.x, shooter.y);
            this.direction = Math.atan((target.x - this.x) / (target.y - this.y));

            if (target.y >= this.y) {
                this.xSpeed = this.speed * Math.sin(this.direction);
                this.ySpeed = this.speed * Math.cos(this.direction);
            }
            else {
                this.xSpeed = -this.speed * Math.sin(this.direction);
                this.ySpeed = -this.speed * Math.cos(this.direction);
            }
        },

        // Updates the position of the bullet each cycle
        update: function (time, delta) {
            this.x += this.xSpeed * delta;
            this.y += this.ySpeed * delta;
            if (this.x < -100 || this.y < -100 || this.x > screenWidth + 100 || this.y > screenWidth + 100){
                this.setActive(false);
                this.setVisible(false);
            }
        }
    });

    Enemy = new Phaser.Class({
        Extends: Phaser.GameObjects.Sprite,
        
        initialize:
        function Enemy(scene, enemyType) {
            
        }
    });

    createOccluder(){
        this.lightMaskGraphics = new Phaser.GameObjects.Graphics(this);
        this.blankScreen = this.add.image(screenWidth / 2, screenHeight / 2, 'blankScreen');
        this.blankScreen.alpha = 1.0;

        this.blankScreen.setScrollFactor(0);
        this.blankScreen.setDepth(occluderDepth);
        this.lightMaskGraphics.setScrollFactor(0);

        this.lightMaskGraphics.generateTexture("geomask");

        this.maskScreen = this.add.image(screenWidth / 2, screenHeight / 2, 'geomask');
        this.maskScreen.visible = false;
        this.maskScreen.setScrollFactor(0);

        this.blankScreen.mask = new Phaser.Display.Masks.BitmapMask(this, this.maskScreen);
        this.blankScreen.mask.invertAlpha = true;
    }

    createBackground(){
        var mapData = [];
        this.initMapData(mapData);
        this.map = this.make.tilemap({ data: mapData, tileWidth: this.tileWidth, tileHeight: this.tileHeight });
        var tileset = this.map.addTilesetImage('tiles');
        var layer = this.map.createLayer(0, tileset, 0, 0);
    }

    createUI(){
        this.reticle = this.physics.add.sprite(416, 300, 'reticle');
        this.reticle.setScrollFactor(0);
        this.reticle.setDepth(UIDepth);
        this.text = this.add.bitmapText(16, 8, 'nokia16').setScrollFactor(0);
        this.text.setDepth(UIDepth);
    }

    createPlayer(){
        this.canAttack = true;
        this.wizard = this.physics.add.sprite(416, 300, 'wizard');
        this.wizard.setScrollFactor(0);

        this.playerMissiles = this.physics.add.group({classType: this.Missile, runChildUpdate: true});
    }

    createMouseLogic(){
        // Attacking logic
        this.input.on('pointerdown', function f(pointer, time, lastFired) {
            if (!this.scene.game.input.mouse.locked) {
                this.scene.game.input.mouse.requestPointerLock();
            }
            if (this.scene.canAttack === true) {
                this.scene.wizard.anims.play('wizardAttack', true);
            }

            console.log(time);
            console.log(lastFired);

            var missile = this.scene.playerMissiles.get().setActive(true).setVisible(true);
            this.scene.addToLightMaskObject(missile, 'mid');

            if(missile){
                missile.fire(this.scene.wizard, this.scene.reticle);
            }

        }, { 'scene': this });

        this.input.on('pointermove', function (pointer) {
            if (this.scene.input.mouse.locked) {
                this.scene.reticle.x += pointer.movementX;
                this.scene.reticle.y += pointer.movementY;
            }
        }, { 'scene': this });
    }

    createAnimations(){
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
        this.anims.create({
            key: 'batFly',
            frames: this.anims.generateFrameNumbers('bat', {start: 0, end: 2}),
            frameRate: 10,
            repeat: -1
        });
        this.anims.create({
            key: 'missile',
            frames: this.anims.generateFrameNumbers('missile', {start : 0, end : 2}),
            frameRate: 10,
            repeat: -1
        });
    }

    addToLightMaskObject(obj, size){
        this.lightMaskList.push([obj, size])
    }

    handleCreateLightMask(){
        this.lightMaskGraphics.clear();
        this.textures.remove("geomask");

        for(var i = 0; i < this.lightMaskList.length; i += 1){
            // If the gameobject no longer exists, remove it from lights
            if(this.lightMaskList[i][0] == undefined){
                this.lightMaskList.splice(i, 1);
                continue;
            }

            // If the gameobject no longer exists, remove it from lights
            if (!this.lightMaskList[i][0].active){
                this.lightMaskList.splice(i, 1);
                continue;
            }

            switch(this.lightMaskList[i][1]){
                case "large":
                    this.drawLargeLightAtPoint(this.lightMaskGraphics, this.lightMaskList[i][0].x, this.lightMaskList[i][0].y);
                    break;
                case "mid":
                    this.drawMidLightAtPoint(this.lightMaskGraphics, this.lightMaskList[i][0].x, this.lightMaskList[i][0].y);
                    break;
                case "small":
                    this.drawSmallLightAtPoint(this.lightMaskGraphics, this.lightMaskList[i][0].x, this.lightMaskList[i][0].y);
                    break;
            }
        }
        //this.drawLargeLightAtPoint(this.lightMaskGraphics, this.wizard.x, this.wizard.y);
        //this.drawSmallLightAtPoint(this.lightMaskGraphics, 200, 200);
        this.lightMaskGraphics.generateTexture("geomask");
        this.maskScreen.setTexture('geomask');
    }

    drawSmallLightAtPoint(g, x, y){
        g.lineStyle(1, 0x000000, 0.25);
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(x, y, 32);

        g.lineStyle(1, 0x000000, 0.5);
        g.fillStyle(0x000000, 0.333333333333);
        g.fillCircle(x, y, 24);

        g.lineStyle(1, 0x000000, 0.75);
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(x, y, 16);

        g.lineStyle(1, 0x000000, 1.0);
        g.fillStyle(0x000000, 1.0);
        g.fillCircle(x, y, 8);
    }

    drawMidLightAtPoint(g, x, y) {
        g.lineStyle(1, 0x000000, 0.25);
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(x, y, 64);

        g.lineStyle(1, 0x000000, 0.5);
        g.fillStyle(0x000000, 0.333333333333);
        g.fillCircle(x, y, 48);

        g.lineStyle(1, 0x000000, 0.75);
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(x, y, 32);

        g.lineStyle(1, 0x000000, 1.0);
        g.fillStyle(0x000000, 1.0);
        g.fillCircle(x, y, 16);
    }

    drawLargeLightAtPoint(g, x, y) {
        g.lineStyle(1, 0x000000, 0.25);
        g.fillStyle(0x000000, 0.25);
        g.fillCircle(x, y, 128);

        g.lineStyle(1, 0x000000, 0.50);
        g.fillStyle(0x000000, 0.333333333333);
        g.fillCircle(x, y, 96);

        g.lineStyle(1, 0x000000, 0.75);
        g.fillStyle(0x000000, 0.50);
        g.fillCircle(x, y, 64);

        g.lineStyle(1, 0x000000, 1.0);
        g.fillStyle(0x000000, 1.0);
        g.fillCircle(x, y, 32);
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

    // Every 100 depth, decrease opacity by 10%
    handleOpacity(){
        // NOP if depth is really high
        if(this.depth > 1005){
            return;
        }
        if(this.depth > 95 && this.depth <= 105){
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 195 && this.depth <= 205) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 295 && this.depth <= 305) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 395 && this.depth <= 405) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 495 && this.depth <= 505) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 595 && this.depth <= 605) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 695 && this.depth <= 705) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 795 && this.depth <= 805) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 895 && this.depth <= 905) {
            this.blankScreen.alpha += 0.01;
        }
        if (this.depth > 995 && this.depth <= 1005) {
            this.blankScreen.alpha += 0.01;
        }
    }

    scrollMap()
    {
        this.sy += Math.floor(this.fallSpeed);

        this.text.setText("Score: " + Math.floor(this.score));

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

            this.depth += 1;

            this.handleOpacity();

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
    width: screenWidth,
    height: screenHeight,
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