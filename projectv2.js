paper.install(window);

var WINDOW_WIDTH  = 970;
var WINDOW_HEIGHT = 720;

const PERMITIVITY     = 9 * Math.pow(10, 9);
const ELECTRON_CHARGE = -1.602 * Math.pow(10, -19);
const PROTON_CHARGE   = -ELECTRON_CHARGE;
const PROTON_MASS     = 1.6727 * Math.pow(10, -27);
const NEUTRON_MASS    = 1.6750 * Math.pow(10, -27);
const ELECTRON_MASS   =  9.110 * Math.pow(10, -31);

class Particle {
    // x, y, radius
    constructor(args) {
        _.assign(this, _.defaults(args, {
            x: WINDOW_WIDTH / 2,
            y: WINDOW_HEIGHT / 2,
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
        if (this.charge > 0) {
            this.color = 'red';
        } else if (this.charge < 0) {
            this.color = 'blue';
        }
        this.draw();
    }

    draw() {
        this.circle = new Path.Circle(new Point(this.x, this.y), this.radius);
        this.circle.fillColor = this.color;
        this.circle.onMouseDrag = _.bind(function(event) {
            this.circle.translate(event.delta);
        }, this);
        this.forceVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.forceVector.strokeColor = 'black';
        this.accelVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.accelVector.strokeColor = 'red';
        this.velVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.velVector.strokeColor = 'green';
    }

    on(event, func) {
        this.circle['on' + _.capitalize(event)] = func;
    }

    reactToElectricFieldDueTo(otherParticle) {
        const distanceX = (this.circle.position.x - otherParticle.circle.position.x);
        const distanceY = (this.circle.position.y - otherParticle.circle.position.y);
        if(distanceX == 0 && distanceY == 0) {
            return;
        }
        const qq = (this.charge * otherParticle.charge);
        const auxiliarForce = PERMITIVITY * ( ( qq ) / Math.pow(( distanceX * distanceX + distanceY * distanceY), 3/2) );
        this.forceX = distanceX * auxiliarForce;
        this.forceY = distanceY * auxiliarForce;
        this.accelX = this.forceX / this.mass;
        this.accelY = this.forceY / this.mass;
    }

    reactToElectricFieldDueTo2(otherParticles) {
        var distanceX;
        var distanceY;
        var qq;
        var auxiliarForce;
        this.forceX = 0;
        this.forceY = 0;
        for(var i = 0; i < otherParticles.length; ++i){
            distanceX = (this.circle.position.x - otherParticles[i].circle.position.x);
            distanceY = (this.circle.position.y - otherParticles[i].circle.position.y);
            if((Math.abs(distanceX) <= 0 && Math.abs(distanceY) <= 0) || this === otherParticles[i]){
                //console.log("hi");
                continue;
            }
            qq = (this.charge * otherParticles[i].charge);
            auxiliarForce = PERMITIVITY * ( ( qq ) / Math.pow(( distanceX * distanceX + distanceY * distanceY), 3/2) );
            this.forceX += distanceX * auxiliarForce;
            this.forceY += distanceY * auxiliarForce;
        }
        this.accelX = this.forceX / this.mass;
        this.accelY = this.forceY / this.mass;
    }

    advanceTime(milliseconds) {
        const seconds = milliseconds / 1000;
        this.velocityX += this.accelX * seconds;
        this.velocityY += this.accelY * seconds;
        this.circle.translate(new Point(this.velocityX, this.velocityY));
        this.forceVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + this.forceX), (this.circle.position.y + this.forceY))];
        this.accelVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + this.accelX), (this.circle.position.y + this.accelY))];
        this.velVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + this.velocityX), (this.circle.position.y + this.velocityY))];
    }

}

class TwoPointChargeSystem {
    constructor() {
        this.initialize();
        this.running = false;
    }

    initialize() {
        paper.project.activeLayer.removeChildren();
        this.frameMillis = 1000/60;
        var p0 = new Particle({
            x: WINDOW_WIDTH / 2 + 30,
            //y: WINDOW_HEIGHT / 2 - 30,
            velocityX: 0,
            velocityY: -1,
            charge: ELECTRON_CHARGE * 20    ,
            mass: ELECTRON_MASS
        });

        var p1 = new Particle({
            x: WINDOW_WIDTH / 2,
            //y: WINDOW_HEIGHT / 2 + 30,
            velocityX: 0,
            velocityY: 0,
            charge: PROTON_CHARGE * 20  ,
            mass: PROTON_MASS,
        });

        var p2 = new Particle({
            x: WINDOW_WIDTH / 2 - 30,
            //y: WINDOW_HEIGHT / 2 + 30,
            velocityX: 0,
            velocityY: 1,
            charge: ELECTRON_CHARGE * 20    ,
            mass: ELECTRON_MASS,
        });

        var p3 = new Particle({
            //x: WINDOW_WIDTH / 2 - 30,
            y: WINDOW_HEIGHT / 2 + 30,
            velocityX: 1,
            velocityY: 0,
            charge: ELECTRON_CHARGE * 20    ,
            mass: ELECTRON_MASS,
        });

        var p4 = new Particle({
            //x: WINDOW_WIDTH / 2 - 30,
            y: WINDOW_HEIGHT / 2 - 30,
            velocityX: -1,
            velocityY: 0,
            charge: ELECTRON_CHARGE * 20    ,
            mass: ELECTRON_MASS,
        });

        this.particles = [
            p0, p1,  p4
        ];
    }

    start() {
        this.refreshIntervalId = setInterval(_.bind(function() {
            for(var i = 0; i < this.particles.length; ++i){
                this.particles[i].reactToElectricFieldDueTo2(this.particles);
            }
            for(var i = 0; i < this.particles.length; ++i){
                this.particles[i].advanceTime(this.frameMillis);
            }
        }, this), this.frameMillis);
        this.disableInputs();
        this.running = true;
        this.renameStartResetButton();
    }

    reset() {
        clearInterval(this.refreshIntervalId);
        this.refreshIntervalId = undefined;
        this.initialize();
        this.running = false;
        this.enableInputs();
        this.renameStartResetButton();
    }

    toggleStatus() {
        if (!this.running) {
            this.start();
        } else {
            this.reset();
        }
    }

    disableInputs() {
        $('input').attr('disabled', 'disabled');
    }

    enableInputs() {
        $('input').attr('disabled', null);
    }

    renameStartResetButton() {
        if (this.running) {
            $('#start-reset-btn').text('Reset');
        } else {
            $('#start-reset-btn').text('Start');
        }
    }

}

var simulation = undefined;

window.onload = function() {
    $('#canvas').width($('#canvas-container').width());

    WINDOW_WIDTH  = $('#canvas-container').width();
    WINDOW_HEIGHT = $('#canvas-container').height();

    paper.setup('canvas');

    simulation = new TwoPointChargeSystem();
}
