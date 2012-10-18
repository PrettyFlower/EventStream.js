/// <reference path="Util.ts" />
/// <reference path="ArrayExtensions.ts" />
/// <reference path="jQuery.d.ts" />

interface JQuery {
    getEventStream(eventType: string);
}

class EventStream {
    listeners: EventStream[] = new EventStream[];
    id: number;
    onNext;
    parents: EventStream[] = new EventStream[];
    start;
    constructor(onNext?, parents?: EventStream[]) {
        if(onNext) this.onNext = onNext;
        else {
            this.onNext = (next) => {
                this._notifyListeners(next);
            };
        }
        if(parents) this.parents = parents;
        this.id = EventStream.nextId;
        EventStream.nextId++;
    }
    
    static nextId: number = 1;
    
    static init() {
        $.fn.getEventStream = function(eventType: string) {
            var s = new EventStream(function(event) {
                s._notifyListeners(event);
            });
            this.bind(eventType, s.onNext);
            return s;
        };
    };
    
    static fromAnimationFrame() {
        var stopAnimation = false;
        var s = new EventStream(function(timestamp: Date) {
            if(!stopAnimation) {
                requestAnimFrame(s.onNext);
                s._notifyListeners(timestamp);
            }
        });
        s.stop = function() {
            stopAnimation = true;
        }
        s.onNext();
        return s;
    }
    
    static fromArray(arr: any[]) {
        var stop = false;
        var s = new EventStream();
        s.start = function() {
            for(var i = 0; i < arr.length; i++) {
                if(stop) {
                    break;
                }
                s.onNext(arr[i]);
            }
        }
        s.stop = function() {
            stop = true;
        }
        return s;
    }
    
    static fromInterval(ms: number) {
        var s = new EventStream();
        var interval = setInterval(s.onNext, ms);
        s.stop = function() {
            clearInterval(interval);
        }
        return s;
    }
    
    static fromOnMessager(messager: OnMessager) {
        var s = new EventStream();
        messager.onmessage = s.onNext;
        return s;
    }
    
    static merge(...streams: EventStream[]) {
        var s = new EventStream(function(next, from: EventStream) {
            this._notifyListeners(new MergeObj(next, from.id));
        });
        for(var i = 0; i < streams.length; i++) {
            s.listenTo(streams[i]);
        }
        return s;
    }
    
    static bufferedMerge(...args: BufferedMergeArg[]) {
        var obj = new BufferedMergeObj();
        var streamArgs = {};
        var count = 0;
        var streamCount = args.length;
        var allDone = false;
        for(var i = 0; i < args.length; i++) {
            var arg = args[i];
            streamArgs[arg.stream.id] = arg;
        }
        var s = new EventStream(function(next, from) {
            var fromArgs = streamArgs[from.id];
            fromArgs.pushed = true;
            
            obj.from = from.id;
            
            if(fromArgs.buffer == 'array') {
                obj.next[fromArgs.stream.id].push(next);
            }
            else if(fromArgs.buffer == 'object') {
                var key = streamArgs[fromArgs.stream.id].keySelector(next);
                obj.next[fromArgs.stream.id][key] = next;
            }
            else {
                obj.next[fromArgs.stream.id] = next;
            }
            
            var retObj = new BufferedMergeObj();
            count = 0;
            allDone = false;
            retObj.from = obj.from;
            for(var p in obj.next) {
                retObj.next[p] = obj.next[p];
                var isArray = $.isArray(obj.next[p]);
                if(isArray && obj.next[p].length > 0) {
                    count++;
                }
                else if(!isArray && !$.isEmptyObject(obj.next[p])) {
                    count++;
                }
            }
            if(count == streamCount) allDone = true;
            if((typeof fromArgs.canPush == 'boolean' && fromArgs.canPush) || 
                (typeof fromArgs.canPush == 'function' && fromArgs.canPush(retObj)) ||
                allDone) {
                this._notifyListeners(retObj);
                for(var a in streamArgs) {
                    var arg = streamArgs[a];
                    if((typeof arg.clear == 'boolean' && arg.clear) || 
                        (typeof arg.clear == 'function' && arg.clear(retObj))) {
                        if(arg.buffer == 'array') {
                            obj.next[arg.stream.id] = [];
                        }
                        else if(arg.buffer == 'object') {
                            obj.next[arg.stream.id] = {};
                        }
                        else {
                            delete obj.next[arg.stream.id];
                        }
                    }
                }
            }
        });
        
        for(var a in streamArgs) {
            var arg = streamArgs[a];
            s.listenTo(arg.stream);
            if(arg.buffer == 'array') {
                obj.next[arg.stream.id] = [];
            }
            else if(arg.buffer == 'object') {
                obj.next[arg.stream.id] = {};
            }
        }
        return s;
    }
    
    private _newStream(onNext) {
        var s = new EventStream(onNext);
        s.listenTo(this);
        return s;
    }
    
    private _notifyListeners(next) {
        for(var i = 0; i < this.listeners.length; i++) {
            this.listeners[i].onNext(next, this);
        }
    }
    
    addCounter() {
        var count = 0;
        var s = this._newStream(function(next) {
            this._notifyListeners(new CounterObj(next, count));
            count++;
        });
        return s;
    }
    
    addStreamOn(f: (next) => bool, newStreamFn: (next, stream: EventStream) => void) {
        return this._newStream(function(next) {
            if(f(next)) {
                var s = this._newStream(function(next) {
                    this._notifyListeners(next);
                });
                newStreamFn(next, s);
            }
            this._notifyListeners(next);
        });
    }
    
