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
                itemId: item.id
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

    targetBlock.config(java.lang.String, new Cons2((build, nameStr) => {
        build.applyFilter(nameStr);
    }));
    targetBlock.configClear(new Cons(build => {
        build.applyFilter(null);
    }));
    
    targetBlock.buildType = () => extend(UnitCargoLoader.UnitTransportSourceBuild, targetBlock, {
        filterItemName: null,
        _filteredLiqId: -1,
        _convTimer: 0,

        applyFilter(nameStr) {
            if (nameStr === null || nameStr === "") {
                this.filterItemName = null;
                this._filteredLiqId = -1;
                return;
            }
            this.filterItemName = nameStr;
            for (var i = 0; i < conversionList.length; i++) {
                if (conversionList[i].item.name === nameStr) {
                    this._filteredLiqId = conversionList[i].liqId;
                    return;
                }
            }
            this._filteredLiqId = -1;
        },

        getFilteredItem() {
            if (this.filterItemName === null) return null;
            return Vars.content.getByName(ContentType.item, this.filterItemName);
        },

        acceptItem() {
            return false;
        },

        acceptLiquid(source, liquid) {
            if (this.items.total() >= blockItemCapacity) return false;
            if (this._filteredLiqId !== -1) return liquid.id === this._filteredLiqId;
            
            for (var i = 0; i < conversionList.length; i++) {
                if (conversionList[i].liqId === liquid.id) return true;
            }
            return false;
        },

        updateTile() {
            this.super$updateTile();
            if (!Vars.state.isPlaying() || Vars.state.isPaused()) return;
            if (this.items.total() >= blockItemCapacity) return;

            this._convTimer += Time.delta;
            if (this._convTimer < 1) return;
            this._convTimer = 0;

            var liquids = this.liquids;
            var items = this.items;
            
            for (var i = 0; i < conversionList.length; i++) {
                var entry = conversionList[i];
                if (this._filteredLiqId !== -1 && entry.liqId !== this._filteredLiqId) continue;

                if (liquids.get(entry.liq) >= entry.inputAmount) {
                    liquids.remove(entry.liq, entry.inputAmount);
                    items.add(entry.item, entry.outputAmount);
                    if (this._filteredLiqId === -1) break;
                }
            }
        },

        buildConfiguration(table) {
            var self = this;
            ItemSelection.buildTable(table, allowedItems, () => self.getFilteredItem(), selectedItem => {
                var current = self.getFilteredItem();
                var nextName = (current === selectedItem || selectedItem === null) ? "" : selectedItem.name;
                self.configure(nextName);
                self.deselect();
            });
        },

        config() {
            return this.filterItemName === null ? "" : this.filterItemName;
        },
        
        write(write) {
            this.super$write(write);
            write.str(this.filterItemName === null ? "" : this.filterItemName);
        },
        
        read(read, revision) {
            this.super$read(read, revision);
            var saved = read.str();
            this.applyFilter(saved === "" ? null : saved);
        },
        
        draw() {
            this.super$draw();
            var fi = this.getFilteredItem();
            if (fi !== null) {
                Draw.z(Layer.blockOver - 2);
                Draw.color(fi.color);
                Draw.rect(topSprite, this.x, this.y);
                Draw.reset();
            }
        }
    });
});
