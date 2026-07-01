const myPrefix = "wi-";
const junctionName = myPrefix + "d3-a1-hybrid-junction";

Events.on(ContentInitEvent, () => {
    const baseBlock = Vars.content.getByName(ContentType.block, junctionName);
    if(baseBlock == null) return;
    
    baseBlock.update = true;
    baseBlock.hasItems = true;
    baseBlock.itemCapacity = 15;

    baseBlock.buildType = () => extend(Packages.mindustry.world.blocks.liquid.LiquidJunction.LiquidJunctionBuild, baseBlock, {
        itemBuffers: new Array(60).fill(null),
        itemTimers: new Array(60).fill(0),
        bufferCounts: [0, 0, 0, 0],
        
        moveSpeed: 26, 

        outputsItems() {
            return true;
        },

        acceptItem(source, item) {
            if(!this.enabled) return false;

            let relative = source.relativeTo(this.tile);
            if(relative === -1) return false;

            if(this.bufferCounts[relative] >= 15) return false;

            let dest = this.nearby(relative);
            return dest != null && dest.team == this.team;
        },

        handleItem(source, item) {
            let relative = source.relativeTo(this.tile);
            if(relative === -1) return;

            let count = this.bufferCounts[relative];
            let index = (relative * 15) + count;

            this.itemBuffers[index] = item;
            this.itemTimers[index] = Time.time + this.moveSpeed;
            this.bufferCounts[relative]++;

        },

        acceptStack(item, amount, source) {
            return 0;
        },

        updateTile() {
            this.super$updateTile();

            if(!Vars.state.isPlaying() || Vars.state.isPaused()) return;

            for (let i = 0; i < 4; i++) {
                let count = this.bufferCounts[i];
                if (count > 0) {
                    let startIndex = i * 15;

                    if (Time.time >= this.itemTimers[startIndex]) {
                        let item = this.itemBuffers[startIndex];
                        let dest = this.nearby(i);

                        if (dest != null && dest.acceptItem(this, item) && dest.team == this.team) {
                            dest.handleItem(this, item);

                            for (let j = 0; j < count - 1; j++) {
                                this.itemBuffers[startIndex + j] = this.itemBuffers[startIndex + j + 1];
                                this.itemTimers[startIndex + j] = this.itemTimers[startIndex + j + 1];
                            }

                            let lastIdx = startIndex + count - 1;
                            this.itemBuffers[lastIdx] = null;
                            this.itemTimers[lastIdx] = 0;
                            
                            this.bufferCounts[i]--;
                        }
                    }
                }
            }
        }
    });
});
