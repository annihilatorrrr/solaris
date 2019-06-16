import * as PIXI from 'pixi.js';

class Star {
    constructor(container) {
        this.container = container;
    }

    _getStarPlayer() {
        return this.players.find(x => x._id === this.data.ownedByPlayerId);
    }

    draw(data, players) {
        this.data = data;
        this.players = players;

        this.drawStar();
        this.drawColour();
        this.drawHalo();
        this.drawName();
        this.drawGarrison();
        this.drawInfrastructure();
        this.drawPlayerName();
    }

    drawStar() {
        let graphics = new PIXI.Graphics();

        graphics.lineStyle(0); // draw a circle, set the lineStyle to zero so the circle doesn't have an outline
        graphics.beginFill(0xFFFFFF, 1);
        graphics.drawCircle(this.data.location.x, this.data.location.y, 2);
        graphics.endFill();

        this.container.addChild(graphics);
    }

    drawColour() {
        // Get the player who owns the star.
        let player = this._getStarPlayer();
        
        if (!player)
            return;
            
        let graphics = new PIXI.Graphics();

        graphics.lineStyle(2, player.colour.value);
        graphics.drawCircle(this.data.location.x, this.data.location.y, 5);

        this.container.addChild(graphics);
    }

    drawHalo() {
        let graphics = new PIXI.Graphics();

        graphics.lineStyle(1, 0xFFFFFF, 0.1);
        graphics.drawCircle(this.data.location.x, this.data.location.y, (this.data.naturalResources + 20) / 2);

        this.container.addChild(graphics);
    }

    drawName() {
        let text = new PIXI.Text(this.data.name, {
            fontSize: 8,
            fill: 0xFFFFFF
        });

        text.x = this.data.location.x - (text.width / 2);
        text.y = this.data.location.y + 6;
        text.resolution = 10;

        this.container.addChild(text);
    }

    drawGarrison() {
        if (!this.data.garrison) return;

        let text = new PIXI.Text(this.data.garrison, {
            fontSize: 8,
            fill: 0xFFFFFF
        });

        text.x = this.data.location.x - (text.width / 2);
        text.y = this.data.location.y + 15;
        text.resolution = 10;

        this.container.addChild(text);
    }

    drawInfrastructure() {
        if (!this.data.ownedByPlayerId) return; // TODO Does abandoning stars destroy ALL infrastructure?
        
        let text = new PIXI.Text(`${this.data.economy} ${this.data.industry} ${this.data.science}`, {
            fontSize: 8,
            fill: 0xFFFFFF
        });

        text.x = this.data.location.x - (text.width / 2);
        text.y = this.data.location.y - 18;
        text.resolution = 10;

        this.container.addChild(text);
    }

    drawPlayerName() {
        // TODO 
    }
}

export default Star;