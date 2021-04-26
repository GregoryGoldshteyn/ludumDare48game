const screenWidth = 832;
const screenHeight = 600;

const tileHeight = 64;
const tileWidth = 64;

const UIDepth = 2;
const occluderDepth = 1;

const pathDuration = 10000;

const _DEBUG = false;

class StartScene extends Phaser.Scene{
    constructor(){
        super("StartScene");
    }
    init(data){

    }
    preload(){

    }
    create(){

    }
    update(){

    }
}

class GameOverScene extends Phaser.Scene {
    constructor() {
        super("GameOverScene");
    }
    init(data) {
        this.score = data.score;
    }
    preload() {

    }
    create() {
        this.loseSound = this.sound.add('lose');
        this.loseSound.play();
        this.text = this.add.bitmapText(16, 8, 'nokia16').setScrollFactor(0);
        this.text.setText("GAME OVER\n\n\nYour score was: " + this.score + "\n\n\n Press F5 to restart");
    }
    update() {

    }
}

class VictoryScene extends Phaser.Scene {
    constructor() {
        super("VictoryScene");
    }
    init(data) {
        this.score = data.score;
    }
    preload() {

    }
    create() {
        this.winSound = this.sound.add('win');
        this.winSound.play();
        this.text = this.add.bitmapText(16, 8, 'nokia16').setScrollFactor(0);
        this.text.setText("YOU WIN!!!!!!!!!!!!!\n\n\nYour score was: " + this.score + "\n\n\n Press F5 to restart");
    }
    update() {

    }
}

class MainGameScene extends Phaser.Scene
{
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

    paths = {};

    maskScreen;
    blankScreen;

    hearts = [];

    startIFrames = 0;
    endIFrames = 0;
    invincibleDuration = 2000;
    globalTime = 0;

    spider;
    wizard;
    reticle;
    playerMissiles;
    enemyGroup;

    outsidetileprobs = [6,6,7,7,7,7,8,9,9,9,9];
    insidetileprobs = [3,4];

    constructor()
    {
        super("MainGameScene");

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
        this.load.spritesheet('spider', 'assets/img/Spider.png', { frameWidth: tileWidth, frameHeight: tileHeight});
        this.load.spritesheet('bat', 'assets/img/Bat1.png', { frameWidth: tileWidth, frameHeight: tileHeight });
        this.load.spritesheet('wizard', 'assets/img/Wizard.png', { frameWidth: tileWidth, frameHeight: tileHeight });
        this.load.spritesheet('missile', 'assets/img/Missile.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('heart', 'assets/img/Heart.png', { frameWidth: 32, frameHeight: 32 });
        
        this.load.image('reticle', 'assets/img/Reticle.png');
        this.load.image('blankScreen', 'assets/img/BlackScreen.png');

        this.load.json('enemies', 'assets/json/enemies.json');

        this.load.audio('theme', 'assets/music/theme.wav');

        this.load.audio('bang', 'assets/sfx/bang.wav');
        this.load.audio('lose', 'assets/sfx/lose.wav');
        this.load.audio('win', 'assets/sfx/win.wav');
        this.load.audio('hurt', 'assets/sfx/hurt.wav');
    }

    create() {
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);

        this.createBackground();
        this.createAnimations();
        this.createPlayer();
        this.createUI();
        this.createOccluder();
        this.createPaths();
        this.createEnemies();

        this.createColliders();
        this.createMouseLogic();

        this.addToLightMaskObject(this.wizard, 'large');

        this.enemyJson = this.cache.json.get('enemies');

        this.themeSound = this.sound.add('theme');
        this.themeSound.loop = true;
        this.themeSound.play();

        this.hurtSound = this.sound.add('hurt');
        this.winSound = this.sound.add('win');
        this.loseSound = this.sound.add('lose');
        this.bangSound = this.sound.add('bang');
        this.bangSound.volume = 0.5;
    }

    update(time, delta) {
        this.handleKeyInputs();
        this.scrollMap();
        this.handleCreateLightMask();
        this.constrainReticle();
        this.handleOnHurt(time);
        this.handleWin();
    }

