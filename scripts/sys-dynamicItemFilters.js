const myPrefix = "wi-";
const targetBlocks = [
    { name: "sorter", getItem: (build) => build.sortItem },
    { name: "inverted-sorter", getItem: (build) => build.sortItem },
    { name: "item-source", getItem: (build) => build.outputItem },
    { name: "unloader", getItem: (build) => build.sortItem },
    { name: "wi-d0-c1-unloader", getItem: (build) => build.sortItem },
    { name: "wi-d0-c2-unloader", getItem: (build) => build.sortItem },
    { name: "duct-router", getItem: (build) => build.sortItem },
    { name: "surge-router", getItem: (build) => build.sortItem },
    { name: "duct-unloader", getItem: (build) => build.unloadItem },
    { name: "landing-pad", getItem: (build) => build.config },
    { name: "unit-cargo-unload-point", getItem: (build) => build.item },
    { name: "wi-copper-cargo-delivery-unload", getItem: (build) => build.item },
    { name: "wi-faster-cargo-delivery-unload", getItem: (build) => build.item }
];

function getTargetBuildClass(block) {
    if (block instanceof Sorter) return Sorter.SorterBuild;
    if (block instanceof ItemSource) return ItemSource.ItemSourceBuild;
    if (block instanceof Unloader) return Unloader.UnloaderBuild;
    if (block instanceof DirectionalUnloader) return DirectionalUnloader.DirectionalUnloaderBuild;
    if (block instanceof DuctRouter) return DuctRouter.DuctRouterBuild;
    if (block instanceof LandingPad) return LandingPad.LandingPadBuild;
    if (block instanceof UnitCargoUnloadPoint) return UnitCargoUnloadPoint.UnitCargoUnloadPointBuild;
    return Building; 
}

Events.on(ContentInitEvent, () => {
    
    targetBlocks.forEach(blockData => {
        const block = Vars.content.getByName(ContentType.block, blockData.name);
        if (block == null) return;
        
        block.configurable = true;

        const BuildClass = getTargetBuildClass(block);
        
        block.buildType = () => extend(BuildClass, block, {
            
            buildConfiguration(table) {
                const self = this;
                const validItems = global.getDynamicFilteredItems();
                
                ItemSelection.buildTable(
                    table,
                    validItems,
                    new Prov(() => blockData.getItem(self)), 
                    
                    new Cons(selectedItem => {
                        const currentObj = blockData.getItem(self);
                        const nextValue = (currentObj === selectedItem) ? null : selectedItem;
                        
                        self.configure(nextValue);
                        self.deselect();
                        //print([blockData.name] + ": Memilih " + nextValue + " dengan config " + currentObj + ".");
                    })
                );
            }
        });
    });
});
