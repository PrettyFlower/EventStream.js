interface Array {
    binarySearch(find: any, comparator: (a, b) => number): number;
    contains( o: any, f: (a, b) => bool): bool;
    filter(f: (x) => bool): any[];
    first(f: (x) => bool): any;
    indexOfFn(fn: (x) => bool): number;
    insertionSort(sortFn: (a, b) => bool): any[];
    quickSort(sortFn: (a, b) => bool): any[];
    aggregate(aggregator: (a, b) => any, initial: any): any;
    remove(obj: any): void;
    shuffle(): any[];
    sum(): number;
    transform(f: (x) => any): any[];
}

Array.prototype.binarySearch = function(find: any, comparator: (a, b) => number) {
    var low = 0, high = this.length - 1, i, comparison;
    while (low <= high) {
        i = Math.floor((low + high) / 2);
        comparison = comparator(find, this[i]);
        if (comparison > 0) { low = i + 1; continue; };
        if (comparison < 0) { high = i - 1; continue; };
        return i;
    }
    return high;
};

Array.prototype.contains = function(o: any, f: (a, b) => bool) {
    if(!f) f = function(a, b) {
        return a === b;
    }
    for(var i = 0; i < this.length; i++) {
        if(f(o, this[i])) return true;
    }
    return false;
};

Array.prototype.filter = function(f: (x) => bool) {
    var retArr = [];
    for(var i = 0; i < this.length; i++) {
        var x = this[i];
        if(f(x)) {
            retArr.push(x);
        }
    }
    return retArr;
};

Array.prototype.first = function(f: (x) => bool) {
    for(var i = 0; i < this.length; i++) {
        var x = this[i];
        if(f(x)) {
            return x;
        }
    }
    return null;
};

Array.prototype.indexOfFn = function(fn: (x) => bool) {
    for(var i = 0; i < this.length; i++) {
        if(fn(this[i])) {
            return i;
        }
    }
    return -1;
};

Array.prototype.insertionSort = function(sortFn: (a, b) => bool) {
    var retArr = this.slice(0);
    for(var i = 1; i < retArr.length; i++) {
        for(var j = i; j >= 0; j--) {
            if(sortFn(retArr[j], retArr[j - 1])) {
                var tmp = retArr[j];
                retArr[j] = retArr[j - 1];
                retArr[j - 1] = tmp;
            }
        }
    }
    return retArr;
};

Array.prototype.quickSort = function(sortFn: (a, b) => bool) {
    if(this.length <= 1) {
        return this.slice(0);
    }
    var pivotIdx = Math.floor(this.length / 2);
    var pivot = this[pivotIdx];
    var less = [], more = [];
    for(var i = 0; i < this.length; i++) {
        if(i == pivotIdx) continue;
        var e = this[i];
        if(sortFn(e, pivot)) {
            less.push(e);
        }
        else {
            more.push(e);
        }
    }
    var sorted = [];
    sorted = sorted.concat(less.quickSort(sortFn));
    sorted.push(pivot);
    sorted = sorted.concat(more.quickSort(sortFn));
    return sorted;
};

Array.prototype.aggregate = function(aggregator: (a, b) => any, initial: any) {
    for(var i = 0; i < this.length; i++) {
        initial = aggregator(initial, this[i]);
    }
    return initial;
};

Array.prototype.remove = function(obj: any) {
    this.splice(this.indexOf(obj), 1);
};

Array.prototype.shuffle = function() {
    var retArr = this.slice(0);
    for(var i = retArr.length - 1; i > 0; i--) {
        var n = Math.floor(Math.random() * i);
        var tmp = retArr[n];
        retArr[n] = retArr[i];
        retArr[i] = tmp;
    }
    return retArr;
};

Array.prototype.sum = function() {
    return this.aggregate(function(a, b) {
        return a + b;
    }, 0);
};

Array.prototype.transform = function(f: (x) => any) {
    var retArr = [];
    for(var i = 0; i < this.length; i++) {
        retArr.push(f(this[i]));
    }
    return retArr;
};