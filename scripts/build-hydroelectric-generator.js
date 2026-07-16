const myPrefix = "wi-";
	const HydroBlock = extend(LiquidRouter, "p1-a-water-generator-1", {
    setStats() {
        this.super$setStats();
        this.stats.add(Stat.basePowerGeneration, 3 * 60, StatUnit.powerSecond);
    },
    setBars() {
        this.super$setBars();
        this.addBar("power", (build) => new Bar(
            Core.bundle.format("bar.poweroutput", Strings.fixed(build.getPowerProduction() * 60 * build.timeScale, 1)),
            Pal.powerBar,
            new Floatp({ get: () => build.getPowerProduction() / 3 })
	        ));
	    }
	});
	
Events.on(ContentInitEvent, () => {
    const hydroGenerator = Vars.content.getByName(ContentType.block, myPrefix + "p1-a-water-generator-1");
    if (hydroGenerator == null) return;
    
    hydroGenerator.hasPower = true;
    hydroGenerator.outputsPower = true;
    hydroGenerator.consumePower(0);
    
    const maxPowerGeneration = 3;    
    const rotorRegion = Core.atlas.find(myPrefix + "p1-a-water-generator-1-rotor");
    const topRegion = Core.atlas.find(myPrefix + "p1-a-water-generator-1");
    
    hydroGenerator.buildType = () => extend(LiquidRouter.LiquidRouterBuild, hydroGenerator, {

        flowMomentum: 0,
        rotorRotation: 0,
		lastAmount: 0, 

	updateTile() {
 	   this.super$updateTile();
 
 	   this.liquids.updateFlow();
 	   const totalLiq = this.liquids.sum((liq, amount) => amount);

 	   const hasWater = totalLiq > 0.01;
 	   const isFlowing = this.enabled && hasWater;
	
 	   if (isFlowing) {
 	       this.flowMomentum = Mathf.lerpDelta(this.flowMomentum, 1, 0.05);
 	   } else {
 	       this.flowMomentum = Mathf.lerpDelta(this.flowMomentum, 0, 0.1);
 	   }
 	   this.rotorRotation += this.flowMomentum * 15 * Time.delta;
	},

        getPowerProduction() {
            return maxPowerGeneration * this.flowMomentum;
        },
        
        draw() {
            this.super$draw();

            if (rotorRegion != null && rotorRegion.found()) {
                Draw.rect(rotorRegion, this.x, this.y, this.rotorRotation);
            }
            if (topRegion != null && topRegion.found()) {
                Draw.rect(topRegion, this.x, this.y);
            }
        }
    });
});
