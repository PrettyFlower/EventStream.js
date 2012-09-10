// from http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function( callback ){
            window.setTimeout(callback, 1000 / 60);
            };
})();

Array.prototype.contains = function(o, f) {
    if(!f) f = function(a, b) {
        return a === b;
    }
    for(var i = 0; i < this.length; i++) {
        if(f(o, this[i])) return true;
    }
    return false;
}

$(document).ready(function() {
    EventStream.init();
    
    var mouseMoves = $(document).toEventStream('click');
    mouseMoves
    .transform(function(event) {
        return {
            x: event.offsetX, 
            y: event.offsetY,
            timestamp: event.timeStamp,
            toString: function() {
                return this.x + ", " + this.y;
            }
        };
    })
    .distinct(
        function(a, b) {
            return a.x === b.x && a.y === b.y;
        },
        function(next, lastValues) {
            if(lastValues.length == 0) return false;
            return next.timestamp > lastValues[lastValues.length - 1].timestamp + 1000;
        }
    )
    .do(function(p) {
        console.log('' + p);
    }); 
});

var mainLoop = EventStream.makeLoop(1000 / 60);
mainLoop.filter(function(next) {
    return next % 60 === 0;
})
.transform(function(next) {
    return next / 60;
})
.do(function(next) {
    if(next >= 5) {
        mainLoop.stop();
    }
    console.log(next);
});

mainLoop
.filter(function(next) {
    return next % 60 === 0;
})
.transform(function(next) {
    return next / 60;
})
.groupBy(function(next) {
    return next % 2;
}, function(newStream) {
    newStream.do(function(next) {
        console.log(next.key + ', ' + next.val);
    });
});

mainLoop.take(5).do(function(next) {
   console.log(next); 
});


var start = new Date() * 1;
var renderLoop = EventStream.requestAnimFrame();
renderLoop.do(function(timestamp) {
        if(timestamp > start + 3000) {
            renderLoop.stop();
        }
        console.log(timestamp);
    });