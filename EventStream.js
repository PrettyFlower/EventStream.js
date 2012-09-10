function EventStream(onNext, parent) {
    var self = this;
    this.listeners = [];
    this.onNext = function() {
        onNext.apply(self, arguments);
    }
    this.parent = parent;
}

EventStream.init = function() {
    (function($) {
        $.fn.toEventStream = function(eventType) {
            var s = new EventStream(function(event) {
                for(var i = 0; i < this.listeners.length; i++) {
                    this.listeners[i].onNext(event);
                }
            });
            this.bind(eventType, s.onNext);
            return s;
        };
    })(jQuery);
};

EventStream.makeLoop = function(ms) {
    var i = 0;
    var s = new EventStream(function () {
        for(var j = 0; j < this.listeners.length; j++) {
            this.listeners[j].onNext(i);
        }
        i++;
    });
    var interval = setInterval(s.onNext, ms);
    s.stop = function() {
        clearInterval(interval);
    }
    return s;
};

EventStream.requestAnimFrame = function() {
    var s = new EventStream(function(timestamp) {
        if(!this.stopAnimation) {
            requestAnimFrame(this.onNext);
        }
        for(var i = 0; i < this.listeners.length; i++) {
            this.listeners[i].onNext(timestamp);
        }
    });
    s.stop = function() {
        this.stopAnimation = true;
    }
    s.onNext();
    return s;
};

EventStream.prototype = {
    addStreamOn: function(f, newStream) {
        var splitStream = new EventStream(function(next) {
            if(f(next)) {
                var s = new EventStream(function(next) {
                    for(var i = 0; i < this.listeners.length; i++) {
                        this.listeners[i].onNext(next);
                    }
                }, splitStream);
                newStream(s);
                splitStream.listeners.push(s);
                s.onNext(next);
            }
            for(var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].onNext(next);
            }
        });
        this.listeners.push(splitStream);
        return splitStream;
    },
    
    distinct: function(comparisonFn, resetFn) {
        var s = new EventStream(function(next) {
            if(resetFn && resetFn(next, s.lastValues)) {
                this.lastValues.length = 0;
            }
            if(!this.lastValues.contains(next, comparisonFn)) {
                this.lastValues.push(next);
                for(var i = 0; i < this.listeners.length; i++) {
                    this.listeners[i].onNext(next);
                }
            }
        }, this);
        s.lastValues = [];
        this.listeners.push(s);
        return s;
    },
    
    do: function(f) {
        var s = new EventStream(function(next) {
            f(next);
        });
        this.listeners.push(s);
    },
    
    filter: function(f) {
        var s = new EventStream(function(next) {
            if(f(next)) {
                for(var i = 0; i < this.listeners.length; i++) {
                    this.listeners[i].onNext(next);
                }
            }
        }, this);
        this.listeners.push(s);
        return s;
    },
    
    groupBy: function(splitBy, newStream) {
        var self = this;
        var ss = {};
        var s1 = new EventStream(function(next) {
            var key = splitBy(next);
            var s2 = ss[key];
            if(!s2) {
                s2 = new EventStream(function(next) {
                    for(var i = 0; i < this.listeners.length; i++) {
                        this.listeners[i].onNext(next);
                    }
                }, s1);
                ss[key] = s2;
                newStream(s2);
                s1.listeners.push(s2);
            }
            s2.onNext({
                key: key,
                val: next
            });
        });
        this.listeners.push(s1);
        return s1;
    },
    
    stop: function() {
        for(var i = 0; i < this.parent.listeners.length; i++) {
            var l = this.parent.listeners[i];
            if(l === this) {
                this.parent.listeners.splice(i, 1);
                break;
            }
        }
    },
    
    stopOn: function(stopFn) {
        var self = this;
        var s = new EventStream(function(next) {
            if(stopFn(next)) {
                self.stop();
            }
            for(var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].onNext(next);
            }
        });
        this.listeners.push(s);
        return s;
    },
    
    take: function(n) {
        var count = 0;
        var s = new EventStream(function(next) {
            for(var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].onNext(next);
            }
            if(count >= n - 1) {
                this.stop();
            }
            count++;
        }, this);
        this.listeners.push(s);
        return s;
    },
    
    throttle: function(timespanInMs) {
        var s = new EventStream(function(next) {
            var now = new Date() * 1;
            if(!this.lastDate || now > this.lastDate + timespanInMs) {
                this.lastDate = now;
                for(var i = 0; i < this.listeners.length; i++) {
                    this.listeners[i].onNext(next);
                }
            }
        }, this);
        this.listeners.push(s);
        return s;
    },
    
    transform: function(f) {
        var s = new EventStream(function(next) {
            for(var i = 0; i < this.listeners.length; i++) {
                this.listeners[i].onNext(f(next));
            }
        }, this);
        this.listeners.push(s);
        return s;
    }
};