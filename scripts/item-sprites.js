var myPrefix = "wi-";
var itemSuffix = "-liquid-item";

function findLiquidSprite(liquidName) {
    var possibleNames = [
        "liquid-" + liquidName,
        liquidName + "-liquid",
        "liquid-" + liquidName + "-icon",
        "liquid-" + liquidName + "-full",
        liquidName + "-icon",
        liquidName
    ];
    
    for (var i = 0; i < possibleNames.length; i++) {
        var region = Core.atlas.find(possibleNames[i]);
        if (region !== null && region.found()) {
            return region;
        }
    }
    return null;
}

function setLiquidItemSprites() {
    if (global.wi === undefined || global.wi.items === undefined) {
        return;
    }
    
    var allLiquids = Vars.content.liquids();
    if (allLiquids === null || allLiquids.size === 0) {
        return;
    }
    
    var updatedCount = 0;
    var notFoundCount = 0;
    
    for (var i = 0; i < allLiquids.size; i++) {
        var liquid = allLiquids.get(i);
        if (liquid === null) continue;
        if (liquid.isHidden && liquid.isHidden()) continue;
        
        var itemName = liquid.name + itemSuffix;
        var item = global.wi.items[itemName];
        if (item === undefined) {
            item = Vars.content.getByName(ContentType.item, itemName);
        }
        
        if (item === null || item === undefined) {
            notFoundCount++;
            continue;
        }

        var liquidSprite = findLiquidSprite(liquid.name);
        
        if (liquidSprite !== null && liquidSprite.found()) {
            var itemRegion = new TextureRegion(liquidSprite);
            Core.atlas.addRegion(itemName, itemRegion);

            item.fullIcon = itemRegion;
            item.uiIcon = itemRegion;
            
            updatedCount++;
        } else {
            notFoundCount++;
        }
    }
}

Events.on(ContentInitEvent, function() {
    setLiquidItemSprites();
});

Events.on(ClientLoadEvent, function() {
    var needsUpdate = false;
    if (global.wi !== undefined && global.wi.items !== undefined) {
        for (var key in global.wi.items) {
            var item = global.wi.items[key];
            if (item.fullIcon === null || item.fullIcon === undefined || !item.fullIcon.found()) {
                needsUpdate = true;
                break;
            }
        }
    }
    
    if (needsUpdate) {
        setLiquidItemSprites();
    }
});