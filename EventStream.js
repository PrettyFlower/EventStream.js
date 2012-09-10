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
        $.fn.getEventStream = function(eventType) {
            var s = new EventStream(function(event) {
				this._notifyListeners(event);
            });
            this.bind(eventType, s.onNext);
            return s;
        };
    })(jQuery);
};

EventStream.fromAnimationFrame = function() {
    var s = new EventStream(function(timestamp) {
        if(!this.stopAnimation) {
            requestAnimFrame(this.onNext);
        }
		this._notifyListeners(timestamp);
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
			s.onNext(arr[i]);
		}
	}
	return s;
};

EventStream.fromInterval = function(ms) {
    var i = 0;
    var s = new EventStream(function () {
		this._notifyListeners(i);
        i++;
    });
    var interval = setInterval(s.onNext, ms);
    s.stop = function() {
        clearInterval(interval);
    }
    return s;
};

EventStream.prototype = {
	_newStream: function(onNext) {
		var s = new EventStream(onNext, this);
		this.listeners.push(s);
		return s;
	},

	_notifyListeners: function(next) {
		for(var i = 0; i < this.listeners.length; i++) {
			this.listeners[i].onNext(next);
		}
	},

    addStreamOn: function(f, newStream) {
		return this._newStream(function(next) {
            if(f(next)) {
                var s = new EventStream(function(next) {
					this._notifyListeners(next);
                }, splitStream);
                newStream(s);
                splitStream.listeners.push(s);
                s.onNext(next);
            }
			this._notifyListeners(next);
        });
    },
	
	buffer: function(count) {
		var buffer = [];
		return this._newStream(function(next) {
			buffer.push(next);
			if(buffer.length >= count) {
				this._notifyListeners(next);
			}
		});
	},
    
    distinct: function(comparisonFn) {
        var s = this._newStream(function(next) {
            if(!this.lastValues.contains(next, comparisonFn)) {
                this.lastValues.push(next);
				this._notifyListeners(next);
            }
        }, this);
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
        }, this);
    },
    
    groupBy: function(splitBy, newStream) {
        var self = this;
        var ss = {};
        return this._newStream(function(next) {
            var key = splitBy(next);
            var s = ss[key];
            if(!s) {
                s = this._newStream(function(next) {
					this._notifyListeners(next);
                });
                ss[key] = s;
                newStream(s);
                this.listeners.push(s);
            }
            s.onNext({
                key: key,
                val: next
            });
        });
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
    }
};