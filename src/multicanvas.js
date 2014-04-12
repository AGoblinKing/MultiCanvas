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
    
    var isDirty = function(old, newB) {
            return old !== newB;
        }, 
        hashFn = function(iter) {
            var red = 0,
                green = 0,
                blue = 0,
                alpha = 0;
            
            for(var i = 0; i < iter.length; i+=4) {
                red += iter[i];
                green += iter[i+1];
                blue += iter[i+2];
                alpha += iter[i+3];
            }
            return "r"+red+"g"+green+"b"+blue+"a"+alpha;
        },
        numDf = function(df, number) { return Math.floor(number / df); },
        toString = function(iter) {
            var str = "";
            for(var i = 0; i < iter.length; i++) {
                str += String.fromCharCode(iter[i]);
            }
            return str;
        },
        fromString = function(raw) {
            var iter = raw,
                results = new Uint8ClampedArray(iter.length);
            for(var i = 0; i < iter.length; i++) {
                results[i] = iter.charCodeAt(i);
            }
            return results;
        };
    
    return function(canvas) {
        var peer = new Peer(Math.floor(Math.random() * 50), { key : "x87ju7n4u66layvi" }),
            conns = {},
            host = false,
            ctx = canvas.getContext("2d"),
            lastBuffer = [],
            drawFactor = 15,
            dfNum = numDf.bind(undefined, drawFactor),
            dfWidth = dfNum(canvas.width),
            dfHeight = dfNum(canvas.height);
            
        return Chainable(canvas)
            .lift("tick", function(canvas) {
                var deltas = [];
                for(var i = 0; i < drawFactor * drawFactor; i++) {
                    var imageData = ctx.getImageData((i % drawFactor) * dfWidth, dfNum(i) * dfHeight, dfWidth, dfHeight),
                        hash = hashFn(imageData.data);
                    
                    if(lastBuffer.length !== 0 && isDirty(lastBuffer[i], hash)) {
                        deltas.push(imageData.data);
                    } else {
                        deltas.push(null);
                    }
                    
                    lastBuffer[i] = hash;
                }

                this.send(deltas);
            })
            .lift("connection", function(canvas, conn) {
                conn.on("close", this.closed.bind(this, conn));
                conn.on("data", this.data);
                conns[conn.peer] = conn;
            })
            .lift("data", function(canvas, data) {
                if(!host) {
                    //probably move this out
                    var imageData = ctx.createImageData(dfWidth, dfHeight);
                
                    for(var i = 0; i < data.length; i++) {
                        if(data[i]) {
                            var rawData = new Uint8ClampedArray(data[i]);
                            imageData.data.set(rawData);
                            ctx.putImageData(imageData, (i % drawFactor) * dfWidth, dfNum(i) * dfHeight);
                        }
                    }
                }
            })
            .lift("closed", function(canvas, conn) {
                delete conns[conn.peer];
            })
            .lift("send", function(canvas, data) { 

                Object.keys(conns).forEach(function(peer) {
                    var conn = conns[peer];
        
                    // buffer is greater than 1 lets concat onto next message
                    if(conn._buffer.length > 50) {
                        conn._buffer = [];
                        conn.bufferSize = 0;
                        conn.buffering = false;
                    }
                    conn.send(data);
                });

            })
            // Public APIs
            .property("peer", function(canvas) {
                return peer;
            })
            .lift("host", function(canvas, tickRate, nBufferSize) {
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
