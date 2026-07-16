var myPrefix = "wi-";
var itemSuffix = "-liquid-item";

if (global.wi === undefined) global.wi = {};
if (global.wi.items === undefined) global.wi.items = {};

function createLiquidItem(liquid) {
    var itemName = liquid.name + itemSuffix;

    if (global.wi.items[itemName] !== undefined) {
        return global.wi.items[itemName];
    }

    var newItem = extend(Item, itemName, {
        localizedName: liquid.localizedName,
        description: "Solidified " + liquid.localizedName + ".",
        color: liquid.color || Color.valueOf("ffffff"),
        hardness: 0,
        explosiveness: liquid.explosiveness || 0,
        flammability: (liquid.name == "slag") ? 2 : liquid.flammability || 0,
        radioactivity: 0,
        charge: 0,
        cost: 1,
        alwaysUnlocked: true,
        hidden: false,
        buildable: true
    });

	const parent = Vars.content.getByName(ContentType.liquid, liquid.name);
		if (parent != null) {
  		  newItem.research = parent;
	}

    global.wi.items[itemName] = newItem;
    return newItem;
}

Events.on(ModContentLoadEvent, function() {
    var allLiquids = Vars.content.liquids();
    if (allLiquids === null || allLiquids.size === 0) {
        return;
    }
    
    var createdCount = 0;
    
    for (var i = 0; i < allLiquids.size; i++) {
        var liquid = allLiquids.get(i);
        if (liquid === null) continue;
        if (liquid.isHidden && liquid.isHidden()) continue;
        
        var itemName = liquid.name + itemSuffix;
        
        if (global.wi.items[itemName] !== undefined) {
            continue;
        }
        
        createLiquidItem(liquid);
        createdCount++;
    }
    print("Registry complete with " + createdCount + " liquid to be Solidified.");
});
