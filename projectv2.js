
paper.install(window);

var WINDOW_WIDTH  = 970;
var WINDOW_HEIGHT = 720;

const PERMITIVITY     = 9 * Math.pow(10, 9);
const ELECTRON_CHARGE = -1.602 * Math.pow(10, -19);
const PROTON_CHARGE   = -ELECTRON_CHARGE;
const PROTON_MASS     = 1.6727 * Math.pow(10, -27);
const NEUTRON_MASS    = 1.6750 * Math.pow(10, -27);
const ELECTRON_MASS   =  9.110 * Math.pow(10, -31);

var PIXELS_PER_METER = 100;

const VECTOR_WIDTH = 2;

var simulation = undefined;
var app = undefined;

class Particle {
    // x, y, radius
    constructor(args) {
        _.assign(this, _.defaults(args, {
            x: 0,
            y: 0,
            radius: 8,
            velocityX: 0,            // m/s
            velocityY: 0,            // m/s
            accelX: 0,               // m/s
            accelY: 0,               // m/s
            charge: ELECTRON_CHARGE, // C
            mass: ELECTRON_MASS      // kg
        }));
        this.forceX = 0;
        this.forceY = 0;
    }

    draw() {
        this.forceVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.forceVector.strokeWidth = VECTOR_WIDTH;
        this.forceVector.strokeColor = 'rgba(255, 255, 255, 0.5)';
        this.accelVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.accelVector.strokeWidth = VECTOR_WIDTH;
        this.accelVector.strokeColor = 'rgba(255, 0, 0, 0.5)';
        this.velocityVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.velocityVector.strokeWidth = VECTOR_WIDTH;
        this.velocityVector.strokeColor = 'rgba(0, 255, 0, 0.5)';
        this.circle = new Path.Circle(new Point(this.x * PIXELS_PER_METER + WINDOW_WIDTH/2, this.y * PIXELS_PER_METER + WINDOW_HEIGHT/2), this.radius);
        this.label = new PointText(this.x * PIXELS_PER_METER + WINDOW_WIDTH/2 - 2, this.y * PIXELS_PER_METER + WINDOW_HEIGHT/2 + 2);
        this.label.strokeColor = 'white';
        this.label.content = this.name;
        this.label.fontSize = 8;
        this.circle.onMouseDrag = this.label.onMouseDrag = _.bind(function(event) {
            this.circle.translate(event.delta);
            this.label.translate(event.delta);
            this.x = (this.circle.position.x - WINDOW_WIDTH/2) / PIXELS_PER_METER;
            this.y = -(this.circle.position.y - WINDOW_HEIGHT/2) / PIXELS_PER_METER;
            this.drawAllVectors();
        }, this);
        this.setParticleColor();
    }

    drawVector(whichVector) {
        this[whichVector + 'Vector'].segments = [this.getPosition(), this.getOffsetByMeters(new Point(this[whichVector + 'X'] * PIXELS_PER_METER, -this[whichVector + 'Y'] * PIXELS_PER_METER))];
    }

    drawAllVectors() {
        _.forEach(['force', 'velocity', 'accel'], _.bind(function(whichVector) {
            this.drawVector(whichVector);
        }, this));
    }

    reactToElectricFieldDueTo(otherParticleList) {
        this.forceX = this.forceY = this.accelX = this.accelY = 0;

        _.forEach(otherParticleList, _.bind(function(otherParticle) {
            const distanceX = (this.x - otherParticle.x);
            const distanceY = (this.y - otherParticle.y);
            if(distanceX == 0 && distanceY == 0) {
                return;
            }
            const qq = (this.charge * otherParticle.charge);
            const auxiliarForce = PERMITIVITY * ( ( qq ) / Math.pow(( distanceX * distanceX + distanceY * distanceY), 3/2) );
            this.forceX += distanceX * auxiliarForce;
            this.forceY += distanceY * auxiliarForce;
        }, this));

        this.accelX += this.forceX / this.mass;
        this.accelY += this.forceY / this.mass;
    }

