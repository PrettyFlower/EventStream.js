/// <reference path='Window.d.ts' />

// from http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// shim layer with setTimeout fallback
var requestAnimFrame = window.requestAnimationFrame   || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function( callback ){
        window.setTimeout(callback, 1000 / 60);
    };

class Util {    
    static propCount(obj) {
        var count = 0;
        for(var p in obj) {
            count++;
        }
        return count;
    }
    
    // from: http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
    static getParamNames(func: (...) => any) {
        var funStr = func.toString();
        return funStr.slice(funStr.indexOf('(')+1, funStr.indexOf(')')).match(/([^\s,]+)/g);
    }
};