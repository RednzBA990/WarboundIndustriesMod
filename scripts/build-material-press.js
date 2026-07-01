const myPrefix = "wi-";
	
var materialPress = extend(GenericCrafter, "pro3-a1-material-press", {
    canPlaceOn: function(tile, team, rotation){
        if(tile == null) return false;
        var f = tile.floor();
        var name = f.name;
        
        var isMetal = name.includes("metal") || name.includes("plating") || name.includes("tiled") || name.includes("water");
        var isSonim = name.includes("sonim");
        
        return !isMetal && !isSonim;
    }
});

Events.on(ContentInitEvent, () => {

materialPress.buildType = function(){
    return extend(GenericCrafter.GenericCrafterBuild, materialPress, {
        pressTimer: 0,
        pressing: false,

        updateTile: function(){
            this.super$updateTile();
            
            if(this.efficiency > 0){
                this.pressTimer += Time.delta;
                if(this.pressTimer >= 1200 && this.pressTimer < 1300){
                    this.pressing = true;

                    var sonimFloor = Vars.content.getByName(ContentType.block, myPrefix + "sonim");
                    var t = this.tile;
                    
                    if(t != null && sonimFloor != null && t.floor() != sonimFloor){
                        t.setFloor(sonimFloor.asFloor());
                        
                        Sounds.explosionCrawler.at(this.x, this.y);
                        Fx.instBomb.at(this.x, this.y);
                        Fx.smokeCloud.at(this.x, this.y);
                        Effect.shake(4, 4, this.x, this.y); 
                    }
                } else {
                    this.pressing = false;
                }

                if(this.pressTimer >= 1300){
                    this.consume(); 
                    Fx.pulverize.at(this.x, this.y);

                    this.tile.remove(); 
                }
            } else {
                this.pressing = false;
            }
        },

        draw: function(){
            this.super$draw();

            var presserRegion = Core.atlas.find(this.block.name + "-presser");
            var topRegion = Core.atlas.find(this.block.name + "-top");
            var offRegion = Core.atlas.find(this.block.name + "-off");

            if(this.pressing && presserRegion.found()){
                Draw.rect(presserRegion, this.x, this.y);
            }

            if(topRegion.found()){
                var sec = this.pressTimer / 60;
                var clockColor = Color.red;
                if(sec >= 16) clockColor = Color.valueOf("99ff99");
                else if(sec >= 10) clockColor = Color.orange;
                
                Draw.color(clockColor);
                Draw.rect(topRegion, this.x, this.y);
                Draw.reset();
            }

            if(this.efficiency <= 0 && offRegion.found()){
                Draw.rect(offRegion, this.x, this.y);
            }
        }
    });
};
	
});