    advanceTime(milliseconds) {
        const seconds = milliseconds / 1000;
        this.velocityX += this.accelX * seconds;
        this.velocityY += this.accelY * seconds;
        this.x += this.velocityX * seconds;
        this.y += this.velocityY * seconds;
        var translatePoint = new Point(this.velocityX * seconds * PIXELS_PER_METER, -1 * this.velocityY * seconds * PIXELS_PER_METER);
        this.circle.translate(translatePoint);
        this.label.translate(translatePoint);
        this.drawAllVectors();
    }

    setParticleColor() {
        if (this.charge > 0) {
            this.circle.fillColor = 'red';
        } else if (this.charge < 0) {
            this.circle.fillColor = 'blue';
        }
    }

    getPosition() {
        return new Point(this.circle.position.x, this.circle.position.y);
    }

    getOffset(offsetPoint) {
        return this.getPosition().add(offsetPoint);
    }

    getOffsetByMeters(offsetPointMeters) {
        return this.getOffset(offsetPointMeters.multiply(PIXELS_PER_METER));
    }

}

class ChargeSystem {
    constructor() {
        this.initialize();
        this.running = false;
    }

    initialize() {
        paper.project.activeLayer.removeChildren();
        this.particles = [];
        this.frameMillis = 1000/60;
        this.lastTime = undefined;
        this.secondsTotal = 0;
        this.secondsElapsed = 0;

        this.secondsLabel = new PointText(20, 20);
        this.secondsLabel.fontSize = 16;
        this.formatSecondsLabel();
    }

    start() {
        this.refreshIntervalId = setInterval(_.bind(function() {
            this.advance();
            this.formatSecondsLabel();
            this.secondsElapsed += this.frameMillis / 1000;
        }, this), 1000/60/*this.frameMillis*/);
        this.disableInputs();
        this.running = true;
        this.renameStartStopButton();
    }

    stop() {
        clearInterval(this.refreshIntervalId);
        this.running = false;
        this.renameStartStopButton();
    }

    reset() {
        PIXELS_PER_METER = 100;
        app.$set(app, 'pixelsPerMeter', 100);
        this.secondsElapsed = 0;
        this.secondsTotal = 0;
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = undefined;
        this.initialize();
        this.running = false;
        this.enableInputs();
        this.renameStartStopButton();
    }

    toggleStatus() {
        if (!this.running) {
            this.start();
        } else {
            this.stop();
        }
    }

    disableInputs() {
        $('input').attr('disabled', 'disabled');
    }

    enableInputs() {
        $('input').attr('disabled', null);
    }

    renameStartStopButton() {
        if (this.running) {
            $('#start-stop-btn').text('Stop');
        } else {
            $('#start-stop-btn').text('Start');
        }
    }

    formatSecondsLabel() {
        this.secondsLabel.content = "t = " + this.secondsElapsed + "s";
    }
}

class TwoPointChargeSystem extends ChargeSystem {
    initialize() {
        super.initialize();
        this.p0 = new Particle({
            x: 3,
            velocityX: 0,
            velocityY: -5,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
            name: '0'
        });
        this.particles.push(this.p0);
        this.p0.draw();

        this.p1 = new Particle({
            x: 0,
            velocityX: 0,
            velocityY: 0,
            charge: PROTON_CHARGE,
            mass: PROTON_MASS,
            name: '1'
        });
        this.particles.push(this.p1);
        this.p1.draw();
    }

    advance() {
        _.forEach(this.particles, _.bind(function(particle) {
            particle.reactToElectricFieldDueTo(this.particles);
        }, this));
        _.forEach(this.particles, _.bind(function(particle) {
            particle.advanceTime(this.frameMillis);
        }, this));
    }
}

class ElectricDipoleSystem extends ChargeSystem {
    initialize() {
        // p1 and p1 are the "fixed" ones
        super.initialize();
        this.p0 = new Particle({
            x: 2,
            y: 0,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
            name: '0'
        });
        this.particles.push(this.p0);
        this.p0.draw();

        this.p1 = new Particle({
            y: -1,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
            name: '1'
        });
        this.particles.push(this.p1);
        this.p1.draw();

        this.p2 = new Particle({
            y: 1,
            charge: this.p1.charge,
            mass: this.p1.mass,
            name: '2'
        });
        this.particles.push(this.p2);
        this.p2.draw();
    }

