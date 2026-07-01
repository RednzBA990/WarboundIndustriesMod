var myPrefix = "wi-";
var junctionName = myPrefix + "d3-a1-hybrid-junction";

var DIR_DX = [1, 0, -1, 0];
var DIR_DY = [0, 1, 0, -1];

var MAX_DISTANCE = 10;
var SCAN_STEP = 1;

Events.on(ContentInitEvent, function() {
    var liquidUnloader = Vars.content.getByName(ContentType.block, myPrefix + "l1-a1-liquid-unloader");
    if (liquidUnloader === null) return;

    var topRegion = Core.atlas.find(myPrefix + "l1-a1-liquid-unloader-top");
    var itemRegion = Core.atlas.find(myPrefix + "l1-a1-liquid-unloader-item");
    var junctionTopRegion = Core.atlas.find(myPrefix + "d3-a1-hybrid-junction-top");
   
    liquidUnloader.configurable = true;
    liquidUnloader.saveConfig = true;

    liquidUnloader.config(java.lang.String, new Cons2((build, name) => {
        build.setupFilter(name);
    }));

    liquidUnloader.configClear(new Cons(build => {
        build.setupFilter(null);
    }));
    
    liquidUnloader.buildType = function() {
        return extend(Wall.WallBuild, liquidUnloader, {
            currentFilter: null,
            filterName: null,
            isActive: false,
            transferColor: Color.white,
            transferAlpha: 0,
            lastDistance: 0,
            _cachedDir: null,

            setupFilter(name) {
                if (name === null || name === "") {
                    this.currentFilter = null;
                    this.filterName = null;
                } else {
                    this.filterName = name;
                    this.currentFilter = Vars.content.getByName(ContentType.liquid, name);
                }
            },

            buildConfiguration: function(table) {
                var self = this;
                ItemSelection.buildTable(table, Vars.content.liquids(), 
                    new Prov(() => self.currentFilter),
                    new Cons(l => {
                        var nextValue = (self.currentFilter === l) ? "" : (l === null) ? "" : l.name;
                        self.configure(nextValue);
                        self.deselect();
                    })
                );
            },

            config: function() {
                return this.filterName === null ? "" : this.filterName;
            },

            updateDirection: function() {
                if (this._cachedDir === null) {
                    this._cachedDir = {
                        dx: DIR_DX[this.rotation],
                        dy: DIR_DY[this.rotation]
                    };
                }
                return this._cachedDir;
            },

            findTarget: function(backTile, currentLiq) {
                var dir = this.updateDirection();
                for (var dist = SCAN_STEP; dist <= MAX_DISTANCE; dist++) {
                    var nextX = this.tileX() + (dir.dx * dist);
                    var nextY = this.tileY() + (dir.dy * dist);
                    var nextBuild = Vars.world.build(nextX, nextY);
                    
                    if (nextBuild === null) return null;
                    if (nextBuild.block.name === junctionName) continue;

                    if (nextBuild.block.hasLiquids && nextBuild.acceptLiquid(this, currentLiq)) {
                        this.lastDistance = dist;
                        return nextBuild;
                    }
                    return null;
                }
                return null;
            },
            
            updateTile: function() {
                this.super$updateTile();
                this.isActive = false;
                
                if (!Vars.state.isPlaying() || Vars.state.isPaused()) return;

                this.transferAlpha = Mathf.approachDelta(this.transferAlpha, 0, 0.05);
                
                var backDir = (this.rotation + 2) % 4;
                var backTile = Vars.world.build(this.tileX() + DIR_DX[backDir], this.tileY() + DIR_DY[backDir]);
                
                if (backTile === null || backTile.liquids === null) return;

                var currentLiq = (this.currentFilter === null) ? backTile.liquids.current() : this.currentFilter;
                if (currentLiq === null) return;
                
                var liquidAmount = backTile.liquids.get(currentLiq);
                if (liquidAmount <= 0.01) return;

                var target = this.findTarget(backTile, currentLiq);
                if (target === null) return;
                
                this.transferColor = currentLiq.color;
                this.transferAlpha = Math.min(liquidAmount / 5, 1.0);

                var spaceLeft = target.block.liquidCapacity - target.liquids.get(currentLiq);
                if (spaceLeft <= 0.1) return;
                
                this.isActive = true;
                var transferAmount = Math.min(liquidAmount, 3);
                transferAmount = Math.min(transferAmount, spaceLeft);
                
                if (transferAmount > 0) {
                    target.handleLiquid(this, currentLiq, transferAmount);
                    backTile.liquids.remove(currentLiq, transferAmount);
                }
            },
            
            draw: function() {
                this.super$draw();

                if (this.currentFilter !== null) {
                    Draw.color(this.currentFilter.color);
                    Draw.rect(itemRegion, this.x, this.y);
                    Draw.reset();
                }

                if (this.transferAlpha > 0.01) {
                    Draw.z(Layer.blockOver + 0.1);
                    Draw.color(this.transferColor, this.transferAlpha);
                    Draw.rect(topRegion, this.x, this.y, this.rotation * 90);

                    var dir = this.updateDirection();
                    for (var d = 1; d < this.lastDistance; d++) {
                        Draw.rect(junctionTopRegion, this.x + (dir.dx * d * 8), this.y + (dir.dy * d * 8));
                    }
                    Draw.reset();
                }
            },
            
            write: function(write) {
                this.super$write(write);
                write.str(this.filterName === null ? "" : this.filterName);
            },
            
            read: function(read, revision) {
                this.super$read(read, revision);
                var savedName = read.str();
                this.setupFilter(savedName === "" ? null : savedName);
            },

            onProximityAdded: function() {
                this.super$onProximityAdded();
                this._cachedDir = null;
                this.lastDistance = 0;
            }
        });
    };
});
