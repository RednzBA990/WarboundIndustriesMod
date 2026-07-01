var myPrefix = "wi-";
var exponentialReconstructorName = myPrefix + "factory-unit2-modern-reconstructor2-exponential";

var suctionEffect = new Effect(60, function(e) {
    var size = (0.5 + e.fslope() * 1.5) * e.fout();
    Draw.color(Color.white, Color.yellow, e.fin());
    var tx = Mathf.lerp(e.x, e.data.x, e.fin());
    var ty = Mathf.lerp(e.y, e.data.y, e.fin());
    Fill.circle(tx, ty, size * 8);
    Draw.reset();
});

var recipes = [
    {
        main: myPrefix + "tankt3-azoph",
        needUnit: myPrefix + "tankt2-aziot",
        countUnit: 3,
        unitSizeX: 15,
        unitSizeY: 20,
        needBlock: myPrefix + "w-w2-titarium-wall-large",
        countBlock: 6
    },
    {
        main: myPrefix + "helit3-razor",
        needUnit: myPrefix + "helit2-rapier",
        countUnit: 2,
        unitSizeX: 15,
        unitSizeY: 25,
        needBlock: myPrefix + "w-w2-titarium-wall-large",
        countBlock: 4
    }
];

var recipeMap = {};
for (var i = 0; i < recipes.length; i++) {
    recipeMap[recipes[i].main] = recipes[i];
}

var cachedUnitTypes = {};
var cachedBlockTypes = {};

