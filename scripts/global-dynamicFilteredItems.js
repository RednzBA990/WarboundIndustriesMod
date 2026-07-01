global.getDynamicFilteredItems = function() {
    const allowedItems = new Seq();
    const allItems = Vars.content.items();

    const isSandbox = Vars.state.rules.infiniteResources;
    const currentSector = Vars.state.rules.sector;
    const currentPlanet = currentSector != null ? currentSector.planet : null;

    for (let i = 0; i < allItems.size; i++) {
        let item = allItems.get(i);

        if (item.name.endsWith("-liquid-item")) continue;
        if (item.isHidden()) continue;

        let isAllowedOnPlanet = true;
        if (!isSandbox) {
            if (currentPlanet != null && currentPlanet.hiddenItems.contains(item)) {
                isAllowedOnPlanet = false;
            }
            if (Vars.state.rules.hiddenBuildItems.contains(item)) {
                isAllowedOnPlanet = false; 
            }
        }

        if (isSandbox || (isAllowedOnPlanet && item.unlockedNow())) {
            allowedItems.add(item);
        }
    }
    
    return allowedItems;
};
