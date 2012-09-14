function EventStream(onNext, parents) {
    var self = this;
    this.listeners = {};
    this.onNext = function() {
        onNext.apply(self, arguments);
    }
    this.parents = parents || {};
    this.id = EventStream.nextId++;
}

EventStream.nextId = 0;

EventStream.init = function() {
    (function($) {
        $.fn.getEventStream = function(eventType, currentState) {
            var s = new EventStream(function(event) {
                event.currentState = this.currentState;
                this._notifyListeners(event);
            });
            s.currentState = currentState;
            this.bind(eventType, s.onNext);
            return s;
        };
    })(jQuery);
};

EventStream.fromAnimationFrame = function(args) {
    var s = new EventStream(function(timestamp) {
        if(!this.stopAnimation) {
            requestAnimFrame(this.onNext);
            this._notifyListeners(args);
        }
    });
    s.stop = function() {
        this.stopAnimation = true;
    }
    s.onNext();
    return s;
};

EventStream.fromArray = function(arr) {
    var s = new EventStream(function(next) {
        this._notifyListeners(next);
    });
    s.start = function() {
        for(var i = 0; i < arr.length; i++) {
            if(this.stopArray) {
                break;
            }
            s.onNext(arr[i]);
        }
    }
    s.stop = function() {
        this.stopArray = true;
    }
    return s;
};

EventStream.fromInterval = function(ms, currentState) {
    var s = new EventStream(function () {
        this._notifyListeners(this.currentState);
    });
    s.currentState = currentState;
    var interval = setInterval(s.onNext, ms);
    s.stop = function() {
        clearInterval(interval);
    }
    return s;
};

EventStream.fromWebSocket = function(ws) {
    var s = new EventStream(function (event) {
        this._notifyListeners(event);
    });
    ws.onmessage = s.onNext;
    return s;
};

/*
 * args:
 *      stream: stream to merge
 *      buffer (optional): array or object depending on the
 *          type of buffering you want
 *      keySelector: required if buffer set to object;
 *          selects the key to use when buffering to an object
 * 
 * return:
 *      n1...nx: an array, object, or value depending on the 
 *          buffer type selected
 */
EventStream.mergeBlocking = function() {
    var obj = {};
    var streamArgs = {};
    for(var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        streamArgs[arg.stream.id] = arg;
    }
    var s = new EventStream(function(next, from) {
        var fromArgs = streamArgs[from.id];
        fromArgs.pushed = true;
        
        if(fromArgs.buffer == 'array') {
            obj[fromArgs.stream.id].push(next);
        }
        else if(fromArgs.buffer == 'object') {
            var key = streamArgs[fromArgs.stream.id].keySelector(next);
            obj[fromArgs.stream.id][key] = next;
        }
        else {
            obj[fromArgs.stream.id] = next;
        }
        
        var unblock = true;
        for(var p in streamArgs) {
            if(!streamArgs[p].pushed) {
                unblock = false;
                break;
            }
        }
        
        if(unblock) {
            var retObj = {};
            for(var p in obj) {
                retObj[p] = obj[p];
            }
            this._notifyListeners(retObj);
            for(var a in streamArgs) {
                var arg = streamArgs[a];
                if(arg.buffer == 'array') {
                    obj[arg.stream.id] = [];
                }
                else if(arg.buffer == 'object') {
                    obj[arg.stream.id] = {};
                }
                else {
                    delete obj[arg.stream.id];
                }
            }
        }
        
    });
    
    for(var a in streamArgs) {
        var arg = streamArgs[a];
        arg.stream.listeners[arg.stream.id] = s;
        s.parents[arg.stream.id] = arg.stream;
        if(arg.buffer == 'array') {
            obj[arg.stream.id] = [];
        }
        else if(arg.buffer == 'object') {
            obj[arg.stream.id] = {};
        }
    }
    return s;
};

/*
 * args:
 *      stream: stream to merge
 *      clear: whether or not to clear the last value
 *          when a value is pushed from a different stream
 * 
 * return:
 *      id n1...nx: the next value for the associated stream;
 *          this may be the last reported value if clear is 
 *          not set for this stream
 *      from: the stream that fired the event
 */
EventStream.mergeNonBlocking = function() {
    var obj = {};
    var args = {};
    for(var i = 0; i < arguments.length; i++) {
        args[arguments[i].stream.id] = arguments[i];
    }
    var s = new EventStream(function(next, from) {
        obj[from.id] = next;
        var retObj = {
            from: from.id
        };
        for(var p in obj) {
            retObj[p] = obj[p];
        }
        this._notifyListeners(retObj);
        for(var a in args) {
            var arg = args[a];
            if(arg.clear) delete obj[arg.stream.id];
        }
    });
    
    for(var a in args) {
        var parentStream = args[a].stream;
        parentStream.listeners[s.id] = s;
        s.parents[parentStream.id] = parentStream;
    }
    return s;
};