    advance() {
        _.forEach(this.particles, _.bind(function(particle) {
            particle.reactToElectricFieldDueTo(this.particles);
        }, this));
        _.forEach(this.particles, _.bind(function(particle) {
            particle.advanceTime(this.frameMillis);
        }, this));
    }
}

class ThreePointChargeSystem extends ChargeSystem {
    initialize() {
        super.initialize();
        this.p0 = new Particle({
            x: 3,
            velocityX: 0,
            velocityY: 5,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
            name: '0'
        });
        this.particles.push(this.p0);
        this.p0.draw();

        this.p1 = new Particle({
            x: 0,
            velocityX: 0,
            velocityY: 0,
            charge: PROTON_CHARGE,
            mass: PROTON_MASS,
            name: '1'
        });
        this.particles.push(this.p1);
        this.p1.draw();

        this.p2 = new Particle({
            x: -3,
            velocityX: 0,
            velocityY: -5,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
            name: '2'
        });
        this.particles.push(this.p2);
        this.p2.draw();
    }

    advance() {
        _.forEach(this.particles, _.bind(function(particle) {
            particle.reactToElectricFieldDueTo(this.particles);
        }, this));
        _.forEach(this.particles, _.bind(function(particle) {
            particle.advanceTime(this.frameMillis);
        }, this));
    }
}

SYSTEMS_MAP = {
    twoChargeSystem: TwoPointChargeSystem,
    electricDipole: ElectricDipoleSystem,
    threeChargeSystem: ThreePointChargeSystem
};


window.onload = function() {
    $('#canvas').width($('#canvas-container').width());

    WINDOW_WIDTH  = $('#canvas-container').width();
    WINDOW_HEIGHT = $('#canvas-container').height();

    paper.setup('canvas');

    simulation = new TwoPointChargeSystem();

    app = new Vue({
        el: '#app',
        data: {
            pixelsPerMeter: PIXELS_PER_METER,
            updatePixelsPerMeter: function(event) {
                var newValue = $('input.ppm').val();
                PIXELS_PER_METER = newValue;
                app.pixelsPerMeter = newValue;
            },
            simulation: simulation,
            changeChargeSystem: function() {
                var selectedSystem = $('#charge-system-selector').val();
                simulation.reset();
                app.simulation = simulation = new SYSTEMS_MAP[selectedSystem]();
            }
        },
        components: {
            "particle-controls": {
                props: ['index', 'particle'],
                data: function() {
                    return {
                        showing: true
                    };
                },
                template: `
<div class="panel panel-warning">
    <div class="panel-heading unselectable" v-on:click="showing = !showing">
        <span>Particle {{ index }}</span>
        <span class="glyphicon glyphicon-chevron-down pull-right" v-show="!showing"></span>
        <span class="glyphicon glyphicon-chevron-up pull-right" v-show="showing"></span>
    </div>
    <div class="panel-body" v-show="showing">
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon">q =</span>
                <input class="form-control" type="number" v-model="particle.charge" v-on:change="particle.setParticleColor()"/>
                <span class="input-group-addon">C</span>
            </div>
        </div>
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon">m =</span>
                <input class="form-control" type="number" v-model="particle.mass"/>
                <span class="input-group-addon">kg</span>
            </div>
        </div>
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon">vx =</span>
                <input class="form-control" type="number" v-model="particle.velocityX"/>
                <span class="input-group-addon">m/s</span>
            </div>
        </div>
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon">ax =</span>
                <input class="form-control" type="number" v-model="particle.accelX"/>
                <span class="input-group-addon">m/s^2</span>
            </div>
        </div>
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon">vy =</span>
                <input class="form-control" type="number" v-model="particle.velocityY"/>
                <span class="input-group-addon">m/s</span>
            </div>
        </div>
        <div class="form-group">
            <div class="input-group">
                <span class="input-group-addon">ay =</span>
                <input class="form-control" type="number" v-model="particle.accelY"/>
                <span class="input-group-addon">m/s^2</span>
            </div>
        </div>
    </div>
</div>
`
            }
        }
    });
}
