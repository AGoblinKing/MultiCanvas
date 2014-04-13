// yeah polluting the namespace with chainable :/
var Chainable = (function() {
    "use strict";
    
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

var MultiCanvas = (function() {
    "use strict";
    
    var events = [
            "keydown", "keypress", "mousedown", "mouseup", "mouseover", "click", "dblclick",
            "keyup", "mouseout", "mousemove"
        ],
        Simulate = (function() {
            var eventMatchers = {
                    "HTMLEvents": /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/,
                    "MouseEvents": /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/,
                    "KeyboardEvents": /^(?:keydown|keyup|keypress)$/
                };

            return function (element, options) {
                var oEvent, 
                    eventType;
                
                // really dislike this part
                for (var name in eventMatchers) {
                    if (eventMatchers[name].test(options.type)) { 
                        eventType = name; break; 
                    }
                }
                // TODO: mouse events should be an offset based on where on the canvas they clicked
                switch(eventType) {
                    case "MouseEvents":
                        oEvent = new MouseEvent(options.type, {});
                        break;
                    case "KeyboardEvents":
                        oEvent = new KeyboardEvent(options.type, {});
                        Object.defineProperty(oEvent, "keyCode", {
                            get : function() { return options.keyCode; }
                        });
                        
                        Object.defineProperty(oEvent, "which", {
                            get : function() { return options.keyCode; }
                        });
                        break;
                    default:
                        oEvent = new Event(options.type, options);
                }
                element.dispatchEvent(oEvent);

                return element;
            };
        } ());

    return function(canvas) {
        var peer = new Peer(Math.floor(Math.random() * 50), { key : "x87ju7n4u66layvi" }),
            conns = {},
            host = false,
            lossless = false,
            quality = 0.5,
            eventTarget,
            chatTarget,
            ctx = canvas.getContext("2d"),
            onTick = function() {
                if(lossless) {
                    send(canvas.toDataURL("image/png"));
                } else {
                    // WebP is kinda CPU intensive... disable for now
                    /* if(util.browser === "Chrome") {
                        send(canvas.toDataURL("image/webp", quality));   
                    } */
                    send(canvas.toDataURL("image/jpeg", quality));
                }
            },
            onConnection = function(conn) {
                conn.on("close", onClosed.bind(undefined, conn));
                conn.on("data", onData);
                conns[conn.peer] = conn;
            },
            onData = function(data) {
                if(!host) {
                    var img = new Image();
                    img.src = data;
                    img.onload = function() {
                        ctx.drawImage(img, 0, 0);
                    };
                } else {
                    if(eventTarget) {
                        Simulate(eventTarget, data);
                    }
                }
            },
            onClosed = function(conn) {
                delete conns[conn.peer];
            },
            onEvent = function(e) {
                // I could care about sending only defined data... or I couldn't.
                e.preventDefault();

                send({
                    type : e.type,
                    keyCode : e.keyCode,
                    charCode : e.charCode,
                    screenX : e.screenX,
                    screenY : e.screenY,
                    clientX : e.clientX,
                    clientY : e.clientY,
                    button : e.button
                });
            },
            send = function(data) {
                Object.keys(conns).forEach(function(peer) {
                    var conn = conns[peer];
                    
                    // kill buffer if it grows too large on host
                    if(host && conn.bufferSize > 5) {
                        conn._buffer = [];
                        conn.bufferSize = 0;
                        conn.buffered = false;
                    }
                    
                    conn.send(data);
                });
            },
            sendMessage = function(message) {
                send(peer.id + "> " + message);
            };

        return Chainable(canvas)
            .property("peer", function(canvas) {
                return peer;
            })
            .lift("host", function(canvas, tickRate) {
                host = true;
                peer.on("connection", onConnection);
                // start broadcasting data
                setInterval(onTick, tickRate);
            })
            .property("lossless", function(canvas){
                return lossless;
            }, function(canvas, plossless) {
                lossless = plossless;
            })
            .property("quality", function(canvas) {
                return quality;
            }, function(canvas, pquality) {
                quality = pquality;
            })
            .lift("sim", function(canvas, e) {
                // useful when you want to provide external controls
                onEvent(e);
            })
            .lift("connect", function(canvas, id) {
                onConnection(peer.connect(id));
            })
            .lift("events", function(canvas, target, events) {
                target = target || canvas;
                
                if(!host) {
                    events.forEach(function(event) {
                        target.addEventListener(event, onEvent);
                    });
                } else {
                    eventTarget = target;
                }
            })
            .lift("chat", function(canvas, outTarget, inTarget) {
                chatTarget = outTarget;
                
                inTarget.addEventListener("keypress", function(e) {
                    if(e.keyCode === 13) {
                        e.preventDefault();
                        sendMessage(inTarget.value);
                        inTarget.value = "";
                    }
                });
            });
    };
} ());