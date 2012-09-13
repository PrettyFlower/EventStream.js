function EventStream(onNext, parents) {
    var self = this;
    this.listeners = {};
    this.onNext = function() {
        onNext.apply(self, arguments);
    }
    this.parents = parents;
    this.id = EventStream.nextId++;
}

EventStream.nextId = 0;

EventStream.init = function() {
    (function($) {
        $.fn.getEventStream = function(eventType) {
            var s = new EventStream(function(event) {
                this._notifyListeners(event);
            });
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

    addStreamOn: function(f, newStream) {
        return this._newStream(function(next) {
            if(f(next)) {
                var s = new EventStream(function(next) {
                    this._notifyListeners(next);
                });
                newStream(s);
                this.listeners[s.id] = s;
            }
            this._notifyListeners(next);
        });
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
    
    mergeReturnBufferArray: function() {
        var buffers = {};
        var count = 0;
        var s = this._newStream(function(next, from) {
            if(!buffers[from.id]) {
                buffers[from.id] = [];
                count++;
            }
            buffers[from.id].push(next);
            if(count === arguments.length + 1) {
                this._notifyListeners(buffers);
                buffers = {};
                count = 0;
            }
            
        });
        for(var i = 0; i < arguments.length; i++) {
            var parentStream = arguments[i];
            parentStream.listeners[s.id] = s;
        }
        return s;
    },
    
    mergeReturnBufferObject: function(keySelector) {
        var buffers = {};
        var count = 0;
        var s = this._newStream(function(next, from) {
            if(!buffers[from.id]) {
                buffers[from.id] = {};
                count++;
            }
            var key = keySelector(next);
            buffers[from.id][key] = next;
            if(count === arguments.length + 1) {
                this._notifyListeners(buffers);
                buffers = {};
                count = 0;
            }
            
        });
        for(var i = 1; i < arguments.length; i++) {
            var parentStream = arguments[i];
            parentStream.listeners[s.id] = s;
        }
        return s;
    },
    
    mergeReturnImmediately: function() {
        var s = this._newStream(function(next, from) {
            next = {
                from: from.id,
                next: next
            };
            this._notifyListeners(next);
        });
        for(var i = 0; i < arguments.length; i++) {
            var parentStream = arguments[i];
            parentStream.listeners[s.id] = s;
        }
        return s;
    },
    
    mergeReturnObjDelayed: function() {
        var obj = {};
        var count = 0;
        var s = this._newStream(function(next, from) {
            if(!obj[from.id]) {
                count++;
            }
            obj[from.id] = {
                from: from.id,
                next: next
            };
            if(count === arguments.length + 1) {
                this._notifyListeners(obj);
                obj = {};
                count = 0;
            }
            
        });
        for(var i = 0; i < arguments.length; i++) {
            var parentStream = arguments[i];
            parentStream.listeners[s.id] = s;
        }
        return s;
    },
    
    mergeReturnObjImmediate: function() {
        var obj = {};
        var s = this._newStream(function(next, from) {
            obj[from.id] = {
                from: from.id,
                next: next
            };
            var retObj = {};
            for(var p in obj) {
                retObj[p] = obj[p];
            }
            this._notifyListeners(retObj);
        });
        for(var i = 0; i < arguments.length; i++) {
            var parentStream = arguments[i];
            parentStream.listeners[s.id] = s;
        }
        return s;
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