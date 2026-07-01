const minerialExtractor = extend(SolidPump, "pro3-a2-minerial-extractor", {
    canPlaceOn: function(tile, team, rotation){
        if(tile == null) return false;
        var f = tile.floor();
        var name = f.name;
        var isSonim = name.includes("sonim");    
        return isSonim;
    }
});
Events.on(ContentInitEvent, () => {
minerialExtractor.buildType = function(){
    return extend(SolidPump.SolidPumpBuild, minerialExtractor, {
   	 });
	};
});
