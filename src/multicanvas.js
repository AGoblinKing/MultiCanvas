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

var MultiCanvas = (function() {
    "use strict";
    
    return function(canvas) {
        var peer = new Peer(null, { key : "x87ju7n4u66layvi" });
        
        return Chainable(canvas)
            .bind(function() {
                this.conns = {};
            })
            .lift("tick", function(canvas) {
                
            })
            .lift("opened", function(canvas, conn) {
                conn.on("close", this.closed);
                conn.on("data", this.data);
                
                this.conns[conn.peer] = conn;
            })
            .lift("data", function(canvas, data) {
                
            })
            .lift("closed", function(canvas, conn) {
                delete this.conns[conn.peer];
            })
            // Public APIs
            .lift("host", function(canvas) {
                peer.on("connection", this.opened);
                // start broadcasting data
            })
            .lift("connect", function(canvas, id) {
                var conn = peer.connect(id);
                conn.on("open", this.opened);
                // bind inputs
            });
    };
} ());