var myPrefix = "wi-";

function buildConversionList() {
    var list = [];
    var allLiquids = Vars.content.liquids();
    
    for (var i = 0; i < allLiquids.size; i++) {
        var liquid = allLiquids.get(i);
        if (liquid === null || (liquid.isHidden && liquid.isHidden())) continue;
        
        var itemName = liquid.name + "-liquid-item";
        var item = Vars.content.getByName(ContentType.item, itemName);
        
        if (item !== null) {
            list.push({
                itemName: itemName,
                item: item,
                liq: liquid,
                liqName: liquid.name,
                outputAmount: 50,
                itemId: item.id,
                liqId: liquid.id
            });
        }
    }
    return list;
}

Events.on(ContentInitEvent, () => {
    var conversionList = buildConversionList();
    if (conversionList.length === 0) return;

    var allowedItems = new Seq();
    for (var i = 0; i < conversionList.length; i++) {
        allowedItems.add(conversionList[i].item);
    }
    
    var targetBlockName = myPrefix + "d1-a1-packaged-liquid-cargo-delivery-unload";
    var targetBlock = Vars.content.getByName(ContentType.block, targetBlockName);
    if (targetBlock === null) return;
    
    var blockLiquidCapacity = targetBlock.liquidCapacity;
    var blockName = targetBlock.name;
    var blockItemCapacity = targetBlock.itemCapacity;

    targetBlock.buildType = () => extend(UnitCargoUnloadPoint.UnitCargoUnloadPointBuild, targetBlock, {
        item: null,
        itemId: -1,
        
        _conversionList: conversionList,
        _listLength: conversionList.length,
        _itemToLiquidMap: null,

        buildItemToLiquidMap() {
            if (this._itemToLiquidMap !== null) return;
            this._itemToLiquidMap = {};
            for (var i = 0; i < this._listLength; i++) {
                var entry = this._conversionList[i];
                this._itemToLiquidMap[entry.itemName] = entry.liq;
            }
        },
        
        acceptItem(source, item) {
            return false;
        },
        
        dumpAccumulate() {
            return false;
        },
        
        buildConfiguration(table) {
            ItemSelection.buildTable(table, allowedItems, () => this.item,
                i => {
                    this.item = (this.item === i) ? null : i;
                    this.itemId = this.item === null ? -1 : this.item.id;
                    this.configure(this.item);
                }
            );
        },
        
        configure(value) {
            this.item = value;
            this.itemId = this.item === null ? -1 : this.item.id;
        },
        
        config() {
            return this.item;
        },
        
        write(write) {
            this.super$write(write);
            write.s(this.item === null ? -1 : this.item.id);
        },
        
        read(read, revision) {
            this.super$read(read, revision);
            var id = read.s();
            this.item = (id === -1) ? null : Vars.content.item(id);
            this.itemId = this.item === null ? -1 : this.item.id;
        },
        
        updateTile() {
            this.super$updateTile();
            
            if (!Vars.state.isPlaying() || Vars.state.isPaused()) return;
            
            this.buildItemToLiquidMap();
            
            var items = this.items;
            var liquids = this.liquids;
            var list = this._conversionList;
            var len = this._listLength;
            var filterId = this.itemId;
            var liquidCapacity = blockLiquidCapacity;

            for (var i = 0; i < len; i++) {
                var entry = list[i];
                
                if (filterId !== -1 && filterId !== entry.itemId) continue;
                
                var itemAmount = items.get(entry.item);
                if (itemAmount <= 0) continue;
                
                var currentLiquid = liquids.get(entry.liq);
                var spaceAvailable = liquidCapacity - currentLiquid;
                
                var maxConvert = Math.floor(spaceAvailable / entry.outputAmount);
                if (maxConvert <= 0) continue;
                
                var amountToConvert = Math.min(itemAmount, maxConvert);
                if (amountToConvert <= 0) continue;

                items.remove(entry.item, amountToConvert);
                liquids.add(entry.liq, amountToConvert * entry.outputAmount);

                break;
            }

            if (liquids.currentAmount() > 0.1) {
                var currentLiq = liquids.current();
                if (currentLiq === null) return;
                
                var available = liquids.get(currentLiq);
                var transferAmount = Math.min(available, 15.0);
                var team = this.team;
                
                var proximity = this.proximity;
                for (var j = 0; j < proximity.size; j++) {
                    var other = proximity.get(j);
                    if (other !== null && other.block.hasLiquids && other.team === team && other.acceptLiquid(this, currentLiq)) {
                        var space = other.block.liquidCapacity - other.liquids.get(currentLiq);
                        if (space > 0) {
                            var out = Math.min(transferAmount, space);
                            other.handleLiquid(this, currentLiq, out);
                            liquids.remove(currentLiq, out);
                        }
                    }
                }
            }
        },
        
        draw() {
            this.super$draw();
            
            if (this.item !== null) {
                Draw.color(this.item.color);
                Draw.rect(blockName + "-top", this.x, this.y);
                Draw.reset();
            }
        }
    });
});