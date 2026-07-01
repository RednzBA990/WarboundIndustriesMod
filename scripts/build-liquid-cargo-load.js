var myPrefix = "wi-";

Events.on(ContentInitEvent, () => {
    var conversionList = [];
    var allLiquids = Vars.content.liquids();
    
    for (var i = 0; i < allLiquids.size; i++) {
        var liquid = allLiquids.get(i);
        if (liquid === null || (liquid.isHidden && liquid.isHidden())) continue;
        
        var itemName = liquid.name + "-liquid-item";
        var item = Vars.content.getByName(ContentType.item, itemName);
        
        if (item !== null) {
            conversionList.push({
                liq: liquid,
                item: item,
                inputAmount: 50,
                outputAmount: 1,
                liqId: liquid.id,
                itemId: item.id,
                itemNameString: item.name
            });
        }
    }
    
    if (conversionList.length === 0) return;
    
    var allowedItems = new Seq();
    for (var i = 0; i < conversionList.length; i++) {
        allowedItems.add(conversionList[i].item);
    }
    
    var targetBlockName = myPrefix + "d1-a1-packaged-liquid-cargo-delivery-load";
    var topSprite = Core.atlas.find(targetBlockName + "-top");
    var targetBlock = Vars.content.getByName(ContentType.block, targetBlockName);
    if (targetBlock === null) return;
        
    var blockItemCapacity = targetBlock.itemCapacity;

    targetBlock.configurable = true;
    targetBlock.saveConfig = true;

    targetBlock.config(java.lang.String, new Cons2((build, itemNameString) => {
        build.setupFilterByName(itemNameString);
    }));
    targetBlock.configClear(new Cons(build => {
        build.setupFilterByName(null);
    }));
    
    targetBlock.buildType = () => extend(UnitCargoLoader.UnitTransportSourceBuild, targetBlock, {
        loaderTimer: 0,

        filteredItemName: null, 
        itemId: -1,
        liqId: -1,
        
        _conversionList: conversionList,
        _listLength: conversionList.length,

        setupFilterByName(nameStr) {
            if (nameStr === null || nameStr === "") {
                this.filteredItemName = null;
                this.itemId = -1;
                this.liqId = -1;
                return;
            }

            this.filteredItemName = nameStr;
            var itemObj = Vars.content.getByName(ContentType.item, nameStr);
            this.itemId = itemObj === null ? -1 : itemObj.id;

            for (var i = 0; i < this._listLength; i++) {
                if (this._conversionList[i].itemId === this.itemId) {
                    this.liqId = this._conversionList[i].liqId;
                    return;
                }
            }
            this.liqId = -1;
        },

        getItemObject() {
            if (this.filteredItemName === null) return null;
            return Vars.content.getByName(ContentType.item, this.filteredItemName);
        },

        acceptItem() {
            return false;
        },

        acceptLiquid(source, liquid) {
            if (this.filteredItemName === null) return false;
            if (this.items.total() >= blockItemCapacity) return false;

            var targetLiqId = this.liqId;
            if (targetLiqId === -1) return false;

            return liquid.id === targetLiqId;
        },

        buildConfiguration(table) {
            var self = this;
            ItemSelection.buildTable(
                table,
                allowedItems,
                new Prov(() => self.getItemObject()),
                new Cons(selectedItem => {
                    var currentObj = self.getItemObject();
                    var nextValue = (currentObj === selectedItem) ? "" : (selectedItem === null) ? "" : selectedItem.name;

                    self.configure(nextValue);
                    self.deselect();
                })
            );
        },

        config() {
            return this.filteredItemName === null ? "" : this.filteredItemName;
        },
        
        write(write) {
            this.super$write(write);
            write.str(this.filteredItemName === null ? "" : this.filteredItemName);
        },
        
        read(read, revision) {
            this.super$read(read, revision);
            var savedName = read.str();
            this.setupFilterByName(savedName === "" ? null : savedName);
        },
        
        updateTile() {
            this.super$updateTile();
            
            if (!Vars.state.isPlaying() || Vars.state.isPaused()) return;
            if (this.filteredItemName === null) {
                this.loaderTimer = 0;
                return;
            }
            
            this.loaderTimer += Time.delta;
            if (this.loaderTimer < 1) return;
            
            var items = this.items;
            var liquids = this.liquids;
            var list = this._conversionList;
            var len = this._listLength;
            var filterLiqId = this.liqId;

            for (var i = 0; i < len; i++) {
                var entry = list[i];
                if (entry.liqId !== filterLiqId) continue;

                if (liquids.get(entry.liq) >= entry.inputAmount) {
                    if (items.total() < blockItemCapacity) {
                        liquids.remove(entry.liq, entry.inputAmount);
                        items.add(entry.item, entry.outputAmount);
                        this.loaderTimer = 0;
                    }
                }
                break;
            }
        },
        
        draw() {
            this.super$draw();

            var currentItem = this.getItemObject();
            if (currentItem !== null) {
                Draw.z(Layer.blockOver - 2);
                Draw.color(currentItem.color);
                Draw.rect(topSprite, this.x, this.y);
                Draw.reset();
            }
        }
    });
});