Events.on(ContentInitEvent, function() {
    var exponentialReconstructor = Vars.content.getByName(ContentType.block, exponentialReconstructorName);
    if (exponentialReconstructor === null) return;
    
    var scanSprite = Core.atlas.find(exponentialReconstructorName + "-scan-area");
    var arrowSprite = Core.atlas.find(exponentialReconstructorName + "-arrow-grab");
    var statusSprite = Core.atlas.find(exponentialReconstructorName + "-status");
    
    for (var i = 0; i < recipes.length; i++) {
        var r = recipes[i];
        cachedUnitTypes[r.needUnit] = Vars.content.getByName(ContentType.unit, r.needUnit);
        cachedBlockTypes[r.needBlock] = Vars.content.getByName(ContentType.block, r.needBlock);
    }
    
    exponentialReconstructor.buildType = function() {
        return extend(Reconstructor.ReconstructorBuild, exponentialReconstructor, {
            consumed: false,
            chargeTimer: 0,
            isCharging: false,
            isReady: false,
            currentUnitCount: 0,
            currentBlockCount: 0,
            
            cachedScanX: 0,
            cachedScanY: 0,
            cachedRotation: -1,
            
            write: function(write) {
                this.super$write(write);
                write.bool(this.consumed);
                write.f(this.chargeTimer);
                write.bool(this.isCharging);
                write.bool(this.isReady);
                write.f(this.progress);
                write.f(this.efficiency);
            },
            
            read: function(read, revision) {
                this.super$read(read, revision);
                this.consumed = read.bool();
                this.chargeTimer = read.f();
                this.isCharging = read.bool();
                this.isReady = read.bool();
                this.progress = read.f();
                this.efficiency = read.f();
            },
            
            shouldConsume: function() {
                if (!this.isReady) return false;
                return this.super$shouldConsume();
            },
            
            updateScanPosition: function() {
                var rot = this.rotation;
                if (this.cachedRotation === rot) return;
                this.cachedRotation = rot;
                var offset = 80;
                var angle = rot * 90 + 180;
                this.cachedScanX = this.x + Angles.trnsx(angle, offset);
                this.cachedScanY = this.y + Angles.trnsy(angle, offset);
            },
            
            updateTile: function() {
                this.super$updateTile();
                
                var payload = this.payload;
                if (payload === null) {
                    this.consumed = false;
                    this.chargeTimer = 0;
                    this.isCharging = false;
                    this.isReady = false;
                    this.progress = 0;
                    this.efficiency = 0;
                    this.currentUnitCount = 0;
                    this.currentBlockCount = 0;
                    return;
                }
                
                if (!this.consumed) {
                    this.updateScanPosition();
                    
                    var unit = payload.unit;
                    if (!unit) return;
                    
                    var recipe = recipeMap[unit.type.name];
                    if (!recipe) return;
                    
                    var scanX = this.cachedScanX;
                    var scanY = this.cachedScanY;
                    var team = this.team;
                    
                    var unitCount = 0;
                    var needUnit = recipe.needUnit;
                    var needUnitCount = recipe.countUnit;
                    var scanSize = 96;
                    
                    if (!this._foundUnits) this._foundUnits = [];
                    var foundUnits = this._foundUnits;
                    foundUnits.length = 0;
                    
                    var centerX = scanX;
                    var centerY = scanY;
                    var radius = scanSize / 2;
                    
                    Units.nearby(team, centerX, centerY, radius, function(u) {
                        if (u.type && u.type.name === needUnit && unitCount < needUnitCount) {
                            foundUnits.push(u);
                            unitCount++;
                        }
                    });
                    this.currentUnitCount = unitCount;

                    var blockCount = 0;
                    var needBlock = recipe.needBlock;
                    var needBlockCount = recipe.countBlock;
                    
                    if (!this._foundBlocks) this._foundBlocks = [];
                    var foundBlocks = this._foundBlocks;
                    foundBlocks.length = 0;
                    
                    var startX = World.toTile(scanX - 32);
                    var startY = World.toTile(scanY - 32);
                    var endX = startX + 8;
                    var endY = startY + 8;
                    
                    for (var x = startX; x < endX; x++) {
                        for (var y = startY; y < endY; y++) {
                            if (blockCount >= needBlockCount) break;
                            var t = Vars.world.tile(x, y);
                            if (t !== null && t.build !== null && t.block().name === needBlock && t.team() === team) {
                                var build = t.build;
                                var alreadyExists = false;
                                for (var f = 0; f < foundBlocks.length; f++) {
                                    if (foundBlocks[f] === build) {
                                        alreadyExists = true;
                                        break;
                                    }
                                }
                                if (!alreadyExists) {
                                    foundBlocks.push(build);
                                    blockCount++;
                                }
                            }
                        }
                        if (blockCount >= needBlockCount) break;
                    }
                    this.currentBlockCount = blockCount;

                    if (unitCount >= needUnitCount && blockCount >= needBlockCount) {
                        this.isCharging = true;
                        this.chargeTimer += Time.delta;
                        
                        if (this.chargeTimer >= 120) {
                            var unitPositions = [];
                            for (var iu = 0; iu < needUnitCount; iu++) {
                                var uf = foundUnits[iu];
                                if (uf) unitPositions.push({x: uf.x, y: uf.y});
                            }
                            var blockPositions = [];
                            for (var ib = 0; ib < needBlockCount; ib++) {
                                var bf = foundBlocks[ib];
                                if (bf) blockPositions.push({x: bf.x, y: bf.y});
                            }

                            for (var iu2 = 0; iu2 < unitPositions.length; iu2++) {
                                var ufe = foundUnits[iu2];
                                if (ufe) ufe.remove();
                            }
                            for (var ib2 = 0; ib2 < blockPositions.length; ib2++) {
                                var bfe = foundBlocks[ib2];
                                if (bfe) bfe.kill();
                            }

                            for (var ip = 0; ip < unitPositions.length; ip++) {
                                var pos = unitPositions[ip];
                                Fx.spawn.at(pos.x, pos.y);
                                suctionEffect.at(pos.x, pos.y, 0, this);
                            }
                            for (var bp = 0; bp < blockPositions.length; bp++) {
                                var bpos = blockPositions[bp];
                                Fx.spawn.at(bpos.x, bpos.y);
                                suctionEffect.at(bpos.x, bpos.y, 0, this);
                            }
                            
                            this.consumed = true;
                            this.isCharging = false;
                            this.isReady = true;
                        }
                    } else {
                        this.isReady = false;
                        this.chargeTimer = 0;
                        this.isCharging = false;
                    }
                }
            },
            
            updateEfficiency: function() {
                if (this.isReady) {
                    this.super$updateEfficiency();
                } else {
                    this.efficiency = 0;
                    this.progress = 0;
                }
            },
            
            draw: function() {
                this.super$draw();
                
                var rot = this.rotation !== undefined ? this.rotation : 0;
                var offset = 80;
                var angle = rot * 90 + 180;
                var scanX = this.x + Angles.trnsx(angle, offset);
                var scanY = this.y + Angles.trnsy(angle, offset);
                
                Draw.z(Layer.overlayUI);
                var baseColor = this.consumed ? Color.green : (this.isCharging ? Color.orange : Color.valueOf("ffd27e"));
                
                Draw.blend(Blending.additive);
                Draw.color(baseColor);
                if (scanSprite.found()) Draw.rect(scanSprite, scanX, scanY);
                
                if (this.isCharging && arrowSprite.found()) {
                    var progressAnim = (Time.time % 40) / 40;
                    var arrowX = Mathf.lerp(scanX, this.x, progressAnim);
                    var arrowY = Mathf.lerp(scanY, this.y, progressAnim);
                    Draw.rect(arrowSprite, arrowX, arrowY, rot * 90);
                }
                Draw.blend();
                
                if (statusSprite.found()) {
                    Draw.z(Layer.blockOver + 10);
                    Draw.blend();
                    Draw.color(this.consumed ? Color.green : (this.isCharging ? Color.orange : Color.red));
                    Draw.rect(statusSprite, this.x, this.y);
                }
                
                var payload = this.payload;
                if (payload !== null && !this.consumed && payload.unit) {
                    var recipe = recipeMap[payload.unit.type.name];
                    if (recipe) {
                        var unitType = cachedUnitTypes[recipe.needUnit];
                        var blockType = cachedBlockTypes[recipe.needBlock];
                        
                        if (unitType !== null) {
                            Draw.z(Layer.overlayUI);
                            Draw.blend();
                            Draw.color(this.currentUnitCount >= recipe.countUnit ? Color.white : Color.gray);
                            Draw.rect(unitType.fullIcon, scanX - 16, scanY, recipe.unitSizeX, recipe.unitSizeY);
                            FontUtils.draw(this.currentUnitCount + "/" + recipe.countUnit, scanX - 16, scanY - 14, 0.23, true);
                        }
                        
                        if (blockType !== null) {
                            Draw.z(Layer.overlayUI);
                            Draw.blend();
                            Draw.color(this.currentBlockCount >= recipe.countBlock ? Color.white : Color.gray);
                            Draw.rect(blockType.fullIcon, scanX + 16, scanY, 15, 15);
                            FontUtils.draw(this.currentBlockCount + "/" + recipe.countBlock, scanX + 16, scanY - 14, 0.23, true);
                        }
                    }
                }
                
                Draw.reset();
            }
        });
    };
});

var FontUtils = {
    draw: function(text, x, y, scale, center) {
        var font = Fonts.outline;
        font.setUseIntegerPositions(false);
        font.getData().setScale(scale);
        if (center) font.draw(text, x, y, 1, 1, false);
        else font.draw(text, x, y);
    }
};