    ajax(args) {
        var s = this._newStream(function(next) {
            $.ajax(args);
        });
        args.success = result => s._notifyListeners(result);
        return s;
    }
    
    async(file: string) {
        var worker = new Worker(file);
        var s = this._newStream(function(next) {
            worker.postMessage(next);
        });
        worker.onmessage = event => s._notifyListeners(event);
        return s;
    }
    
    block(fn: (next, callback: (next) => void) => void) {
        var s = this._newStream(function(next) {
            fn(next, function(next) {
                s._notifyListeners.call(s, next);
            });
        });
        return s;
    }
    
    buffer(count: number) {
        var buffer = [];
        return this._newStream(function(next) {
            buffer.push(next);
            if(buffer.length >= count) {
                this._notifyListeners(buffer);
                buffer.length = 0;
            }
        });
    }
    
    bufferToObj(keySelector: (next) => string, canPush: (next) => bool) {
        var bufferObj: { [key: string]: any; } = {};
        return this._newStream(function(next) {
            var key = keySelector(next);
            bufferObj[key] = next;
            if(canPush(bufferObj)) {
                this._notifyListeners(bufferObj);
                bufferObj = {};
            }
        });
    }
    
    delay(ms: number) {
        var s = new EventStream(function(next) {
            setTimeout(function() {
                s._notifyListeners(next);
            }, ms);
        });
        s.listenTo(this);
        return s;
    }
    
    distinct(comparisonFn?: (a, b) => bool) {
        var lastValues = [];
        var s = this._newStream(function(next) {
            if(!lastValues.contains(next, comparisonFn)) {
                lastValues.push(next);
                this._notifyListeners(next);
            }
        });
        return s;
    }
    
    do(f: (next) => void) {
        this._newStream(function(next) {
            f(next);
        });
    }
    
    filter(f: (next) => bool) {
        return this._newStream(function(next) {
            if(f(next)) {
                this._notifyListeners(next);
            }
        });
    }
    
    groupBy(keySelector: (next) => string, newStream: (next, stream: EventStream) => void) {
        var ss = {};
        return this._newStream(function(next) {
            var key = keySelector(next);
            var s = ss[key];
            if(!s) {
                s = this._newStream(function(next) {
                    this._notifyListeners(next);
                });
                ss[key] = s;
                newStream(next, s);
            }
            s.onNext(next);
        });
    }
    
    listenTo(parent: EventStream) {
        this.parents.push(parent);
        parent.listeners.push(this);
    }
    
    stop() {
        for(var i = 0; i < this.parents.length; i++) {
            this.stopListeningTo(this.parents[i]);
        }
    }
    
    stopListeningTo(parent: EventStream) {
        this.parents.remove(parent);
        parent.listeners.remove(this);
    }
    
    stopOn(stopFn: (next) => bool) {
        var self = this;
        return this._newStream(function(next) {
            if(stopFn(next)) {
                self.stop();
            }
            this._notifyListeners(next);
        });
    }
    
    take(n: number) {
        var count = 0;
        return this._newStream(function(next) {
            this._notifyListeners(next);
            if(count >= n - 1) {
                this.stop();
            }
            count++;
        });
    }
    
    throttle(timespanInMs: number) {
        return this._newStream(function(next) {
            var now = new Date().getTime();
            if(!this.lastDate || now > this.lastDate + timespanInMs) {
                this.lastDate = now;
                this._notifyListeners(next);
            }
        });
    }
    
    transform(f: (next) => any) {
        return this._newStream(function(next) {
            var newVal = f(next);
            this._notifyListeners(newVal);
        });
    }
    
    waitForPause(delayInMs?: number, loopSpeedInMs?: number) {
        delayInMs = delayInMs || 500;
        loopSpeedInMs = loopSpeedInMs || 100;
        var count = 0;
        var interval = null;
        var lastNext = null;
        var intervalFn = function(){};
        
        var s = this._newStream(function(next) {
            count = 0;
            lastNext = next;
            if(!interval) {
                interval = setInterval(intervalFn, loopSpeedInMs);
            }
        });

        intervalFn = function() {
            count += loopSpeedInMs;
            if(count >= delayInMs) {
                clearInterval(interval);
                count = 0;
                interval = null;
                s._notifyListeners(lastNext);
            }
        };
        return s;
    }
}

class CounterObj {
    constructor(public next, public count: number) {
        
    }
}

interface OnMessager {
    onmessage: (...) => void;
}

class MergeObj {
    constructor(public next, public from: number) {
        
    }
}

/*
* args:
*      stream: stream to merge
*      buffer (optional): array or object depending on the
*          type of buffering you want. If not specified,the 
*          last pushed value is stored
*      keySelector: required if buffer set to object;
*          selects the key to use when buffering to an object
*      clear: a function that takes in the next element and
*          determines whether or not the cached/buffered 
*          values should be cleared, or a bool to clear or 
*          not clear every time a new value is pushed to
*          the resulting stream
*      canPush: a function that takes in the next element
*          and returns a bool to determine whether or not 
*          the resulting stream can have this value pushed 
*          to it or if it should be buffered/cached, or a 
*          bool to always push or never push the next value 
*          to the resulting stream
* 
* return:
*      n1...nx: an array, object, or value depending on the 
*          buffer type selected
*/
interface BufferedMergeArg {
    stream: EventStream;
    buffer?: string;
    keySelector?: (next) => string;
    clear?;
    canPush?;
    pushed?;
}

class BufferedMergeObj {
    next: {} = {};
    from: number;
}