EventStream.prototype = {
    _newStream: function(onNext) {
        var parents = {};
        parents[this.id] = this;
        var s = new EventStream(onNext, parents);
        this.listeners[s.id] = s;
        return s;
    },

    _notifyListeners: function(next) {
        for(var l in this.listeners) {
            this.listeners[l].onNext(next, this);
        }
    },
    
    addCounter: function() {
        var count = 0;
        var s = this._newStream(function(next) {
            this._notifyListeners({
                next: next,
                count: count
            });
            count++;
        });
        return s;
    },

    addStreamOn: function(f, newStreamFn) {
        return this._newStream(function(next) {
            if(f(next)) {
                var s = new EventStream(function(next) {
                    this._notifyListeners(next);
                });
                newStreamFn(s);
                this.listeners[s.id] = s;
            }
            this._notifyListeners(next);
        });
    },
    
    ajax: function(args) {
        var sSuccess = new EventStream(function(next) {
            this._notifyListeners(next);
        });
        args.successStreamFn(sSuccess);
        args.success = sSuccess.onNext;
        var s = this._newStream(function(next) {
            $.ajax(this.args);
            this._notifyListeners(next);
        });
        s.args = args;
        return s;
    },
    
    block: function(fn) {
        var s = this._newStream(function(next) {
            fn(next, function(next) {
                s._notifyListeners.call(s, next);
            });
        });
        return s;
    },
    
    buffer: function(count) {
        var buffer = [];
        return this._newStream(function(next) {
            buffer.push(next);
            if(buffer.length >= count) {
                this._notifyListeners(buffer);
                buffer.length = 0;
            }
        });
    },
    
    distinct: function(comparisonFn) {
        var s = this._newStream(function(next) {
            if(!this.lastValues.contains(next, comparisonFn)) {
                this.lastValues.push(next);
                this._notifyListeners(next);
            }
        });
        s.lastValues = [];
        return s;
    },
    
    do: function(f) {
        this._newStream(function(next) {
            f(next);
        });
    },
    
    filter: function(f) {
        return this._newStream(function(next) {
            if(f(next)) {
                this._notifyListeners(next);
            }
        });
    },
    
    groupBy: function(splitByFn, newStreamFn) {
        var self = this;
        var ss = {};
        return this._newStream(function(next) {
            var key = splitByFn(next);
            var s = ss[key];
            if(!s) {
                s = this._newStream(function(next) {
                    this._notifyListeners(next);
                });
                ss[key] = s;
                newStreamFn(s, key);
            }
            s.onNext(next);
        });
    },
    
    stop: function() {
        for(var p in this.parents) {
            delete this.parents[p].listeners[this.id];
        }
    },
    
    stopOn: function(stopFn) {
        var self = this;
        return this._newStream(function(next) {
            if(stopFn(next)) {
                self.stop();
            }
            this._notifyListeners(next);
        });
    },
    
    take: function(n) {
        var count = 0;
        return this._newStream(function(next) {
            this._notifyListeners(next);
            if(count >= n - 1) {
                this.stop();
            }
            count++;
        });
    },
    
    throttle: function(timespanInMs) {
        return this._newStream(function(next) {
            var now = new Date() * 1;
            if(!this.lastDate || now > this.lastDate + timespanInMs) {
                this.lastDate = now;
                this._notifyListeners(next);
            }
        });
    },
    
    transform: function(f) {
        return this._newStream(function(next) {
            var newVal = f(next);
            this._notifyListeners(newVal);
        });
    },
    
    waitForPause: function(delayInMs, loopSpeedInMs) {       
        var s = this._newStream(function(next) {
            this.count = 0;
            this.lastNext = next;
            if(!this.interval) {
                this.interval = setInterval(this.intervalFn, this.loopSpeedInMs);
            }
        });
        s.delayInMs = delayInMs || 500;
        s.loopSpeedInMs = loopSpeedInMs || 100;
        s.count = 0;
        s.interval = null;
        s.lastNext = null;
        s.intervalFn = function() {
            s.count += s.loopSpeedInMs;
            if(s.count >= s.delayInMs) {
                clearInterval(s.interval);
                s.count = 0;
                s.interval = null;
                s._notifyListeners(s.lastNext);
            }
        };
        return s;
    }
};