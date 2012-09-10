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
    
    var mouseClicks = $(document).getEventStream('click');
    mouseClicks
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
	.groupBy(
		function(next) {
			return next.y * 1000 + next.x;
		},
		function(newStream) {
			newStream.throttle(1000)
			.do(function(p) {
				console.log(p.val.toString());
			});
		}
	);
});

var a = [1, 2, 3, 4, 5];
var s = EventStream.fromArray(a);
var b = [];
s.do(function(next) {
	b.push(next);
	if(b.length == a.length) {
		var success = true;
		for(var i = 0; i < Math.max(a.length, b.length); i++) {
			if(a[i] !== b[i]) {
				console.log('Failed: EventStream.fromArray');
				success = false;
			}
		}
		if(success) {
			console.log('Passed: EventStream.fromArray');
		}
	}
});
s.start();

/*var mainLoop = EventStream.fromInterval(1000 / 60);
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
var renderLoop = EventStream.fromAnimationFrame();
renderLoop.do(function(timestamp) {
        if(timestamp > start + 3000) {
            renderLoop.stop();
        }
        console.log(timestamp);
    });*/