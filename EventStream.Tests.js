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

function printArray(arr) {
    for(var i = 0; i < arr.length; i++) {
        console.log('\t' + arr[i]);
    }
}

function checkArrays(a, b, components) {
    var success = true;
    for(var i = 0; success && i < Math.max(a.length, b.length); i++) {
        if(a[i] !== b[i]) {
            for(var i = 0; i < components.length; i++) {
                console.log('Failed: ' + components[i]);
            }
            console.log('a:');
            printArray(a);
            console.log('b:');
            printArray(b);
            success = false;
        }
    }
    if(success) {
        for(var i = 0; i < components.length; i++) {
            console.log('Passed: ' + components[i]);
        }
    }
    return success;
}



var a = [1, 2, 3, 4, 5, 6];
var b = [];
var pushFn = function(next) {
    b.push(next);
}



var s = EventStream.fromArray(a);
s.do(pushFn);
s.start();
checkArrays(a, b, [
    'EventStream.fromArray',
    'EventStream.do'
]);

s = EventStream.fromArray(a);
b.length = 0;
s.addStreamOn(
    function(next) {
        return next == 3;
    },
    function(newStream) {
        newStream.do(pushFn);
    }
)
.filter(function(next) {
    return next <= 2;
})
.do(pushFn);
s.start();
checkArrays(a, b, [
    'EventStream.filter',
    'EventStream.addStreamOn'
]);

s = EventStream.fromArray(a);
b.length = 0;
s.buffer(2)
.do(function(arr) {
    b.push(arr[0]);
    b.push(arr[1]);
});
s.start();
checkArrays(a, b, [
    'EventStream.buffer'
]);

var count = 0;
a = [1, 2, 3, 3, 4];
s = EventStream.fromArray(a);
s.distinct()
.do(function() {
    count++;   
});
s.start();
if(count != 4) {
    console.log('Failed: EventStream.distinct');
    console.log(count + '!= 4');
}
else {
    console.log('Passed: EventStream.distinct');
}

a = [1, 1, 2, 2, 3, 3];
b = [];
s = EventStream.fromArray(a);
b.length = 0;
s.groupBy(
    function(next) {
        return next;
    },
    function(newStream) {
        newStream.transform(function(next) {
            return next.val;
        })
        .distinct()
        .do(pushFn);
    }
)
s.start();
if(b[0] != 1 || b[1] != 2 || b[2] != 3 || b.length != 3) {
    console.log('Failed: EventStream.groupBy');
    printArray(b);
}
else {
    console.log('Passed: EventStream.groupBy');
}

a = [1, 2, 3, 4, 5];
b.length = 0;
var s1 = EventStream.fromArray(a);
var s2 = EventStream.fromArray(a);
var s3 = EventStream.fromArray(a);
s1.mergeAny(s2, s3)
.distinct()
.do(function(next) {
    b.push(next);
});
s1.start();
s2.start();
s3.start();
checkArrays(a, b, [
    'EventStream.mergeAny'
]);



/*$(document).ready(function() {
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
    
    $('#text').getEventStream('keyup')
    .waitForPause(1000)
    .do(function(text) {
        var text = $('#text').val();
        if(text) {
            $('#output').append('<div>' + text + '</div>');
        }
    });
});*/



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