    createColliders(){
        // Collider between enemies and player
        this.collider1 = this.physics.add.collider(this.enemyGroup, this.wizard, this.playerHitCallback);

        // Collider between missiles and enemies
        this.collider2 = this.physics.add.collider(this.enemyGroup, this.playerMissiles, this.enemyHitCallback);
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
            //this.setSize(32, 32, true);
            //scene.addToLightMaskObject(this, 'mid');

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
        Extends: Phaser.GameObjects.PathFollower,
        
        initialize:
        function Enemy(scene) {
            Phaser.GameObjects.PathFollower.call(this, scene);
            this.setScrollFactor(0);
        },

        update:
        function (time, delta) {
            // When it reaches the end of the path, make inactive
            if(this.pathTween.totalProgress > 0.98){
                this.setVisible(false);
                this.setActive(false);
            }
        },

        addScore:
        function (score) {
            this.scene.score += score;
        },

        playBang:
        function(){
            this.scene.bangSound.play();
        }
    });

    createOccluder(){
        this.lightMaskGraphics = new Phaser.GameObjects.Graphics(this);
        this.blankScreen = this.add.image(screenWidth / 2, screenHeight / 2, 'blankScreen');
        this.blankScreen.alpha = 0.0;

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

    addEnemyToPath(path, isTopPath, enemyType){
        var enemy = this.enemyGroup.get();

        // In case enemy cannot be gotten
        if(!enemy){
            return;
        }

        enemy.path = path;

        if(enemyType == 'bat'){
            enemy.setTexture('bat');
            enemy.anims.play('batFly');
        }
        else if(enemyType == 'spider'){
            enemy.setTexture('spider');
            enemy.anims.play('spiderWalk');
        }
        
        var rotation;
        if(isTopPath){
            rotation = 270;
        }
        else{
            rotation = 90;
        }

        enemy.startFollow({
            positionOnPath: true,
            duration: pathDuration,
            repeat: 0,
            rotateToPath: true,
            rotationOffset: rotation,
            verticalAdjust: true
        }, 0);

        enemy.setVisible(true);
        enemy.setActive(true);
    }

    createEnemies(){
        this.enemyGroup = this.physics.add.group({classType: this.Enemy, runChildUpdate: true});

        // Init one enemy to keep the collider working
        const initEnemy = this.enemyGroup.get().setActive(false).setVisible(false);
        //this.addEnemyToPath(this.paths['topToBottomWaves'][3], true, 'spider');
    }

    createBackground(){
        var mapData = [];
        this.initMapData(mapData);
        this.map = this.make.tilemap({ data: mapData, tileWidth: tileWidth, tileHeight: tileHeight });
        var tileset = this.map.addTilesetImage('tiles');
        var layer = this.map.createLayer(0, tileset, 0, 0);
    }

    createUI(){
        this.reticle = this.physics.add.sprite(416, 300, 'reticle');
        this.reticle.setScrollFactor(0);
        this.reticle.setDepth(UIDepth);
        this.text = this.add.bitmapText(16, 8, 'nokia16').setScrollFactor(0);

        this.hearts.push(this.physics.add.sprite(20, 40, 'heart'));
        this.hearts[0].setScrollFactor(0);
        this.hearts[0].setDepth(UIDepth);

        this.hearts.push(this.physics.add.sprite(50, 40, 'heart'));
        this.hearts[1].setScrollFactor(0);
        this.hearts[1].setDepth(UIDepth);

        this.hearts.push(this.physics.add.sprite(80, 40, 'heart'));
        this.hearts[2].setScrollFactor(0);
        this.hearts[2].setDepth(UIDepth);
        
        this.hearts.push(this.physics.add.sprite(110, 40, 'heart'));
        this.hearts[3].setScrollFactor(0);
        this.hearts[3].setDepth(UIDepth);

        this.hearts.push(this.physics.add.sprite(140, 40, 'heart'));
        this.hearts[4].setScrollFactor(0);
        this.hearts[4].setDepth(UIDepth);

        this.text.setDepth(UIDepth);
    }

    createPlayer(){
        this.canAttack = true;
        this.wizard = this.physics.add.sprite(416, 300, 'wizard');
        this.wizard.setScrollFactor(0);
        this.wizard.health = 5;
        this.wizard.isHurt = false;

        this.playerMissiles = this.physics.add.group({classType: this.Missile, runChildUpdate: true, maxSize: 5});

        // Init one missile to keep the collider working
        var missile = this.playerMissiles.get().setActive(false).setVisible(false);
        missile.x = -100;
        missile.y = -100;
    }

    createMouseLogic(){
        // Attacking logic
        this.input.on('pointerdown', function f(pointer, time, lastFired) {
            if (!this.scene.game.input.mouse.locked) {
                this.scene.game.input.mouse.requestPointerLock();
                return;
            }
            
            var missile = this.scene.playerMissiles.get();
            
            if(missile){
                this.scene.addToLightMaskObject(missile, 'mid')
                missile.setActive(true).setVisible(true);
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
        this.anims.create({
            key: 'heartDie',
            frames: this.anims.generateFrameNames('heart', {start: 0, end: 1}),
            frameRate: 10,
            repeat: 15
        })
    }

    createPaths(){
        // These paths are templates. They should not be changed during normal gameplay

        this.paths['topToBottomWaves'] = [];
        this.paths['bottomToTopWaves'] = [];

        for(var x = -3; x <= 3; x += 1){
            this.paths['topToBottomWaves'].push(new Phaser.Curves.Path(screenWidth / 2, -100)
                .splineTo(this.generateTopToBottomPath(screenWidth / 2 + (tileWidth * x), 10, -100, screenHeight + 100, 50)));
            this.paths['bottomToTopWaves'].push(new Phaser.Curves.Path(screenWidth / 2, screenHeight + 100)
                .splineTo(this.generateBottomToTopPath(screenWidth / 2 + (tileWidth * x), 10, screenHeight + 100, -100, 50)));
        }

        var graphics = this.add.graphics();
        graphics.lineStyle(1, 0xffffff, 1);

        if (_DEBUG){
            for(let path in this.paths){
                for(var index = 0; index < this.paths[path].length; index += 1){
                    this.paths[path][index].draw(graphics, 128).setScrollFactor(0);
                }
            }
        }
    }

    generateTopToBottomPath(startX, deltaX, startY, endY, deltaY){
        var spline = [];
        var goLeft = true;
        for (var i = startY + deltaY; i <= endY - deltaY; i += deltaY) {
            if(goLeft){
                spline.push(startX - deltaX);
                goLeft = false;
            }
            else{
                spline.push(startX + deltaX);
                goLeft = true;
            }
            spline.push(i);
        }
        spline.push(startX);
        spline.push(endY);

        return spline;
    }

    generateBottomToTopPath(startX, deltaX, startY, endY, deltaY) {
        var spline = [];
        var goLeft = true;
        for (var i = startY - deltaY; i >= endY + deltaY; i -= deltaY) {
            if (goLeft) {
                spline.push(startX - deltaX);
                goLeft = false;
            }
            else {
                spline.push(startX + deltaX);
                goLeft = true;
            }
            spline.push(i);
        }
        spline.push(startX);
        spline.push(endY);

        return spline;
    }

    handleEnemyGeneration(){
        if(this.depth in this.enemyJson){
            var enemyDataList = this.enemyJson[this.depth];
            for(var i = 0; i < enemyDataList.length; i += 1){
                var enemyData = enemyDataList[i];
                this.addEnemyToPath(
                    this.paths[enemyData.path][enemyData.pathNum],
                    enemyData.flip,
                    enemyData.type
                );
            }
        }
    }

    getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    constrainReticle() {
        // Ensures reticle cannot be moved offscreen (player follow)
        if (this.reticle.x > screenWidth)
            this.reticle.x = screenWidth;
        else if (this.reticle.x < 0)
            this.reticle.x = 0;

        if (this.reticle.y > screenHeight)
            this.reticle.y = screenHeight;
        else if (this.reticle.y < 0)
            this.reticle.y = 0;
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

    enemyHitCallback(enemyHit, missileHit) {
        enemyHit.body.debugBodyColor = 0x00FF00;
        missileHit.body.debugBodyColor = 0x00FF00;

        // Reduce health of enemy
        if (missileHit.active === true && enemyHit.active === true) {
            enemyHit.addScore(100);
            enemyHit.playBang();
            enemyHit.setActive(false).setVisible(false);

            // Destroy bullet
            missileHit.setActive(false).setVisible(false);
        }
    }

    playerHitCallback(playerHit, enemyHit) {

        playerHit.body.debugBodyColor = 0xFF0000;
        enemyHit.body.debugBodyColor = 0xFF0000;

        // Reduce health of player
        if (enemyHit.active === true && playerHit.active === true && playerHit.isHurt === false) {
            playerHit.health = playerHit.health - 1;
            playerHit.isHurt = true;
            // Todo: if enemy is a projectile, destroy the projectile
        }
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
            this.canAttack = false;
            // If wizard is not transitioning or fast falling, play transition animation
            if (this.wizard.anims.getName() !== 'wizardFastTransition' && this.wizard.anims.getName() !== 'wizardFast'){
                this.wizard.anims.play('wizardFastTransition', true);
            }
            else{
                this.wizard.playAfterRepeat('wizardFast');
                if (this.wizard.anims.getName() == 'wizardFast' || this.wizard.anims.getName() == 'wizardAttack'){
                    if (this.wizard.y < screenHeight - tileHeight * 2) {
                        this.wizard.y += 3;
                    }
                    this.fallSpeed = 8;
                }
            }
        }
        else if (this.upKey.isDown) {
            this.canAttack = false;
            // If wizard is not transitioning or slow falling, play transition animation
            if (this.wizard.anims.getName() !== 'wizardSlowTransition' && this.wizard.anims.getName() !== 'wizardSlow') {
                this.wizard.anims.play('wizardSlowTransition', true);
            }
            else {
                this.wizard.playAfterRepeat('wizardSlow');
                if (this.wizard.anims.getName() == 'wizardSlow' || this.wizard.anims.getName() == 'wizardAttack') {
                    if(this.wizard.y > 0 + tileHeight * 2){
                        this.wizard.y -= 2;
                    }
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
                this.canAttack = true;
                this.fallSpeed = 4;
            }
        }
        if (this.rightKey.isDown) {
            if(this.wizard.x < screenWidth/2 + (3 * tileWidth)){
                this.wizard.x += 2;
            }
        }
        else if (this.leftKey.isDown) {
            if (this.wizard.x > screenWidth / 2 - (3 * tileWidth)) {
                this.wizard.x -= 2;
            }
        }
    }

    // Every 100 depth, decrease opacity by 10%
    handleOpacity(){
        // NOP if depth is really high
        if(this.depth > 1005){
            return;
        }
        if(this.depth > 45 && this.depth <= 55){
            this.blankScreen.alpha += 0.02;
        }
        if (this.depth > 95 && this.depth <= 105) {
            this.blankScreen.alpha += 0.02;
        }
        if (this.depth > 145 && this.depth <= 155) {
            this.blankScreen.alpha += 0.02;
        }
        if (this.depth > 195 && this.depth <= 205) {
            this.blankScreen.alpha += 0.02;
        }
        if (this.depth > 245 && this.depth <= 255) {
            this.blankScreen.alpha += 0.02;
        }
    }

    scrollMap()
    {
        this.sy += Math.floor(this.fallSpeed);

        this.text.setText("Score: " + Math.floor(this.score));

        // Every tileHeight, delete the tile from the top of the screen and generate a new one at the bottom
        if (this.sy >= tileHeight) {
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

            this.handleEnemyGeneration();
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

    handleOnHurt(t){
        if(this.wizard.isHurt){
            if(this.wizard.health < 1){
                this.scene.start('GameOverScene', {'score': this.score});
            }
            this.wizard.setTint(0xFF0000);
            if (t < this.endIFrames){
                return;
            }
            else if (this.endIFrames - t > -20 && this.endIFrames - t < 20){
                this.wizard.setTint(0xFFFFFF);
                this.wizard.isHurt = false;
            }
            else{
                this.hurtSound.play();
                this.hearts[this.wizard.health].play('heartDie', true);
                this.endIFrames = t + this.invincibleDuration;
            }
        }
    }

    handleWin(){
        if(this.depth > 1300){
            this.scene.start('VictoryScene', { 'score': this.score });
        }
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
            debug: false,
            debugShowBody: true,
            debugShowStaticBody: true
        }
    },
    scene: [MainGameScene, GameOverScene, VictoryScene]
};

const game = new Phaser.Game(config);