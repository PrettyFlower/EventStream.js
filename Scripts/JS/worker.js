importScripts('EventStream.js');

EventStream.fromOnMessager(self)
.delay(1000)
.do(function(next) {
    self.postMessage(next.data);
});