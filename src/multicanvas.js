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
            wrap : function(fn) {
                var self = this;
                return function() { return self.bind.call(self, fn, arguments) };
            },
            lift : function(property, fn) {
                this[property] = this.wrap(fn);
                return this;
            },
            property : function(property, get, set) {
                Object.defineProperty(this, property, {
                    enumerable: true,
                    configurable: true,
                    get: get ? this.wrap(get) : undefined,
                    set: set ? this.wrap(set) : undefined
                });
                return this;
            }
        };
        
        return Object.create(chains);
    };
} ());

/*
var Simulate =  (function() {
    var defaultOptions = {
            ctrlKey: false,
            altKey: false,
            shiftKey: false,
            metaKey: false,
            bubbles: true,
            cancelable: true
        }, 
        defaultMouse = {
            pointerX: 0,
            pointerY: 0,
            button: 0
        },
        eventMatchers = {
            "HTMLEvents": /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
            "MouseEvents": /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/
        }
    
    function extend(destination, source) {
        for (var property in source)
          destination[property] = source[property];
        return destination;
    }
    
    function simulate(element, eventName)
    {
        var options = extend(defaultOptions, arguments[2] || {});
        var oEvent, eventType = null;

        for (var name in eventMatchers)
        {
            if (eventMatchers[name].test(eventName)) { eventType = name; break; }
        }

        if (!eventType)
            throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');

        if (document.createEvent)
        {
            oEvent = document.createEvent(eventType);
            if (eventType == 'HTMLEvents')
            {
                oEvent.initEvent(eventName, options.bubbles, options.cancelable);
            }
            else
            {
                oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, document.defaultView,
                options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
                options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, element);
            }
            element.dispatchEvent(oEvent);
        }
        else
        {
            options.clientX = options.pointerX;
            options.clientY = options.pointerY;
            var evt = document.createEventObject();
            oEvent = extend(evt, options);
            element.fireEvent('on' + eventName, oEvent);
        }
        return element;
    }
} ());
*/
var MultiCanvas = (function() {
    "use strict";
    
    return function(canvas) {
        var peer = new Peer({ key : "x87ju7n4u66layvi" }),
            conns = {},
            host = false,
            ctx = canvas.getContext("2d");
        
        return Chainable(canvas)
            .lift("tick", function(canvas) {
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                
                // TODO: just send deltas, this is killing the bandwidth
                this.send(imageData.data);
            })
            .lift("connection", function(canvas, conn) {
                conn.on("close", this.closed);
                conn.on("data", this.data);
                conn.bufferSize = 1;
                conns[conn.peer] = conn;
            })
            .lift("data", function(canvas, data) {
                if(!host) {
                    var imageData = ctx.createImageData(canvas.width, canvas.height);
                    imageData.data.set(new Uint8ClampedArray(data));
                    ctx.putImageData(imageData, 0, 0);
                }
            })
            .lift("closed", function(canvas, conn) {
                delete this.conns[conn.peer];
            })
            .lift("send", function(canvas, data) {
                Object.keys(conns).forEach(function(peer) {
                    conns[peer].send(data); 
                });
            })
            // Public APIs
            .property("peer", function(canvas) {
                return peer;
            })
            .lift("host", function(canvas, tickRate) {
                host = true;
                peer.on("connection", this.connection);
                // start broadcasting data
                setInterval(this.tick, tickRate);
            })
            .lift("connect", function(canvas, id) {
                this.connection(peer.connect(id));
                // bind inputs
            });
    };
} ());