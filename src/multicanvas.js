var Chainable = (function() {
    "use strict";
    
    // thought about putting additional values here
    return function unit(value) {
        var chains = {
            bind : function(fn, args) { 
                var results = fn.apply(this, [value].concat(Array.prototype.slice.apply(args || [])));
                if(typeof results === "undefined") {
                    return this;  
                } else {
                    return results;
                }
            },
            lift : function(property, fn) {
                this[property] = function() {
                    return this.bind.call(this, fn, arguments);
                };
                return this;
            }
        };
        
        return Object.create(chains);
    };
} ());

var MultiCanvas = function(canvas) {
    "use strict";
    
    return Chainable(canvas)
        .lift("update", function(canvas) {
            
        });
};