paper.install(window);

var WINDOW_WIDTH  = 970;
var WINDOW_HEIGHT = 720;

const PERMITIVITY     = 9 * Math.pow(10, 9);
const ELECTRON_CHARGE = -1.602 * Math.pow(10, -19);
const PROTON_CHARGE   = -ELECTRON_CHARGE;
const PROTON_MASS     = 1.6727 * Math.pow(10, -27);
const NEUTRON_MASS    = 1.6750 * Math.pow(10, -27);
const ELECTRON_MASS   =  9.110 * Math.pow(10, -31);
const SCALE = 0.01;

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
        this.pForce = 0;
        this.eField = 0;
        if (this.charge > 0) {
            this.color = 'red';
        } else if (this.charge < 0) {
            this.color = 'blue';
        }
        this.draw();
    }

    draw() {
        this.circle = new Path.Circle(new Point(this.x / SCALE + WINDOW_WIDTH/2, -this.y / SCALE + WINDOW_HEIGHT/2), this.radius);
        this.circle.fillColor = this.color;
        this.circle.onMouseDrag = _.bind(function(event) {
            this.circle.translate(event.delta);
            this.x = (this.circle.position.x - WINDOW_WIDTH/2) * SCALE;
            this.y = -(this.circle.position.y - WINDOW_HEIGHT/2) * SCALE;
        }, this);
        this.forceVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.forceVector.strokeColor = 'black';
        this.accelVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.accelVector.strokeColor = 'red';
        this.velVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.velVector.strokeColor = 'green';
        this.fieldVector = new Path.Line(new Point(this.x, this.y), new Point(this.x, this.y));
        this.fieldVector.strokeColor = 'blue';
    }

    on(event, func) {
        this.circle['on' + _.capitalize(event)] = func;
    }

    reactToElectricFieldDueTo2(otherParticles) {
        var distanceX;
        var distanceY;
        var qq;
        var auxiliarForce;
        this.forceX = 0;
        this.forceY = 0;
        for(var i = 0; i < otherParticles.length; ++i){
            distanceX = (this.x - otherParticles[i].x);
            distanceY = (this.y - otherParticles[i].y);
            if(distanceX == 0 && distanceY == 0 || this === otherParticles[i]){
                continue;
            }
            qq = (this.charge * otherParticles[i].charge);
            auxiliarForce = PERMITIVITY * ( ( qq ) / Math.pow(( distanceX * distanceX + distanceY * distanceY ), 3/2) );
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
        this.x += this.velocityX * seconds;
        this.y += this.velocityY * seconds;
        this.circle.translate(new Point((this.velocityX * seconds) / SCALE, -(this.velocityY * seconds) / SCALE));
        this.forceVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + this.forceX / SCALE), (this.circle.position.y - this.forceY / SCALE))];
        this.accelVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + this.accelX / SCALE), (this.circle.position.y - this.accelY / SCALE))];
        this.velVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + this.velocityX / SCALE), (this.circle.position.y - this.velocityY / SCALE))];
        this.fieldVector.segments = [new Point(this.circle.position.x, this.circle.position.y), new Point((this.circle.position.x + (this.forceX / this.charge) / SCALE), (this.circle.position.y - (this.forceY / this.charge) / SCALE))];
        /*if(this.circle.position.x < 0 || this.circle.position.x > WINDOW_HEIGHT){
            this.velocityX *= -1;
        }
        if(this.circle.position.y < 0 || this.circle.position.y > WINDOW_HEIGHT){
            this.velocityY *= -1;
        }*/
    }

}

class TwoPointChargeSystem {
    constructor() {
        this.initialize();
        this.running = false;
    }

    initialize() {
        paper.project.activeLayer.removeChildren();
        this.frameMillis = 1000/1000;
        var p0 = new Particle({
            x: 0,
            y: 1,
            velocityX: 0,
            velocityY: 0,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS
        });

        var p1 = new Particle({
            x: 0,
            y: -1,
            velocityX: 0,
            velocityY: 0,
            //charge: PROTON_CHARGE,
            //mass: PROTON_MASS,
        });

        var p2 = new Particle({
            x: 1,
            y: 0,
            velocityX: 0,
            velocityY: 0,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
        });
/*
        var p3 = new Particle({
            x: 0,
            y: -1,
            velocityX: 3,
            velocityY: 0,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
        });

        var p4 = new Particle({
            x: 0,
            y: 1,
            velocityX: -3,
            velocityY: 0,
            charge: ELECTRON_CHARGE,
            mass: ELECTRON_MASS,
        });
*/
        this.particles = [
            p0, p1, p2//, p3, p4
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
        }, this), 1000/60/*this.frameMillis*/);
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
