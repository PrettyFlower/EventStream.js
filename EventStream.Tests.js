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

a = [0, 1, 2, 3, 4];
b.length = 0;
var s = EventStream.fromArray(a);
s.addCounter()
.do(function(next) {
    b.push(next.count);
});
s.start();
checkArrays(a, b, [
    'EventStream.addCounter'
]);

a = [1, 2, 3, 4, 5, 6];
s = EventStream.fromArray(a);
b.length = 0;
s.addStreamOn(
    function(next) {
        return next == 3;
    },
    function(next, newStream) {
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

var ajaxResult = '';
var s = EventStream.fromArray([1]);
s.ajax({
    url: 'index.html'
})
.do(function(next) {
    ajaxResult += next.slice(0, 9);
    if(ajaxResult != 'hi<!DOCTYPE') {
        console.log('Failed: EventStream.ajax');
        console.log(ajaxResult);
    }
    else {
        console.log('Passed: EventStream.ajax');
    }
});

s.do(function(next) {
    ajaxResult += 'hi';
});
s.start();

var syncFinished;
var s = EventStream.fromArray([1]);
s.async('worker.js')
.do(function(next) {
    var diff = Math.abs(syncFinished - new Date() * 1);
    if(diff > 100) {
        console.log('Failed: EventStream.async');
        console.log(diff);
    }
    else {
        console.log('Passed: EventStream.async');
    }
});
s.delay(1000)
.do(function(next) {
    syncFinished = new Date() * 1;
});
s.start();


s = EventStream.fromArray([new Date() * 1]);
s.block(function(next, callback) {
    var interval = window.setInterval(function() {
        window.clearInterval(interval);
        callback(next);
    }, 1000);
})
.do(function(next) {
    if(!next || new Date() * 1 - next < 500) {
        console.log('Failed: EventStream.block');
        console.log((new Date() * 1) + ', ' + next);
    }
    else {
        console.log('Passed: EventStream.block');
    }
});
s.start();

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

s = EventStream.fromArray([new Date() * 1]);
s.delay(1000)
.do(function(next) {
    if(new Date() * 1 - next < 500) {
        console.log('Failed: EventStream.delay');
    }
    else {
        console.log('Passed: EventStream.delay');
    }
});
s.start();

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
var g = {
    '1': [],
    '2': [],
    '3': []
};
s = EventStream.fromArray(a);
b.length = 0;
s.groupBy(
    function(next) {
        return next;
    },
    function(next, newStream) {
        b.push(next);
        newStream.do(function(next) {
            g[next].push(next);
        });
    }
)
s.start();
if(b[0] != 1 || b[1] != 2 || b[2] != 3 || b.length != 3 || 
    !checkArrays([1, 1], g[1], []) || !checkArrays([2, 2], g[2], []) ||
    !checkArrays([3, 3], g[3], [])) {
    console.log('Failed: EventStream.groupBy');
    printArray(b);
}
else {
    console.log('Passed: EventStream.groupBy');
}

a = [1, 2, 3, 4, 5];
s1 = EventStream.fromArray(a);
s2 = EventStream.fromArray(a);
s3 = EventStream.fromArray(a);
EventStream.merge(
    {
        stream: s1,
        clearFn: function(next) { return false; },
        canPushFn: function(next) { return true; }
    },
    {
        stream: s2,
        buffer: 'array',
        clearFn: function(next) { return false; },
        canPushFn: function(next) { return false; }
    },
    {
        stream: s3,
        buffer: 'object',
        keySelector: function(next) {
            return next;
        },
        clearFn: function(next) { return true; },
        canPushFn: function(next) { return next == 5; }
    }
)
.do(function(next) {
    answer = next;
});
s1.start();
s2.start();
s3.start();
if(answer[s1.id] !== 5 || answer[s2.id].length !== 5 || answer[s3.id][1] !== 1) {
    console.log('Failed: EventStream.merge');
    console.log(answer);
}
else {
    console.log('Passed: EventStream.merge');
}

a = [1, 2, 3, 4, 5, 6];
b = [];
s = EventStream.fromArray(a);
s.stopOn(function(next) {
    return next == 5;
})
.do(pushFn);
s.start();
a.splice(5, 1);
checkArrays(a, b, [
    'EventStream.stop',
    'EventStream.stopOn'
]);

a = [1, 2, 3, 4, 5, 6];
b = [];
s = EventStream.fromArray(a);
s.take(5)
.do(pushFn);
s.start();
a.splice(5, 1);
checkArrays(a, b, [
    'EventStream.take'
]);

a = [1, 2, 3, 4, 5];
b = [];
s = EventStream.fromArray(a);
s.transform(function(next) {
    return next + 1;
})
.do(pushFn);
s.start();
for(var i = 0; i < a.length; i++) {
    a[i]++;
}
checkArrays(a, b, [
    'EventStream.transform'
]);

answer = -1;
s = EventStream.fromInterval(10);
s.throttle(1000)
.do(function(next) {
    answer = next;
});
s.stopOn(function(next) {
    return next == 10;
});
s.filter(function(next) {
    return next == 10;
})
.do(function(next) {
    if(answer != 0) {
        console.log('Failed: EventStream.fromInterval');
        console.log('Failed: EventStream.throttle');
        console.log(answer + ' != 0');
    }
    else {
        console.log('Passed: EventStream.fromInterval');
        console.log('Passed: EventStream.throttle');
    }
});

answer = -1;
s = EventStream.fromAnimationFrame();
var count = 0;
s.transform(function(next) {
    count++;
    if(count == 10) {
        s.stop();
    }
    return count;
})
.waitForPause(1000)
.do(function(next) {
    answer = next;
    if(answer != 10) {
        console.log('Failed: EventStream.fromAnimationFrame');
        console.log('Failed: EventStream.waitForPause');
        console.log(answer + ' != 10');
    }
    else {
        console.log('Passed: EventStream.fromAnimationFrame');
        console.log('Passed: EventStream.waitForPause');
    }
});

var ws = new WebSocket('ws://echo.websocket.org');
ws.onopen = function(){
    ws.send('hi');
}
ws.onclose = function(event){
    console.log('Failed: EventStream.fromWebMessager');
    console.log(event);
}
ws.onerror = function(event){
    console.log('Failed: EventStream.fromWebMessager');
    console.log(event);
}
wss = EventStream.fromOnMessager(ws);
wss.do(function(event) {
    if(event.data == 'hi') {
        console.log('Passed: EventStream.fromWebMessager');
    }
    else {
        console.log('Failed: EventStream.fromWebMessager');
        console.log(event.data + ' != hi');
    }
});


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
        function(next, newStream) {
            newStream.throttle(1000)
            .do(function(p) {
                console.log(p.toString());
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
    
    var mouseMoves = $(document).getEventStream('mousemove');
    var fruit = EventStream.fromArray('fruit flies like a banana');
    fruit.addCounter()
    .transform(function(next) {
        return {
            count: next.count,
            span: $('<span/>', {
                text: next.next,
                css: {
                    position: 'absolute'
                }
            }).appendTo($('#container'))
        };
    })
    .addStreamOn(
        function(next) {
            return true;
        },
        function(span, newStream) {
            newStream.stop();
            newStream.listenTo(mouseMoves);
            newStream.delay(span.count * 100)
            .do(function(next) {
                span.span.css({
                    top: next.offsetY + 'px',
                    left: next.offsetX + span.count * 10 + 15 + 'px'
                });
            });
        }
    );
    fruit.start();
});