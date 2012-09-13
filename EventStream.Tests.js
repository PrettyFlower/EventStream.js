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
    function(newStream, key) {
        b.push(key);
        newStream.do(function(next) {
            g[key].push(next);
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
b.length = 0;
s1 = EventStream.fromArray(a);
s2 = EventStream.fromArray(a);
s3 = EventStream.fromArray(a);
s1.mergeReturnImmediately(s2, s3)
.do(function(next) {
    var val = 0;
    if(next.from === s1.id && (next.next == 1 || next.next == 2)) {
        b.push(next.next);
    }
    else if(next.from === s2.id && next.next == 3) {
        b.push(next.next);
    }
    else if(next.from === s3.id && (next.next == 4 || next.next == 5)) {
        b.push(next.next);
    }
});
s1.start();
s2.start();
s3.start();
checkArrays(a, b, [
    'EventStream.mergeReturnImmediately'
]);

a = [1, 2, 3, 4, 5];
var answer;
var s1 = EventStream.fromArray(a);
var s2 = EventStream.fromArray(a);
var s3 = EventStream.fromArray(a);
s1.mergeReturnObjDelayed(s2, s3)
.do(function(next) {
    answer = next;
});
s1.start();
s2.start();
s3.start();
var count = 0;
for(var p in answer) {
    count++;
}
if(answer[s1.id].next != 5 || answer[s2.id].next != 5 || answer[s3.id].next != 1 || count != 3) {
    console.log('Failed: EventStream.mergeReturnObjDelayed');
    console.log(answer);
}
else {
    console.log('Passed: EventStream.mergeReturnObjDelayed');
}

a = [1, 2, 3, 4, 5];
answer = {};
s1 = EventStream.fromArray(a);
s2 = EventStream.fromArray(a);
s3 = EventStream.fromArray(a);
s1.mergeReturnObjImmediate(s2, s3)
.take(1)
.do(function(next) {
    answer = next;
});
s1.start();
s2.start();
s3.start();
count = 0;
for(var p in answer) {
    count++;
}
if(answer[s1.id].next != 1 || answer[s2.id] != undefined || answer[s3.id] != undefined || count != 1) {
    console.log('Failed: EventStream.mergeReturnObjImmediate');
    console.log(answer);
}
else {
    console.log('Passed: EventStream.mergeReturnObjImmediate');
}

a = [1, 2, 3, 4, 5];
var b1 = [];
var b2 = [];
var b3 = [];
var s1 = EventStream.fromArray(a);
var s2 = EventStream.fromArray(a);
var s3 = EventStream.fromArray(a);
s1.mergeReturnBufferArray(s2, s3)
.do(function(next) {
    b1 = next[s1.id];
    b2 = next[s2.id];
    b3 = next[s3.id];
});
s1.start();
s2.start();
s3.start();
if(checkArrays(a, b1, []) && checkArrays(a, b2, []) && b3.length == 1) {
    console.log('Passed: EventStream.mergeReturnBufferArray');
}
else {
    console.log('Failed: EventStream.mergeReturnBufferArray');
}

a = [1, 2, 3, 4, 5];
var b1 = {};
var b2 = {};
var b3 = {};
var s1 = EventStream.fromArray(a);
var s2 = EventStream.fromArray(a);
var s3 = EventStream.fromArray(a);
s1.mergeReturnBufferObject(function(next) {
    return next;
}, s2, s3)
.do(function(next) {
    b1 = next[s1.id];
    b2 = next[s2.id];
    b3 = next[s3.id];
});
s1.start();
s2.start();
s3.start();
if(b1[5] == 5 && b2[3] == 3 && b3[1] == 1) {
    console.log('Passed: EventStream.mergeReturnBufferObject');
}
else {
    console.log('Failed: EventStream.mergeReturnBufferObject');
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
    console.log('Failed: EventStream.fromWebSocket');
    console.log(event);
}
ws.onerror = function(event){
    console.log('Failed: EventStream.fromWebSocket');
    console.log(event);
}
wss = EventStream.fromWebSocket(ws);
wss.do(function(event) {
    if(event.data == 'hi') {
        console.log('Passed: EventStream.fromWebSocket');
    }
    else {
        console.log('Failed: EventStream.fromWebSocket');
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
        function(newStream) {
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
});