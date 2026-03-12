/* eslint-disable */
'use strict';

const PACKET_TYPES = Object.create(null); // no Map = no polyfill
PACKET_TYPES["open"] = "0";
PACKET_TYPES["close"] = "1";
PACKET_TYPES["ping"] = "2";
PACKET_TYPES["pong"] = "3";
PACKET_TYPES["message"] = "4";
PACKET_TYPES["upgrade"] = "5";
PACKET_TYPES["noop"] = "6";
const PACKET_TYPES_REVERSE = Object.create(null);
Object.keys(PACKET_TYPES).forEach((key) => {
    PACKET_TYPES_REVERSE[PACKET_TYPES[key]] = key;
});
const ERROR_PACKET = { type: "error", data: "parser error" };

const withNativeBlob$1 = typeof Blob === "function" ||
    (typeof Blob !== "undefined" &&
        Object.prototype.toString.call(Blob) === "[object BlobConstructor]");
const withNativeArrayBuffer$2 = typeof ArrayBuffer === "function";
// ArrayBuffer.isView method is not defined in IE10
const isView$1 = (obj) => {
    return typeof ArrayBuffer.isView === "function"
        ? ArrayBuffer.isView(obj)
        : obj && obj.buffer instanceof ArrayBuffer;
};
const encodePacket = ({ type, data }, supportsBinary, callback) => {
    if (withNativeBlob$1 && data instanceof Blob) {
        if (supportsBinary) {
            return callback(data);
        }
        else {
            return encodeBlobAsBase64(data, callback);
        }
    }
    else if (withNativeArrayBuffer$2 &&
        (data instanceof ArrayBuffer || isView$1(data))) {
        if (supportsBinary) {
            return callback(data);
        }
        else {
            return encodeBlobAsBase64(new Blob([data]), callback);
        }
    }
    // plain string
    return callback(PACKET_TYPES[type] + (data || ""));
};
const encodeBlobAsBase64 = (data, callback) => {
    const fileReader = new FileReader();
    fileReader.onload = function () {
        const content = fileReader.result.split(",")[1];
        callback("b" + (content || ""));
    };
    return fileReader.readAsDataURL(data);
};
function toArray$1(data) {
    if (data instanceof Uint8Array) {
        return data;
    }
    else if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
    }
    else {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }
}
let TEXT_ENCODER;
function encodePacketToBinary(packet, callback) {
    if (withNativeBlob$1 && packet.data instanceof Blob) {
        return packet.data.arrayBuffer().then(toArray$1).then(callback);
    }
    else if (withNativeArrayBuffer$2 &&
        (packet.data instanceof ArrayBuffer || isView$1(packet.data))) {
        return callback(toArray$1(packet.data));
    }
    encodePacket(packet, false, (encoded) => {
        if (!TEXT_ENCODER) {
            TEXT_ENCODER = new TextEncoder();
        }
        callback(TEXT_ENCODER.encode(encoded));
    });
}

// imported from https://github.com/socketio/base64-arraybuffer
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
// Use a lookup table to find the index.
const lookup$1 = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
    lookup$1[chars.charCodeAt(i)] = i;
}
const decode$1 = (base64) => {
    let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
    if (base64[base64.length - 1] === '=') {
        bufferLength--;
        if (base64[base64.length - 2] === '=') {
            bufferLength--;
        }
    }
    const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
    for (i = 0; i < len; i += 4) {
        encoded1 = lookup$1[base64.charCodeAt(i)];
        encoded2 = lookup$1[base64.charCodeAt(i + 1)];
        encoded3 = lookup$1[base64.charCodeAt(i + 2)];
        encoded4 = lookup$1[base64.charCodeAt(i + 3)];
        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return arraybuffer;
};

const withNativeArrayBuffer$1 = typeof ArrayBuffer === "function";
const decodePacket = (encodedPacket, binaryType) => {
    if (typeof encodedPacket !== "string") {
        return {
            type: "message",
            data: mapBinary(encodedPacket, binaryType),
        };
    }
    const type = encodedPacket.charAt(0);
    if (type === "b") {
        return {
            type: "message",
            data: decodeBase64Packet(encodedPacket.substring(1), binaryType),
        };
    }
    const packetType = PACKET_TYPES_REVERSE[type];
    if (!packetType) {
        return ERROR_PACKET;
    }
    return encodedPacket.length > 1
        ? {
            type: PACKET_TYPES_REVERSE[type],
            data: encodedPacket.substring(1),
        }
        : {
            type: PACKET_TYPES_REVERSE[type],
        };
};
const decodeBase64Packet = (data, binaryType) => {
    if (withNativeArrayBuffer$1) {
        const decoded = decode$1(data);
        return mapBinary(decoded, binaryType);
    }
    else {
        return { base64: true, data }; // fallback for old browsers
    }
};
const mapBinary = (data, binaryType) => {
    switch (binaryType) {
        case "blob":
            if (data instanceof Blob) {
                // from WebSocket + binaryType "blob"
                return data;
            }
            else {
                // from HTTP long-polling or WebTransport
                return new Blob([data]);
            }
        case "arraybuffer":
        default:
            if (data instanceof ArrayBuffer) {
                // from HTTP long-polling (base64) or WebSocket + binaryType "arraybuffer"
                return data;
            }
            else {
                // from WebTransport (Uint8Array)
                return data.buffer;
            }
    }
};

const SEPARATOR = String.fromCharCode(30); // see https://en.wikipedia.org/wiki/Delimiter#ASCII_delimited_text
const encodePayload = (packets, callback) => {
    // some packets may be added to the array while encoding, so the initial length must be saved
    const length = packets.length;
    const encodedPackets = new Array(length);
    let count = 0;
    packets.forEach((packet, i) => {
        // force base64 encoding for binary packets
        encodePacket(packet, false, (encodedPacket) => {
            encodedPackets[i] = encodedPacket;
            if (++count === length) {
                callback(encodedPackets.join(SEPARATOR));
            }
        });
    });
};
const decodePayload = (encodedPayload, binaryType) => {
    const encodedPackets = encodedPayload.split(SEPARATOR);
    const packets = [];
    for (let i = 0; i < encodedPackets.length; i++) {
        const decodedPacket = decodePacket(encodedPackets[i], binaryType);
        packets.push(decodedPacket);
        if (decodedPacket.type === "error") {
            break;
        }
    }
    return packets;
};
function createPacketEncoderStream() {
    return new TransformStream({
        transform(packet, controller) {
            encodePacketToBinary(packet, (encodedPacket) => {
                const payloadLength = encodedPacket.length;
                let header;
                // inspired by the WebSocket format: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers#decoding_payload_length
                if (payloadLength < 126) {
                    header = new Uint8Array(1);
                    new DataView(header.buffer).setUint8(0, payloadLength);
                }
                else if (payloadLength < 65536) {
                    header = new Uint8Array(3);
                    const view = new DataView(header.buffer);
                    view.setUint8(0, 126);
                    view.setUint16(1, payloadLength);
                }
                else {
                    header = new Uint8Array(9);
                    const view = new DataView(header.buffer);
                    view.setUint8(0, 127);
                    view.setBigUint64(1, BigInt(payloadLength));
                }
                // first bit indicates whether the payload is plain text (0) or binary (1)
                if (packet.data && typeof packet.data !== "string") {
                    header[0] |= 0x80;
                }
                controller.enqueue(header);
                controller.enqueue(encodedPacket);
            });
        },
    });
}
let TEXT_DECODER;
function totalLength(chunks) {
    return chunks.reduce((acc, chunk) => acc + chunk.length, 0);
}
function concatChunks(chunks, size) {
    if (chunks[0].length === size) {
        return chunks.shift();
    }
    const buffer = new Uint8Array(size);
    let j = 0;
    for (let i = 0; i < size; i++) {
        buffer[i] = chunks[0][j++];
        if (j === chunks[0].length) {
            chunks.shift();
            j = 0;
        }
    }
    if (chunks.length && j < chunks[0].length) {
        chunks[0] = chunks[0].slice(j);
    }
    return buffer;
}
function createPacketDecoderStream(maxPayload, binaryType) {
    if (!TEXT_DECODER) {
        TEXT_DECODER = new TextDecoder();
    }
    const chunks = [];
    let state = 0 /* State.READ_HEADER */;
    let expectedLength = -1;
    let isBinary = false;
    return new TransformStream({
        transform(chunk, controller) {
            chunks.push(chunk);
            while (true) {
                if (state === 0 /* State.READ_HEADER */) {
                    if (totalLength(chunks) < 1) {
                        break;
                    }
                    const header = concatChunks(chunks, 1);
                    isBinary = (header[0] & 0x80) === 0x80;
                    expectedLength = header[0] & 0x7f;
                    if (expectedLength < 126) {
                        state = 3 /* State.READ_PAYLOAD */;
                    }
                    else if (expectedLength === 126) {
                        state = 1 /* State.READ_EXTENDED_LENGTH_16 */;
                    }
                    else {
                        state = 2 /* State.READ_EXTENDED_LENGTH_64 */;
                    }
                }
                else if (state === 1 /* State.READ_EXTENDED_LENGTH_16 */) {
                    if (totalLength(chunks) < 2) {
                        break;
                    }
                    const headerArray = concatChunks(chunks, 2);
                    expectedLength = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length).getUint16(0);
                    state = 3 /* State.READ_PAYLOAD */;
                }
                else if (state === 2 /* State.READ_EXTENDED_LENGTH_64 */) {
                    if (totalLength(chunks) < 8) {
                        break;
                    }
                    const headerArray = concatChunks(chunks, 8);
                    const view = new DataView(headerArray.buffer, headerArray.byteOffset, headerArray.length);
                    const n = view.getUint32(0);
                    if (n > Math.pow(2, 53 - 32) - 1) {
                        // the maximum safe integer in JavaScript is 2^53 - 1
                        controller.enqueue(ERROR_PACKET);
                        break;
                    }
                    expectedLength = n * Math.pow(2, 32) + view.getUint32(4);
                    state = 3 /* State.READ_PAYLOAD */;
                }
                else {
                    if (totalLength(chunks) < expectedLength) {
                        break;
                    }
                    const data = concatChunks(chunks, expectedLength);
                    controller.enqueue(decodePacket(isBinary ? data : TEXT_DECODER.decode(data), binaryType));
                    state = 0 /* State.READ_HEADER */;
                }
                if (expectedLength === 0 || expectedLength > maxPayload) {
                    controller.enqueue(ERROR_PACKET);
                    break;
                }
            }
        },
    });
}
const protocol = 4;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
}

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }

  // Remove event specific arrays for event types that no
  // one is subscribed for to avoid memory leak.
  if (callbacks.length === 0) {
    delete this._callbacks['$' + event];
  }

  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};

  var args = new Array(arguments.length - 1)
    , callbacks = this._callbacks['$' + event];

  for (var i = 1; i < arguments.length; i++) {
    args[i - 1] = arguments[i];
  }

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

// alias used for reserved events (protected method)
Emitter.prototype.emitReserved = Emitter.prototype.emit;

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

const nextTick = (() => {
    const isPromiseAvailable = typeof Promise === "function" && typeof Promise.resolve === "function";
    if (isPromiseAvailable) {
        return (cb) => Promise.resolve().then(cb);
    }
    else {
        return (cb, setTimeoutFn) => setTimeoutFn(cb, 0);
    }
})();
const globalThisShim = (() => {
    if (typeof self !== "undefined") {
        return self;
    }
    else if (typeof window !== "undefined") {
        return window;
    }
    else {
        return Function("return this")();
    }
})();
const defaultBinaryType = "arraybuffer";
function createCookieJar() { }

function pick(obj, ...attr) {
    return attr.reduce((acc, k) => {
        if (obj.hasOwnProperty(k)) {
            acc[k] = obj[k];
        }
        return acc;
    }, {});
}
// Keep a reference to the real timeout functions so they can be used when overridden
const NATIVE_SET_TIMEOUT = globalThisShim.setTimeout;
const NATIVE_CLEAR_TIMEOUT = globalThisShim.clearTimeout;
function installTimerFunctions(obj, opts) {
    if (opts.useNativeTimers) {
        obj.setTimeoutFn = NATIVE_SET_TIMEOUT.bind(globalThisShim);
        obj.clearTimeoutFn = NATIVE_CLEAR_TIMEOUT.bind(globalThisShim);
    }
    else {
        obj.setTimeoutFn = globalThisShim.setTimeout.bind(globalThisShim);
        obj.clearTimeoutFn = globalThisShim.clearTimeout.bind(globalThisShim);
    }
}
// base64 encoded buffers are about 33% bigger (https://en.wikipedia.org/wiki/Base64)
const BASE64_OVERHEAD = 1.33;
// we could also have used `new Blob([obj]).size`, but it isn't supported in IE9
function byteLength(obj) {
    if (typeof obj === "string") {
        return utf8Length(obj);
    }
    // arraybuffer or blob
    return Math.ceil((obj.byteLength || obj.size) * BASE64_OVERHEAD);
}
function utf8Length(str) {
    let c = 0, length = 0;
    for (let i = 0, l = str.length; i < l; i++) {
        c = str.charCodeAt(i);
        if (c < 0x80) {
            length += 1;
        }
        else if (c < 0x800) {
            length += 2;
        }
        else if (c < 0xd800 || c >= 0xe000) {
            length += 3;
        }
        else {
            i++;
            length += 4;
        }
    }
    return length;
}
/**
 * Generates a random 8-characters string.
 */
function randomString() {
    return (Date.now().toString(36).substring(3) +
        Math.random().toString(36).substring(2, 5));
}

// imported from https://github.com/galkn/querystring
/**
 * Compiles a querystring
 * Returns string representation of the object
 *
 * @param {Object}
 * @api private
 */
function encode$2(obj) {
    let str = '';
    for (let i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (str.length)
                str += '&';
            str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
        }
    }
    return str;
}
/**
 * Parses a simple querystring into an object
 *
 * @param {String} qs
 * @api private
 */
function decode(qs) {
    let qry = {};
    let pairs = qs.split('&');
    for (let i = 0, l = pairs.length; i < l; i++) {
        let pair = pairs[i].split('=');
        qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
}

class TransportError extends Error {
    constructor(reason, description, context) {
        super(reason);
        this.description = description;
        this.context = context;
        this.type = "TransportError";
    }
}
class Transport extends Emitter {
    /**
     * Transport abstract constructor.
     *
     * @param {Object} opts - options
     * @protected
     */
    constructor(opts) {
        super();
        this.writable = false;
        installTimerFunctions(this, opts);
        this.opts = opts;
        this.query = opts.query;
        this.socket = opts.socket;
        this.supportsBinary = !opts.forceBase64;
    }
    /**
     * Emits an error.
     *
     * @param {String} reason
     * @param description
     * @param context - the error context
     * @return {Transport} for chaining
     * @protected
     */
    onError(reason, description, context) {
        super.emitReserved("error", new TransportError(reason, description, context));
        return this;
    }
    /**
     * Opens the transport.
     */
    open() {
        this.readyState = "opening";
        this.doOpen();
        return this;
    }
    /**
     * Closes the transport.
     */
    close() {
        if (this.readyState === "opening" || this.readyState === "open") {
            this.doClose();
            this.onClose();
        }
        return this;
    }
    /**
     * Sends multiple packets.
     *
     * @param {Array} packets
     */
    send(packets) {
        if (this.readyState === "open") {
            this.write(packets);
        }
    }
    /**
     * Called upon open
     *
     * @protected
     */
    onOpen() {
        this.readyState = "open";
        this.writable = true;
        super.emitReserved("open");
    }
    /**
     * Called with data.
     *
     * @param {String} data
     * @protected
     */
    onData(data) {
        const packet = decodePacket(data, this.socket.binaryType);
        this.onPacket(packet);
    }
    /**
     * Called with a decoded packet.
     *
     * @protected
     */
    onPacket(packet) {
        super.emitReserved("packet", packet);
    }
    /**
     * Called upon close.
     *
     * @protected
     */
    onClose(details) {
        this.readyState = "closed";
        super.emitReserved("close", details);
    }
    /**
     * Pauses the transport, in order not to lose packets during an upgrade.
     *
     * @param onPause
     */
    pause(onPause) { }
    createUri(schema, query = {}) {
        return (schema +
            "://" +
            this._hostname() +
            this._port() +
            this.opts.path +
            this._query(query));
    }
    _hostname() {
        const hostname = this.opts.hostname;
        return hostname.indexOf(":") === -1 ? hostname : "[" + hostname + "]";
    }
    _port() {
        if (this.opts.port &&
            ((this.opts.secure && Number(this.opts.port) !== 443) ||
                (!this.opts.secure && Number(this.opts.port) !== 80))) {
            return ":" + this.opts.port;
        }
        else {
            return "";
        }
    }
    _query(query) {
        const encodedQuery = encode$2(query);
        return encodedQuery.length ? "?" + encodedQuery : "";
    }
}

class Polling extends Transport {
    constructor() {
        super(...arguments);
        this._polling = false;
    }
    get name() {
        return "polling";
    }
    /**
     * Opens the socket (triggers polling). We write a PING message to determine
     * when the transport is open.
     *
     * @protected
     */
    doOpen() {
        this._poll();
    }
    /**
     * Pauses polling.
     *
     * @param {Function} onPause - callback upon buffers are flushed and transport is paused
     * @package
     */
    pause(onPause) {
        this.readyState = "pausing";
        const pause = () => {
            this.readyState = "paused";
            onPause();
        };
        if (this._polling || !this.writable) {
            let total = 0;
            if (this._polling) {
                total++;
                this.once("pollComplete", function () {
                    --total || pause();
                });
            }
            if (!this.writable) {
                total++;
                this.once("drain", function () {
                    --total || pause();
                });
            }
        }
        else {
            pause();
        }
    }
    /**
     * Starts polling cycle.
     *
     * @private
     */
    _poll() {
        this._polling = true;
        this.doPoll();
        this.emitReserved("poll");
    }
    /**
     * Overloads onData to detect payloads.
     *
     * @protected
     */
    onData(data) {
        const callback = (packet) => {
            // if its the first message we consider the transport open
            if ("opening" === this.readyState && packet.type === "open") {
                this.onOpen();
            }
            // if its a close packet, we close the ongoing requests
            if ("close" === packet.type) {
                this.onClose({ description: "transport closed by the server" });
                return false;
            }
            // otherwise bypass onData and handle the message
            this.onPacket(packet);
        };
        // decode payload
        decodePayload(data, this.socket.binaryType).forEach(callback);
        // if an event did not trigger closing
        if ("closed" !== this.readyState) {
            // if we got data we're not polling
            this._polling = false;
            this.emitReserved("pollComplete");
            if ("open" === this.readyState) {
                this._poll();
            }
        }
    }
    /**
     * For polling, send a close packet.
     *
     * @protected
     */
    doClose() {
        const close = () => {
            this.write([{ type: "close" }]);
        };
        if ("open" === this.readyState) {
            close();
        }
        else {
            // in case we're trying to close while
            // handshaking is in progress (GH-164)
            this.once("open", close);
        }
    }
    /**
     * Writes a packets payload.
     *
     * @param {Array} packets - data packets
     * @protected
     */
    write(packets) {
        this.writable = false;
        encodePayload(packets, (data) => {
            this.doWrite(data, () => {
                this.writable = true;
                this.emitReserved("drain");
            });
        });
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
        const schema = this.opts.secure ? "https" : "http";
        const query = this.query || {};
        // cache busting is forced
        if (false !== this.opts.timestampRequests) {
            query[this.opts.timestampParam] = randomString();
        }
        if (!this.supportsBinary && !query.sid) {
            query.b64 = 1;
        }
        return this.createUri(schema, query);
    }
}

// imported from https://github.com/component/has-cors
let value = false;
try {
    value = typeof XMLHttpRequest !== 'undefined' &&
        'withCredentials' in new XMLHttpRequest();
}
catch (err) {
    // if XMLHttp support is disabled in IE then it will throw
    // when trying to create
}
const hasCORS = value;

function empty() { }
class BaseXHR extends Polling {
    /**
     * XHR Polling constructor.
     *
     * @param {Object} opts
     * @package
     */
    constructor(opts) {
        super(opts);
        if (typeof location !== "undefined") {
            const isSSL = "https:" === location.protocol;
            let port = location.port;
            // some user agents have empty `location.port`
            if (!port) {
                port = isSSL ? "443" : "80";
            }
            this.xd =
                (typeof location !== "undefined" &&
                    opts.hostname !== location.hostname) ||
                    port !== opts.port;
        }
    }
    /**
     * Sends data.
     *
     * @param {String} data to send.
     * @param {Function} called upon flush.
     * @private
     */
    doWrite(data, fn) {
        const req = this.request({
            method: "POST",
            data: data,
        });
        req.on("success", fn);
        req.on("error", (xhrStatus, context) => {
            this.onError("xhr post error", xhrStatus, context);
        });
    }
    /**
     * Starts a poll cycle.
     *
     * @private
     */
    doPoll() {
        const req = this.request();
        req.on("data", this.onData.bind(this));
        req.on("error", (xhrStatus, context) => {
            this.onError("xhr poll error", xhrStatus, context);
        });
        this.pollXhr = req;
    }
}
class Request extends Emitter {
    /**
     * Request constructor
     *
     * @param {Object} options
     * @package
     */
    constructor(createRequest, uri, opts) {
        super();
        this.createRequest = createRequest;
        installTimerFunctions(this, opts);
        this._opts = opts;
        this._method = opts.method || "GET";
        this._uri = uri;
        this._data = undefined !== opts.data ? opts.data : null;
        this._create();
    }
    /**
     * Creates the XHR object and sends the request.
     *
     * @private
     */
    _create() {
        var _a;
        const opts = pick(this._opts, "agent", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "autoUnref");
        opts.xdomain = !!this._opts.xd;
        const xhr = (this._xhr = this.createRequest(opts));
        try {
            xhr.open(this._method, this._uri, true);
            try {
                if (this._opts.extraHeaders) {
                    // @ts-ignore
                    xhr.setDisableHeaderCheck && xhr.setDisableHeaderCheck(true);
                    for (let i in this._opts.extraHeaders) {
                        if (this._opts.extraHeaders.hasOwnProperty(i)) {
                            xhr.setRequestHeader(i, this._opts.extraHeaders[i]);
                        }
                    }
                }
            }
            catch (e) { }
            if ("POST" === this._method) {
                try {
                    xhr.setRequestHeader("Content-type", "text/plain;charset=UTF-8");
                }
                catch (e) { }
            }
            try {
                xhr.setRequestHeader("Accept", "*/*");
            }
            catch (e) { }
            (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.addCookies(xhr);
            // ie6 check
            if ("withCredentials" in xhr) {
                xhr.withCredentials = this._opts.withCredentials;
            }
            if (this._opts.requestTimeout) {
                xhr.timeout = this._opts.requestTimeout;
            }
            xhr.onreadystatechange = () => {
                var _a;
                if (xhr.readyState === 3) {
                    (_a = this._opts.cookieJar) === null || _a === void 0 ? void 0 : _a.parseCookies(
                    // @ts-ignore
                    xhr.getResponseHeader("set-cookie"));
                }
                if (4 !== xhr.readyState)
                    return;
                if (200 === xhr.status || 1223 === xhr.status) {
                    this._onLoad();
                }
                else {
                    // make sure the `error` event handler that's user-set
                    // does not throw in the same tick and gets caught here
                    this.setTimeoutFn(() => {
                        this._onError(typeof xhr.status === "number" ? xhr.status : 0);
                    }, 0);
                }
            };
            xhr.send(this._data);
        }
        catch (e) {
            // Need to defer since .create() is called directly from the constructor
            // and thus the 'error' event can only be only bound *after* this exception
            // occurs.  Therefore, also, we cannot throw here at all.
            this.setTimeoutFn(() => {
                this._onError(e);
            }, 0);
            return;
        }
        if (typeof document !== "undefined") {
            this._index = Request.requestsCount++;
            Request.requests[this._index] = this;
        }
    }
    /**
     * Called upon error.
     *
     * @private
     */
    _onError(err) {
        this.emitReserved("error", err, this._xhr);
        this._cleanup(true);
    }
    /**
     * Cleans up house.
     *
     * @private
     */
    _cleanup(fromError) {
        if ("undefined" === typeof this._xhr || null === this._xhr) {
            return;
        }
        this._xhr.onreadystatechange = empty;
        if (fromError) {
            try {
                this._xhr.abort();
            }
            catch (e) { }
        }
        if (typeof document !== "undefined") {
            delete Request.requests[this._index];
        }
        this._xhr = null;
    }
    /**
     * Called upon load.
     *
     * @private
     */
    _onLoad() {
        const data = this._xhr.responseText;
        if (data !== null) {
            this.emitReserved("data", data);
            this.emitReserved("success");
            this._cleanup();
        }
    }
    /**
     * Aborts the request.
     *
     * @package
     */
    abort() {
        this._cleanup();
    }
}
Request.requestsCount = 0;
Request.requests = {};
/**
 * Aborts pending requests when unloading the window. This is needed to prevent
 * memory leaks (e.g. when using IE) and to ensure that no spurious error is
 * emitted.
 */
if (typeof document !== "undefined") {
    // @ts-ignore
    if (typeof attachEvent === "function") {
        // @ts-ignore
        attachEvent("onunload", unloadHandler);
    }
    else if (typeof addEventListener === "function") {
        const terminationEvent = "onpagehide" in globalThisShim ? "pagehide" : "unload";
        addEventListener(terminationEvent, unloadHandler, false);
    }
}
function unloadHandler() {
    for (let i in Request.requests) {
        if (Request.requests.hasOwnProperty(i)) {
            Request.requests[i].abort();
        }
    }
}
const hasXHR2 = (function () {
    const xhr = newRequest({
        xdomain: false,
    });
    return xhr && xhr.responseType !== null;
})();
/**
 * HTTP long-polling based on the built-in `XMLHttpRequest` object.
 *
 * Usage: browser
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
 */
class XHR extends BaseXHR {
    constructor(opts) {
        super(opts);
        const forceBase64 = opts && opts.forceBase64;
        this.supportsBinary = hasXHR2 && !forceBase64;
    }
    request(opts = {}) {
        Object.assign(opts, { xd: this.xd }, this.opts);
        return new Request(newRequest, this.uri(), opts);
    }
}
function newRequest(opts) {
    const xdomain = opts.xdomain;
    // XMLHttpRequest can be disabled on IE
    try {
        if ("undefined" !== typeof XMLHttpRequest && (!xdomain || hasCORS)) {
            return new XMLHttpRequest();
        }
    }
    catch (e) { }
    if (!xdomain) {
        try {
            return new globalThisShim[["Active"].concat("Object").join("X")]("Microsoft.XMLHTTP");
        }
        catch (e) { }
    }
}

// detect ReactNative environment
const isReactNative = typeof navigator !== "undefined" &&
    typeof navigator.product === "string" &&
    navigator.product.toLowerCase() === "reactnative";
class BaseWS extends Transport {
    get name() {
        return "websocket";
    }
    doOpen() {
        const uri = this.uri();
        const protocols = this.opts.protocols;
        // React Native only supports the 'headers' option, and will print a warning if anything else is passed
        const opts = isReactNative
            ? {}
            : pick(this.opts, "agent", "perMessageDeflate", "pfx", "key", "passphrase", "cert", "ca", "ciphers", "rejectUnauthorized", "localAddress", "protocolVersion", "origin", "maxPayload", "family", "checkServerIdentity");
        if (this.opts.extraHeaders) {
            opts.headers = this.opts.extraHeaders;
        }
        try {
            this.ws = this.createSocket(uri, protocols, opts);
        }
        catch (err) {
            return this.emitReserved("error", err);
        }
        this.ws.binaryType = this.socket.binaryType;
        this.addEventListeners();
    }
    /**
     * Adds event listeners to the socket
     *
     * @private
     */
    addEventListeners() {
        this.ws.onopen = () => {
            if (this.opts.autoUnref) {
                this.ws._socket.unref();
            }
            this.onOpen();
        };
        this.ws.onclose = (closeEvent) => this.onClose({
            description: "websocket connection closed",
            context: closeEvent,
        });
        this.ws.onmessage = (ev) => this.onData(ev.data);
        this.ws.onerror = (e) => this.onError("websocket error", e);
    }
    write(packets) {
        this.writable = false;
        // encodePacket efficient as it uses WS framing
        // no need for encodePayload
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            encodePacket(packet, this.supportsBinary, (data) => {
                // Sometimes the websocket has already been closed but the browser didn't
                // have a chance of informing us about it yet, in that case send will
                // throw an error
                try {
                    this.doWrite(packet, data);
                }
                catch (e) {
                }
                if (lastPacket) {
                    // fake drain
                    // defer to next tick to allow Socket to clear writeBuffer
                    nextTick(() => {
                        this.writable = true;
                        this.emitReserved("drain");
                    }, this.setTimeoutFn);
                }
            });
        }
    }
    doClose() {
        if (typeof this.ws !== "undefined") {
            this.ws.onerror = () => { };
            this.ws.close();
            this.ws = null;
        }
    }
    /**
     * Generates uri for connection.
     *
     * @private
     */
    uri() {
        const schema = this.opts.secure ? "wss" : "ws";
        const query = this.query || {};
        // append timestamp to URI
        if (this.opts.timestampRequests) {
            query[this.opts.timestampParam] = randomString();
        }
        // communicate binary support capabilities
        if (!this.supportsBinary) {
            query.b64 = 1;
        }
        return this.createUri(schema, query);
    }
}
const WebSocketCtor = globalThisShim.WebSocket || globalThisShim.MozWebSocket;
/**
 * WebSocket transport based on the built-in `WebSocket` object.
 *
 * Usage: browser, Node.js (since v21), Deno, Bun
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 * @see https://caniuse.com/mdn-api_websocket
 * @see https://nodejs.org/api/globals.html#websocket
 */
class WS extends BaseWS {
    createSocket(uri, protocols, opts) {
        return !isReactNative
            ? protocols
                ? new WebSocketCtor(uri, protocols)
                : new WebSocketCtor(uri)
            : new WebSocketCtor(uri, protocols, opts);
    }
    doWrite(_packet, data) {
        this.ws.send(data);
    }
}

/**
 * WebTransport transport based on the built-in `WebTransport` object.
 *
 * Usage: browser, Node.js (with the `@fails-components/webtransport` package)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/WebTransport
 * @see https://caniuse.com/webtransport
 */
class WT extends Transport {
    get name() {
        return "webtransport";
    }
    doOpen() {
        try {
            // @ts-ignore
            this._transport = new WebTransport(this.createUri("https"), this.opts.transportOptions[this.name]);
        }
        catch (err) {
            return this.emitReserved("error", err);
        }
        this._transport.closed
            .then(() => {
            this.onClose();
        })
            .catch((err) => {
            this.onError("webtransport error", err);
        });
        // note: we could have used async/await, but that would require some additional polyfills
        this._transport.ready.then(() => {
            this._transport.createBidirectionalStream().then((stream) => {
                const decoderStream = createPacketDecoderStream(Number.MAX_SAFE_INTEGER, this.socket.binaryType);
                const reader = stream.readable.pipeThrough(decoderStream).getReader();
                const encoderStream = createPacketEncoderStream();
                encoderStream.readable.pipeTo(stream.writable);
                this._writer = encoderStream.writable.getWriter();
                const read = () => {
                    reader
                        .read()
                        .then(({ done, value }) => {
                        if (done) {
                            return;
                        }
                        this.onPacket(value);
                        read();
                    })
                        .catch((err) => {
                    });
                };
                read();
                const packet = { type: "open" };
                if (this.query.sid) {
                    packet.data = `{"sid":"${this.query.sid}"}`;
                }
                this._writer.write(packet).then(() => this.onOpen());
            });
        });
    }
    write(packets) {
        this.writable = false;
        for (let i = 0; i < packets.length; i++) {
            const packet = packets[i];
            const lastPacket = i === packets.length - 1;
            this._writer.write(packet).then(() => {
                if (lastPacket) {
                    nextTick(() => {
                        this.writable = true;
                        this.emitReserved("drain");
                    }, this.setTimeoutFn);
                }
            });
        }
    }
    doClose() {
        var _a;
        (_a = this._transport) === null || _a === void 0 ? void 0 : _a.close();
    }
}

const transports = {
    websocket: WS,
    webtransport: WT,
    polling: XHR,
};

// imported from https://github.com/galkn/parseuri
/**
 * Parses a URI
 *
 * Note: we could also have used the built-in URL object, but it isn't supported on all platforms.
 *
 * See:
 * - https://developer.mozilla.org/en-US/docs/Web/API/URL
 * - https://caniuse.com/url
 * - https://www.rfc-editor.org/rfc/rfc3986#appendix-B
 *
 * History of the parse() method:
 * - first commit: https://github.com/socketio/socket.io-client/commit/4ee1d5d94b3906a9c052b459f1a818b15f38f91c
 * - export into its own module: https://github.com/socketio/engine.io-client/commit/de2c561e4564efeb78f1bdb1ba39ef81b2822cb3
 * - reimport: https://github.com/socketio/engine.io-client/commit/df32277c3f6d622eec5ed09f493cae3f3391d242
 *
 * @author Steven Levithan <stevenlevithan.com> (MIT license)
 * @api private
 */
const re = /^(?:(?![^:@\/?#]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@\/?#]*)(?::([^:@\/?#]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;
const parts = [
    'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
];
function parse(str) {
    if (str.length > 8000) {
        throw "URI too long";
    }
    const src = str, b = str.indexOf('['), e = str.indexOf(']');
    if (b != -1 && e != -1) {
        str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
    }
    let m = re.exec(str || ''), uri = {}, i = 14;
    while (i--) {
        uri[parts[i]] = m[i] || '';
    }
    if (b != -1 && e != -1) {
        uri.source = src;
        uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
        uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
        uri.ipv6uri = true;
    }
    uri.pathNames = pathNames(uri, uri['path']);
    uri.queryKey = queryKey(uri, uri['query']);
    return uri;
}
function pathNames(obj, path) {
    const regx = /\/{2,9}/g, names = path.replace(regx, "/").split("/");
    if (path.slice(0, 1) == '/' || path.length === 0) {
        names.splice(0, 1);
    }
    if (path.slice(-1) == '/') {
        names.splice(names.length - 1, 1);
    }
    return names;
}
function queryKey(uri, query) {
    const data = {};
    query.replace(/(?:^|&)([^&=]*)=?([^&]*)/g, function ($0, $1, $2) {
        if ($1) {
            data[$1] = $2;
        }
    });
    return data;
}

const withEventListeners = typeof addEventListener === "function" &&
    typeof removeEventListener === "function";
const OFFLINE_EVENT_LISTENERS = [];
if (withEventListeners) {
    // within a ServiceWorker, any event handler for the 'offline' event must be added on the initial evaluation of the
    // script, so we create one single event listener here which will forward the event to the socket instances
    addEventListener("offline", () => {
        OFFLINE_EVENT_LISTENERS.forEach((listener) => listener());
    }, false);
}
/**
 * This class provides a WebSocket-like interface to connect to an Engine.IO server. The connection will be established
 * with one of the available low-level transports, like HTTP long-polling, WebSocket or WebTransport.
 *
 * This class comes without upgrade mechanism, which means that it will keep the first low-level transport that
 * successfully establishes the connection.
 *
 * In order to allow tree-shaking, there are no transports included, that's why the `transports` option is mandatory.
 *
 * @example
 * import { SocketWithoutUpgrade, WebSocket } from "engine.io-client";
 *
 * const socket = new SocketWithoutUpgrade({
 *   transports: [WebSocket]
 * });
 *
 * socket.on("open", () => {
 *   socket.send("hello");
 * });
 *
 * @see SocketWithUpgrade
 * @see Socket
 */
class SocketWithoutUpgrade extends Emitter {
    /**
     * Socket constructor.
     *
     * @param {String|Object} uri - uri or options
     * @param {Object} opts - options
     */
    constructor(uri, opts) {
        super();
        this.binaryType = defaultBinaryType;
        this.writeBuffer = [];
        this._prevBufferLen = 0;
        this._pingInterval = -1;
        this._pingTimeout = -1;
        this._maxPayload = -1;
        /**
         * The expiration timestamp of the {@link _pingTimeoutTimer} object is tracked, in case the timer is throttled and the
         * callback is not fired on time. This can happen for example when a laptop is suspended or when a phone is locked.
         */
        this._pingTimeoutTime = Infinity;
        if (uri && "object" === typeof uri) {
            opts = uri;
            uri = null;
        }
        if (uri) {
            const parsedUri = parse(uri);
            opts.hostname = parsedUri.host;
            opts.secure =
                parsedUri.protocol === "https" || parsedUri.protocol === "wss";
            opts.port = parsedUri.port;
            if (parsedUri.query)
                opts.query = parsedUri.query;
        }
        else if (opts.host) {
            opts.hostname = parse(opts.host).host;
        }
        installTimerFunctions(this, opts);
        this.secure =
            null != opts.secure
                ? opts.secure
                : typeof location !== "undefined" && "https:" === location.protocol;
        if (opts.hostname && !opts.port) {
            // if no port is specified manually, use the protocol default
            opts.port = this.secure ? "443" : "80";
        }
        this.hostname =
            opts.hostname ||
                (typeof location !== "undefined" ? location.hostname : "localhost");
        this.port =
            opts.port ||
                (typeof location !== "undefined" && location.port
                    ? location.port
                    : this.secure
                        ? "443"
                        : "80");
        this.transports = [];
        this._transportsByName = {};
        opts.transports.forEach((t) => {
            const transportName = t.prototype.name;
            this.transports.push(transportName);
            this._transportsByName[transportName] = t;
        });
        this.opts = Object.assign({
            path: "/engine.io",
            agent: false,
            withCredentials: false,
            upgrade: true,
            timestampParam: "t",
            rememberUpgrade: false,
            addTrailingSlash: true,
            rejectUnauthorized: true,
            perMessageDeflate: {
                threshold: 1024,
            },
            transportOptions: {},
            closeOnBeforeunload: false,
        }, opts);
        this.opts.path =
            this.opts.path.replace(/\/$/, "") +
                (this.opts.addTrailingSlash ? "/" : "");
        if (typeof this.opts.query === "string") {
            this.opts.query = decode(this.opts.query);
        }
        if (withEventListeners) {
            if (this.opts.closeOnBeforeunload) {
                // Firefox closes the connection when the "beforeunload" event is emitted but not Chrome. This event listener
                // ensures every browser behaves the same (no "disconnect" event at the Socket.IO level when the page is
                // closed/reloaded)
                this._beforeunloadEventListener = () => {
                    if (this.transport) {
                        // silently close the transport
                        this.transport.removeAllListeners();
                        this.transport.close();
                    }
                };
                addEventListener("beforeunload", this._beforeunloadEventListener, false);
            }
            if (this.hostname !== "localhost") {
                this._offlineEventListener = () => {
                    this._onClose("transport close", {
                        description: "network connection lost",
                    });
                };
                OFFLINE_EVENT_LISTENERS.push(this._offlineEventListener);
            }
        }
        if (this.opts.withCredentials) {
            this._cookieJar = createCookieJar();
        }
        this._open();
    }
    /**
     * Creates transport of the given type.
     *
     * @param {String} name - transport name
     * @return {Transport}
     * @private
     */
    createTransport(name) {
        const query = Object.assign({}, this.opts.query);
        // append engine.io protocol identifier
        query.EIO = protocol;
        // transport name
        query.transport = name;
        // session id if we already have one
        if (this.id)
            query.sid = this.id;
        const opts = Object.assign({}, this.opts, {
            query,
            socket: this,
            hostname: this.hostname,
            secure: this.secure,
            port: this.port,
        }, this.opts.transportOptions[name]);
        return new this._transportsByName[name](opts);
    }
    /**
     * Initializes transport to use and starts probe.
     *
     * @private
     */
    _open() {
        if (this.transports.length === 0) {
            // Emit error on next tick so it can be listened to
            this.setTimeoutFn(() => {
                this.emitReserved("error", "No transports available");
            }, 0);
            return;
        }
        const transportName = this.opts.rememberUpgrade &&
            SocketWithoutUpgrade.priorWebsocketSuccess &&
            this.transports.indexOf("websocket") !== -1
            ? "websocket"
            : this.transports[0];
        this.readyState = "opening";
        const transport = this.createTransport(transportName);
        transport.open();
        this.setTransport(transport);
    }
    /**
     * Sets the current transport. Disables the existing one (if any).
     *
     * @private
     */
    setTransport(transport) {
        if (this.transport) {
            this.transport.removeAllListeners();
        }
        // set up transport
        this.transport = transport;
        // set up transport listeners
        transport
            .on("drain", this._onDrain.bind(this))
            .on("packet", this._onPacket.bind(this))
            .on("error", this._onError.bind(this))
            .on("close", (reason) => this._onClose("transport close", reason));
    }
    /**
     * Called when connection is deemed open.
     *
     * @private
     */
    onOpen() {
        this.readyState = "open";
        SocketWithoutUpgrade.priorWebsocketSuccess =
            "websocket" === this.transport.name;
        this.emitReserved("open");
        this.flush();
    }
    /**
     * Handles a packet.
     *
     * @private
     */
    _onPacket(packet) {
        if ("opening" === this.readyState ||
            "open" === this.readyState ||
            "closing" === this.readyState) {
            this.emitReserved("packet", packet);
            // Socket is live - any packet counts
            this.emitReserved("heartbeat");
            switch (packet.type) {
                case "open":
                    this.onHandshake(JSON.parse(packet.data));
                    break;
                case "ping":
                    this._sendPacket("pong");
                    this.emitReserved("ping");
                    this.emitReserved("pong");
                    this._resetPingTimeout();
                    break;
                case "error":
                    const err = new Error("server error");
                    // @ts-ignore
                    err.code = packet.data;
                    this._onError(err);
                    break;
                case "message":
                    this.emitReserved("data", packet.data);
                    this.emitReserved("message", packet.data);
                    break;
            }
        }
    }
    /**
     * Called upon handshake completion.
     *
     * @param {Object} data - handshake obj
     * @private
     */
    onHandshake(data) {
        this.emitReserved("handshake", data);
        this.id = data.sid;
        this.transport.query.sid = data.sid;
        this._pingInterval = data.pingInterval;
        this._pingTimeout = data.pingTimeout;
        this._maxPayload = data.maxPayload;
        this.onOpen();
        // In case open handler closes socket
        if ("closed" === this.readyState)
            return;
        this._resetPingTimeout();
    }
    /**
     * Sets and resets ping timeout timer based on server pings.
     *
     * @private
     */
    _resetPingTimeout() {
        this.clearTimeoutFn(this._pingTimeoutTimer);
        const delay = this._pingInterval + this._pingTimeout;
        this._pingTimeoutTime = Date.now() + delay;
        this._pingTimeoutTimer = this.setTimeoutFn(() => {
            this._onClose("ping timeout");
        }, delay);
        if (this.opts.autoUnref) {
            this._pingTimeoutTimer.unref();
        }
    }
    /**
     * Called on `drain` event
     *
     * @private
     */
    _onDrain() {
        this.writeBuffer.splice(0, this._prevBufferLen);
        // setting prevBufferLen = 0 is very important
        // for example, when upgrading, upgrade packet is sent over,
        // and a nonzero prevBufferLen could cause problems on `drain`
        this._prevBufferLen = 0;
        if (0 === this.writeBuffer.length) {
            this.emitReserved("drain");
        }
        else {
            this.flush();
        }
    }
    /**
     * Flush write buffers.
     *
     * @private
     */
    flush() {
        if ("closed" !== this.readyState &&
            this.transport.writable &&
            !this.upgrading &&
            this.writeBuffer.length) {
            const packets = this._getWritablePackets();
            this.transport.send(packets);
            // keep track of current length of writeBuffer
            // splice writeBuffer and callbackBuffer on `drain`
            this._prevBufferLen = packets.length;
            this.emitReserved("flush");
        }
    }
    /**
     * Ensure the encoded size of the writeBuffer is below the maxPayload value sent by the server (only for HTTP
     * long-polling)
     *
     * @private
     */
    _getWritablePackets() {
        const shouldCheckPayloadSize = this._maxPayload &&
            this.transport.name === "polling" &&
            this.writeBuffer.length > 1;
        if (!shouldCheckPayloadSize) {
            return this.writeBuffer;
        }
        let payloadSize = 1; // first packet type
        for (let i = 0; i < this.writeBuffer.length; i++) {
            const data = this.writeBuffer[i].data;
            if (data) {
                payloadSize += byteLength(data);
            }
            if (i > 0 && payloadSize > this._maxPayload) {
                return this.writeBuffer.slice(0, i);
            }
            payloadSize += 2; // separator + packet type
        }
        return this.writeBuffer;
    }
    /**
     * Checks whether the heartbeat timer has expired but the socket has not yet been notified.
     *
     * Note: this method is private for now because it does not really fit the WebSocket API, but if we put it in the
     * `write()` method then the message would not be buffered by the Socket.IO client.
     *
     * @return {boolean}
     * @private
     */
    /* private */ _hasPingExpired() {
        if (!this._pingTimeoutTime)
            return true;
        const hasExpired = Date.now() > this._pingTimeoutTime;
        if (hasExpired) {
            this._pingTimeoutTime = 0;
            nextTick(() => {
                this._onClose("ping timeout");
            }, this.setTimeoutFn);
        }
        return hasExpired;
    }
    /**
     * Sends a message.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    write(msg, options, fn) {
        this._sendPacket("message", msg, options, fn);
        return this;
    }
    /**
     * Sends a message. Alias of {@link Socket#write}.
     *
     * @param {String} msg - message.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @return {Socket} for chaining.
     */
    send(msg, options, fn) {
        this._sendPacket("message", msg, options, fn);
        return this;
    }
    /**
     * Sends a packet.
     *
     * @param {String} type: packet type.
     * @param {String} data.
     * @param {Object} options.
     * @param {Function} fn - callback function.
     * @private
     */
    _sendPacket(type, data, options, fn) {
        if ("function" === typeof data) {
            fn = data;
            data = undefined;
        }
        if ("function" === typeof options) {
            fn = options;
            options = null;
        }
        if ("closing" === this.readyState || "closed" === this.readyState) {
            return;
        }
        options = options || {};
        options.compress = false !== options.compress;
        const packet = {
            type: type,
            data: data,
            options: options,
        };
        this.emitReserved("packetCreate", packet);
        this.writeBuffer.push(packet);
        if (fn)
            this.once("flush", fn);
        this.flush();
    }
    /**
     * Closes the connection.
     */
    close() {
        const close = () => {
            this._onClose("forced close");
            this.transport.close();
        };
        const cleanupAndClose = () => {
            this.off("upgrade", cleanupAndClose);
            this.off("upgradeError", cleanupAndClose);
            close();
        };
        const waitForUpgrade = () => {
            // wait for upgrade to finish since we can't send packets while pausing a transport
            this.once("upgrade", cleanupAndClose);
            this.once("upgradeError", cleanupAndClose);
        };
        if ("opening" === this.readyState || "open" === this.readyState) {
            this.readyState = "closing";
            if (this.writeBuffer.length) {
                this.once("drain", () => {
                    if (this.upgrading) {
                        waitForUpgrade();
                    }
                    else {
                        close();
                    }
                });
            }
            else if (this.upgrading) {
                waitForUpgrade();
            }
            else {
                close();
            }
        }
        return this;
    }
    /**
     * Called upon transport error
     *
     * @private
     */
    _onError(err) {
        SocketWithoutUpgrade.priorWebsocketSuccess = false;
        if (this.opts.tryAllTransports &&
            this.transports.length > 1 &&
            this.readyState === "opening") {
            this.transports.shift();
            return this._open();
        }
        this.emitReserved("error", err);
        this._onClose("transport error", err);
    }
    /**
     * Called upon transport close.
     *
     * @private
     */
    _onClose(reason, description) {
        if ("opening" === this.readyState ||
            "open" === this.readyState ||
            "closing" === this.readyState) {
            // clear timers
            this.clearTimeoutFn(this._pingTimeoutTimer);
            // stop event from firing again for transport
            this.transport.removeAllListeners("close");
            // ensure transport won't stay open
            this.transport.close();
            // ignore further transport communication
            this.transport.removeAllListeners();
            if (withEventListeners) {
                if (this._beforeunloadEventListener) {
                    removeEventListener("beforeunload", this._beforeunloadEventListener, false);
                }
                if (this._offlineEventListener) {
                    const i = OFFLINE_EVENT_LISTENERS.indexOf(this._offlineEventListener);
                    if (i !== -1) {
                        OFFLINE_EVENT_LISTENERS.splice(i, 1);
                    }
                }
            }
            // set ready state
            this.readyState = "closed";
            // clear session id
            this.id = null;
            // emit close event
            this.emitReserved("close", reason, description);
            // clean buffers after, so users can still
            // grab the buffers on `close` event
            this.writeBuffer = [];
            this._prevBufferLen = 0;
        }
    }
}
SocketWithoutUpgrade.protocol = protocol;
/**
 * This class provides a WebSocket-like interface to connect to an Engine.IO server. The connection will be established
 * with one of the available low-level transports, like HTTP long-polling, WebSocket or WebTransport.
 *
 * This class comes with an upgrade mechanism, which means that once the connection is established with the first
 * low-level transport, it will try to upgrade to a better transport.
 *
 * In order to allow tree-shaking, there are no transports included, that's why the `transports` option is mandatory.
 *
 * @example
 * import { SocketWithUpgrade, WebSocket } from "engine.io-client";
 *
 * const socket = new SocketWithUpgrade({
 *   transports: [WebSocket]
 * });
 *
 * socket.on("open", () => {
 *   socket.send("hello");
 * });
 *
 * @see SocketWithoutUpgrade
 * @see Socket
 */
class SocketWithUpgrade extends SocketWithoutUpgrade {
    constructor() {
        super(...arguments);
        this._upgrades = [];
    }
    onOpen() {
        super.onOpen();
        if ("open" === this.readyState && this.opts.upgrade) {
            for (let i = 0; i < this._upgrades.length; i++) {
                this._probe(this._upgrades[i]);
            }
        }
    }
    /**
     * Probes a transport.
     *
     * @param {String} name - transport name
     * @private
     */
    _probe(name) {
        let transport = this.createTransport(name);
        let failed = false;
        SocketWithoutUpgrade.priorWebsocketSuccess = false;
        const onTransportOpen = () => {
            if (failed)
                return;
            transport.send([{ type: "ping", data: "probe" }]);
            transport.once("packet", (msg) => {
                if (failed)
                    return;
                if ("pong" === msg.type && "probe" === msg.data) {
                    this.upgrading = true;
                    this.emitReserved("upgrading", transport);
                    if (!transport)
                        return;
                    SocketWithoutUpgrade.priorWebsocketSuccess =
                        "websocket" === transport.name;
                    this.transport.pause(() => {
                        if (failed)
                            return;
                        if ("closed" === this.readyState)
                            return;
                        cleanup();
                        this.setTransport(transport);
                        transport.send([{ type: "upgrade" }]);
                        this.emitReserved("upgrade", transport);
                        transport = null;
                        this.upgrading = false;
                        this.flush();
                    });
                }
                else {
                    const err = new Error("probe error");
                    // @ts-ignore
                    err.transport = transport.name;
                    this.emitReserved("upgradeError", err);
                }
            });
        };
        function freezeTransport() {
            if (failed)
                return;
            // Any callback called by transport should be ignored since now
            failed = true;
            cleanup();
            transport.close();
            transport = null;
        }
        // Handle any error that happens while probing
        const onerror = (err) => {
            const error = new Error("probe error: " + err);
            // @ts-ignore
            error.transport = transport.name;
            freezeTransport();
            this.emitReserved("upgradeError", error);
        };
        function onTransportClose() {
            onerror("transport closed");
        }
        // When the socket is closed while we're probing
        function onclose() {
            onerror("socket closed");
        }
        // When the socket is upgraded while we're probing
        function onupgrade(to) {
            if (transport && to.name !== transport.name) {
                freezeTransport();
            }
        }
        // Remove all listeners on the transport and on self
        const cleanup = () => {
            transport.removeListener("open", onTransportOpen);
            transport.removeListener("error", onerror);
            transport.removeListener("close", onTransportClose);
            this.off("close", onclose);
            this.off("upgrading", onupgrade);
        };
        transport.once("open", onTransportOpen);
        transport.once("error", onerror);
        transport.once("close", onTransportClose);
        this.once("close", onclose);
        this.once("upgrading", onupgrade);
        if (this._upgrades.indexOf("webtransport") !== -1 &&
            name !== "webtransport") {
            // favor WebTransport
            this.setTimeoutFn(() => {
                if (!failed) {
                    transport.open();
                }
            }, 200);
        }
        else {
            transport.open();
        }
    }
    onHandshake(data) {
        this._upgrades = this._filterUpgrades(data.upgrades);
        super.onHandshake(data);
    }
    /**
     * Filters upgrades, returning only those matching client transports.
     *
     * @param {Array} upgrades - server upgrades
     * @private
     */
    _filterUpgrades(upgrades) {
        const filteredUpgrades = [];
        for (let i = 0; i < upgrades.length; i++) {
            if (~this.transports.indexOf(upgrades[i]))
                filteredUpgrades.push(upgrades[i]);
        }
        return filteredUpgrades;
    }
}
/**
 * This class provides a WebSocket-like interface to connect to an Engine.IO server. The connection will be established
 * with one of the available low-level transports, like HTTP long-polling, WebSocket or WebTransport.
 *
 * This class comes with an upgrade mechanism, which means that once the connection is established with the first
 * low-level transport, it will try to upgrade to a better transport.
 *
 * @example
 * import { Socket } from "engine.io-client";
 *
 * const socket = new Socket();
 *
 * socket.on("open", () => {
 *   socket.send("hello");
 * });
 *
 * @see SocketWithoutUpgrade
 * @see SocketWithUpgrade
 */
let Socket$1 = class Socket extends SocketWithUpgrade {
    constructor(uri, opts = {}) {
        const o = typeof uri === "object" ? uri : opts;
        if (!o.transports ||
            (o.transports && typeof o.transports[0] === "string")) {
            o.transports = (o.transports || ["polling", "websocket", "webtransport"])
                .map((transportName) => transports[transportName])
                .filter((t) => !!t);
        }
        super(uri, o);
    }
};

/**
 * URL parser.
 *
 * @param uri - url
 * @param path - the request path of the connection
 * @param loc - An object meant to mimic window.location.
 *        Defaults to window.location.
 * @public
 */
function url(uri, path = "", loc) {
    let obj = uri;
    // default to window.location
    loc = loc || (typeof location !== "undefined" && location);
    if (null == uri)
        uri = loc.protocol + "//" + loc.host;
    // relative path support
    if (typeof uri === "string") {
        if ("/" === uri.charAt(0)) {
            if ("/" === uri.charAt(1)) {
                uri = loc.protocol + uri;
            }
            else {
                uri = loc.host + uri;
            }
        }
        if (!/^(https?|wss?):\/\//.test(uri)) {
            if ("undefined" !== typeof loc) {
                uri = loc.protocol + "//" + uri;
            }
            else {
                uri = "https://" + uri;
            }
        }
        // parse
        obj = parse(uri);
    }
    // make sure we treat `localhost:80` and `localhost` equally
    if (!obj.port) {
        if (/^(http|ws)$/.test(obj.protocol)) {
            obj.port = "80";
        }
        else if (/^(http|ws)s$/.test(obj.protocol)) {
            obj.port = "443";
        }
    }
    obj.path = obj.path || "/";
    const ipv6 = obj.host.indexOf(":") !== -1;
    const host = ipv6 ? "[" + obj.host + "]" : obj.host;
    // define unique id
    obj.id = obj.protocol + "://" + host + ":" + obj.port + path;
    // define href
    obj.href =
        obj.protocol +
            "://" +
            host +
            (loc && loc.port === obj.port ? "" : ":" + obj.port);
    return obj;
}

const withNativeArrayBuffer = typeof ArrayBuffer === "function";
const isView = (obj) => {
    return typeof ArrayBuffer.isView === "function"
        ? ArrayBuffer.isView(obj)
        : obj.buffer instanceof ArrayBuffer;
};
const toString$1 = Object.prototype.toString;
const withNativeBlob = typeof Blob === "function" ||
    (typeof Blob !== "undefined" &&
        toString$1.call(Blob) === "[object BlobConstructor]");
const withNativeFile = typeof File === "function" ||
    (typeof File !== "undefined" &&
        toString$1.call(File) === "[object FileConstructor]");
/**
 * Returns true if obj is a Buffer, an ArrayBuffer, a Blob or a File.
 *
 * @private
 */
function isBinary(obj) {
    return ((withNativeArrayBuffer && (obj instanceof ArrayBuffer || isView(obj))) ||
        (withNativeBlob && obj instanceof Blob) ||
        (withNativeFile && obj instanceof File));
}
function hasBinary(obj, toJSON) {
    if (!obj || typeof obj !== "object") {
        return false;
    }
    if (Array.isArray(obj)) {
        for (let i = 0, l = obj.length; i < l; i++) {
            if (hasBinary(obj[i])) {
                return true;
            }
        }
        return false;
    }
    if (isBinary(obj)) {
        return true;
    }
    if (obj.toJSON &&
        typeof obj.toJSON === "function" &&
        arguments.length === 1) {
        return hasBinary(obj.toJSON(), true);
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && hasBinary(obj[key])) {
            return true;
        }
    }
    return false;
}

/**
 * Replaces every Buffer | ArrayBuffer | Blob | File in packet with a numbered placeholder.
 *
 * @param {Object} packet - socket.io event packet
 * @return {Object} with deconstructed packet and list of buffers
 * @public
 */
function deconstructPacket(packet) {
    const buffers = [];
    const packetData = packet.data;
    const pack = packet;
    pack.data = _deconstructPacket(packetData, buffers);
    pack.attachments = buffers.length; // number of binary 'attachments'
    return { packet: pack, buffers: buffers };
}
function _deconstructPacket(data, buffers) {
    if (!data)
        return data;
    if (isBinary(data)) {
        const placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
    }
    else if (Array.isArray(data)) {
        const newData = new Array(data.length);
        for (let i = 0; i < data.length; i++) {
            newData[i] = _deconstructPacket(data[i], buffers);
        }
        return newData;
    }
    else if (typeof data === "object" && !(data instanceof Date)) {
        const newData = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                newData[key] = _deconstructPacket(data[key], buffers);
            }
        }
        return newData;
    }
    return data;
}
/**
 * Reconstructs a binary packet from its placeholder packet and buffers
 *
 * @param {Object} packet - event packet with placeholders
 * @param {Array} buffers - binary buffers to put in placeholder positions
 * @return {Object} reconstructed packet
 * @public
 */
function reconstructPacket(packet, buffers) {
    packet.data = _reconstructPacket(packet.data, buffers);
    delete packet.attachments; // no longer useful
    return packet;
}
function _reconstructPacket(data, buffers) {
    if (!data)
        return data;
    if (data && data._placeholder === true) {
        const isIndexValid = typeof data.num === "number" &&
            data.num >= 0 &&
            data.num < buffers.length;
        if (isIndexValid) {
            return buffers[data.num]; // appropriate buffer (should be natural order anyway)
        }
        else {
            throw new Error("illegal attachments");
        }
    }
    else if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
            data[i] = _reconstructPacket(data[i], buffers);
        }
    }
    else if (typeof data === "object") {
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                data[key] = _reconstructPacket(data[key], buffers);
            }
        }
    }
    return data;
}

/**
 * These strings must not be used as event names, as they have a special meaning.
 */
const RESERVED_EVENTS$1 = [
    "connect", // used on the client side
    "connect_error", // used on the client side
    "disconnect", // used on both sides
    "disconnecting", // used on the server side
    "newListener", // used by the Node.js EventEmitter
    "removeListener", // used by the Node.js EventEmitter
];
var PacketType;
(function (PacketType) {
    PacketType[PacketType["CONNECT"] = 0] = "CONNECT";
    PacketType[PacketType["DISCONNECT"] = 1] = "DISCONNECT";
    PacketType[PacketType["EVENT"] = 2] = "EVENT";
    PacketType[PacketType["ACK"] = 3] = "ACK";
    PacketType[PacketType["CONNECT_ERROR"] = 4] = "CONNECT_ERROR";
    PacketType[PacketType["BINARY_EVENT"] = 5] = "BINARY_EVENT";
    PacketType[PacketType["BINARY_ACK"] = 6] = "BINARY_ACK";
})(PacketType || (PacketType = {}));
/**
 * A socket.io Encoder instance
 */
class Encoder {
    /**
     * Encoder constructor
     *
     * @param {function} replacer - custom replacer to pass down to JSON.parse
     */
    constructor(replacer) {
        this.replacer = replacer;
    }
    /**
     * Encode a packet as a single string if non-binary, or as a
     * buffer sequence, depending on packet type.
     *
     * @param {Object} obj - packet object
     */
    encode(obj) {
        if (obj.type === PacketType.EVENT || obj.type === PacketType.ACK) {
            if (hasBinary(obj)) {
                return this.encodeAsBinary({
                    type: obj.type === PacketType.EVENT
                        ? PacketType.BINARY_EVENT
                        : PacketType.BINARY_ACK,
                    nsp: obj.nsp,
                    data: obj.data,
                    id: obj.id,
                });
            }
        }
        return [this.encodeAsString(obj)];
    }
    /**
     * Encode packet as string.
     */
    encodeAsString(obj) {
        // first is type
        let str = "" + obj.type;
        // attachments if we have them
        if (obj.type === PacketType.BINARY_EVENT ||
            obj.type === PacketType.BINARY_ACK) {
            str += obj.attachments + "-";
        }
        // if we have a namespace other than `/`
        // we append it followed by a comma `,`
        if (obj.nsp && "/" !== obj.nsp) {
            str += obj.nsp + ",";
        }
        // immediately followed by the id
        if (null != obj.id) {
            str += obj.id;
        }
        // json data
        if (null != obj.data) {
            str += JSON.stringify(obj.data, this.replacer);
        }
        return str;
    }
    /**
     * Encode packet as 'buffer sequence' by removing blobs, and
     * deconstructing packet into object with placeholders and
     * a list of buffers.
     */
    encodeAsBinary(obj) {
        const deconstruction = deconstructPacket(obj);
        const pack = this.encodeAsString(deconstruction.packet);
        const buffers = deconstruction.buffers;
        buffers.unshift(pack); // add packet info to beginning of data list
        return buffers; // write all the buffers
    }
}
/**
 * A socket.io Decoder instance
 *
 * @return {Object} decoder
 */
class Decoder extends Emitter {
    /**
     * Decoder constructor
     *
     * @param {function} reviver - custom reviver to pass down to JSON.stringify
     */
    constructor(reviver) {
        super();
        this.reviver = reviver;
    }
    /**
     * Decodes an encoded packet string into packet JSON.
     *
     * @param {String} obj - encoded packet
     */
    add(obj) {
        let packet;
        if (typeof obj === "string") {
            if (this.reconstructor) {
                throw new Error("got plaintext data when reconstructing a packet");
            }
            packet = this.decodeString(obj);
            const isBinaryEvent = packet.type === PacketType.BINARY_EVENT;
            if (isBinaryEvent || packet.type === PacketType.BINARY_ACK) {
                packet.type = isBinaryEvent ? PacketType.EVENT : PacketType.ACK;
                // binary packet's json
                this.reconstructor = new BinaryReconstructor(packet);
                // no attachments, labeled binary but no binary data to follow
                if (packet.attachments === 0) {
                    super.emitReserved("decoded", packet);
                }
            }
            else {
                // non-binary full packet
                super.emitReserved("decoded", packet);
            }
        }
        else if (isBinary(obj) || obj.base64) {
            // raw binary data
            if (!this.reconstructor) {
                throw new Error("got binary data when not reconstructing a packet");
            }
            else {
                packet = this.reconstructor.takeBinaryData(obj);
                if (packet) {
                    // received final buffer
                    this.reconstructor = null;
                    super.emitReserved("decoded", packet);
                }
            }
        }
        else {
            throw new Error("Unknown type: " + obj);
        }
    }
    /**
     * Decode a packet String (JSON data)
     *
     * @param {String} str
     * @return {Object} packet
     */
    decodeString(str) {
        let i = 0;
        // look up type
        const p = {
            type: Number(str.charAt(0)),
        };
        if (PacketType[p.type] === undefined) {
            throw new Error("unknown packet type " + p.type);
        }
        // look up attachments if type binary
        if (p.type === PacketType.BINARY_EVENT ||
            p.type === PacketType.BINARY_ACK) {
            const start = i + 1;
            while (str.charAt(++i) !== "-" && i != str.length) { }
            const buf = str.substring(start, i);
            if (buf != Number(buf) || str.charAt(i) !== "-") {
                throw new Error("Illegal attachments");
            }
            p.attachments = Number(buf);
        }
        // look up namespace (if any)
        if ("/" === str.charAt(i + 1)) {
            const start = i + 1;
            while (++i) {
                const c = str.charAt(i);
                if ("," === c)
                    break;
                if (i === str.length)
                    break;
            }
            p.nsp = str.substring(start, i);
        }
        else {
            p.nsp = "/";
        }
        // look up id
        const next = str.charAt(i + 1);
        if ("" !== next && Number(next) == next) {
            const start = i + 1;
            while (++i) {
                const c = str.charAt(i);
                if (null == c || Number(c) != c) {
                    --i;
                    break;
                }
                if (i === str.length)
                    break;
            }
            p.id = Number(str.substring(start, i + 1));
        }
        // look up json data
        if (str.charAt(++i)) {
            const payload = this.tryParse(str.substr(i));
            if (Decoder.isPayloadValid(p.type, payload)) {
                p.data = payload;
            }
            else {
                throw new Error("invalid payload");
            }
        }
        return p;
    }
    tryParse(str) {
        try {
            return JSON.parse(str, this.reviver);
        }
        catch (e) {
            return false;
        }
    }
    static isPayloadValid(type, payload) {
        switch (type) {
            case PacketType.CONNECT:
                return isObject$1(payload);
            case PacketType.DISCONNECT:
                return payload === undefined;
            case PacketType.CONNECT_ERROR:
                return typeof payload === "string" || isObject$1(payload);
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT:
                return (Array.isArray(payload) &&
                    (typeof payload[0] === "number" ||
                        (typeof payload[0] === "string" &&
                            RESERVED_EVENTS$1.indexOf(payload[0]) === -1)));
            case PacketType.ACK:
            case PacketType.BINARY_ACK:
                return Array.isArray(payload);
        }
    }
    /**
     * Deallocates a parser's resources
     */
    destroy() {
        if (this.reconstructor) {
            this.reconstructor.finishedReconstruction();
            this.reconstructor = null;
        }
    }
}
/**
 * A manager of a binary event's 'buffer sequence'. Should
 * be constructed whenever a packet of type BINARY_EVENT is
 * decoded.
 *
 * @param {Object} packet
 * @return {BinaryReconstructor} initialized reconstructor
 */
class BinaryReconstructor {
    constructor(packet) {
        this.packet = packet;
        this.buffers = [];
        this.reconPack = packet;
    }
    /**
     * Method to be called when binary data received from connection
     * after a BINARY_EVENT packet.
     *
     * @param {Buffer | ArrayBuffer} binData - the raw binary data received
     * @return {null | Object} returns null if more binary data is expected or
     *   a reconstructed packet object if all buffers have been received.
     */
    takeBinaryData(binData) {
        this.buffers.push(binData);
        if (this.buffers.length === this.reconPack.attachments) {
            // done with buffer list
            const packet = reconstructPacket(this.reconPack, this.buffers);
            this.finishedReconstruction();
            return packet;
        }
        return null;
    }
    /**
     * Cleans up binary packet reconstruction variables.
     */
    finishedReconstruction() {
        this.reconPack = null;
        this.buffers = [];
    }
}
// see https://stackoverflow.com/questions/8511281/check-if-a-value-is-an-object-in-javascript
function isObject$1(value) {
    return Object.prototype.toString.call(value) === "[object Object]";
}

var parser = /*#__PURE__*/Object.freeze({
    __proto__: null,
    Decoder: Decoder,
    Encoder: Encoder,
    get PacketType () { return PacketType; }
});

function on(obj, ev, fn) {
    obj.on(ev, fn);
    return function subDestroy() {
        obj.off(ev, fn);
    };
}

/**
 * Internal events.
 * These events can't be emitted by the user.
 */
const RESERVED_EVENTS = Object.freeze({
    connect: 1,
    connect_error: 1,
    disconnect: 1,
    disconnecting: 1,
    // EventEmitter reserved events: https://nodejs.org/api/events.html#events_event_newlistener
    newListener: 1,
    removeListener: 1,
});
/**
 * A Socket is the fundamental class for interacting with the server.
 *
 * A Socket belongs to a certain Namespace (by default /) and uses an underlying {@link Manager} to communicate.
 *
 * @example
 * const socket = io();
 *
 * socket.on("connect", () => {
 *   console.log("connected");
 * });
 *
 * // send an event to the server
 * socket.emit("foo", "bar");
 *
 * socket.on("foobar", () => {
 *   // an event was received from the server
 * });
 *
 * // upon disconnection
 * socket.on("disconnect", (reason) => {
 *   console.log(`disconnected due to ${reason}`);
 * });
 */
class Socket extends Emitter {
    /**
     * `Socket` constructor.
     */
    constructor(io, nsp, opts) {
        super();
        /**
         * Whether the socket is currently connected to the server.
         *
         * @example
         * const socket = io();
         *
         * socket.on("connect", () => {
         *   console.log(socket.connected); // true
         * });
         *
         * socket.on("disconnect", () => {
         *   console.log(socket.connected); // false
         * });
         */
        this.connected = false;
        /**
         * Whether the connection state was recovered after a temporary disconnection. In that case, any missed packets will
         * be transmitted by the server.
         */
        this.recovered = false;
        /**
         * Buffer for packets received before the CONNECT packet
         */
        this.receiveBuffer = [];
        /**
         * Buffer for packets that will be sent once the socket is connected
         */
        this.sendBuffer = [];
        /**
         * The queue of packets to be sent with retry in case of failure.
         *
         * Packets are sent one by one, each waiting for the server acknowledgement, in order to guarantee the delivery order.
         * @private
         */
        this._queue = [];
        /**
         * A sequence to generate the ID of the {@link QueuedPacket}.
         * @private
         */
        this._queueSeq = 0;
        this.ids = 0;
        /**
         * A map containing acknowledgement handlers.
         *
         * The `withError` attribute is used to differentiate handlers that accept an error as first argument:
         *
         * - `socket.emit("test", (err, value) => { ... })` with `ackTimeout` option
         * - `socket.timeout(5000).emit("test", (err, value) => { ... })`
         * - `const value = await socket.emitWithAck("test")`
         *
         * From those that don't:
         *
         * - `socket.emit("test", (value) => { ... });`
         *
         * In the first case, the handlers will be called with an error when:
         *
         * - the timeout is reached
         * - the socket gets disconnected
         *
         * In the second case, the handlers will be simply discarded upon disconnection, since the client will never receive
         * an acknowledgement from the server.
         *
         * @private
         */
        this.acks = {};
        this.flags = {};
        this.io = io;
        this.nsp = nsp;
        if (opts && opts.auth) {
            this.auth = opts.auth;
        }
        this._opts = Object.assign({}, opts);
        if (this.io._autoConnect)
            this.open();
    }
    /**
     * Whether the socket is currently disconnected
     *
     * @example
     * const socket = io();
     *
     * socket.on("connect", () => {
     *   console.log(socket.disconnected); // false
     * });
     *
     * socket.on("disconnect", () => {
     *   console.log(socket.disconnected); // true
     * });
     */
    get disconnected() {
        return !this.connected;
    }
    /**
     * Subscribe to open, close and packet events
     *
     * @private
     */
    subEvents() {
        if (this.subs)
            return;
        const io = this.io;
        this.subs = [
            on(io, "open", this.onopen.bind(this)),
            on(io, "packet", this.onpacket.bind(this)),
            on(io, "error", this.onerror.bind(this)),
            on(io, "close", this.onclose.bind(this)),
        ];
    }
    /**
     * Whether the Socket will try to reconnect when its Manager connects or reconnects.
     *
     * @example
     * const socket = io();
     *
     * console.log(socket.active); // true
     *
     * socket.on("disconnect", (reason) => {
     *   if (reason === "io server disconnect") {
     *     // the disconnection was initiated by the server, you need to manually reconnect
     *     console.log(socket.active); // false
     *   }
     *   // else the socket will automatically try to reconnect
     *   console.log(socket.active); // true
     * });
     */
    get active() {
        return !!this.subs;
    }
    /**
     * "Opens" the socket.
     *
     * @example
     * const socket = io({
     *   autoConnect: false
     * });
     *
     * socket.connect();
     */
    connect() {
        if (this.connected)
            return this;
        this.subEvents();
        if (!this.io["_reconnecting"])
            this.io.open(); // ensure open
        if ("open" === this.io._readyState)
            this.onopen();
        return this;
    }
    /**
     * Alias for {@link connect()}.
     */
    open() {
        return this.connect();
    }
    /**
     * Sends a `message` event.
     *
     * This method mimics the WebSocket.send() method.
     *
     * @see https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/send
     *
     * @example
     * socket.send("hello");
     *
     * // this is equivalent to
     * socket.emit("message", "hello");
     *
     * @return self
     */
    send(...args) {
        args.unshift("message");
        this.emit.apply(this, args);
        return this;
    }
    /**
     * Override `emit`.
     * If the event is in `events`, it's emitted normally.
     *
     * @example
     * socket.emit("hello", "world");
     *
     * // all serializable datastructures are supported (no need to call JSON.stringify)
     * socket.emit("hello", 1, "2", { 3: ["4"], 5: Uint8Array.from([6]) });
     *
     * // with an acknowledgement from the server
     * socket.emit("hello", "world", (val) => {
     *   // ...
     * });
     *
     * @return self
     */
    emit(ev, ...args) {
        var _a, _b, _c;
        if (RESERVED_EVENTS.hasOwnProperty(ev)) {
            throw new Error('"' + ev.toString() + '" is a reserved event name');
        }
        args.unshift(ev);
        if (this._opts.retries && !this.flags.fromQueue && !this.flags.volatile) {
            this._addToQueue(args);
            return this;
        }
        const packet = {
            type: PacketType.EVENT,
            data: args,
        };
        packet.options = {};
        packet.options.compress = this.flags.compress !== false;
        // event ack callback
        if ("function" === typeof args[args.length - 1]) {
            const id = this.ids++;
            const ack = args.pop();
            this._registerAckCallback(id, ack);
            packet.id = id;
        }
        const isTransportWritable = (_b = (_a = this.io.engine) === null || _a === void 0 ? void 0 : _a.transport) === null || _b === void 0 ? void 0 : _b.writable;
        const isConnected = this.connected && !((_c = this.io.engine) === null || _c === void 0 ? void 0 : _c._hasPingExpired());
        const discardPacket = this.flags.volatile && !isTransportWritable;
        if (discardPacket) ;
        else if (isConnected) {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
        }
        else {
            this.sendBuffer.push(packet);
        }
        this.flags = {};
        return this;
    }
    /**
     * @private
     */
    _registerAckCallback(id, ack) {
        var _a;
        const timeout = (_a = this.flags.timeout) !== null && _a !== void 0 ? _a : this._opts.ackTimeout;
        if (timeout === undefined) {
            this.acks[id] = ack;
            return;
        }
        // @ts-ignore
        const timer = this.io.setTimeoutFn(() => {
            delete this.acks[id];
            for (let i = 0; i < this.sendBuffer.length; i++) {
                if (this.sendBuffer[i].id === id) {
                    this.sendBuffer.splice(i, 1);
                }
            }
            ack.call(this, new Error("operation has timed out"));
        }, timeout);
        const fn = (...args) => {
            // @ts-ignore
            this.io.clearTimeoutFn(timer);
            ack.apply(this, args);
        };
        fn.withError = true;
        this.acks[id] = fn;
    }
    /**
     * Emits an event and waits for an acknowledgement
     *
     * @example
     * // without timeout
     * const response = await socket.emitWithAck("hello", "world");
     *
     * // with a specific timeout
     * try {
     *   const response = await socket.timeout(1000).emitWithAck("hello", "world");
     * } catch (err) {
     *   // the server did not acknowledge the event in the given delay
     * }
     *
     * @return a Promise that will be fulfilled when the server acknowledges the event
     */
    emitWithAck(ev, ...args) {
        return new Promise((resolve, reject) => {
            const fn = (arg1, arg2) => {
                return arg1 ? reject(arg1) : resolve(arg2);
            };
            fn.withError = true;
            args.push(fn);
            this.emit(ev, ...args);
        });
    }
    /**
     * Add the packet to the queue.
     * @param args
     * @private
     */
    _addToQueue(args) {
        let ack;
        if (typeof args[args.length - 1] === "function") {
            ack = args.pop();
        }
        const packet = {
            id: this._queueSeq++,
            tryCount: 0,
            pending: false,
            args,
            flags: Object.assign({ fromQueue: true }, this.flags),
        };
        args.push((err, ...responseArgs) => {
            if (packet !== this._queue[0]) ;
            const hasError = err !== null;
            if (hasError) {
                if (packet.tryCount > this._opts.retries) {
                    this._queue.shift();
                    if (ack) {
                        ack(err);
                    }
                }
            }
            else {
                this._queue.shift();
                if (ack) {
                    ack(null, ...responseArgs);
                }
            }
            packet.pending = false;
            return this._drainQueue();
        });
        this._queue.push(packet);
        this._drainQueue();
    }
    /**
     * Send the first packet of the queue, and wait for an acknowledgement from the server.
     * @param force - whether to resend a packet that has not been acknowledged yet
     *
     * @private
     */
    _drainQueue(force = false) {
        if (!this.connected || this._queue.length === 0) {
            return;
        }
        const packet = this._queue[0];
        if (packet.pending && !force) {
            return;
        }
        packet.pending = true;
        packet.tryCount++;
        this.flags = packet.flags;
        this.emit.apply(this, packet.args);
    }
    /**
     * Sends a packet.
     *
     * @param packet
     * @private
     */
    packet(packet) {
        packet.nsp = this.nsp;
        this.io._packet(packet);
    }
    /**
     * Called upon engine `open`.
     *
     * @private
     */
    onopen() {
        if (typeof this.auth == "function") {
            this.auth((data) => {
                this._sendConnectPacket(data);
            });
        }
        else {
            this._sendConnectPacket(this.auth);
        }
    }
    /**
     * Sends a CONNECT packet to initiate the Socket.IO session.
     *
     * @param data
     * @private
     */
    _sendConnectPacket(data) {
        this.packet({
            type: PacketType.CONNECT,
            data: this._pid
                ? Object.assign({ pid: this._pid, offset: this._lastOffset }, data)
                : data,
        });
    }
    /**
     * Called upon engine or manager `error`.
     *
     * @param err
     * @private
     */
    onerror(err) {
        if (!this.connected) {
            this.emitReserved("connect_error", err);
        }
    }
    /**
     * Called upon engine `close`.
     *
     * @param reason
     * @param description
     * @private
     */
    onclose(reason, description) {
        this.connected = false;
        delete this.id;
        this.emitReserved("disconnect", reason, description);
        this._clearAcks();
    }
    /**
     * Clears the acknowledgement handlers upon disconnection, since the client will never receive an acknowledgement from
     * the server.
     *
     * @private
     */
    _clearAcks() {
        Object.keys(this.acks).forEach((id) => {
            const isBuffered = this.sendBuffer.some((packet) => String(packet.id) === id);
            if (!isBuffered) {
                // note: handlers that do not accept an error as first argument are ignored here
                const ack = this.acks[id];
                delete this.acks[id];
                if (ack.withError) {
                    ack.call(this, new Error("socket has been disconnected"));
                }
            }
        });
    }
    /**
     * Called with socket packet.
     *
     * @param packet
     * @private
     */
    onpacket(packet) {
        const sameNamespace = packet.nsp === this.nsp;
        if (!sameNamespace)
            return;
        switch (packet.type) {
            case PacketType.CONNECT:
                if (packet.data && packet.data.sid) {
                    this.onconnect(packet.data.sid, packet.data.pid);
                }
                else {
                    this.emitReserved("connect_error", new Error("It seems you are trying to reach a Socket.IO server in v2.x with a v3.x client, but they are not compatible (more information here: https://socket.io/docs/v3/migrating-from-2-x-to-3-0/)"));
                }
                break;
            case PacketType.EVENT:
            case PacketType.BINARY_EVENT:
                this.onevent(packet);
                break;
            case PacketType.ACK:
            case PacketType.BINARY_ACK:
                this.onack(packet);
                break;
            case PacketType.DISCONNECT:
                this.ondisconnect();
                break;
            case PacketType.CONNECT_ERROR:
                this.destroy();
                const err = new Error(packet.data.message);
                // @ts-ignore
                err.data = packet.data.data;
                this.emitReserved("connect_error", err);
                break;
        }
    }
    /**
     * Called upon a server event.
     *
     * @param packet
     * @private
     */
    onevent(packet) {
        const args = packet.data || [];
        if (null != packet.id) {
            args.push(this.ack(packet.id));
        }
        if (this.connected) {
            this.emitEvent(args);
        }
        else {
            this.receiveBuffer.push(Object.freeze(args));
        }
    }
    emitEvent(args) {
        if (this._anyListeners && this._anyListeners.length) {
            const listeners = this._anyListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, args);
            }
        }
        super.emit.apply(this, args);
        if (this._pid && args.length && typeof args[args.length - 1] === "string") {
            this._lastOffset = args[args.length - 1];
        }
    }
    /**
     * Produces an ack callback to emit with an event.
     *
     * @private
     */
    ack(id) {
        const self = this;
        let sent = false;
        return function (...args) {
            // prevent double callbacks
            if (sent)
                return;
            sent = true;
            self.packet({
                type: PacketType.ACK,
                id: id,
                data: args,
            });
        };
    }
    /**
     * Called upon a server acknowledgement.
     *
     * @param packet
     * @private
     */
    onack(packet) {
        const ack = this.acks[packet.id];
        if (typeof ack !== "function") {
            return;
        }
        delete this.acks[packet.id];
        // @ts-ignore FIXME ack is incorrectly inferred as 'never'
        if (ack.withError) {
            packet.data.unshift(null);
        }
        // @ts-ignore
        ack.apply(this, packet.data);
    }
    /**
     * Called upon server connect.
     *
     * @private
     */
    onconnect(id, pid) {
        this.id = id;
        this.recovered = pid && this._pid === pid;
        this._pid = pid; // defined only if connection state recovery is enabled
        this.connected = true;
        this.emitBuffered();
        this._drainQueue(true);
        this.emitReserved("connect");
    }
    /**
     * Emit buffered events (received and emitted).
     *
     * @private
     */
    emitBuffered() {
        this.receiveBuffer.forEach((args) => this.emitEvent(args));
        this.receiveBuffer = [];
        this.sendBuffer.forEach((packet) => {
            this.notifyOutgoingListeners(packet);
            this.packet(packet);
        });
        this.sendBuffer = [];
    }
    /**
     * Called upon server disconnect.
     *
     * @private
     */
    ondisconnect() {
        this.destroy();
        this.onclose("io server disconnect");
    }
    /**
     * Called upon forced client/server side disconnections,
     * this method ensures the manager stops tracking us and
     * that reconnections don't get triggered for this.
     *
     * @private
     */
    destroy() {
        if (this.subs) {
            // clean subscriptions to avoid reconnections
            this.subs.forEach((subDestroy) => subDestroy());
            this.subs = undefined;
        }
        this.io["_destroy"](this);
    }
    /**
     * Disconnects the socket manually. In that case, the socket will not try to reconnect.
     *
     * If this is the last active Socket instance of the {@link Manager}, the low-level connection will be closed.
     *
     * @example
     * const socket = io();
     *
     * socket.on("disconnect", (reason) => {
     *   // console.log(reason); prints "io client disconnect"
     * });
     *
     * socket.disconnect();
     *
     * @return self
     */
    disconnect() {
        if (this.connected) {
            this.packet({ type: PacketType.DISCONNECT });
        }
        // remove socket from pool
        this.destroy();
        if (this.connected) {
            // fire events
            this.onclose("io client disconnect");
        }
        return this;
    }
    /**
     * Alias for {@link disconnect()}.
     *
     * @return self
     */
    close() {
        return this.disconnect();
    }
    /**
     * Sets the compress flag.
     *
     * @example
     * socket.compress(false).emit("hello");
     *
     * @param compress - if `true`, compresses the sending data
     * @return self
     */
    compress(compress) {
        this.flags.compress = compress;
        return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the event message will be dropped when this socket is not
     * ready to send messages.
     *
     * @example
     * socket.volatile.emit("hello"); // the server may or may not receive it
     *
     * @returns self
     */
    get volatile() {
        this.flags.volatile = true;
        return this;
    }
    /**
     * Sets a modifier for a subsequent event emission that the callback will be called with an error when the
     * given number of milliseconds have elapsed without an acknowledgement from the server:
     *
     * @example
     * socket.timeout(5000).emit("my-event", (err) => {
     *   if (err) {
     *     // the server did not acknowledge the event in the given delay
     *   }
     * });
     *
     * @returns self
     */
    timeout(timeout) {
        this.flags.timeout = timeout;
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * @example
     * socket.onAny((event, ...args) => {
     *   console.log(`got ${event}`);
     * });
     *
     * @param listener
     */
    onAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.push(listener);
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * @example
     * socket.prependAny((event, ...args) => {
     *   console.log(`got event ${event}`);
     * });
     *
     * @param listener
     */
    prependAny(listener) {
        this._anyListeners = this._anyListeners || [];
        this._anyListeners.unshift(listener);
        return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`got event ${event}`);
     * }
     *
     * socket.onAny(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAny(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAny();
     *
     * @param listener
     */
    offAny(listener) {
        if (!this._anyListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
        else {
            this._anyListeners = [];
        }
        return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAny() {
        return this._anyListeners || [];
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.onAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    onAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.push(listener);
        return this;
    }
    /**
     * Adds a listener that will be fired when any event is emitted. The event name is passed as the first argument to the
     * callback. The listener is added to the beginning of the listeners array.
     *
     * Note: acknowledgements sent to the server are not included.
     *
     * @example
     * socket.prependAnyOutgoing((event, ...args) => {
     *   console.log(`sent event ${event}`);
     * });
     *
     * @param listener
     */
    prependAnyOutgoing(listener) {
        this._anyOutgoingListeners = this._anyOutgoingListeners || [];
        this._anyOutgoingListeners.unshift(listener);
        return this;
    }
    /**
     * Removes the listener that will be fired when any event is emitted.
     *
     * @example
     * const catchAllListener = (event, ...args) => {
     *   console.log(`sent event ${event}`);
     * }
     *
     * socket.onAnyOutgoing(catchAllListener);
     *
     * // remove a specific listener
     * socket.offAnyOutgoing(catchAllListener);
     *
     * // or remove all listeners
     * socket.offAnyOutgoing();
     *
     * @param [listener] - the catch-all listener (optional)
     */
    offAnyOutgoing(listener) {
        if (!this._anyOutgoingListeners) {
            return this;
        }
        if (listener) {
            const listeners = this._anyOutgoingListeners;
            for (let i = 0; i < listeners.length; i++) {
                if (listener === listeners[i]) {
                    listeners.splice(i, 1);
                    return this;
                }
            }
        }
        else {
            this._anyOutgoingListeners = [];
        }
        return this;
    }
    /**
     * Returns an array of listeners that are listening for any event that is specified. This array can be manipulated,
     * e.g. to remove listeners.
     */
    listenersAnyOutgoing() {
        return this._anyOutgoingListeners || [];
    }
    /**
     * Notify the listeners for each packet sent
     *
     * @param packet
     *
     * @private
     */
    notifyOutgoingListeners(packet) {
        if (this._anyOutgoingListeners && this._anyOutgoingListeners.length) {
            const listeners = this._anyOutgoingListeners.slice();
            for (const listener of listeners) {
                listener.apply(this, packet.data);
            }
        }
    }
}

/**
 * Initialize backoff timer with `opts`.
 *
 * - `min` initial timeout in milliseconds [100]
 * - `max` max timeout [10000]
 * - `jitter` [0]
 * - `factor` [2]
 *
 * @param {Object} opts
 * @api public
 */
function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 10000;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
}
/**
 * Return the backoff duration.
 *
 * @return {Number}
 * @api public
 */
Backoff.prototype.duration = function () {
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
        var rand = Math.random();
        var deviation = Math.floor(rand * this.jitter * ms);
        ms = (Math.floor(rand * 10) & 1) == 0 ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
};
/**
 * Reset the number of attempts.
 *
 * @api public
 */
Backoff.prototype.reset = function () {
    this.attempts = 0;
};
/**
 * Set the minimum duration
 *
 * @api public
 */
Backoff.prototype.setMin = function (min) {
    this.ms = min;
};
/**
 * Set the maximum duration
 *
 * @api public
 */
Backoff.prototype.setMax = function (max) {
    this.max = max;
};
/**
 * Set the jitter
 *
 * @api public
 */
Backoff.prototype.setJitter = function (jitter) {
    this.jitter = jitter;
};

class Manager extends Emitter {
    constructor(uri, opts) {
        var _a;
        super();
        this.nsps = {};
        this.subs = [];
        if (uri && "object" === typeof uri) {
            opts = uri;
            uri = undefined;
        }
        opts = opts || {};
        opts.path = opts.path || "/socket.io";
        this.opts = opts;
        installTimerFunctions(this, opts);
        this.reconnection(opts.reconnection !== false);
        this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
        this.reconnectionDelay(opts.reconnectionDelay || 1000);
        this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
        this.randomizationFactor((_a = opts.randomizationFactor) !== null && _a !== void 0 ? _a : 0.5);
        this.backoff = new Backoff({
            min: this.reconnectionDelay(),
            max: this.reconnectionDelayMax(),
            jitter: this.randomizationFactor(),
        });
        this.timeout(null == opts.timeout ? 20000 : opts.timeout);
        this._readyState = "closed";
        this.uri = uri;
        const _parser = opts.parser || parser;
        this.encoder = new _parser.Encoder();
        this.decoder = new _parser.Decoder();
        this._autoConnect = opts.autoConnect !== false;
        if (this._autoConnect)
            this.open();
    }
    reconnection(v) {
        if (!arguments.length)
            return this._reconnection;
        this._reconnection = !!v;
        if (!v) {
            this.skipReconnect = true;
        }
        return this;
    }
    reconnectionAttempts(v) {
        if (v === undefined)
            return this._reconnectionAttempts;
        this._reconnectionAttempts = v;
        return this;
    }
    reconnectionDelay(v) {
        var _a;
        if (v === undefined)
            return this._reconnectionDelay;
        this._reconnectionDelay = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMin(v);
        return this;
    }
    randomizationFactor(v) {
        var _a;
        if (v === undefined)
            return this._randomizationFactor;
        this._randomizationFactor = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setJitter(v);
        return this;
    }
    reconnectionDelayMax(v) {
        var _a;
        if (v === undefined)
            return this._reconnectionDelayMax;
        this._reconnectionDelayMax = v;
        (_a = this.backoff) === null || _a === void 0 ? void 0 : _a.setMax(v);
        return this;
    }
    timeout(v) {
        if (!arguments.length)
            return this._timeout;
        this._timeout = v;
        return this;
    }
    /**
     * Starts trying to reconnect if reconnection is enabled and we have not
     * started reconnecting yet
     *
     * @private
     */
    maybeReconnectOnOpen() {
        // Only try to reconnect if it's the first time we're connecting
        if (!this._reconnecting &&
            this._reconnection &&
            this.backoff.attempts === 0) {
            // keeps reconnection from firing twice for the same reconnection loop
            this.reconnect();
        }
    }
    /**
     * Sets the current transport `socket`.
     *
     * @param {Function} fn - optional, callback
     * @return self
     * @public
     */
    open(fn) {
        if (~this._readyState.indexOf("open"))
            return this;
        this.engine = new Socket$1(this.uri, this.opts);
        const socket = this.engine;
        const self = this;
        this._readyState = "opening";
        this.skipReconnect = false;
        // emit `open`
        const openSubDestroy = on(socket, "open", function () {
            self.onopen();
            fn && fn();
        });
        const onError = (err) => {
            this.cleanup();
            this._readyState = "closed";
            this.emitReserved("error", err);
            if (fn) {
                fn(err);
            }
            else {
                // Only do this if there is no fn to handle the error
                this.maybeReconnectOnOpen();
            }
        };
        // emit `error`
        const errorSub = on(socket, "error", onError);
        if (false !== this._timeout) {
            const timeout = this._timeout;
            // set timer
            const timer = this.setTimeoutFn(() => {
                openSubDestroy();
                onError(new Error("timeout"));
                socket.close();
            }, timeout);
            if (this.opts.autoUnref) {
                timer.unref();
            }
            this.subs.push(() => {
                this.clearTimeoutFn(timer);
            });
        }
        this.subs.push(openSubDestroy);
        this.subs.push(errorSub);
        return this;
    }
    /**
     * Alias for open()
     *
     * @return self
     * @public
     */
    connect(fn) {
        return this.open(fn);
    }
    /**
     * Called upon transport open.
     *
     * @private
     */
    onopen() {
        // clear old subs
        this.cleanup();
        // mark as open
        this._readyState = "open";
        this.emitReserved("open");
        // add new subs
        const socket = this.engine;
        this.subs.push(on(socket, "ping", this.onping.bind(this)), on(socket, "data", this.ondata.bind(this)), on(socket, "error", this.onerror.bind(this)), on(socket, "close", this.onclose.bind(this)), 
        // @ts-ignore
        on(this.decoder, "decoded", this.ondecoded.bind(this)));
    }
    /**
     * Called upon a ping.
     *
     * @private
     */
    onping() {
        this.emitReserved("ping");
    }
    /**
     * Called with data.
     *
     * @private
     */
    ondata(data) {
        try {
            this.decoder.add(data);
        }
        catch (e) {
            this.onclose("parse error", e);
        }
    }
    /**
     * Called when parser fully decodes a packet.
     *
     * @private
     */
    ondecoded(packet) {
        // the nextTick call prevents an exception in a user-provided event listener from triggering a disconnection due to a "parse error"
        nextTick(() => {
            this.emitReserved("packet", packet);
        }, this.setTimeoutFn);
    }
    /**
     * Called upon socket error.
     *
     * @private
     */
    onerror(err) {
        this.emitReserved("error", err);
    }
    /**
     * Creates a new socket for the given `nsp`.
     *
     * @return {Socket}
     * @public
     */
    socket(nsp, opts) {
        let socket = this.nsps[nsp];
        if (!socket) {
            socket = new Socket(this, nsp, opts);
            this.nsps[nsp] = socket;
        }
        else if (this._autoConnect && !socket.active) {
            socket.connect();
        }
        return socket;
    }
    /**
     * Called upon a socket close.
     *
     * @param socket
     * @private
     */
    _destroy(socket) {
        const nsps = Object.keys(this.nsps);
        for (const nsp of nsps) {
            const socket = this.nsps[nsp];
            if (socket.active) {
                return;
            }
        }
        this._close();
    }
    /**
     * Writes a packet.
     *
     * @param packet
     * @private
     */
    _packet(packet) {
        const encodedPackets = this.encoder.encode(packet);
        for (let i = 0; i < encodedPackets.length; i++) {
            this.engine.write(encodedPackets[i], packet.options);
        }
    }
    /**
     * Clean up transport subscriptions and packet buffer.
     *
     * @private
     */
    cleanup() {
        this.subs.forEach((subDestroy) => subDestroy());
        this.subs.length = 0;
        this.decoder.destroy();
    }
    /**
     * Close the current socket.
     *
     * @private
     */
    _close() {
        this.skipReconnect = true;
        this._reconnecting = false;
        this.onclose("forced close");
    }
    /**
     * Alias for close()
     *
     * @private
     */
    disconnect() {
        return this._close();
    }
    /**
     * Called when:
     *
     * - the low-level engine is closed
     * - the parser encountered a badly formatted packet
     * - all sockets are disconnected
     *
     * @private
     */
    onclose(reason, description) {
        var _a;
        this.cleanup();
        (_a = this.engine) === null || _a === void 0 ? void 0 : _a.close();
        this.backoff.reset();
        this._readyState = "closed";
        this.emitReserved("close", reason, description);
        if (this._reconnection && !this.skipReconnect) {
            this.reconnect();
        }
    }
    /**
     * Attempt a reconnection.
     *
     * @private
     */
    reconnect() {
        if (this._reconnecting || this.skipReconnect)
            return this;
        const self = this;
        if (this.backoff.attempts >= this._reconnectionAttempts) {
            this.backoff.reset();
            this.emitReserved("reconnect_failed");
            this._reconnecting = false;
        }
        else {
            const delay = this.backoff.duration();
            this._reconnecting = true;
            const timer = this.setTimeoutFn(() => {
                if (self.skipReconnect)
                    return;
                this.emitReserved("reconnect_attempt", self.backoff.attempts);
                // check again for the case socket closed in above events
                if (self.skipReconnect)
                    return;
                self.open((err) => {
                    if (err) {
                        self._reconnecting = false;
                        self.reconnect();
                        this.emitReserved("reconnect_error", err);
                    }
                    else {
                        self.onreconnect();
                    }
                });
            }, delay);
            if (this.opts.autoUnref) {
                timer.unref();
            }
            this.subs.push(() => {
                this.clearTimeoutFn(timer);
            });
        }
    }
    /**
     * Called upon successful reconnect.
     *
     * @private
     */
    onreconnect() {
        const attempt = this.backoff.attempts;
        this._reconnecting = false;
        this.backoff.reset();
        this.emitReserved("reconnect", attempt);
    }
}

/**
 * Managers cache.
 */
const cache = {};
function lookup(uri, opts) {
    if (typeof uri === "object") {
        opts = uri;
        uri = undefined;
    }
    opts = opts || {};
    const parsed = url(uri, opts.path || "/socket.io");
    const source = parsed.source;
    const id = parsed.id;
    const path = parsed.path;
    const sameNamespace = cache[id] && path in cache[id]["nsps"];
    const newConnection = opts.forceNew ||
        opts["force new connection"] ||
        false === opts.multiplex ||
        sameNamespace;
    let io;
    if (newConnection) {
        io = new Manager(source, opts);
    }
    else {
        if (!cache[id]) {
            cache[id] = new Manager(source, opts);
        }
        io = cache[id];
    }
    if (parsed.query && !opts.query) {
        opts.query = parsed.queryKey;
    }
    return io.socket(parsed.path, opts);
}
// so that "lookup" can be used both as a function (e.g. `io(...)`) and as a
// namespace (e.g. `io.connect(...)`), for backward compatibility
Object.assign(lookup, {
    Manager,
    Socket,
    io: lookup,
    connect: lookup,
});

/**
 * Create a bound version of a function with a specified `this` context
 *
 * @param {Function} fn - The function to bind
 * @param {*} thisArg - The value to be passed as the `this` parameter
 * @returns {Function} A new function that will call the original function with the specified `this` context
 */
function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}

// utils is a library of generic helper functions non-specific to axios

const {toString} = Object.prototype;
const {getPrototypeOf} = Object;
const {iterator, toStringTag} = Symbol;

const kindOf = (cache => thing => {
    const str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
})(Object.create(null));

const kindOfTest = (type) => {
  type = type.toLowerCase();
  return (thing) => kindOf(thing) === type
};

const typeOfTest = type => thing => typeof thing === type;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 *
 * @returns {boolean} True if value is an Array, otherwise false
 */
const {isArray} = Array;

/**
 * Determine if a value is undefined
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if the value is undefined, otherwise false
 */
const isUndefined = typeOfTest('undefined');

/**
 * Determine if a value is a Buffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
const isArrayBuffer = kindOfTest('ArrayBuffer');


/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  let result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a String, otherwise false
 */
const isString = typeOfTest('string');

/**
 * Determine if a value is a Function
 *
 * @param {*} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
const isFunction$1 = typeOfTest('function');

/**
 * Determine if a value is a Number
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Number, otherwise false
 */
const isNumber = typeOfTest('number');

/**
 * Determine if a value is an Object
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an Object, otherwise false
 */
const isObject = (thing) => thing !== null && typeof thing === 'object';

/**
 * Determine if a value is a Boolean
 *
 * @param {*} thing The value to test
 * @returns {boolean} True if value is a Boolean, otherwise false
 */
const isBoolean = thing => thing === true || thing === false;

/**
 * Determine if a value is a plain Object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a plain Object, otherwise false
 */
const isPlainObject = (val) => {
  if (kindOf(val) !== 'object') {
    return false;
  }

  const prototype = getPrototypeOf(val);
  return (prototype === null || prototype === Object.prototype || Object.getPrototypeOf(prototype) === null) && !(toStringTag in val) && !(iterator in val);
};

/**
 * Determine if a value is an empty object (safely handles Buffers)
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is an empty object, otherwise false
 */
const isEmptyObject = (val) => {
  // Early return for non-objects or Buffers to prevent RangeError
  if (!isObject(val) || isBuffer(val)) {
    return false;
  }

  try {
    return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
  } catch (e) {
    // Fallback for any other objects that might cause RangeError with Object.keys()
    return false;
  }
};

/**
 * Determine if a value is a Date
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Date, otherwise false
 */
const isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Blob, otherwise false
 */
const isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a File, otherwise false
 */
const isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Stream
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a Stream, otherwise false
 */
const isStream = (val) => isObject(val) && isFunction$1(val.pipe);

/**
 * Determine if a value is a FormData
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an FormData, otherwise false
 */
const isFormData = (thing) => {
  let kind;
  return thing && (
    (typeof FormData === 'function' && thing instanceof FormData) || (
      isFunction$1(thing.append) && (
        (kind = kindOf(thing)) === 'formdata' ||
        // detect form-data instance
        (kind === 'object' && isFunction$1(thing.toString) && thing.toString() === '[object FormData]')
      )
    )
  )
};

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
const isURLSearchParams = kindOfTest('URLSearchParams');

const [isReadableStream, isRequest, isResponse, isHeaders] = ['ReadableStream', 'Request', 'Response', 'Headers'].map(kindOfTest);

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 *
 * @returns {String} The String freed of excess whitespace
 */
const trim = (str) => str.trim ?
  str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array<unknown>} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 *
 * @param {Object} [options]
 * @param {Boolean} [options.allOwnKeys = false]
 * @returns {any}
 */
function forEach(obj, fn, {allOwnKeys = false} = {}) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  let i;
  let l;

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Buffer check
    if (isBuffer(obj)) {
      return;
    }

    // Iterate over object keys
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;

    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}

function findKey(obj, key) {
  if (isBuffer(obj)){
    return null;
  }

  key = key.toLowerCase();
  const keys = Object.keys(obj);
  let i = keys.length;
  let _key;
  while (i-- > 0) {
    _key = keys[i];
    if (key === _key.toLowerCase()) {
      return _key;
    }
  }
  return null;
}

const _global = (() => {
  /*eslint no-undef:0*/
  if (typeof globalThis !== "undefined") return globalThis;
  return typeof self !== "undefined" ? self : (typeof window !== 'undefined' ? window : global)
})();

const isContextDefined = (context) => !isUndefined(context) && context !== _global;

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * const result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 *
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  const {caseless, skipUndefined} = isContextDefined(this) && this || {};
  const result = {};
  const assignValue = (val, key) => {
    const targetKey = caseless && findKey(result, key) || key;
    if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
      result[targetKey] = merge(result[targetKey], val);
    } else if (isPlainObject(val)) {
      result[targetKey] = merge({}, val);
    } else if (isArray(val)) {
      result[targetKey] = val.slice();
    } else if (!skipUndefined || !isUndefined(val)) {
      result[targetKey] = val;
    }
  };

  for (let i = 0, l = arguments.length; i < l; i++) {
    arguments[i] && forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 *
 * @param {Object} [options]
 * @param {Boolean} [options.allOwnKeys]
 * @returns {Object} The resulting value of object a
 */
const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction$1(val)) {
      Object.defineProperty(a, key, {
        value: bind(val, thisArg),
        writable: true,
        enumerable: true,
        configurable: true
      });
    } else {
      Object.defineProperty(a, key, {
        value: val,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }, {allOwnKeys});
  return a;
};

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 *
 * @returns {string} content value without BOM
 */
const stripBOM = (content) => {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
};

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 *
 * @returns {void}
 */
const inherits = (constructor, superConstructor, props, descriptors) => {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  Object.defineProperty(constructor.prototype, 'constructor', {
    value: constructor,
    writable: true,
    enumerable: false,
    configurable: true
  });
  Object.defineProperty(constructor, 'super', {
    value: superConstructor.prototype
  });
  props && Object.assign(constructor.prototype, props);
};

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function|Boolean} [filter]
 * @param {Function} [propFilter]
 *
 * @returns {Object}
 */
const toFlatObject = (sourceObj, destObj, filter, propFilter) => {
  let props;
  let i;
  let prop;
  const merged = {};

  destObj = destObj || {};
  // eslint-disable-next-line no-eq-null,eqeqeq
  if (sourceObj == null) return destObj;

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = filter !== false && getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
};

/**
 * Determines whether a string ends with the characters of a specified string
 *
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 *
 * @returns {boolean}
 */
const endsWith = (str, searchString, position) => {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  const lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
};


/**
 * Returns new array from array like object or null if failed
 *
 * @param {*} [thing]
 *
 * @returns {?Array}
 */
const toArray = (thing) => {
  if (!thing) return null;
  if (isArray(thing)) return thing;
  let i = thing.length;
  if (!isNumber(i)) return null;
  const arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
};

/**
 * Checking if the Uint8Array exists and if it does, it returns a function that checks if the
 * thing passed in is an instance of Uint8Array
 *
 * @param {TypedArray}
 *
 * @returns {Array}
 */
// eslint-disable-next-line func-names
const isTypedArray = (TypedArray => {
  // eslint-disable-next-line func-names
  return thing => {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && getPrototypeOf(Uint8Array));

/**
 * For each entry in the object, call the function with the key and value.
 *
 * @param {Object<any, any>} obj - The object to iterate over.
 * @param {Function} fn - The function to call for each entry.
 *
 * @returns {void}
 */
const forEachEntry = (obj, fn) => {
  const generator = obj && obj[iterator];

  const _iterator = generator.call(obj);

  let result;

  while ((result = _iterator.next()) && !result.done) {
    const pair = result.value;
    fn.call(obj, pair[0], pair[1]);
  }
};

/**
 * It takes a regular expression and a string, and returns an array of all the matches
 *
 * @param {string} regExp - The regular expression to match against.
 * @param {string} str - The string to search.
 *
 * @returns {Array<boolean>}
 */
const matchAll = (regExp, str) => {
  let matches;
  const arr = [];

  while ((matches = regExp.exec(str)) !== null) {
    arr.push(matches);
  }

  return arr;
};

/* Checking if the kindOfTest function returns true when passed an HTMLFormElement. */
const isHTMLForm = kindOfTest('HTMLFormElement');

const toCamelCase = str => {
  return str.toLowerCase().replace(/[-_\s]([a-z\d])(\w*)/g,
    function replacer(m, p1, p2) {
      return p1.toUpperCase() + p2;
    }
  );
};

/* Creating a function that will check if an object has a property. */
const hasOwnProperty = (({hasOwnProperty}) => (obj, prop) => hasOwnProperty.call(obj, prop))(Object.prototype);

/**
 * Determine if a value is a RegExp object
 *
 * @param {*} val The value to test
 *
 * @returns {boolean} True if value is a RegExp object, otherwise false
 */
const isRegExp = kindOfTest('RegExp');

const reduceDescriptors = (obj, reducer) => {
  const descriptors = Object.getOwnPropertyDescriptors(obj);
  const reducedDescriptors = {};

  forEach(descriptors, (descriptor, name) => {
    let ret;
    if ((ret = reducer(descriptor, name, obj)) !== false) {
      reducedDescriptors[name] = ret || descriptor;
    }
  });

  Object.defineProperties(obj, reducedDescriptors);
};

/**
 * Makes all methods read-only
 * @param {Object} obj
 */

const freezeMethods = (obj) => {
  reduceDescriptors(obj, (descriptor, name) => {
    // skip restricted props in strict mode
    if (isFunction$1(obj) && ['arguments', 'caller', 'callee'].indexOf(name) !== -1) {
      return false;
    }

    const value = obj[name];

    if (!isFunction$1(value)) return;

    descriptor.enumerable = false;

    if ('writable' in descriptor) {
      descriptor.writable = false;
      return;
    }

    if (!descriptor.set) {
      descriptor.set = () => {
        throw Error('Can not rewrite read-only method \'' + name + '\'');
      };
    }
  });
};

const toObjectSet = (arrayOrString, delimiter) => {
  const obj = {};

  const define = (arr) => {
    arr.forEach(value => {
      obj[value] = true;
    });
  };

  isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));

  return obj;
};

const noop = () => {};

const toFiniteNumber = (value, defaultValue) => {
  return value != null && Number.isFinite(value = +value) ? value : defaultValue;
};



/**
 * If the thing is a FormData object, return true, otherwise return false.
 *
 * @param {unknown} thing - The thing to check.
 *
 * @returns {boolean}
 */
function isSpecCompliantForm(thing) {
  return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === 'FormData' && thing[iterator]);
}

const toJSONObject = (obj) => {
  const stack = new Array(10);

  const visit = (source, i) => {

    if (isObject(source)) {
      if (stack.indexOf(source) >= 0) {
        return;
      }

      //Buffer check
      if (isBuffer(source)) {
        return source;
      }

      if(!('toJSON' in source)) {
        stack[i] = source;
        const target = isArray(source) ? [] : {};

        forEach(source, (value, key) => {
          const reducedValue = visit(value, i + 1);
          !isUndefined(reducedValue) && (target[key] = reducedValue);
        });

        stack[i] = undefined;

        return target;
      }
    }

    return source;
  };

  return visit(obj, 0);
};

const isAsyncFn = kindOfTest('AsyncFunction');

const isThenable = (thing) =>
  thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);

// original code
// https://github.com/DigitalBrainJS/AxiosPromise/blob/16deab13710ec09779922131f3fa5954320f83ab/lib/utils.js#L11-L34

const _setImmediate = ((setImmediateSupported, postMessageSupported) => {
  if (setImmediateSupported) {
    return setImmediate;
  }

  return postMessageSupported ? ((token, callbacks) => {
    _global.addEventListener("message", ({source, data}) => {
      if (source === _global && data === token) {
        callbacks.length && callbacks.shift()();
      }
    }, false);

    return (cb) => {
      callbacks.push(cb);
      _global.postMessage(token, "*");
    }
  })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
})(
  typeof setImmediate === 'function',
  isFunction$1(_global.postMessage)
);

const asap = typeof queueMicrotask !== 'undefined' ?
  queueMicrotask.bind(_global) : ( typeof process !== 'undefined' && process.nextTick || _setImmediate);

// *********************


const isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);


var utils$1 = {
  isArray,
  isArrayBuffer,
  isBuffer,
  isFormData,
  isArrayBufferView,
  isString,
  isNumber,
  isBoolean,
  isObject,
  isPlainObject,
  isEmptyObject,
  isReadableStream,
  isRequest,
  isResponse,
  isHeaders,
  isUndefined,
  isDate,
  isFile,
  isBlob,
  isRegExp,
  isFunction: isFunction$1,
  isStream,
  isURLSearchParams,
  isTypedArray,
  isFileList,
  forEach,
  merge,
  extend,
  trim,
  stripBOM,
  inherits,
  toFlatObject,
  kindOf,
  kindOfTest,
  endsWith,
  toArray,
  forEachEntry,
  matchAll,
  isHTMLForm,
  hasOwnProperty,
  hasOwnProp: hasOwnProperty, // an alias to avoid ESLint no-prototype-builtins detection
  reduceDescriptors,
  freezeMethods,
  toObjectSet,
  toCamelCase,
  noop,
  toFiniteNumber,
  findKey,
  global: _global,
  isContextDefined,
  isSpecCompliantForm,
  toJSONObject,
  isAsyncFn,
  isThenable,
  setImmediate: _setImmediate,
  asap,
  isIterable
};

let AxiosError$1 = class AxiosError extends Error {
    static from(error, code, config, request, response, customProps) {
        const axiosError = new AxiosError(error.message, code || error.code, config, request, response);
        axiosError.cause = error;
        axiosError.name = error.name;
        customProps && Object.assign(axiosError, customProps);
        return axiosError;
    }

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [config] The config.
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     *
     * @returns {Error} The created error.
     */
    constructor(message, code, config, request, response) {
        super(message);
        this.name = 'AxiosError';
        this.isAxiosError = true;
        code && (this.code = code);
        config && (this.config = config);
        request && (this.request = request);
        if (response) {
            this.response = response;
            this.status = response.status;
        }
    }

    toJSON() {
        return {
            // Standard
            message: this.message,
            name: this.name,
            // Microsoft
            description: this.description,
            number: this.number,
            // Mozilla
            fileName: this.fileName,
            lineNumber: this.lineNumber,
            columnNumber: this.columnNumber,
            stack: this.stack,
            // Axios
            config: utils$1.toJSONObject(this.config),
            code: this.code,
            status: this.status,
        };
    }
};

// This can be changed to static properties as soon as the parser options in .eslint.cjs are updated.
AxiosError$1.ERR_BAD_OPTION_VALUE = 'ERR_BAD_OPTION_VALUE';
AxiosError$1.ERR_BAD_OPTION = 'ERR_BAD_OPTION';
AxiosError$1.ECONNABORTED = 'ECONNABORTED';
AxiosError$1.ETIMEDOUT = 'ETIMEDOUT';
AxiosError$1.ERR_NETWORK = 'ERR_NETWORK';
AxiosError$1.ERR_FR_TOO_MANY_REDIRECTS = 'ERR_FR_TOO_MANY_REDIRECTS';
AxiosError$1.ERR_DEPRECATED = 'ERR_DEPRECATED';
AxiosError$1.ERR_BAD_RESPONSE = 'ERR_BAD_RESPONSE';
AxiosError$1.ERR_BAD_REQUEST = 'ERR_BAD_REQUEST';
AxiosError$1.ERR_CANCELED = 'ERR_CANCELED';
AxiosError$1.ERR_NOT_SUPPORT = 'ERR_NOT_SUPPORT';
AxiosError$1.ERR_INVALID_URL = 'ERR_INVALID_URL';

// eslint-disable-next-line strict
var httpAdapter = null;

/**
 * Determines if the given thing is a array or js object.
 *
 * @param {string} thing - The object or array to be visited.
 *
 * @returns {boolean}
 */
function isVisitable(thing) {
  return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
}

/**
 * It removes the brackets from the end of a string
 *
 * @param {string} key - The key of the parameter.
 *
 * @returns {string} the key without the brackets.
 */
function removeBrackets(key) {
  return utils$1.endsWith(key, '[]') ? key.slice(0, -2) : key;
}

/**
 * It takes a path, a key, and a boolean, and returns a string
 *
 * @param {string} path - The path to the current key.
 * @param {string} key - The key of the current object being iterated over.
 * @param {string} dots - If true, the key will be rendered with dots instead of brackets.
 *
 * @returns {string} The path to the current key.
 */
function renderKey(path, key, dots) {
  if (!path) return key;
  return path.concat(key).map(function each(token, i) {
    // eslint-disable-next-line no-param-reassign
    token = removeBrackets(token);
    return !dots && i ? '[' + token + ']' : token;
  }).join(dots ? '.' : '');
}

/**
 * If the array is an array and none of its elements are visitable, then it's a flat array.
 *
 * @param {Array<any>} arr - The array to check
 *
 * @returns {boolean}
 */
function isFlatArray(arr) {
  return utils$1.isArray(arr) && !arr.some(isVisitable);
}

const predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
  return /^is[A-Z]/.test(prop);
});

/**
 * Convert a data object to FormData
 *
 * @param {Object} obj
 * @param {?Object} [formData]
 * @param {?Object} [options]
 * @param {Function} [options.visitor]
 * @param {Boolean} [options.metaTokens = true]
 * @param {Boolean} [options.dots = false]
 * @param {?Boolean} [options.indexes = false]
 *
 * @returns {Object}
 **/

/**
 * It converts an object into a FormData object
 *
 * @param {Object<any, any>} obj - The object to convert to form data.
 * @param {string} formData - The FormData object to append to.
 * @param {Object<string, any>} options
 *
 * @returns
 */
function toFormData$1(obj, formData, options) {
  if (!utils$1.isObject(obj)) {
    throw new TypeError('target must be an object');
  }

  // eslint-disable-next-line no-param-reassign
  formData = formData || new (FormData)();

  // eslint-disable-next-line no-param-reassign
  options = utils$1.toFlatObject(options, {
    metaTokens: true,
    dots: false,
    indexes: false
  }, false, function defined(option, source) {
    // eslint-disable-next-line no-eq-null,eqeqeq
    return !utils$1.isUndefined(source[option]);
  });

  const metaTokens = options.metaTokens;
  // eslint-disable-next-line no-use-before-define
  const visitor = options.visitor || defaultVisitor;
  const dots = options.dots;
  const indexes = options.indexes;
  const _Blob = options.Blob || typeof Blob !== 'undefined' && Blob;
  const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);

  if (!utils$1.isFunction(visitor)) {
    throw new TypeError('visitor must be a function');
  }

  function convertValue(value) {
    if (value === null) return '';

    if (utils$1.isDate(value)) {
      return value.toISOString();
    }

    if (utils$1.isBoolean(value)) {
      return value.toString();
    }

    if (!useBlob && utils$1.isBlob(value)) {
      throw new AxiosError$1('Blob is not supported. Use a Buffer instead.');
    }

    if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
      return useBlob && typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }

    return value;
  }

  /**
   * Default visitor.
   *
   * @param {*} value
   * @param {String|Number} key
   * @param {Array<String|Number>} path
   * @this {FormData}
   *
   * @returns {boolean} return true to visit the each prop of the value recursively
   */
  function defaultVisitor(value, key, path) {
    let arr = value;

    if (value && !path && typeof value === 'object') {
      if (utils$1.endsWith(key, '{}')) {
        // eslint-disable-next-line no-param-reassign
        key = metaTokens ? key : key.slice(0, -2);
        // eslint-disable-next-line no-param-reassign
        value = JSON.stringify(value);
      } else if (
        (utils$1.isArray(value) && isFlatArray(value)) ||
        ((utils$1.isFileList(value) || utils$1.endsWith(key, '[]')) && (arr = utils$1.toArray(value))
        )) {
        // eslint-disable-next-line no-param-reassign
        key = removeBrackets(key);

        arr.forEach(function each(el, index) {
          !(utils$1.isUndefined(el) || el === null) && formData.append(
            // eslint-disable-next-line no-nested-ternary
            indexes === true ? renderKey([key], index, dots) : (indexes === null ? key : key + '[]'),
            convertValue(el)
          );
        });
        return false;
      }
    }

    if (isVisitable(value)) {
      return true;
    }

    formData.append(renderKey(path, key, dots), convertValue(value));

    return false;
  }

  const stack = [];

  const exposedHelpers = Object.assign(predicates, {
    defaultVisitor,
    convertValue,
    isVisitable
  });

  function build(value, path) {
    if (utils$1.isUndefined(value)) return;

    if (stack.indexOf(value) !== -1) {
      throw Error('Circular reference detected in ' + path.join('.'));
    }

    stack.push(value);

    utils$1.forEach(value, function each(el, key) {
      const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
        formData, el, utils$1.isString(key) ? key.trim() : key, path, exposedHelpers
      );

      if (result === true) {
        build(el, path ? path.concat(key) : [key]);
      }
    });

    stack.pop();
  }

  if (!utils$1.isObject(obj)) {
    throw new TypeError('data must be an object');
  }

  build(obj);

  return formData;
}

/**
 * It encodes a string by replacing all characters that are not in the unreserved set with
 * their percent-encoded equivalents
 *
 * @param {string} str - The string to encode.
 *
 * @returns {string} The encoded string.
 */
function encode$1(str) {
  const charMap = {
    '!': '%21',
    "'": '%27',
    '(': '%28',
    ')': '%29',
    '~': '%7E',
    '%20': '+',
    '%00': '\x00'
  };
  return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
    return charMap[match];
  });
}

/**
 * It takes a params object and converts it to a FormData object
 *
 * @param {Object<string, any>} params - The parameters to be converted to a FormData object.
 * @param {Object<string, any>} options - The options object passed to the Axios constructor.
 *
 * @returns {void}
 */
function AxiosURLSearchParams(params, options) {
  this._pairs = [];

  params && toFormData$1(params, this, options);
}

const prototype = AxiosURLSearchParams.prototype;

prototype.append = function append(name, value) {
  this._pairs.push([name, value]);
};

prototype.toString = function toString(encoder) {
  const _encode = encoder ? function(value) {
    return encoder.call(this, value, encode$1);
  } : encode$1;

  return this._pairs.map(function each(pair) {
    return _encode(pair[0]) + '=' + _encode(pair[1]);
  }, '').join('&');
};

/**
 * It replaces all instances of the characters `:`, `$`, `,`, `+`, `[`, and `]` with their
 * URI encoded counterparts
 *
 * @param {string} val The value to be encoded.
 *
 * @returns {string} The encoded value.
 */
function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @param {?(object|Function)} options
 *
 * @returns {string} The formatted url
 */
function buildURL(url, params, options) {
  if (!params) {
    return url;
  }

  const _encode = options && options.encode || encode;

  const _options = utils$1.isFunction(options) ? {
    serialize: options
  } : options;

  const serializeFn = _options && _options.serialize;

  let serializedParams;

  if (serializeFn) {
    serializedParams = serializeFn(params, _options);
  } else {
    serializedParams = utils$1.isURLSearchParams(params) ?
      params.toString() :
      new AxiosURLSearchParams(params, _options).toString(_encode);
  }

  if (serializedParams) {
    const hashmarkIndex = url.indexOf("#");

    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
}

class InterceptorManager {
  constructor() {
    this.handlers = [];
  }

  /**
   * Add a new interceptor to the stack
   *
   * @param {Function} fulfilled The function to handle `then` for a `Promise`
   * @param {Function} rejected The function to handle `reject` for a `Promise`
   * @param {Object} options The options for the interceptor, synchronous and runWhen
   *
   * @return {Number} An ID used to remove interceptor later
   */
  use(fulfilled, rejected, options) {
    this.handlers.push({
      fulfilled,
      rejected,
      synchronous: options ? options.synchronous : false,
      runWhen: options ? options.runWhen : null
    });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor from the stack
   *
   * @param {Number} id The ID that was returned by `use`
   *
   * @returns {void}
   */
  eject(id) {
    if (this.handlers[id]) {
      this.handlers[id] = null;
    }
  }

  /**
   * Clear all interceptors from the stack
   *
   * @returns {void}
   */
  clear() {
    if (this.handlers) {
      this.handlers = [];
    }
  }

  /**
   * Iterate over all the registered interceptors
   *
   * This method is particularly useful for skipping over any
   * interceptors that may have become `null` calling `eject`.
   *
   * @param {Function} fn The function to call for each interceptor
   *
   * @returns {void}
   */
  forEach(fn) {
    utils$1.forEach(this.handlers, function forEachHandler(h) {
      if (h !== null) {
        fn(h);
      }
    });
  }
}

var transitionalDefaults = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

var URLSearchParams$1 = typeof URLSearchParams !== 'undefined' ? URLSearchParams : AxiosURLSearchParams;

var FormData$1 = typeof FormData !== 'undefined' ? FormData : null;

var Blob$1 = typeof Blob !== 'undefined' ? Blob : null;

var platform$1 = {
  isBrowser: true,
  classes: {
    URLSearchParams: URLSearchParams$1,
    FormData: FormData$1,
    Blob: Blob$1
  },
  protocols: ['http', 'https', 'file', 'blob', 'url', 'data']
};

const hasBrowserEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

const _navigator = typeof navigator === 'object' && navigator || undefined;

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 *
 * @returns {boolean}
 */
const hasStandardBrowserEnv = hasBrowserEnv &&
  (!_navigator || ['ReactNative', 'NativeScript', 'NS'].indexOf(_navigator.product) < 0);

/**
 * Determine if we're running in a standard browser webWorker environment
 *
 * Although the `isStandardBrowserEnv` method indicates that
 * `allows axios to run in a web worker`, the WebWorker will still be
 * filtered out due to its judgment standard
 * `typeof window !== 'undefined' && typeof document !== 'undefined'`.
 * This leads to a problem when axios post `FormData` in webWorker
 */
const hasStandardBrowserWebWorkerEnv = (() => {
  return (
    typeof WorkerGlobalScope !== 'undefined' &&
    // eslint-disable-next-line no-undef
    self instanceof WorkerGlobalScope &&
    typeof self.importScripts === 'function'
  );
})();

const origin = hasBrowserEnv && window.location.href || 'http://localhost';

var utils = /*#__PURE__*/Object.freeze({
    __proto__: null,
    hasBrowserEnv: hasBrowserEnv,
    hasStandardBrowserEnv: hasStandardBrowserEnv,
    hasStandardBrowserWebWorkerEnv: hasStandardBrowserWebWorkerEnv,
    navigator: _navigator,
    origin: origin
});

var platform = {
  ...utils,
  ...platform$1
};

function toURLEncodedForm(data, options) {
  return toFormData$1(data, new platform.classes.URLSearchParams(), {
    visitor: function(value, key, path, helpers) {
      if (platform.isNode && utils$1.isBuffer(value)) {
        this.append(key, value.toString('base64'));
        return false;
      }

      return helpers.defaultVisitor.apply(this, arguments);
    },
    ...options
  });
}

/**
 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
 *
 * @param {string} name - The name of the property to get.
 *
 * @returns An array of strings.
 */
function parsePropPath(name) {
  // foo[x][y][z]
  // foo.x.y.z
  // foo-x-y-z
  // foo x y z
  return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map(match => {
    return match[0] === '[]' ? '' : match[1] || match[0];
  });
}

/**
 * Convert an array to an object.
 *
 * @param {Array<any>} arr - The array to convert to an object.
 *
 * @returns An object with the same keys and values as the array.
 */
function arrayToObject(arr) {
  const obj = {};
  const keys = Object.keys(arr);
  let i;
  const len = keys.length;
  let key;
  for (i = 0; i < len; i++) {
    key = keys[i];
    obj[key] = arr[key];
  }
  return obj;
}

/**
 * It takes a FormData object and returns a JavaScript object
 *
 * @param {string} formData The FormData object to convert to JSON.
 *
 * @returns {Object<string, any> | null} The converted object.
 */
function formDataToJSON(formData) {
  function buildPath(path, value, target, index) {
    let name = path[index++];

    if (name === '__proto__') return true;

    const isNumericKey = Number.isFinite(+name);
    const isLast = index >= path.length;
    name = !name && utils$1.isArray(target) ? target.length : name;

    if (isLast) {
      if (utils$1.hasOwnProp(target, name)) {
        target[name] = [target[name], value];
      } else {
        target[name] = value;
      }

      return !isNumericKey;
    }

    if (!target[name] || !utils$1.isObject(target[name])) {
      target[name] = [];
    }

    const result = buildPath(path, value, target[name], index);

    if (result && utils$1.isArray(target[name])) {
      target[name] = arrayToObject(target[name]);
    }

    return !isNumericKey;
  }

  if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
    const obj = {};

    utils$1.forEachEntry(formData, (name, value) => {
      buildPath(parsePropPath(name), value, obj, 0);
    });

    return obj;
  }

  return null;
}

/**
 * It takes a string, tries to parse it, and if it fails, it returns the stringified version
 * of the input
 *
 * @param {any} rawValue - The value to be stringified.
 * @param {Function} parser - A function that parses a string into a JavaScript object.
 * @param {Function} encoder - A function that takes a value and returns a string.
 *
 * @returns {string} A stringified version of the rawValue.
 */
function stringifySafely(rawValue, parser, encoder) {
  if (utils$1.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$1.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

const defaults = {

  transitional: transitionalDefaults,

  adapter: ['xhr', 'http', 'fetch'],

  transformRequest: [function transformRequest(data, headers) {
    const contentType = headers.getContentType() || '';
    const hasJSONContentType = contentType.indexOf('application/json') > -1;
    const isObjectPayload = utils$1.isObject(data);

    if (isObjectPayload && utils$1.isHTMLForm(data)) {
      data = new FormData(data);
    }

    const isFormData = utils$1.isFormData(data);

    if (isFormData) {
      return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
    }

    if (utils$1.isArrayBuffer(data) ||
      utils$1.isBuffer(data) ||
      utils$1.isStream(data) ||
      utils$1.isFile(data) ||
      utils$1.isBlob(data) ||
      utils$1.isReadableStream(data)
    ) {
      return data;
    }
    if (utils$1.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils$1.isURLSearchParams(data)) {
      headers.setContentType('application/x-www-form-urlencoded;charset=utf-8', false);
      return data.toString();
    }

    let isFileList;

    if (isObjectPayload) {
      if (contentType.indexOf('application/x-www-form-urlencoded') > -1) {
        return toURLEncodedForm(data, this.formSerializer).toString();
      }

      if ((isFileList = utils$1.isFileList(data)) || contentType.indexOf('multipart/form-data') > -1) {
        const _FormData = this.env && this.env.FormData;

        return toFormData$1(
          isFileList ? {'files[]': data} : data,
          _FormData && new _FormData(),
          this.formSerializer
        );
      }
    }

    if (isObjectPayload || hasJSONContentType ) {
      headers.setContentType('application/json', false);
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    const transitional = this.transitional || defaults.transitional;
    const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    const JSONRequested = this.responseType === 'json';

    if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
      return data;
    }

    if (data && utils$1.isString(data) && ((forcedJSONParsing && !this.responseType) || JSONRequested)) {
      const silentJSONParsing = transitional && transitional.silentJSONParsing;
      const strictJSONParsing = !silentJSONParsing && JSONRequested;

      try {
        return JSON.parse(data, this.parseReviver);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: platform.classes.FormData,
    Blob: platform.classes.Blob
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*',
      'Content-Type': undefined
    }
  }
};

utils$1.forEach(['delete', 'get', 'head', 'post', 'put', 'patch'], (method) => {
  defaults.headers[method] = {};
});

// RawAxiosHeaders whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
const ignoreDuplicateOf = utils$1.toObjectSet([
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
]);

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} rawHeaders Headers needing to be parsed
 *
 * @returns {Object} Headers parsed into an object
 */
var parseHeaders = rawHeaders => {
  const parsed = {};
  let key;
  let val;
  let i;

  rawHeaders && rawHeaders.split('\n').forEach(function parser(line) {
    i = line.indexOf(':');
    key = line.substring(0, i).trim().toLowerCase();
    val = line.substring(i + 1).trim();

    if (!key || (parsed[key] && ignoreDuplicateOf[key])) {
      return;
    }

    if (key === 'set-cookie') {
      if (parsed[key]) {
        parsed[key].push(val);
      } else {
        parsed[key] = [val];
      }
    } else {
      parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
    }
  });

  return parsed;
};

const $internals = Symbol('internals');

function normalizeHeader(header) {
  return header && String(header).trim().toLowerCase();
}

function normalizeValue(value) {
  if (value === false || value == null) {
    return value;
  }

  return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
}

function parseTokens(str) {
  const tokens = Object.create(null);
  const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
  let match;

  while ((match = tokensRE.exec(str))) {
    tokens[match[1]] = match[2];
  }

  return tokens;
}

const isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());

function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
  if (utils$1.isFunction(filter)) {
    return filter.call(this, value, header);
  }

  if (isHeaderNameFilter) {
    value = header;
  }

  if (!utils$1.isString(value)) return;

  if (utils$1.isString(filter)) {
    return value.indexOf(filter) !== -1;
  }

  if (utils$1.isRegExp(filter)) {
    return filter.test(value);
  }
}

function formatHeader(header) {
  return header.trim()
    .toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
      return char.toUpperCase() + str;
    });
}

function buildAccessors(obj, header) {
  const accessorName = utils$1.toCamelCase(' ' + header);

  ['get', 'set', 'has'].forEach(methodName => {
    Object.defineProperty(obj, methodName + accessorName, {
      value: function(arg1, arg2, arg3) {
        return this[methodName].call(this, header, arg1, arg2, arg3);
      },
      configurable: true
    });
  });
}

let AxiosHeaders$1 = class AxiosHeaders {
  constructor(headers) {
    headers && this.set(headers);
  }

  set(header, valueOrRewrite, rewrite) {
    const self = this;

    function setHeader(_value, _header, _rewrite) {
      const lHeader = normalizeHeader(_header);

      if (!lHeader) {
        throw new Error('header name must be a non-empty string');
      }

      const key = utils$1.findKey(self, lHeader);

      if(!key || self[key] === undefined || _rewrite === true || (_rewrite === undefined && self[key] !== false)) {
        self[key || _header] = normalizeValue(_value);
      }
    }

    const setHeaders = (headers, _rewrite) =>
      utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));

    if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
      setHeaders(header, valueOrRewrite);
    } else if(utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
      setHeaders(parseHeaders(header), valueOrRewrite);
    } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
      let obj = {}, dest, key;
      for (const entry of header) {
        if (!utils$1.isArray(entry)) {
          throw TypeError('Object iterator must return a key-value pair');
        }

        obj[key = entry[0]] = (dest = obj[key]) ?
          (utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]]) : entry[1];
      }

      setHeaders(obj, valueOrRewrite);
    } else {
      header != null && setHeader(valueOrRewrite, header, rewrite);
    }

    return this;
  }

  get(header, parser) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils$1.findKey(this, header);

      if (key) {
        const value = this[key];

        if (!parser) {
          return value;
        }

        if (parser === true) {
          return parseTokens(value);
        }

        if (utils$1.isFunction(parser)) {
          return parser.call(this, value, key);
        }

        if (utils$1.isRegExp(parser)) {
          return parser.exec(value);
        }

        throw new TypeError('parser must be boolean|regexp|function');
      }
    }
  }

  has(header, matcher) {
    header = normalizeHeader(header);

    if (header) {
      const key = utils$1.findKey(this, header);

      return !!(key && this[key] !== undefined && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
    }

    return false;
  }

  delete(header, matcher) {
    const self = this;
    let deleted = false;

    function deleteHeader(_header) {
      _header = normalizeHeader(_header);

      if (_header) {
        const key = utils$1.findKey(self, _header);

        if (key && (!matcher || matchHeaderValue(self, self[key], key, matcher))) {
          delete self[key];

          deleted = true;
        }
      }
    }

    if (utils$1.isArray(header)) {
      header.forEach(deleteHeader);
    } else {
      deleteHeader(header);
    }

    return deleted;
  }

  clear(matcher) {
    const keys = Object.keys(this);
    let i = keys.length;
    let deleted = false;

    while (i--) {
      const key = keys[i];
      if(!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
        delete this[key];
        deleted = true;
      }
    }

    return deleted;
  }

  normalize(format) {
    const self = this;
    const headers = {};

    utils$1.forEach(this, (value, header) => {
      const key = utils$1.findKey(headers, header);

      if (key) {
        self[key] = normalizeValue(value);
        delete self[header];
        return;
      }

      const normalized = format ? formatHeader(header) : String(header).trim();

      if (normalized !== header) {
        delete self[header];
      }

      self[normalized] = normalizeValue(value);

      headers[normalized] = true;
    });

    return this;
  }

  concat(...targets) {
    return this.constructor.concat(this, ...targets);
  }

  toJSON(asStrings) {
    const obj = Object.create(null);

    utils$1.forEach(this, (value, header) => {
      value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(', ') : value);
    });

    return obj;
  }

  [Symbol.iterator]() {
    return Object.entries(this.toJSON())[Symbol.iterator]();
  }

  toString() {
    return Object.entries(this.toJSON()).map(([header, value]) => header + ': ' + value).join('\n');
  }

  getSetCookie() {
    return this.get("set-cookie") || [];
  }

  get [Symbol.toStringTag]() {
    return 'AxiosHeaders';
  }

  static from(thing) {
    return thing instanceof this ? thing : new this(thing);
  }

  static concat(first, ...targets) {
    const computed = new this(first);

    targets.forEach((target) => computed.set(target));

    return computed;
  }

  static accessor(header) {
    const internals = this[$internals] = (this[$internals] = {
      accessors: {}
    });

    const accessors = internals.accessors;
    const prototype = this.prototype;

    function defineAccessor(_header) {
      const lHeader = normalizeHeader(_header);

      if (!accessors[lHeader]) {
        buildAccessors(prototype, _header);
        accessors[lHeader] = true;
      }
    }

    utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);

    return this;
  }
};

AxiosHeaders$1.accessor(['Content-Type', 'Content-Length', 'Accept', 'Accept-Encoding', 'User-Agent', 'Authorization']);

// reserved names hotfix
utils$1.reduceDescriptors(AxiosHeaders$1.prototype, ({value}, key) => {
  let mapped = key[0].toUpperCase() + key.slice(1); // map `set` => `Set`
  return {
    get: () => value,
    set(headerValue) {
      this[mapped] = headerValue;
    }
  }
});

utils$1.freezeMethods(AxiosHeaders$1);

/**
 * Transform the data for a request or a response
 *
 * @param {Array|Function} fns A single function or Array of functions
 * @param {?Object} response The response object
 *
 * @returns {*} The resulting transformed data
 */
function transformData(fns, response) {
  const config = this || defaults;
  const context = response || config;
  const headers = AxiosHeaders$1.from(context.headers);
  let data = context.data;

  utils$1.forEach(fns, function transform(fn) {
    data = fn.call(config, data, headers.normalize(), response ? response.status : undefined);
  });

  headers.normalize();

  return data;
}

function isCancel$1(value) {
  return !!(value && value.__CANCEL__);
}

let CanceledError$1 = class CanceledError extends AxiosError$1 {
  /**
   * A `CanceledError` is an object that is thrown when an operation is canceled.
   *
   * @param {string=} message The message.
   * @param {Object=} config The config.
   * @param {Object=} request The request.
   *
   * @returns {CanceledError} The created error.
   */
  constructor(message, config, request) {
    super(message == null ? 'canceled' : message, AxiosError$1.ERR_CANCELED, config, request);
    this.name = 'CanceledError';
    this.__CANCEL__ = true;
  }
};

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 *
 * @returns {object} The response.
 */
function settle(resolve, reject, response) {
  const validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError$1(
      'Request failed with status code ' + response.status,
      [AxiosError$1.ERR_BAD_REQUEST, AxiosError$1.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
}

function parseProtocol(url) {
  const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
}

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10;
  const bytes = new Array(samplesCount);
  const timestamps = new Array(samplesCount);
  let head = 0;
  let tail = 0;
  let firstSampleTS;

  min = min !== undefined ? min : 1000;

  return function push(chunkLength) {
    const now = Date.now();

    const startedAt = timestamps[tail];

    if (!firstSampleTS) {
      firstSampleTS = now;
    }

    bytes[head] = chunkLength;
    timestamps[head] = now;

    let i = tail;
    let bytesCount = 0;

    while (i !== head) {
      bytesCount += bytes[i++];
      i = i % samplesCount;
    }

    head = (head + 1) % samplesCount;

    if (head === tail) {
      tail = (tail + 1) % samplesCount;
    }

    if (now - firstSampleTS < min) {
      return;
    }

    const passed = startedAt && now - startedAt;

    return passed ? Math.round(bytesCount * 1000 / passed) : undefined;
  };
}

/**
 * Throttle decorator
 * @param {Function} fn
 * @param {Number} freq
 * @return {Function}
 */
function throttle(fn, freq) {
  let timestamp = 0;
  let threshold = 1000 / freq;
  let lastArgs;
  let timer;

  const invoke = (args, now = Date.now()) => {
    timestamp = now;
    lastArgs = null;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    fn(...args);
  };

  const throttled = (...args) => {
    const now = Date.now();
    const passed = now - timestamp;
    if ( passed >= threshold) {
      invoke(args, now);
    } else {
      lastArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          timer = null;
          invoke(lastArgs);
        }, threshold - passed);
      }
    }
  };

  const flush = () => lastArgs && invoke(lastArgs);

  return [throttled, flush];
}

const progressEventReducer = (listener, isDownloadStream, freq = 3) => {
  let bytesNotified = 0;
  const _speedometer = speedometer(50, 250);

  return throttle(e => {
    const loaded = e.loaded;
    const total = e.lengthComputable ? e.total : undefined;
    const progressBytes = loaded - bytesNotified;
    const rate = _speedometer(progressBytes);
    const inRange = loaded <= total;

    bytesNotified = loaded;

    const data = {
      loaded,
      total,
      progress: total ? (loaded / total) : undefined,
      bytes: progressBytes,
      rate: rate ? rate : undefined,
      estimated: rate && total && inRange ? (total - loaded) / rate : undefined,
      event: e,
      lengthComputable: total != null,
      [isDownloadStream ? 'download' : 'upload']: true
    };

    listener(data);
  }, freq);
};

const progressEventDecorator = (total, throttled) => {
  const lengthComputable = total != null;

  return [(loaded) => throttled[0]({
    lengthComputable,
    total,
    loaded
  }), throttled[1]];
};

const asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));

var isURLSameOrigin = platform.hasStandardBrowserEnv ? ((origin, isMSIE) => (url) => {
  url = new URL(url, platform.origin);

  return (
    origin.protocol === url.protocol &&
    origin.host === url.host &&
    (isMSIE || origin.port === url.port)
  );
})(
  new URL(platform.origin),
  platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
) : () => true;

var cookies = platform.hasStandardBrowserEnv ?

  // Standard browser envs support document.cookie
  {
    write(name, value, expires, path, domain, secure, sameSite) {
      if (typeof document === 'undefined') return;

      const cookie = [`${name}=${encodeURIComponent(value)}`];

      if (utils$1.isNumber(expires)) {
        cookie.push(`expires=${new Date(expires).toUTCString()}`);
      }
      if (utils$1.isString(path)) {
        cookie.push(`path=${path}`);
      }
      if (utils$1.isString(domain)) {
        cookie.push(`domain=${domain}`);
      }
      if (secure === true) {
        cookie.push('secure');
      }
      if (utils$1.isString(sameSite)) {
        cookie.push(`SameSite=${sameSite}`);
      }

      document.cookie = cookie.join('; ');
    },

    read(name) {
      if (typeof document === 'undefined') return null;
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    },

    remove(name) {
      this.write(name, '', Date.now() - 86400000, '/');
    }
  }

  :

  // Non-standard browser env (web workers, react-native) lack needed support.
  {
    write() {},
    read() {
      return null;
    },
    remove() {}
  };

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 *
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 *
 * @returns {string} The combined URL
 */
function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/?\/$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 *
 * @returns {string} The combined full path
 */
function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
  let isRelativeUrl = !isAbsoluteURL(requestedURL);
  if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
}

const headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 *
 * @returns {Object} New object resulting from merging config2 to config1
 */
function mergeConfig$1(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  const config = {};

  function getMergedValue(target, source, prop, caseless) {
    if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
      return utils$1.merge.call({ caseless }, target, source);
    } else if (utils$1.isPlainObject(source)) {
      return utils$1.merge({}, source);
    } else if (utils$1.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  function mergeDeepProperties(a, b, prop, caseless) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(a, b, prop, caseless);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(undefined, a, prop, caseless);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(undefined, b);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(a, b) {
    if (!utils$1.isUndefined(b)) {
      return getMergedValue(undefined, b);
    } else if (!utils$1.isUndefined(a)) {
      return getMergedValue(undefined, a);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(a, b, prop) {
    if (prop in config2) {
      return getMergedValue(a, b);
    } else if (prop in config1) {
      return getMergedValue(undefined, a);
    }
  }

  const mergeMap = {
    url: valueFromConfig2,
    method: valueFromConfig2,
    data: valueFromConfig2,
    baseURL: defaultToConfig2,
    transformRequest: defaultToConfig2,
    transformResponse: defaultToConfig2,
    paramsSerializer: defaultToConfig2,
    timeout: defaultToConfig2,
    timeoutMessage: defaultToConfig2,
    withCredentials: defaultToConfig2,
    withXSRFToken: defaultToConfig2,
    adapter: defaultToConfig2,
    responseType: defaultToConfig2,
    xsrfCookieName: defaultToConfig2,
    xsrfHeaderName: defaultToConfig2,
    onUploadProgress: defaultToConfig2,
    onDownloadProgress: defaultToConfig2,
    decompress: defaultToConfig2,
    maxContentLength: defaultToConfig2,
    maxBodyLength: defaultToConfig2,
    beforeRedirect: defaultToConfig2,
    transport: defaultToConfig2,
    httpAgent: defaultToConfig2,
    httpsAgent: defaultToConfig2,
    cancelToken: defaultToConfig2,
    socketPath: defaultToConfig2,
    responseEncoding: defaultToConfig2,
    validateStatus: mergeDirectKeys,
    headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
  };

  utils$1.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
    const merge = mergeMap[prop] || mergeDeepProperties;
    const configValue = merge(config1[prop], config2[prop], prop);
    (utils$1.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
}

var resolveConfig = (config) => {
  const newConfig = mergeConfig$1({}, config);

  let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;

  newConfig.headers = headers = AxiosHeaders$1.from(headers);

  newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);

  // HTTP basic authentication
  if (auth) {
    headers.set('Authorization', 'Basic ' +
      btoa((auth.username || '') + ':' + (auth.password ? unescape(encodeURIComponent(auth.password)) : ''))
    );
  }

  if (utils$1.isFormData(data)) {
    if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
      headers.setContentType(undefined); // browser handles it
    } else if (utils$1.isFunction(data.getHeaders)) {
      // Node.js FormData (like form-data package)
      const formHeaders = data.getHeaders();
      // Only set safe headers to avoid overwriting security headers
      const allowedHeaders = ['content-type', 'content-length'];
      Object.entries(formHeaders).forEach(([key, val]) => {
        if (allowedHeaders.includes(key.toLowerCase())) {
          headers.set(key, val);
        }
      });
    }
  }  

  // Add xsrf header
  // This is only done if running in a standard browser environment.
  // Specifically not if we're in a web worker, or react-native.

  if (platform.hasStandardBrowserEnv) {
    withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));

    if (withXSRFToken || (withXSRFToken !== false && isURLSameOrigin(newConfig.url))) {
      // Add xsrf header
      const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);

      if (xsrfValue) {
        headers.set(xsrfHeaderName, xsrfValue);
      }
    }
  }

  return newConfig;
};

const isXHRAdapterSupported = typeof XMLHttpRequest !== 'undefined';

var xhrAdapter = isXHRAdapterSupported && function (config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    const _config = resolveConfig(config);
    let requestData = _config.data;
    const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
    let {responseType, onUploadProgress, onDownloadProgress} = _config;
    let onCanceled;
    let uploadThrottled, downloadThrottled;
    let flushUpload, flushDownload;

    function done() {
      flushUpload && flushUpload(); // flush events
      flushDownload && flushDownload(); // flush events

      _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);

      _config.signal && _config.signal.removeEventListener('abort', onCanceled);
    }

    let request = new XMLHttpRequest();

    request.open(_config.method.toUpperCase(), _config.url, true);

    // Set the request timeout in MS
    request.timeout = _config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      const responseHeaders = AxiosHeaders$1.from(
        'getAllResponseHeaders' in request && request.getAllResponseHeaders()
      );
      const responseData = !responseType || responseType === 'text' || responseType === 'json' ?
        request.responseText : request.response;
      const response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config,
        request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(new AxiosError$1('Request aborted', AxiosError$1.ECONNABORTED, config, request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
  request.onerror = function handleError(event) {
       // Browsers deliver a ProgressEvent in XHR onerror
       // (message may be empty; when present, surface it)
       // See https://developer.mozilla.org/docs/Web/API/XMLHttpRequest/error_event
       const msg = event && event.message ? event.message : 'Network Error';
       const err = new AxiosError$1(msg, AxiosError$1.ERR_NETWORK, config, request);
       // attach the underlying event for consumers who want details
       err.event = event || null;
       reject(err);
       request = null;
    };
    
    // Handle timeout
    request.ontimeout = function handleTimeout() {
      let timeoutErrorMessage = _config.timeout ? 'timeout of ' + _config.timeout + 'ms exceeded' : 'timeout exceeded';
      const transitional = _config.transitional || transitionalDefaults;
      if (_config.timeoutErrorMessage) {
        timeoutErrorMessage = _config.timeoutErrorMessage;
      }
      reject(new AxiosError$1(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError$1.ETIMEDOUT : AxiosError$1.ECONNABORTED,
        config,
        request));

      // Clean up request
      request = null;
    };

    // Remove Content-Type if data is undefined
    requestData === undefined && requestHeaders.setContentType(null);

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
        request.setRequestHeader(key, val);
      });
    }

    // Add withCredentials to request if needed
    if (!utils$1.isUndefined(_config.withCredentials)) {
      request.withCredentials = !!_config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = _config.responseType;
    }

    // Handle progress if needed
    if (onDownloadProgress) {
      ([downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true));
      request.addEventListener('progress', downloadThrottled);
    }

    // Not all browsers support upload events
    if (onUploadProgress && request.upload) {
      ([uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress));

      request.upload.addEventListener('progress', uploadThrottled);

      request.upload.addEventListener('loadend', flushUpload);
    }

    if (_config.cancelToken || _config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = cancel => {
        if (!request) {
          return;
        }
        reject(!cancel || cancel.type ? new CanceledError$1(null, config, request) : cancel);
        request.abort();
        request = null;
      };

      _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
      if (_config.signal) {
        _config.signal.aborted ? onCanceled() : _config.signal.addEventListener('abort', onCanceled);
      }
    }

    const protocol = parseProtocol(_config.url);

    if (protocol && platform.protocols.indexOf(protocol) === -1) {
      reject(new AxiosError$1('Unsupported protocol ' + protocol + ':', AxiosError$1.ERR_BAD_REQUEST, config));
      return;
    }


    // Send the request
    request.send(requestData || null);
  });
};

const composeSignals = (signals, timeout) => {
  const {length} = (signals = signals ? signals.filter(Boolean) : []);

  if (timeout || length) {
    let controller = new AbortController();

    let aborted;

    const onabort = function (reason) {
      if (!aborted) {
        aborted = true;
        unsubscribe();
        const err = reason instanceof Error ? reason : this.reason;
        controller.abort(err instanceof AxiosError$1 ? err : new CanceledError$1(err instanceof Error ? err.message : err));
      }
    };

    let timer = timeout && setTimeout(() => {
      timer = null;
      onabort(new AxiosError$1(`timeout of ${timeout}ms exceeded`, AxiosError$1.ETIMEDOUT));
    }, timeout);

    const unsubscribe = () => {
      if (signals) {
        timer && clearTimeout(timer);
        timer = null;
        signals.forEach(signal => {
          signal.unsubscribe ? signal.unsubscribe(onabort) : signal.removeEventListener('abort', onabort);
        });
        signals = null;
      }
    };

    signals.forEach((signal) => signal.addEventListener('abort', onabort));

    const {signal} = controller;

    signal.unsubscribe = () => utils$1.asap(unsubscribe);

    return signal;
  }
};

const streamChunk = function* (chunk, chunkSize) {
  let len = chunk.byteLength;

  if (len < chunkSize) {
    yield chunk;
    return;
  }

  let pos = 0;
  let end;

  while (pos < len) {
    end = pos + chunkSize;
    yield chunk.slice(pos, end);
    pos = end;
  }
};

const readBytes = async function* (iterable, chunkSize) {
  for await (const chunk of readStream(iterable)) {
    yield* streamChunk(chunk, chunkSize);
  }
};

const readStream = async function* (stream) {
  if (stream[Symbol.asyncIterator]) {
    yield* stream;
    return;
  }

  const reader = stream.getReader();
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) {
        break;
      }
      yield value;
    }
  } finally {
    await reader.cancel();
  }
};

const trackStream = (stream, chunkSize, onProgress, onFinish) => {
  const iterator = readBytes(stream, chunkSize);

  let bytes = 0;
  let done;
  let _onFinish = (e) => {
    if (!done) {
      done = true;
      onFinish && onFinish(e);
    }
  };

  return new ReadableStream({
    async pull(controller) {
      try {
        const {done, value} = await iterator.next();

        if (done) {
         _onFinish();
          controller.close();
          return;
        }

        let len = value.byteLength;
        if (onProgress) {
          let loadedBytes = bytes += len;
          onProgress(loadedBytes);
        }
        controller.enqueue(new Uint8Array(value));
      } catch (err) {
        _onFinish(err);
        throw err;
      }
    },
    cancel(reason) {
      _onFinish(reason);
      return iterator.return();
    }
  }, {
    highWaterMark: 2
  })
};

const DEFAULT_CHUNK_SIZE = 64 * 1024;

const {isFunction} = utils$1;

const globalFetchAPI = (({Request, Response}) => ({
  Request, Response
}))(utils$1.global);

const {
  ReadableStream: ReadableStream$1, TextEncoder: TextEncoder$1
} = utils$1.global;


const test = (fn, ...args) => {
  try {
    return !!fn(...args);
  } catch (e) {
    return false
  }
};

const factory = (env) => {
  env = utils$1.merge.call({
    skipUndefined: true
  }, globalFetchAPI, env);

  const {fetch: envFetch, Request, Response} = env;
  const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === 'function';
  const isRequestSupported = isFunction(Request);
  const isResponseSupported = isFunction(Response);

  if (!isFetchSupported) {
    return false;
  }

  const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream$1);

  const encodeText = isFetchSupported && (typeof TextEncoder$1 === 'function' ?
      ((encoder) => (str) => encoder.encode(str))(new TextEncoder$1()) :
      async (str) => new Uint8Array(await new Request(str).arrayBuffer())
  );

  const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
    let duplexAccessed = false;

    const hasContentType = new Request(platform.origin, {
      body: new ReadableStream$1(),
      method: 'POST',
      get duplex() {
        duplexAccessed = true;
        return 'half';
      },
    }).headers.has('Content-Type');

    return duplexAccessed && !hasContentType;
  });

  const supportsResponseStream = isResponseSupported && isReadableStreamSupported &&
    test(() => utils$1.isReadableStream(new Response('').body));

  const resolvers = {
    stream: supportsResponseStream && ((res) => res.body)
  };

  isFetchSupported && ((() => {
    ['text', 'arrayBuffer', 'blob', 'formData', 'stream'].forEach(type => {
      !resolvers[type] && (resolvers[type] = (res, config) => {
        let method = res && res[type];

        if (method) {
          return method.call(res);
        }

        throw new AxiosError$1(`Response type '${type}' is not supported`, AxiosError$1.ERR_NOT_SUPPORT, config);
      });
    });
  })());

  const getBodyLength = async (body) => {
    if (body == null) {
      return 0;
    }

    if (utils$1.isBlob(body)) {
      return body.size;
    }

    if (utils$1.isSpecCompliantForm(body)) {
      const _request = new Request(platform.origin, {
        method: 'POST',
        body,
      });
      return (await _request.arrayBuffer()).byteLength;
    }

    if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
      return body.byteLength;
    }

    if (utils$1.isURLSearchParams(body)) {
      body = body + '';
    }

    if (utils$1.isString(body)) {
      return (await encodeText(body)).byteLength;
    }
  };

  const resolveBodyLength = async (headers, body) => {
    const length = utils$1.toFiniteNumber(headers.getContentLength());

    return length == null ? getBodyLength(body) : length;
  };

  return async (config) => {
    let {
      url,
      method,
      data,
      signal,
      cancelToken,
      timeout,
      onDownloadProgress,
      onUploadProgress,
      responseType,
      headers,
      withCredentials = 'same-origin',
      fetchOptions
    } = resolveConfig(config);

    let _fetch = envFetch || fetch;

    responseType = responseType ? (responseType + '').toLowerCase() : 'text';

    let composedSignal = composeSignals([signal, cancelToken && cancelToken.toAbortSignal()], timeout);

    let request = null;

    const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
      composedSignal.unsubscribe();
    });

    let requestContentLength;

    try {
      if (
        onUploadProgress && supportsRequestStream && method !== 'get' && method !== 'head' &&
        (requestContentLength = await resolveBodyLength(headers, data)) !== 0
      ) {
        let _request = new Request(url, {
          method: 'POST',
          body: data,
          duplex: "half"
        });

        let contentTypeHeader;

        if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get('content-type'))) {
          headers.setContentType(contentTypeHeader);
        }

        if (_request.body) {
          const [onProgress, flush] = progressEventDecorator(
            requestContentLength,
            progressEventReducer(asyncDecorator(onUploadProgress))
          );

          data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
        }
      }

      if (!utils$1.isString(withCredentials)) {
        withCredentials = withCredentials ? 'include' : 'omit';
      }

      // Cloudflare Workers throws when credentials are defined
      // see https://github.com/cloudflare/workerd/issues/902
      const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;

      const resolvedOptions = {
        ...fetchOptions,
        signal: composedSignal,
        method: method.toUpperCase(),
        headers: headers.normalize().toJSON(),
        body: data,
        duplex: "half",
        credentials: isCredentialsSupported ? withCredentials : undefined
      };

      request = isRequestSupported && new Request(url, resolvedOptions);

      let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url, resolvedOptions));

      const isStreamResponse = supportsResponseStream && (responseType === 'stream' || responseType === 'response');

      if (supportsResponseStream && (onDownloadProgress || (isStreamResponse && unsubscribe))) {
        const options = {};

        ['status', 'statusText', 'headers'].forEach(prop => {
          options[prop] = response[prop];
        });

        const responseContentLength = utils$1.toFiniteNumber(response.headers.get('content-length'));

        const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
          responseContentLength,
          progressEventReducer(asyncDecorator(onDownloadProgress), true)
        ) || [];

        response = new Response(
          trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
            flush && flush();
            unsubscribe && unsubscribe();
          }),
          options
        );
      }

      responseType = responseType || 'text';

      let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || 'text'](response, config);

      !isStreamResponse && unsubscribe && unsubscribe();

      return await new Promise((resolve, reject) => {
        settle(resolve, reject, {
          data: responseData,
          headers: AxiosHeaders$1.from(response.headers),
          status: response.status,
          statusText: response.statusText,
          config,
          request
        });
      })
    } catch (err) {
      unsubscribe && unsubscribe();

      if (err && err.name === 'TypeError' && /Load failed|fetch/i.test(err.message)) {
        throw Object.assign(
          new AxiosError$1('Network Error', AxiosError$1.ERR_NETWORK, config, request),
          {
            cause: err.cause || err
          }
        )
      }

      throw AxiosError$1.from(err, err && err.code, config, request);
    }
  }
};

const seedCache = new Map();

const getFetch = (config) => {
  let env = (config && config.env) || {};
  const {fetch, Request, Response} = env;
  const seeds = [
    Request, Response, fetch
  ];

  let len = seeds.length, i = len,
    seed, target, map = seedCache;

  while (i--) {
    seed = seeds[i];
    target = map.get(seed);

    target === undefined && map.set(seed, target = (i ? new Map() : factory(env)));

    map = target;
  }

  return target;
};

getFetch();

/**
 * Known adapters mapping.
 * Provides environment-specific adapters for Axios:
 * - `http` for Node.js
 * - `xhr` for browsers
 * - `fetch` for fetch API-based requests
 * 
 * @type {Object<string, Function|Object>}
 */
const knownAdapters = {
  http: httpAdapter,
  xhr: xhrAdapter,
  fetch: {
    get: getFetch,
  }
};

// Assign adapter names for easier debugging and identification
utils$1.forEach(knownAdapters, (fn, value) => {
  if (fn) {
    try {
      Object.defineProperty(fn, 'name', { value });
    } catch (e) {
      // eslint-disable-next-line no-empty
    }
    Object.defineProperty(fn, 'adapterName', { value });
  }
});

/**
 * Render a rejection reason string for unknown or unsupported adapters
 * 
 * @param {string} reason
 * @returns {string}
 */
const renderReason = (reason) => `- ${reason}`;

/**
 * Check if the adapter is resolved (function, null, or false)
 * 
 * @param {Function|null|false} adapter
 * @returns {boolean}
 */
const isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;

/**
 * Get the first suitable adapter from the provided list.
 * Tries each adapter in order until a supported one is found.
 * Throws an AxiosError if no adapter is suitable.
 * 
 * @param {Array<string|Function>|string|Function} adapters - Adapter(s) by name or function.
 * @param {Object} config - Axios request configuration
 * @throws {AxiosError} If no suitable adapter is available
 * @returns {Function} The resolved adapter function
 */
function getAdapter$1(adapters, config) {
  adapters = utils$1.isArray(adapters) ? adapters : [adapters];

  const { length } = adapters;
  let nameOrAdapter;
  let adapter;

  const rejectedReasons = {};

  for (let i = 0; i < length; i++) {
    nameOrAdapter = adapters[i];
    let id;

    adapter = nameOrAdapter;

    if (!isResolvedHandle(nameOrAdapter)) {
      adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];

      if (adapter === undefined) {
        throw new AxiosError$1(`Unknown adapter '${id}'`);
      }
    }

    if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
      break;
    }

    rejectedReasons[id || '#' + i] = adapter;
  }

  if (!adapter) {
    const reasons = Object.entries(rejectedReasons)
      .map(([id, state]) => `adapter ${id} ` +
        (state === false ? 'is not supported by the environment' : 'is not available in the build')
      );

    let s = length ?
      (reasons.length > 1 ? 'since :\n' + reasons.map(renderReason).join('\n') : ' ' + renderReason(reasons[0])) :
      'as no adapter specified';

    throw new AxiosError$1(
      `There is no suitable adapter to dispatch the request ` + s,
      'ERR_NOT_SUPPORT'
    );
  }

  return adapter;
}

/**
 * Exports Axios adapters and utility to resolve an adapter
 */
var adapters = {
  /**
   * Resolve an adapter from a list of adapter names or functions.
   * @type {Function}
   */
  getAdapter: getAdapter$1,

  /**
   * Exposes all known adapters
   * @type {Object<string, Function|Object>}
   */
  adapters: knownAdapters
};

/**
 * Throws a `CanceledError` if cancellation has been requested.
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError$1(null, config);
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  config.headers = AxiosHeaders$1.from(config.headers);

  // Transform request data
  config.data = transformData.call(
    config,
    config.transformRequest
  );

  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  const adapter = adapters.getAdapter(config.adapter || defaults.adapter, config);

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );

    response.headers = AxiosHeaders$1.from(response.headers);

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel$1(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  });
}

const VERSION$1 = "1.13.4";

const validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach((type, i) => {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

const deprecatedWarnings = {};

/**
 * Transitional option validator
 *
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 *
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION$1 + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return (value, opt, opts) => {
    if (validator === false) {
      throw new AxiosError$1(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError$1.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

validators$1.spelling = function spelling(correctSpelling) {
  return (value, opt) => {
    // eslint-disable-next-line no-console
    console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
    return true;
  }
};

/**
 * Assert object's properties type
 *
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 *
 * @returns {object}
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new AxiosError$1('options must be an object', AxiosError$1.ERR_BAD_OPTION_VALUE);
  }
  const keys = Object.keys(options);
  let i = keys.length;
  while (i-- > 0) {
    const opt = keys[i];
    const validator = schema[opt];
    if (validator) {
      const value = options[opt];
      const result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError$1('option ' + opt + ' must be ' + result, AxiosError$1.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError$1('Unknown option ' + opt, AxiosError$1.ERR_BAD_OPTION);
    }
  }
}

var validator = {
  assertOptions,
  validators: validators$1
};

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
let Axios$1 = class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig || {};
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager()
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  async request(configOrUrl, config) {
    try {
      return await this._request(configOrUrl, config);
    } catch (err) {
      if (err instanceof Error) {
        let dummy = {};

        Error.captureStackTrace ? Error.captureStackTrace(dummy) : (dummy = new Error());

        // slice off the Error: ... line
        const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, '') : '';
        try {
          if (!err.stack) {
            err.stack = stack;
            // match without the 2 top stack lines
          } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ''))) {
            err.stack += '\n' + stack;
          }
        } catch (e) {
          // ignore the case where "stack" is an un-writable property
        }
      }

      throw err;
    }
  }

  _request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    config = mergeConfig$1(this.defaults, config);

    const {transitional, paramsSerializer, headers} = config;

    if (transitional !== undefined) {
      validator.assertOptions(transitional, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }

    if (paramsSerializer != null) {
      if (utils$1.isFunction(paramsSerializer)) {
        config.paramsSerializer = {
          serialize: paramsSerializer
        };
      } else {
        validator.assertOptions(paramsSerializer, {
          encode: validators.function,
          serialize: validators.function
        }, true);
      }
    }

    // Set config.allowAbsoluteUrls
    if (config.allowAbsoluteUrls !== undefined) ; else if (this.defaults.allowAbsoluteUrls !== undefined) {
      config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
    } else {
      config.allowAbsoluteUrls = true;
    }

    validator.assertOptions(config, {
      baseUrl: validators.spelling('baseURL'),
      withXsrfToken: validators.spelling('withXSRFToken')
    }, true);

    // Set config.method
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    // Flatten headers
    let contextHeaders = headers && utils$1.merge(
      headers.common,
      headers[config.method]
    );

    headers && utils$1.forEach(
      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
      (method) => {
        delete headers[method];
      }
    );

    config.headers = AxiosHeaders$1.concat(contextHeaders, headers);

    // filter out skipped interceptors
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) {
      const chain = [dispatchRequest.bind(this), undefined];
      chain.unshift(...requestInterceptorChain);
      chain.push(...responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig$1(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
};

// Provide aliases for supported request methods
utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios$1.prototype[method] = function(url, config) {
    return this.request(mergeConfig$1(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});

utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig$1(config || {}, {
        method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url,
        data
      }));
    };
  }

  Axios$1.prototype[method] = generateHTTPMethod();

  Axios$1.prototype[method + 'Form'] = generateHTTPMethod(true);
});

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @param {Function} executor The executor function.
 *
 * @returns {CancelToken}
 */
let CancelToken$1 = class CancelToken {
  constructor(executor) {
    if (typeof executor !== 'function') {
      throw new TypeError('executor must be a function.');
    }

    let resolvePromise;

    this.promise = new Promise(function promiseExecutor(resolve) {
      resolvePromise = resolve;
    });

    const token = this;

    // eslint-disable-next-line func-names
    this.promise.then(cancel => {
      if (!token._listeners) return;

      let i = token._listeners.length;

      while (i-- > 0) {
        token._listeners[i](cancel);
      }
      token._listeners = null;
    });

    // eslint-disable-next-line func-names
    this.promise.then = onfulfilled => {
      let _resolve;
      // eslint-disable-next-line func-names
      const promise = new Promise(resolve => {
        token.subscribe(resolve);
        _resolve = resolve;
      }).then(onfulfilled);

      promise.cancel = function reject() {
        token.unsubscribe(_resolve);
      };

      return promise;
    };

    executor(function cancel(message, config, request) {
      if (token.reason) {
        // Cancellation has already been requested
        return;
      }

      token.reason = new CanceledError$1(message, config, request);
      resolvePromise(token.reason);
    });
  }

  /**
   * Throws a `CanceledError` if cancellation has been requested.
   */
  throwIfRequested() {
    if (this.reason) {
      throw this.reason;
    }
  }

  /**
   * Subscribe to the cancel signal
   */

  subscribe(listener) {
    if (this.reason) {
      listener(this.reason);
      return;
    }

    if (this._listeners) {
      this._listeners.push(listener);
    } else {
      this._listeners = [listener];
    }
  }

  /**
   * Unsubscribe from the cancel signal
   */

  unsubscribe(listener) {
    if (!this._listeners) {
      return;
    }
    const index = this._listeners.indexOf(listener);
    if (index !== -1) {
      this._listeners.splice(index, 1);
    }
  }

  toAbortSignal() {
    const controller = new AbortController();

    const abort = (err) => {
      controller.abort(err);
    };

    this.subscribe(abort);

    controller.signal.unsubscribe = () => this.unsubscribe(abort);

    return controller.signal;
  }

  /**
   * Returns an object that contains a new `CancelToken` and a function that, when called,
   * cancels the `CancelToken`.
   */
  static source() {
    let cancel;
    const token = new CancelToken(function executor(c) {
      cancel = c;
    });
    return {
      token,
      cancel
    };
  }
};

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  const args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 *
 * @returns {Function}
 */
function spread$1(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
}

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 *
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
function isAxiosError$1(payload) {
  return utils$1.isObject(payload) && (payload.isAxiosError === true);
}

const HttpStatusCode$1 = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,
  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,
  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  Unused: 306,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,
  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableEntity: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,
  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HttpVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
  WebServerIsDown: 521,
  ConnectionTimedOut: 522,
  OriginIsUnreachable: 523,
  TimeoutOccurred: 524,
  SslHandshakeFailed: 525,
  InvalidSslCertificate: 526,
};

Object.entries(HttpStatusCode$1).forEach(([key, value]) => {
  HttpStatusCode$1[value] = key;
});

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  const context = new Axios$1(defaultConfig);
  const instance = bind(Axios$1.prototype.request, context);

  // Copy axios.prototype to instance
  utils$1.extend(instance, Axios$1.prototype, context, {allOwnKeys: true});

  // Copy context to instance
  utils$1.extend(instance, context, null, {allOwnKeys: true});

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig$1(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
const axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios$1;

// Expose Cancel & CancelToken
axios.CanceledError = CanceledError$1;
axios.CancelToken = CancelToken$1;
axios.isCancel = isCancel$1;
axios.VERSION = VERSION$1;
axios.toFormData = toFormData$1;

// Expose AxiosError class
axios.AxiosError = AxiosError$1;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = spread$1;

// Expose isAxiosError
axios.isAxiosError = isAxiosError$1;

// Expose mergeConfig
axios.mergeConfig = mergeConfig$1;

axios.AxiosHeaders = AxiosHeaders$1;

axios.formToJSON = thing => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);

axios.getAdapter = adapters.getAdapter;

axios.HttpStatusCode = HttpStatusCode$1;

axios.default = axios;

// This module is intended to unwrap Axios default export as named.
// Keep top-level export same with static properties
// so that it can keep same with es module or cjs
const {
  Axios,
  AxiosError,
  CanceledError,
  isCancel,
  CancelToken,
  VERSION,
  all,
  Cancel,
  isAxiosError,
  spread,
  toFormData,
  AxiosHeaders,
  HttpStatusCode,
  formToJSON,
  getAdapter,
  mergeConfig
} = axios;

// export const apiUrl = "https://staging.app.thesampark.com";
// export const apiUrl = "http://localhost:8006"; // web app
const apiUrl = "http://10.0.2.2:8006"; // android emulator
// export const apiUrl = "https://admin-backend.thesampark.com";

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function getAugmentedNamespace(n) {
  if (n.__esModule) return n;
  var f = n.default;
	if (typeof f == "function") {
		var a = function a () {
			if (this instanceof a) {
        return Reflect.construct(f, arguments, this.constructor);
			}
			return f.apply(this, arguments);
		};
		a.prototype = f.prototype;
  } else a = {};
  Object.defineProperty(a, '__esModule', {value: true});
	Object.keys(n).forEach(function (k) {
		var d = Object.getOwnPropertyDescriptor(n, k);
		Object.defineProperty(a, k, d.get ? d : {
			enumerable: true,
			get: function () {
				return n[k];
			}
		});
	});
	return a;
}

var cryptoJs = {exports: {}};

function commonjsRequire(path) {
	throw new Error('Could not dynamically require "' + path + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}

var core = {exports: {}};

var _nodeResolve_empty = {};

var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    default: _nodeResolve_empty
});

var require$$0 = /*@__PURE__*/getAugmentedNamespace(_nodeResolve_empty$1);

var hasRequiredCore;

function requireCore () {
	if (hasRequiredCore) return core.exports;
	hasRequiredCore = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory();
			}
		}(commonjsGlobal, function () {

			/*globals window, global, require*/

			/**
			 * CryptoJS core components.
			 */
			var CryptoJS = CryptoJS || (function (Math, undefined$1) {

			    var crypto;

			    // Native crypto from window (Browser)
			    if (typeof window !== 'undefined' && window.crypto) {
			        crypto = window.crypto;
			    }

			    // Native crypto in web worker (Browser)
			    if (typeof self !== 'undefined' && self.crypto) {
			        crypto = self.crypto;
			    }

			    // Native crypto from worker
			    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
			        crypto = globalThis.crypto;
			    }

			    // Native (experimental IE 11) crypto from window (Browser)
			    if (!crypto && typeof window !== 'undefined' && window.msCrypto) {
			        crypto = window.msCrypto;
			    }

			    // Native crypto from global (NodeJS)
			    if (!crypto && typeof commonjsGlobal !== 'undefined' && commonjsGlobal.crypto) {
			        crypto = commonjsGlobal.crypto;
			    }

			    // Native crypto import via require (NodeJS)
			    if (!crypto && typeof commonjsRequire === 'function') {
			        try {
			            crypto = require$$0;
			        } catch (err) {}
			    }

			    /*
			     * Cryptographically secure pseudorandom number generator
			     *
			     * As Math.random() is cryptographically not safe to use
			     */
			    var cryptoSecureRandomInt = function () {
			        if (crypto) {
			            // Use getRandomValues method (Browser)
			            if (typeof crypto.getRandomValues === 'function') {
			                try {
			                    return crypto.getRandomValues(new Uint32Array(1))[0];
			                } catch (err) {}
			            }

			            // Use randomBytes method (NodeJS)
			            if (typeof crypto.randomBytes === 'function') {
			                try {
			                    return crypto.randomBytes(4).readInt32LE();
			                } catch (err) {}
			            }
			        }

			        throw new Error('Native crypto module could not be used to get secure random number.');
			    };

			    /*
			     * Local polyfill of Object.create

			     */
			    var create = Object.create || (function () {
			        function F() {}

			        return function (obj) {
			            var subtype;

			            F.prototype = obj;

			            subtype = new F();

			            F.prototype = null;

			            return subtype;
			        };
			    }());

			    /**
			     * CryptoJS namespace.
			     */
			    var C = {};

			    /**
			     * Library namespace.
			     */
			    var C_lib = C.lib = {};

			    /**
			     * Base object for prototypal inheritance.
			     */
			    var Base = C_lib.Base = (function () {


			        return {
			            /**
			             * Creates a new object that inherits from this object.
			             *
			             * @param {Object} overrides Properties to copy into the new object.
			             *
			             * @return {Object} The new object.
			             *
			             * @static
			             *
			             * @example
			             *
			             *     var MyType = CryptoJS.lib.Base.extend({
			             *         field: 'value',
			             *
			             *         method: function () {
			             *         }
			             *     });
			             */
			            extend: function (overrides) {
			                // Spawn
			                var subtype = create(this);

			                // Augment
			                if (overrides) {
			                    subtype.mixIn(overrides);
			                }

			                // Create default initializer
			                if (!subtype.hasOwnProperty('init') || this.init === subtype.init) {
			                    subtype.init = function () {
			                        subtype.$super.init.apply(this, arguments);
			                    };
			                }

			                // Initializer's prototype is the subtype object
			                subtype.init.prototype = subtype;

			                // Reference supertype
			                subtype.$super = this;

			                return subtype;
			            },

			            /**
			             * Extends this object and runs the init method.
			             * Arguments to create() will be passed to init().
			             *
			             * @return {Object} The new object.
			             *
			             * @static
			             *
			             * @example
			             *
			             *     var instance = MyType.create();
			             */
			            create: function () {
			                var instance = this.extend();
			                instance.init.apply(instance, arguments);

			                return instance;
			            },

			            /**
			             * Initializes a newly created object.
			             * Override this method to add some logic when your objects are created.
			             *
			             * @example
			             *
			             *     var MyType = CryptoJS.lib.Base.extend({
			             *         init: function () {
			             *             // ...
			             *         }
			             *     });
			             */
			            init: function () {
			            },

			            /**
			             * Copies properties into this object.
			             *
			             * @param {Object} properties The properties to mix in.
			             *
			             * @example
			             *
			             *     MyType.mixIn({
			             *         field: 'value'
			             *     });
			             */
			            mixIn: function (properties) {
			                for (var propertyName in properties) {
			                    if (properties.hasOwnProperty(propertyName)) {
			                        this[propertyName] = properties[propertyName];
			                    }
			                }

			                // IE won't copy toString using the loop above
			                if (properties.hasOwnProperty('toString')) {
			                    this.toString = properties.toString;
			                }
			            },

			            /**
			             * Creates a copy of this object.
			             *
			             * @return {Object} The clone.
			             *
			             * @example
			             *
			             *     var clone = instance.clone();
			             */
			            clone: function () {
			                return this.init.prototype.extend(this);
			            }
			        };
			    }());

			    /**
			     * An array of 32-bit words.
			     *
			     * @property {Array} words The array of 32-bit words.
			     * @property {number} sigBytes The number of significant bytes in this word array.
			     */
			    var WordArray = C_lib.WordArray = Base.extend({
			        /**
			         * Initializes a newly created word array.
			         *
			         * @param {Array} words (Optional) An array of 32-bit words.
			         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.lib.WordArray.create();
			         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607]);
			         *     var wordArray = CryptoJS.lib.WordArray.create([0x00010203, 0x04050607], 6);
			         */
			        init: function (words, sigBytes) {
			            words = this.words = words || [];

			            if (sigBytes != undefined$1) {
			                this.sigBytes = sigBytes;
			            } else {
			                this.sigBytes = words.length * 4;
			            }
			        },

			        /**
			         * Converts this word array to a string.
			         *
			         * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: CryptoJS.enc.Hex
			         *
			         * @return {string} The stringified word array.
			         *
			         * @example
			         *
			         *     var string = wordArray + '';
			         *     var string = wordArray.toString();
			         *     var string = wordArray.toString(CryptoJS.enc.Utf8);
			         */
			        toString: function (encoder) {
			            return (encoder || Hex).stringify(this);
			        },

			        /**
			         * Concatenates a word array to this word array.
			         *
			         * @param {WordArray} wordArray The word array to append.
			         *
			         * @return {WordArray} This word array.
			         *
			         * @example
			         *
			         *     wordArray1.concat(wordArray2);
			         */
			        concat: function (wordArray) {
			            // Shortcuts
			            var thisWords = this.words;
			            var thatWords = wordArray.words;
			            var thisSigBytes = this.sigBytes;
			            var thatSigBytes = wordArray.sigBytes;

			            // Clamp excess bits
			            this.clamp();

			            // Concat
			            if (thisSigBytes % 4) {
			                // Copy one byte at a time
			                for (var i = 0; i < thatSigBytes; i++) {
			                    var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
			                    thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
			                }
			            } else {
			                // Copy one word at a time
			                for (var j = 0; j < thatSigBytes; j += 4) {
			                    thisWords[(thisSigBytes + j) >>> 2] = thatWords[j >>> 2];
			                }
			            }
			            this.sigBytes += thatSigBytes;

			            // Chainable
			            return this;
			        },

			        /**
			         * Removes insignificant bits.
			         *
			         * @example
			         *
			         *     wordArray.clamp();
			         */
			        clamp: function () {
			            // Shortcuts
			            var words = this.words;
			            var sigBytes = this.sigBytes;

			            // Clamp
			            words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
			            words.length = Math.ceil(sigBytes / 4);
			        },

			        /**
			         * Creates a copy of this word array.
			         *
			         * @return {WordArray} The clone.
			         *
			         * @example
			         *
			         *     var clone = wordArray.clone();
			         */
			        clone: function () {
			            var clone = Base.clone.call(this);
			            clone.words = this.words.slice(0);

			            return clone;
			        },

			        /**
			         * Creates a word array filled with random bytes.
			         *
			         * @param {number} nBytes The number of random bytes to generate.
			         *
			         * @return {WordArray} The random word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.lib.WordArray.random(16);
			         */
			        random: function (nBytes) {
			            var words = [];

			            for (var i = 0; i < nBytes; i += 4) {
			                words.push(cryptoSecureRandomInt());
			            }

			            return new WordArray.init(words, nBytes);
			        }
			    });

			    /**
			     * Encoder namespace.
			     */
			    var C_enc = C.enc = {};

			    /**
			     * Hex encoding strategy.
			     */
			    var Hex = C_enc.Hex = {
			        /**
			         * Converts a word array to a hex string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The hex string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var hexString = CryptoJS.enc.Hex.stringify(wordArray);
			         */
			        stringify: function (wordArray) {
			            // Shortcuts
			            var words = wordArray.words;
			            var sigBytes = wordArray.sigBytes;

			            // Convert
			            var hexChars = [];
			            for (var i = 0; i < sigBytes; i++) {
			                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
			                hexChars.push((bite >>> 4).toString(16));
			                hexChars.push((bite & 0x0f).toString(16));
			            }

			            return hexChars.join('');
			        },

			        /**
			         * Converts a hex string to a word array.
			         *
			         * @param {string} hexStr The hex string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Hex.parse(hexString);
			         */
			        parse: function (hexStr) {
			            // Shortcut
			            var hexStrLength = hexStr.length;

			            // Convert
			            var words = [];
			            for (var i = 0; i < hexStrLength; i += 2) {
			                words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
			            }

			            return new WordArray.init(words, hexStrLength / 2);
			        }
			    };

			    /**
			     * Latin1 encoding strategy.
			     */
			    var Latin1 = C_enc.Latin1 = {
			        /**
			         * Converts a word array to a Latin1 string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The Latin1 string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var latin1String = CryptoJS.enc.Latin1.stringify(wordArray);
			         */
			        stringify: function (wordArray) {
			            // Shortcuts
			            var words = wordArray.words;
			            var sigBytes = wordArray.sigBytes;

			            // Convert
			            var latin1Chars = [];
			            for (var i = 0; i < sigBytes; i++) {
			                var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
			                latin1Chars.push(String.fromCharCode(bite));
			            }

			            return latin1Chars.join('');
			        },

			        /**
			         * Converts a Latin1 string to a word array.
			         *
			         * @param {string} latin1Str The Latin1 string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Latin1.parse(latin1String);
			         */
			        parse: function (latin1Str) {
			            // Shortcut
			            var latin1StrLength = latin1Str.length;

			            // Convert
			            var words = [];
			            for (var i = 0; i < latin1StrLength; i++) {
			                words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
			            }

			            return new WordArray.init(words, latin1StrLength);
			        }
			    };

			    /**
			     * UTF-8 encoding strategy.
			     */
			    var Utf8 = C_enc.Utf8 = {
			        /**
			         * Converts a word array to a UTF-8 string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The UTF-8 string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var utf8String = CryptoJS.enc.Utf8.stringify(wordArray);
			         */
			        stringify: function (wordArray) {
			            try {
			                return decodeURIComponent(escape(Latin1.stringify(wordArray)));
			            } catch (e) {
			                throw new Error('Malformed UTF-8 data');
			            }
			        },

			        /**
			         * Converts a UTF-8 string to a word array.
			         *
			         * @param {string} utf8Str The UTF-8 string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Utf8.parse(utf8String);
			         */
			        parse: function (utf8Str) {
			            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
			        }
			    };

			    /**
			     * Abstract buffered block algorithm template.
			     *
			     * The property blockSize must be implemented in a concrete subtype.
			     *
			     * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
			     */
			    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
			        /**
			         * Resets this block algorithm's data buffer to its initial state.
			         *
			         * @example
			         *
			         *     bufferedBlockAlgorithm.reset();
			         */
			        reset: function () {
			            // Initial values
			            this._data = new WordArray.init();
			            this._nDataBytes = 0;
			        },

			        /**
			         * Adds new data to this block algorithm's buffer.
			         *
			         * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
			         *
			         * @example
			         *
			         *     bufferedBlockAlgorithm._append('data');
			         *     bufferedBlockAlgorithm._append(wordArray);
			         */
			        _append: function (data) {
			            // Convert string to WordArray, else assume WordArray already
			            if (typeof data == 'string') {
			                data = Utf8.parse(data);
			            }

			            // Append
			            this._data.concat(data);
			            this._nDataBytes += data.sigBytes;
			        },

			        /**
			         * Processes available data blocks.
			         *
			         * This method invokes _doProcessBlock(offset), which must be implemented by a concrete subtype.
			         *
			         * @param {boolean} doFlush Whether all blocks and partial blocks should be processed.
			         *
			         * @return {WordArray} The processed data.
			         *
			         * @example
			         *
			         *     var processedData = bufferedBlockAlgorithm._process();
			         *     var processedData = bufferedBlockAlgorithm._process(!!'flush');
			         */
			        _process: function (doFlush) {
			            var processedWords;

			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;
			            var dataSigBytes = data.sigBytes;
			            var blockSize = this.blockSize;
			            var blockSizeBytes = blockSize * 4;

			            // Count blocks ready
			            var nBlocksReady = dataSigBytes / blockSizeBytes;
			            if (doFlush) {
			                // Round up to include partial blocks
			                nBlocksReady = Math.ceil(nBlocksReady);
			            } else {
			                // Round down to include only full blocks,
			                // less the number of blocks that must remain in the buffer
			                nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
			            }

			            // Count words ready
			            var nWordsReady = nBlocksReady * blockSize;

			            // Count bytes ready
			            var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

			            // Process blocks
			            if (nWordsReady) {
			                for (var offset = 0; offset < nWordsReady; offset += blockSize) {
			                    // Perform concrete-algorithm logic
			                    this._doProcessBlock(dataWords, offset);
			                }

			                // Remove processed words
			                processedWords = dataWords.splice(0, nWordsReady);
			                data.sigBytes -= nBytesReady;
			            }

			            // Return processed words
			            return new WordArray.init(processedWords, nBytesReady);
			        },

			        /**
			         * Creates a copy of this object.
			         *
			         * @return {Object} The clone.
			         *
			         * @example
			         *
			         *     var clone = bufferedBlockAlgorithm.clone();
			         */
			        clone: function () {
			            var clone = Base.clone.call(this);
			            clone._data = this._data.clone();

			            return clone;
			        },

			        _minBufferSize: 0
			    });

			    /**
			     * Abstract hasher template.
			     *
			     * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
			     */
			    C_lib.Hasher = BufferedBlockAlgorithm.extend({
			        /**
			         * Configuration options.
			         */
			        cfg: Base.extend(),

			        /**
			         * Initializes a newly created hasher.
			         *
			         * @param {Object} cfg (Optional) The configuration options to use for this hash computation.
			         *
			         * @example
			         *
			         *     var hasher = CryptoJS.algo.SHA256.create();
			         */
			        init: function (cfg) {
			            // Apply config defaults
			            this.cfg = this.cfg.extend(cfg);

			            // Set initial values
			            this.reset();
			        },

			        /**
			         * Resets this hasher to its initial state.
			         *
			         * @example
			         *
			         *     hasher.reset();
			         */
			        reset: function () {
			            // Reset data buffer
			            BufferedBlockAlgorithm.reset.call(this);

			            // Perform concrete-hasher logic
			            this._doReset();
			        },

			        /**
			         * Updates this hasher with a message.
			         *
			         * @param {WordArray|string} messageUpdate The message to append.
			         *
			         * @return {Hasher} This hasher.
			         *
			         * @example
			         *
			         *     hasher.update('message');
			         *     hasher.update(wordArray);
			         */
			        update: function (messageUpdate) {
			            // Append
			            this._append(messageUpdate);

			            // Update the hash
			            this._process();

			            // Chainable
			            return this;
			        },

			        /**
			         * Finalizes the hash computation.
			         * Note that the finalize operation is effectively a destructive, read-once operation.
			         *
			         * @param {WordArray|string} messageUpdate (Optional) A final message update.
			         *
			         * @return {WordArray} The hash.
			         *
			         * @example
			         *
			         *     var hash = hasher.finalize();
			         *     var hash = hasher.finalize('message');
			         *     var hash = hasher.finalize(wordArray);
			         */
			        finalize: function (messageUpdate) {
			            // Final message update
			            if (messageUpdate) {
			                this._append(messageUpdate);
			            }

			            // Perform concrete-hasher logic
			            var hash = this._doFinalize();

			            return hash;
			        },

			        blockSize: 512/32,

			        /**
			         * Creates a shortcut function to a hasher's object interface.
			         *
			         * @param {Hasher} hasher The hasher to create a helper for.
			         *
			         * @return {Function} The shortcut function.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var SHA256 = CryptoJS.lib.Hasher._createHelper(CryptoJS.algo.SHA256);
			         */
			        _createHelper: function (hasher) {
			            return function (message, cfg) {
			                return new hasher.init(cfg).finalize(message);
			            };
			        },

			        /**
			         * Creates a shortcut function to the HMAC's object interface.
			         *
			         * @param {Hasher} hasher The hasher to use in this HMAC helper.
			         *
			         * @return {Function} The shortcut function.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var HmacSHA256 = CryptoJS.lib.Hasher._createHmacHelper(CryptoJS.algo.SHA256);
			         */
			        _createHmacHelper: function (hasher) {
			            return function (message, key) {
			                return new C_algo.HMAC.init(hasher, key).finalize(message);
			            };
			        }
			    });

			    /**
			     * Algorithm namespace.
			     */
			    var C_algo = C.algo = {};

			    return C;
			}(Math));


			return CryptoJS;

		})); 
	} (core));
	return core.exports;
}

var x64Core = {exports: {}};

var hasRequiredX64Core;

function requireX64Core () {
	if (hasRequiredX64Core) return x64Core.exports;
	hasRequiredX64Core = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function (undefined$1) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var Base = C_lib.Base;
			    var X32WordArray = C_lib.WordArray;

			    /**
			     * x64 namespace.
			     */
			    var C_x64 = C.x64 = {};

			    /**
			     * A 64-bit word.
			     */
			    C_x64.Word = Base.extend({
			        /**
			         * Initializes a newly created 64-bit word.
			         *
			         * @param {number} high The high 32 bits.
			         * @param {number} low The low 32 bits.
			         *
			         * @example
			         *
			         *     var x64Word = CryptoJS.x64.Word.create(0x00010203, 0x04050607);
			         */
			        init: function (high, low) {
			            this.high = high;
			            this.low = low;
			        }

			        /**
			         * Bitwise NOTs this word.
			         *
			         * @return {X64Word} A new x64-Word object after negating.
			         *
			         * @example
			         *
			         *     var negated = x64Word.not();
			         */
			        // not: function () {
			            // var high = ~this.high;
			            // var low = ~this.low;

			            // return X64Word.create(high, low);
			        // },

			        /**
			         * Bitwise ANDs this word with the passed word.
			         *
			         * @param {X64Word} word The x64-Word to AND with this word.
			         *
			         * @return {X64Word} A new x64-Word object after ANDing.
			         *
			         * @example
			         *
			         *     var anded = x64Word.and(anotherX64Word);
			         */
			        // and: function (word) {
			            // var high = this.high & word.high;
			            // var low = this.low & word.low;

			            // return X64Word.create(high, low);
			        // },

			        /**
			         * Bitwise ORs this word with the passed word.
			         *
			         * @param {X64Word} word The x64-Word to OR with this word.
			         *
			         * @return {X64Word} A new x64-Word object after ORing.
			         *
			         * @example
			         *
			         *     var ored = x64Word.or(anotherX64Word);
			         */
			        // or: function (word) {
			            // var high = this.high | word.high;
			            // var low = this.low | word.low;

			            // return X64Word.create(high, low);
			        // },

			        /**
			         * Bitwise XORs this word with the passed word.
			         *
			         * @param {X64Word} word The x64-Word to XOR with this word.
			         *
			         * @return {X64Word} A new x64-Word object after XORing.
			         *
			         * @example
			         *
			         *     var xored = x64Word.xor(anotherX64Word);
			         */
			        // xor: function (word) {
			            // var high = this.high ^ word.high;
			            // var low = this.low ^ word.low;

			            // return X64Word.create(high, low);
			        // },

			        /**
			         * Shifts this word n bits to the left.
			         *
			         * @param {number} n The number of bits to shift.
			         *
			         * @return {X64Word} A new x64-Word object after shifting.
			         *
			         * @example
			         *
			         *     var shifted = x64Word.shiftL(25);
			         */
			        // shiftL: function (n) {
			            // if (n < 32) {
			                // var high = (this.high << n) | (this.low >>> (32 - n));
			                // var low = this.low << n;
			            // } else {
			                // var high = this.low << (n - 32);
			                // var low = 0;
			            // }

			            // return X64Word.create(high, low);
			        // },

			        /**
			         * Shifts this word n bits to the right.
			         *
			         * @param {number} n The number of bits to shift.
			         *
			         * @return {X64Word} A new x64-Word object after shifting.
			         *
			         * @example
			         *
			         *     var shifted = x64Word.shiftR(7);
			         */
			        // shiftR: function (n) {
			            // if (n < 32) {
			                // var low = (this.low >>> n) | (this.high << (32 - n));
			                // var high = this.high >>> n;
			            // } else {
			                // var low = this.high >>> (n - 32);
			                // var high = 0;
			            // }

			            // return X64Word.create(high, low);
			        // },

			        /**
			         * Rotates this word n bits to the left.
			         *
			         * @param {number} n The number of bits to rotate.
			         *
			         * @return {X64Word} A new x64-Word object after rotating.
			         *
			         * @example
			         *
			         *     var rotated = x64Word.rotL(25);
			         */
			        // rotL: function (n) {
			            // return this.shiftL(n).or(this.shiftR(64 - n));
			        // },

			        /**
			         * Rotates this word n bits to the right.
			         *
			         * @param {number} n The number of bits to rotate.
			         *
			         * @return {X64Word} A new x64-Word object after rotating.
			         *
			         * @example
			         *
			         *     var rotated = x64Word.rotR(7);
			         */
			        // rotR: function (n) {
			            // return this.shiftR(n).or(this.shiftL(64 - n));
			        // },

			        /**
			         * Adds this word with the passed word.
			         *
			         * @param {X64Word} word The x64-Word to add with this word.
			         *
			         * @return {X64Word} A new x64-Word object after adding.
			         *
			         * @example
			         *
			         *     var added = x64Word.add(anotherX64Word);
			         */
			        // add: function (word) {
			            // var low = (this.low + word.low) | 0;
			            // var carry = (low >>> 0) < (this.low >>> 0) ? 1 : 0;
			            // var high = (this.high + word.high + carry) | 0;

			            // return X64Word.create(high, low);
			        // }
			    });

			    /**
			     * An array of 64-bit words.
			     *
			     * @property {Array} words The array of CryptoJS.x64.Word objects.
			     * @property {number} sigBytes The number of significant bytes in this word array.
			     */
			    C_x64.WordArray = Base.extend({
			        /**
			         * Initializes a newly created word array.
			         *
			         * @param {Array} words (Optional) An array of CryptoJS.x64.Word objects.
			         * @param {number} sigBytes (Optional) The number of significant bytes in the words.
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.x64.WordArray.create();
			         *
			         *     var wordArray = CryptoJS.x64.WordArray.create([
			         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
			         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
			         *     ]);
			         *
			         *     var wordArray = CryptoJS.x64.WordArray.create([
			         *         CryptoJS.x64.Word.create(0x00010203, 0x04050607),
			         *         CryptoJS.x64.Word.create(0x18191a1b, 0x1c1d1e1f)
			         *     ], 10);
			         */
			        init: function (words, sigBytes) {
			            words = this.words = words || [];

			            if (sigBytes != undefined$1) {
			                this.sigBytes = sigBytes;
			            } else {
			                this.sigBytes = words.length * 8;
			            }
			        },

			        /**
			         * Converts this 64-bit word array to a 32-bit word array.
			         *
			         * @return {CryptoJS.lib.WordArray} This word array's data as a 32-bit word array.
			         *
			         * @example
			         *
			         *     var x32WordArray = x64WordArray.toX32();
			         */
			        toX32: function () {
			            // Shortcuts
			            var x64Words = this.words;
			            var x64WordsLength = x64Words.length;

			            // Convert
			            var x32Words = [];
			            for (var i = 0; i < x64WordsLength; i++) {
			                var x64Word = x64Words[i];
			                x32Words.push(x64Word.high);
			                x32Words.push(x64Word.low);
			            }

			            return X32WordArray.create(x32Words, this.sigBytes);
			        },

			        /**
			         * Creates a copy of this word array.
			         *
			         * @return {X64WordArray} The clone.
			         *
			         * @example
			         *
			         *     var clone = x64WordArray.clone();
			         */
			        clone: function () {
			            var clone = Base.clone.call(this);

			            // Clone "words" array
			            var words = clone.words = this.words.slice(0);

			            // Clone each X64Word object
			            var wordsLength = words.length;
			            for (var i = 0; i < wordsLength; i++) {
			                words[i] = words[i].clone();
			            }

			            return clone;
			        }
			    });
			}());


			return CryptoJS;

		})); 
	} (x64Core));
	return x64Core.exports;
}

var libTypedarrays = {exports: {}};

var hasRequiredLibTypedarrays;

function requireLibTypedarrays () {
	if (hasRequiredLibTypedarrays) return libTypedarrays.exports;
	hasRequiredLibTypedarrays = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Check if typed arrays are supported
			    if (typeof ArrayBuffer != 'function') {
			        return;
			    }

			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;

			    // Reference original init
			    var superInit = WordArray.init;

			    // Augment WordArray.init to handle typed arrays
			    var subInit = WordArray.init = function (typedArray) {
			        // Convert buffers to uint8
			        if (typedArray instanceof ArrayBuffer) {
			            typedArray = new Uint8Array(typedArray);
			        }

			        // Convert other array views to uint8
			        if (
			            typedArray instanceof Int8Array ||
			            (typeof Uint8ClampedArray !== "undefined" && typedArray instanceof Uint8ClampedArray) ||
			            typedArray instanceof Int16Array ||
			            typedArray instanceof Uint16Array ||
			            typedArray instanceof Int32Array ||
			            typedArray instanceof Uint32Array ||
			            typedArray instanceof Float32Array ||
			            typedArray instanceof Float64Array
			        ) {
			            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
			        }

			        // Handle Uint8Array
			        if (typedArray instanceof Uint8Array) {
			            // Shortcut
			            var typedArrayByteLength = typedArray.byteLength;

			            // Extract bytes
			            var words = [];
			            for (var i = 0; i < typedArrayByteLength; i++) {
			                words[i >>> 2] |= typedArray[i] << (24 - (i % 4) * 8);
			            }

			            // Initialize this word array
			            superInit.call(this, words, typedArrayByteLength);
			        } else {
			            // Else call normal init
			            superInit.apply(this, arguments);
			        }
			    };

			    subInit.prototype = WordArray;
			}());


			return CryptoJS.lib.WordArray;

		})); 
	} (libTypedarrays));
	return libTypedarrays.exports;
}

var encUtf16 = {exports: {}};

var hasRequiredEncUtf16;

function requireEncUtf16 () {
	if (hasRequiredEncUtf16) return encUtf16.exports;
	hasRequiredEncUtf16 = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var C_enc = C.enc;

			    /**
			     * UTF-16 BE encoding strategy.
			     */
			    C_enc.Utf16 = C_enc.Utf16BE = {
			        /**
			         * Converts a word array to a UTF-16 BE string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The UTF-16 BE string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var utf16String = CryptoJS.enc.Utf16.stringify(wordArray);
			         */
			        stringify: function (wordArray) {
			            // Shortcuts
			            var words = wordArray.words;
			            var sigBytes = wordArray.sigBytes;

			            // Convert
			            var utf16Chars = [];
			            for (var i = 0; i < sigBytes; i += 2) {
			                var codePoint = (words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff;
			                utf16Chars.push(String.fromCharCode(codePoint));
			            }

			            return utf16Chars.join('');
			        },

			        /**
			         * Converts a UTF-16 BE string to a word array.
			         *
			         * @param {string} utf16Str The UTF-16 BE string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Utf16.parse(utf16String);
			         */
			        parse: function (utf16Str) {
			            // Shortcut
			            var utf16StrLength = utf16Str.length;

			            // Convert
			            var words = [];
			            for (var i = 0; i < utf16StrLength; i++) {
			                words[i >>> 1] |= utf16Str.charCodeAt(i) << (16 - (i % 2) * 16);
			            }

			            return WordArray.create(words, utf16StrLength * 2);
			        }
			    };

			    /**
			     * UTF-16 LE encoding strategy.
			     */
			    C_enc.Utf16LE = {
			        /**
			         * Converts a word array to a UTF-16 LE string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The UTF-16 LE string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var utf16Str = CryptoJS.enc.Utf16LE.stringify(wordArray);
			         */
			        stringify: function (wordArray) {
			            // Shortcuts
			            var words = wordArray.words;
			            var sigBytes = wordArray.sigBytes;

			            // Convert
			            var utf16Chars = [];
			            for (var i = 0; i < sigBytes; i += 2) {
			                var codePoint = swapEndian((words[i >>> 2] >>> (16 - (i % 4) * 8)) & 0xffff);
			                utf16Chars.push(String.fromCharCode(codePoint));
			            }

			            return utf16Chars.join('');
			        },

			        /**
			         * Converts a UTF-16 LE string to a word array.
			         *
			         * @param {string} utf16Str The UTF-16 LE string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Utf16LE.parse(utf16Str);
			         */
			        parse: function (utf16Str) {
			            // Shortcut
			            var utf16StrLength = utf16Str.length;

			            // Convert
			            var words = [];
			            for (var i = 0; i < utf16StrLength; i++) {
			                words[i >>> 1] |= swapEndian(utf16Str.charCodeAt(i) << (16 - (i % 2) * 16));
			            }

			            return WordArray.create(words, utf16StrLength * 2);
			        }
			    };

			    function swapEndian(word) {
			        return ((word << 8) & 0xff00ff00) | ((word >>> 8) & 0x00ff00ff);
			    }
			}());


			return CryptoJS.enc.Utf16;

		})); 
	} (encUtf16));
	return encUtf16.exports;
}

var encBase64 = {exports: {}};

var hasRequiredEncBase64;

function requireEncBase64 () {
	if (hasRequiredEncBase64) return encBase64.exports;
	hasRequiredEncBase64 = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var C_enc = C.enc;

			    /**
			     * Base64 encoding strategy.
			     */
			    C_enc.Base64 = {
			        /**
			         * Converts a word array to a Base64 string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @return {string} The Base64 string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var base64String = CryptoJS.enc.Base64.stringify(wordArray);
			         */
			        stringify: function (wordArray) {
			            // Shortcuts
			            var words = wordArray.words;
			            var sigBytes = wordArray.sigBytes;
			            var map = this._map;

			            // Clamp excess bits
			            wordArray.clamp();

			            // Convert
			            var base64Chars = [];
			            for (var i = 0; i < sigBytes; i += 3) {
			                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
			                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
			                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

			                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

			                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
			                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
			                }
			            }

			            // Add padding
			            var paddingChar = map.charAt(64);
			            if (paddingChar) {
			                while (base64Chars.length % 4) {
			                    base64Chars.push(paddingChar);
			                }
			            }

			            return base64Chars.join('');
			        },

			        /**
			         * Converts a Base64 string to a word array.
			         *
			         * @param {string} base64Str The Base64 string.
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Base64.parse(base64String);
			         */
			        parse: function (base64Str) {
			            // Shortcuts
			            var base64StrLength = base64Str.length;
			            var map = this._map;
			            var reverseMap = this._reverseMap;

			            if (!reverseMap) {
			                    reverseMap = this._reverseMap = [];
			                    for (var j = 0; j < map.length; j++) {
			                        reverseMap[map.charCodeAt(j)] = j;
			                    }
			            }

			            // Ignore padding
			            var paddingChar = map.charAt(64);
			            if (paddingChar) {
			                var paddingIndex = base64Str.indexOf(paddingChar);
			                if (paddingIndex !== -1) {
			                    base64StrLength = paddingIndex;
			                }
			            }

			            // Convert
			            return parseLoop(base64Str, base64StrLength, reverseMap);

			        },

			        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
			    };

			    function parseLoop(base64Str, base64StrLength, reverseMap) {
			      var words = [];
			      var nBytes = 0;
			      for (var i = 0; i < base64StrLength; i++) {
			          if (i % 4) {
			              var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
			              var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
			              var bitsCombined = bits1 | bits2;
			              words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
			              nBytes++;
			          }
			      }
			      return WordArray.create(words, nBytes);
			    }
			}());


			return CryptoJS.enc.Base64;

		})); 
	} (encBase64));
	return encBase64.exports;
}

var encBase64url = {exports: {}};

var hasRequiredEncBase64url;

function requireEncBase64url () {
	if (hasRequiredEncBase64url) return encBase64url.exports;
	hasRequiredEncBase64url = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var C_enc = C.enc;

			    /**
			     * Base64url encoding strategy.
			     */
			    C_enc.Base64url = {
			        /**
			         * Converts a word array to a Base64url string.
			         *
			         * @param {WordArray} wordArray The word array.
			         *
			         * @param {boolean} urlSafe Whether to use url safe
			         *
			         * @return {string} The Base64url string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var base64String = CryptoJS.enc.Base64url.stringify(wordArray);
			         */
			        stringify: function (wordArray, urlSafe) {
			            if (urlSafe === undefined) {
			                urlSafe = true;
			            }
			            // Shortcuts
			            var words = wordArray.words;
			            var sigBytes = wordArray.sigBytes;
			            var map = urlSafe ? this._safe_map : this._map;

			            // Clamp excess bits
			            wordArray.clamp();

			            // Convert
			            var base64Chars = [];
			            for (var i = 0; i < sigBytes; i += 3) {
			                var byte1 = (words[i >>> 2]       >>> (24 - (i % 4) * 8))       & 0xff;
			                var byte2 = (words[(i + 1) >>> 2] >>> (24 - ((i + 1) % 4) * 8)) & 0xff;
			                var byte3 = (words[(i + 2) >>> 2] >>> (24 - ((i + 2) % 4) * 8)) & 0xff;

			                var triplet = (byte1 << 16) | (byte2 << 8) | byte3;

			                for (var j = 0; (j < 4) && (i + j * 0.75 < sigBytes); j++) {
			                    base64Chars.push(map.charAt((triplet >>> (6 * (3 - j))) & 0x3f));
			                }
			            }

			            // Add padding
			            var paddingChar = map.charAt(64);
			            if (paddingChar) {
			                while (base64Chars.length % 4) {
			                    base64Chars.push(paddingChar);
			                }
			            }

			            return base64Chars.join('');
			        },

			        /**
			         * Converts a Base64url string to a word array.
			         *
			         * @param {string} base64Str The Base64url string.
			         *
			         * @param {boolean} urlSafe Whether to use url safe
			         *
			         * @return {WordArray} The word array.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var wordArray = CryptoJS.enc.Base64url.parse(base64String);
			         */
			        parse: function (base64Str, urlSafe) {
			            if (urlSafe === undefined) {
			                urlSafe = true;
			            }

			            // Shortcuts
			            var base64StrLength = base64Str.length;
			            var map = urlSafe ? this._safe_map : this._map;
			            var reverseMap = this._reverseMap;

			            if (!reverseMap) {
			                reverseMap = this._reverseMap = [];
			                for (var j = 0; j < map.length; j++) {
			                    reverseMap[map.charCodeAt(j)] = j;
			                }
			            }

			            // Ignore padding
			            var paddingChar = map.charAt(64);
			            if (paddingChar) {
			                var paddingIndex = base64Str.indexOf(paddingChar);
			                if (paddingIndex !== -1) {
			                    base64StrLength = paddingIndex;
			                }
			            }

			            // Convert
			            return parseLoop(base64Str, base64StrLength, reverseMap);

			        },

			        _map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
			        _safe_map: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
			    };

			    function parseLoop(base64Str, base64StrLength, reverseMap) {
			        var words = [];
			        var nBytes = 0;
			        for (var i = 0; i < base64StrLength; i++) {
			            if (i % 4) {
			                var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << ((i % 4) * 2);
			                var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> (6 - (i % 4) * 2);
			                var bitsCombined = bits1 | bits2;
			                words[nBytes >>> 2] |= bitsCombined << (24 - (nBytes % 4) * 8);
			                nBytes++;
			            }
			        }
			        return WordArray.create(words, nBytes);
			    }
			}());


			return CryptoJS.enc.Base64url;

		})); 
	} (encBase64url));
	return encBase64url.exports;
}

var md5 = {exports: {}};

var hasRequiredMd5;

function requireMd5 () {
	if (hasRequiredMd5) return md5.exports;
	hasRequiredMd5 = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function (Math) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var Hasher = C_lib.Hasher;
			    var C_algo = C.algo;

			    // Constants table
			    var T = [];

			    // Compute constants
			    (function () {
			        for (var i = 0; i < 64; i++) {
			            T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
			        }
			    }());

			    /**
			     * MD5 hash algorithm.
			     */
			    var MD5 = C_algo.MD5 = Hasher.extend({
			        _doReset: function () {
			            this._hash = new WordArray.init([
			                0x67452301, 0xefcdab89,
			                0x98badcfe, 0x10325476
			            ]);
			        },

			        _doProcessBlock: function (M, offset) {
			            // Swap endian
			            for (var i = 0; i < 16; i++) {
			                // Shortcuts
			                var offset_i = offset + i;
			                var M_offset_i = M[offset_i];

			                M[offset_i] = (
			                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
			                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
			                );
			            }

			            // Shortcuts
			            var H = this._hash.words;

			            var M_offset_0  = M[offset + 0];
			            var M_offset_1  = M[offset + 1];
			            var M_offset_2  = M[offset + 2];
			            var M_offset_3  = M[offset + 3];
			            var M_offset_4  = M[offset + 4];
			            var M_offset_5  = M[offset + 5];
			            var M_offset_6  = M[offset + 6];
			            var M_offset_7  = M[offset + 7];
			            var M_offset_8  = M[offset + 8];
			            var M_offset_9  = M[offset + 9];
			            var M_offset_10 = M[offset + 10];
			            var M_offset_11 = M[offset + 11];
			            var M_offset_12 = M[offset + 12];
			            var M_offset_13 = M[offset + 13];
			            var M_offset_14 = M[offset + 14];
			            var M_offset_15 = M[offset + 15];

			            // Working variables
			            var a = H[0];
			            var b = H[1];
			            var c = H[2];
			            var d = H[3];

			            // Computation
			            a = FF(a, b, c, d, M_offset_0,  7,  T[0]);
			            d = FF(d, a, b, c, M_offset_1,  12, T[1]);
			            c = FF(c, d, a, b, M_offset_2,  17, T[2]);
			            b = FF(b, c, d, a, M_offset_3,  22, T[3]);
			            a = FF(a, b, c, d, M_offset_4,  7,  T[4]);
			            d = FF(d, a, b, c, M_offset_5,  12, T[5]);
			            c = FF(c, d, a, b, M_offset_6,  17, T[6]);
			            b = FF(b, c, d, a, M_offset_7,  22, T[7]);
			            a = FF(a, b, c, d, M_offset_8,  7,  T[8]);
			            d = FF(d, a, b, c, M_offset_9,  12, T[9]);
			            c = FF(c, d, a, b, M_offset_10, 17, T[10]);
			            b = FF(b, c, d, a, M_offset_11, 22, T[11]);
			            a = FF(a, b, c, d, M_offset_12, 7,  T[12]);
			            d = FF(d, a, b, c, M_offset_13, 12, T[13]);
			            c = FF(c, d, a, b, M_offset_14, 17, T[14]);
			            b = FF(b, c, d, a, M_offset_15, 22, T[15]);

			            a = GG(a, b, c, d, M_offset_1,  5,  T[16]);
			            d = GG(d, a, b, c, M_offset_6,  9,  T[17]);
			            c = GG(c, d, a, b, M_offset_11, 14, T[18]);
			            b = GG(b, c, d, a, M_offset_0,  20, T[19]);
			            a = GG(a, b, c, d, M_offset_5,  5,  T[20]);
			            d = GG(d, a, b, c, M_offset_10, 9,  T[21]);
			            c = GG(c, d, a, b, M_offset_15, 14, T[22]);
			            b = GG(b, c, d, a, M_offset_4,  20, T[23]);
			            a = GG(a, b, c, d, M_offset_9,  5,  T[24]);
			            d = GG(d, a, b, c, M_offset_14, 9,  T[25]);
			            c = GG(c, d, a, b, M_offset_3,  14, T[26]);
			            b = GG(b, c, d, a, M_offset_8,  20, T[27]);
			            a = GG(a, b, c, d, M_offset_13, 5,  T[28]);
			            d = GG(d, a, b, c, M_offset_2,  9,  T[29]);
			            c = GG(c, d, a, b, M_offset_7,  14, T[30]);
			            b = GG(b, c, d, a, M_offset_12, 20, T[31]);

			            a = HH(a, b, c, d, M_offset_5,  4,  T[32]);
			            d = HH(d, a, b, c, M_offset_8,  11, T[33]);
			            c = HH(c, d, a, b, M_offset_11, 16, T[34]);
			            b = HH(b, c, d, a, M_offset_14, 23, T[35]);
			            a = HH(a, b, c, d, M_offset_1,  4,  T[36]);
			            d = HH(d, a, b, c, M_offset_4,  11, T[37]);
			            c = HH(c, d, a, b, M_offset_7,  16, T[38]);
			            b = HH(b, c, d, a, M_offset_10, 23, T[39]);
			            a = HH(a, b, c, d, M_offset_13, 4,  T[40]);
			            d = HH(d, a, b, c, M_offset_0,  11, T[41]);
			            c = HH(c, d, a, b, M_offset_3,  16, T[42]);
			            b = HH(b, c, d, a, M_offset_6,  23, T[43]);
			            a = HH(a, b, c, d, M_offset_9,  4,  T[44]);
			            d = HH(d, a, b, c, M_offset_12, 11, T[45]);
			            c = HH(c, d, a, b, M_offset_15, 16, T[46]);
			            b = HH(b, c, d, a, M_offset_2,  23, T[47]);

			            a = II(a, b, c, d, M_offset_0,  6,  T[48]);
			            d = II(d, a, b, c, M_offset_7,  10, T[49]);
			            c = II(c, d, a, b, M_offset_14, 15, T[50]);
			            b = II(b, c, d, a, M_offset_5,  21, T[51]);
			            a = II(a, b, c, d, M_offset_12, 6,  T[52]);
			            d = II(d, a, b, c, M_offset_3,  10, T[53]);
			            c = II(c, d, a, b, M_offset_10, 15, T[54]);
			            b = II(b, c, d, a, M_offset_1,  21, T[55]);
			            a = II(a, b, c, d, M_offset_8,  6,  T[56]);
			            d = II(d, a, b, c, M_offset_15, 10, T[57]);
			            c = II(c, d, a, b, M_offset_6,  15, T[58]);
			            b = II(b, c, d, a, M_offset_13, 21, T[59]);
			            a = II(a, b, c, d, M_offset_4,  6,  T[60]);
			            d = II(d, a, b, c, M_offset_11, 10, T[61]);
			            c = II(c, d, a, b, M_offset_2,  15, T[62]);
			            b = II(b, c, d, a, M_offset_9,  21, T[63]);

			            // Intermediate hash value
			            H[0] = (H[0] + a) | 0;
			            H[1] = (H[1] + b) | 0;
			            H[2] = (H[2] + c) | 0;
			            H[3] = (H[3] + d) | 0;
			        },

			        _doFinalize: function () {
			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;

			            var nBitsTotal = this._nDataBytes * 8;
			            var nBitsLeft = data.sigBytes * 8;

			            // Add padding
			            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);

			            var nBitsTotalH = Math.floor(nBitsTotal / 0x100000000);
			            var nBitsTotalL = nBitsTotal;
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = (
			                (((nBitsTotalH << 8)  | (nBitsTotalH >>> 24)) & 0x00ff00ff) |
			                (((nBitsTotalH << 24) | (nBitsTotalH >>> 8))  & 0xff00ff00)
			            );
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
			                (((nBitsTotalL << 8)  | (nBitsTotalL >>> 24)) & 0x00ff00ff) |
			                (((nBitsTotalL << 24) | (nBitsTotalL >>> 8))  & 0xff00ff00)
			            );

			            data.sigBytes = (dataWords.length + 1) * 4;

			            // Hash final blocks
			            this._process();

			            // Shortcuts
			            var hash = this._hash;
			            var H = hash.words;

			            // Swap endian
			            for (var i = 0; i < 4; i++) {
			                // Shortcut
			                var H_i = H[i];

			                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
			                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
			            }

			            // Return final computed hash
			            return hash;
			        },

			        clone: function () {
			            var clone = Hasher.clone.call(this);
			            clone._hash = this._hash.clone();

			            return clone;
			        }
			    });

			    function FF(a, b, c, d, x, s, t) {
			        var n = a + ((b & c) | (~b & d)) + x + t;
			        return ((n << s) | (n >>> (32 - s))) + b;
			    }

			    function GG(a, b, c, d, x, s, t) {
			        var n = a + ((b & d) | (c & ~d)) + x + t;
			        return ((n << s) | (n >>> (32 - s))) + b;
			    }

			    function HH(a, b, c, d, x, s, t) {
			        var n = a + (b ^ c ^ d) + x + t;
			        return ((n << s) | (n >>> (32 - s))) + b;
			    }

			    function II(a, b, c, d, x, s, t) {
			        var n = a + (c ^ (b | ~d)) + x + t;
			        return ((n << s) | (n >>> (32 - s))) + b;
			    }

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.MD5('message');
			     *     var hash = CryptoJS.MD5(wordArray);
			     */
			    C.MD5 = Hasher._createHelper(MD5);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacMD5(message, key);
			     */
			    C.HmacMD5 = Hasher._createHmacHelper(MD5);
			}(Math));


			return CryptoJS.MD5;

		})); 
	} (md5));
	return md5.exports;
}

var sha1 = {exports: {}};

var hasRequiredSha1;

function requireSha1 () {
	if (hasRequiredSha1) return sha1.exports;
	hasRequiredSha1 = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var Hasher = C_lib.Hasher;
			    var C_algo = C.algo;

			    // Reusable object
			    var W = [];

			    /**
			     * SHA-1 hash algorithm.
			     */
			    var SHA1 = C_algo.SHA1 = Hasher.extend({
			        _doReset: function () {
			            this._hash = new WordArray.init([
			                0x67452301, 0xefcdab89,
			                0x98badcfe, 0x10325476,
			                0xc3d2e1f0
			            ]);
			        },

			        _doProcessBlock: function (M, offset) {
			            // Shortcut
			            var H = this._hash.words;

			            // Working variables
			            var a = H[0];
			            var b = H[1];
			            var c = H[2];
			            var d = H[3];
			            var e = H[4];

			            // Computation
			            for (var i = 0; i < 80; i++) {
			                if (i < 16) {
			                    W[i] = M[offset + i] | 0;
			                } else {
			                    var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
			                    W[i] = (n << 1) | (n >>> 31);
			                }

			                var t = ((a << 5) | (a >>> 27)) + e + W[i];
			                if (i < 20) {
			                    t += ((b & c) | (~b & d)) + 0x5a827999;
			                } else if (i < 40) {
			                    t += (b ^ c ^ d) + 0x6ed9eba1;
			                } else if (i < 60) {
			                    t += ((b & c) | (b & d) | (c & d)) - 0x70e44324;
			                } else /* if (i < 80) */ {
			                    t += (b ^ c ^ d) - 0x359d3e2a;
			                }

			                e = d;
			                d = c;
			                c = (b << 30) | (b >>> 2);
			                b = a;
			                a = t;
			            }

			            // Intermediate hash value
			            H[0] = (H[0] + a) | 0;
			            H[1] = (H[1] + b) | 0;
			            H[2] = (H[2] + c) | 0;
			            H[3] = (H[3] + d) | 0;
			            H[4] = (H[4] + e) | 0;
			        },

			        _doFinalize: function () {
			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;

			            var nBitsTotal = this._nDataBytes * 8;
			            var nBitsLeft = data.sigBytes * 8;

			            // Add padding
			            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
			            data.sigBytes = dataWords.length * 4;

			            // Hash final blocks
			            this._process();

			            // Return final computed hash
			            return this._hash;
			        },

			        clone: function () {
			            var clone = Hasher.clone.call(this);
			            clone._hash = this._hash.clone();

			            return clone;
			        }
			    });

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA1('message');
			     *     var hash = CryptoJS.SHA1(wordArray);
			     */
			    C.SHA1 = Hasher._createHelper(SHA1);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA1(message, key);
			     */
			    C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
			}());


			return CryptoJS.SHA1;

		})); 
	} (sha1));
	return sha1.exports;
}

var sha256 = {exports: {}};

var hasRequiredSha256;

function requireSha256 () {
	if (hasRequiredSha256) return sha256.exports;
	hasRequiredSha256 = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function (Math) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var Hasher = C_lib.Hasher;
			    var C_algo = C.algo;

			    // Initialization and round constants tables
			    var H = [];
			    var K = [];

			    // Compute constants
			    (function () {
			        function isPrime(n) {
			            var sqrtN = Math.sqrt(n);
			            for (var factor = 2; factor <= sqrtN; factor++) {
			                if (!(n % factor)) {
			                    return false;
			                }
			            }

			            return true;
			        }

			        function getFractionalBits(n) {
			            return ((n - (n | 0)) * 0x100000000) | 0;
			        }

			        var n = 2;
			        var nPrime = 0;
			        while (nPrime < 64) {
			            if (isPrime(n)) {
			                if (nPrime < 8) {
			                    H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
			                }
			                K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

			                nPrime++;
			            }

			            n++;
			        }
			    }());

			    // Reusable object
			    var W = [];

			    /**
			     * SHA-256 hash algorithm.
			     */
			    var SHA256 = C_algo.SHA256 = Hasher.extend({
			        _doReset: function () {
			            this._hash = new WordArray.init(H.slice(0));
			        },

			        _doProcessBlock: function (M, offset) {
			            // Shortcut
			            var H = this._hash.words;

			            // Working variables
			            var a = H[0];
			            var b = H[1];
			            var c = H[2];
			            var d = H[3];
			            var e = H[4];
			            var f = H[5];
			            var g = H[6];
			            var h = H[7];

			            // Computation
			            for (var i = 0; i < 64; i++) {
			                if (i < 16) {
			                    W[i] = M[offset + i] | 0;
			                } else {
			                    var gamma0x = W[i - 15];
			                    var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
			                                  ((gamma0x << 14) | (gamma0x >>> 18)) ^
			                                   (gamma0x >>> 3);

			                    var gamma1x = W[i - 2];
			                    var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
			                                  ((gamma1x << 13) | (gamma1x >>> 19)) ^
			                                   (gamma1x >>> 10);

			                    W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
			                }

			                var ch  = (e & f) ^ (~e & g);
			                var maj = (a & b) ^ (a & c) ^ (b & c);

			                var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
			                var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

			                var t1 = h + sigma1 + ch + K[i] + W[i];
			                var t2 = sigma0 + maj;

			                h = g;
			                g = f;
			                f = e;
			                e = (d + t1) | 0;
			                d = c;
			                c = b;
			                b = a;
			                a = (t1 + t2) | 0;
			            }

			            // Intermediate hash value
			            H[0] = (H[0] + a) | 0;
			            H[1] = (H[1] + b) | 0;
			            H[2] = (H[2] + c) | 0;
			            H[3] = (H[3] + d) | 0;
			            H[4] = (H[4] + e) | 0;
			            H[5] = (H[5] + f) | 0;
			            H[6] = (H[6] + g) | 0;
			            H[7] = (H[7] + h) | 0;
			        },

			        _doFinalize: function () {
			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;

			            var nBitsTotal = this._nDataBytes * 8;
			            var nBitsLeft = data.sigBytes * 8;

			            // Add padding
			            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = Math.floor(nBitsTotal / 0x100000000);
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
			            data.sigBytes = dataWords.length * 4;

			            // Hash final blocks
			            this._process();

			            // Return final computed hash
			            return this._hash;
			        },

			        clone: function () {
			            var clone = Hasher.clone.call(this);
			            clone._hash = this._hash.clone();

			            return clone;
			        }
			    });

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA256('message');
			     *     var hash = CryptoJS.SHA256(wordArray);
			     */
			    C.SHA256 = Hasher._createHelper(SHA256);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA256(message, key);
			     */
			    C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
			}(Math));


			return CryptoJS.SHA256;

		})); 
	} (sha256));
	return sha256.exports;
}

var sha224 = {exports: {}};

var hasRequiredSha224;

function requireSha224 () {
	if (hasRequiredSha224) return sha224.exports;
	hasRequiredSha224 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireSha256());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var C_algo = C.algo;
			    var SHA256 = C_algo.SHA256;

			    /**
			     * SHA-224 hash algorithm.
			     */
			    var SHA224 = C_algo.SHA224 = SHA256.extend({
			        _doReset: function () {
			            this._hash = new WordArray.init([
			                0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
			                0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4
			            ]);
			        },

			        _doFinalize: function () {
			            var hash = SHA256._doFinalize.call(this);

			            hash.sigBytes -= 4;

			            return hash;
			        }
			    });

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA224('message');
			     *     var hash = CryptoJS.SHA224(wordArray);
			     */
			    C.SHA224 = SHA256._createHelper(SHA224);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA224(message, key);
			     */
			    C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
			}());


			return CryptoJS.SHA224;

		})); 
	} (sha224));
	return sha224.exports;
}

var sha512 = {exports: {}};

var hasRequiredSha512;

function requireSha512 () {
	if (hasRequiredSha512) return sha512.exports;
	hasRequiredSha512 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireX64Core());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var Hasher = C_lib.Hasher;
			    var C_x64 = C.x64;
			    var X64Word = C_x64.Word;
			    var X64WordArray = C_x64.WordArray;
			    var C_algo = C.algo;

			    function X64Word_create() {
			        return X64Word.create.apply(X64Word, arguments);
			    }

			    // Constants
			    var K = [
			        X64Word_create(0x428a2f98, 0xd728ae22), X64Word_create(0x71374491, 0x23ef65cd),
			        X64Word_create(0xb5c0fbcf, 0xec4d3b2f), X64Word_create(0xe9b5dba5, 0x8189dbbc),
			        X64Word_create(0x3956c25b, 0xf348b538), X64Word_create(0x59f111f1, 0xb605d019),
			        X64Word_create(0x923f82a4, 0xaf194f9b), X64Word_create(0xab1c5ed5, 0xda6d8118),
			        X64Word_create(0xd807aa98, 0xa3030242), X64Word_create(0x12835b01, 0x45706fbe),
			        X64Word_create(0x243185be, 0x4ee4b28c), X64Word_create(0x550c7dc3, 0xd5ffb4e2),
			        X64Word_create(0x72be5d74, 0xf27b896f), X64Word_create(0x80deb1fe, 0x3b1696b1),
			        X64Word_create(0x9bdc06a7, 0x25c71235), X64Word_create(0xc19bf174, 0xcf692694),
			        X64Word_create(0xe49b69c1, 0x9ef14ad2), X64Word_create(0xefbe4786, 0x384f25e3),
			        X64Word_create(0x0fc19dc6, 0x8b8cd5b5), X64Word_create(0x240ca1cc, 0x77ac9c65),
			        X64Word_create(0x2de92c6f, 0x592b0275), X64Word_create(0x4a7484aa, 0x6ea6e483),
			        X64Word_create(0x5cb0a9dc, 0xbd41fbd4), X64Word_create(0x76f988da, 0x831153b5),
			        X64Word_create(0x983e5152, 0xee66dfab), X64Word_create(0xa831c66d, 0x2db43210),
			        X64Word_create(0xb00327c8, 0x98fb213f), X64Word_create(0xbf597fc7, 0xbeef0ee4),
			        X64Word_create(0xc6e00bf3, 0x3da88fc2), X64Word_create(0xd5a79147, 0x930aa725),
			        X64Word_create(0x06ca6351, 0xe003826f), X64Word_create(0x14292967, 0x0a0e6e70),
			        X64Word_create(0x27b70a85, 0x46d22ffc), X64Word_create(0x2e1b2138, 0x5c26c926),
			        X64Word_create(0x4d2c6dfc, 0x5ac42aed), X64Word_create(0x53380d13, 0x9d95b3df),
			        X64Word_create(0x650a7354, 0x8baf63de), X64Word_create(0x766a0abb, 0x3c77b2a8),
			        X64Word_create(0x81c2c92e, 0x47edaee6), X64Word_create(0x92722c85, 0x1482353b),
			        X64Word_create(0xa2bfe8a1, 0x4cf10364), X64Word_create(0xa81a664b, 0xbc423001),
			        X64Word_create(0xc24b8b70, 0xd0f89791), X64Word_create(0xc76c51a3, 0x0654be30),
			        X64Word_create(0xd192e819, 0xd6ef5218), X64Word_create(0xd6990624, 0x5565a910),
			        X64Word_create(0xf40e3585, 0x5771202a), X64Word_create(0x106aa070, 0x32bbd1b8),
			        X64Word_create(0x19a4c116, 0xb8d2d0c8), X64Word_create(0x1e376c08, 0x5141ab53),
			        X64Word_create(0x2748774c, 0xdf8eeb99), X64Word_create(0x34b0bcb5, 0xe19b48a8),
			        X64Word_create(0x391c0cb3, 0xc5c95a63), X64Word_create(0x4ed8aa4a, 0xe3418acb),
			        X64Word_create(0x5b9cca4f, 0x7763e373), X64Word_create(0x682e6ff3, 0xd6b2b8a3),
			        X64Word_create(0x748f82ee, 0x5defb2fc), X64Word_create(0x78a5636f, 0x43172f60),
			        X64Word_create(0x84c87814, 0xa1f0ab72), X64Word_create(0x8cc70208, 0x1a6439ec),
			        X64Word_create(0x90befffa, 0x23631e28), X64Word_create(0xa4506ceb, 0xde82bde9),
			        X64Word_create(0xbef9a3f7, 0xb2c67915), X64Word_create(0xc67178f2, 0xe372532b),
			        X64Word_create(0xca273ece, 0xea26619c), X64Word_create(0xd186b8c7, 0x21c0c207),
			        X64Word_create(0xeada7dd6, 0xcde0eb1e), X64Word_create(0xf57d4f7f, 0xee6ed178),
			        X64Word_create(0x06f067aa, 0x72176fba), X64Word_create(0x0a637dc5, 0xa2c898a6),
			        X64Word_create(0x113f9804, 0xbef90dae), X64Word_create(0x1b710b35, 0x131c471b),
			        X64Word_create(0x28db77f5, 0x23047d84), X64Word_create(0x32caab7b, 0x40c72493),
			        X64Word_create(0x3c9ebe0a, 0x15c9bebc), X64Word_create(0x431d67c4, 0x9c100d4c),
			        X64Word_create(0x4cc5d4be, 0xcb3e42b6), X64Word_create(0x597f299c, 0xfc657e2a),
			        X64Word_create(0x5fcb6fab, 0x3ad6faec), X64Word_create(0x6c44198c, 0x4a475817)
			    ];

			    // Reusable objects
			    var W = [];
			    (function () {
			        for (var i = 0; i < 80; i++) {
			            W[i] = X64Word_create();
			        }
			    }());

			    /**
			     * SHA-512 hash algorithm.
			     */
			    var SHA512 = C_algo.SHA512 = Hasher.extend({
			        _doReset: function () {
			            this._hash = new X64WordArray.init([
			                new X64Word.init(0x6a09e667, 0xf3bcc908), new X64Word.init(0xbb67ae85, 0x84caa73b),
			                new X64Word.init(0x3c6ef372, 0xfe94f82b), new X64Word.init(0xa54ff53a, 0x5f1d36f1),
			                new X64Word.init(0x510e527f, 0xade682d1), new X64Word.init(0x9b05688c, 0x2b3e6c1f),
			                new X64Word.init(0x1f83d9ab, 0xfb41bd6b), new X64Word.init(0x5be0cd19, 0x137e2179)
			            ]);
			        },

			        _doProcessBlock: function (M, offset) {
			            // Shortcuts
			            var H = this._hash.words;

			            var H0 = H[0];
			            var H1 = H[1];
			            var H2 = H[2];
			            var H3 = H[3];
			            var H4 = H[4];
			            var H5 = H[5];
			            var H6 = H[6];
			            var H7 = H[7];

			            var H0h = H0.high;
			            var H0l = H0.low;
			            var H1h = H1.high;
			            var H1l = H1.low;
			            var H2h = H2.high;
			            var H2l = H2.low;
			            var H3h = H3.high;
			            var H3l = H3.low;
			            var H4h = H4.high;
			            var H4l = H4.low;
			            var H5h = H5.high;
			            var H5l = H5.low;
			            var H6h = H6.high;
			            var H6l = H6.low;
			            var H7h = H7.high;
			            var H7l = H7.low;

			            // Working variables
			            var ah = H0h;
			            var al = H0l;
			            var bh = H1h;
			            var bl = H1l;
			            var ch = H2h;
			            var cl = H2l;
			            var dh = H3h;
			            var dl = H3l;
			            var eh = H4h;
			            var el = H4l;
			            var fh = H5h;
			            var fl = H5l;
			            var gh = H6h;
			            var gl = H6l;
			            var hh = H7h;
			            var hl = H7l;

			            // Rounds
			            for (var i = 0; i < 80; i++) {
			                var Wil;
			                var Wih;

			                // Shortcut
			                var Wi = W[i];

			                // Extend message
			                if (i < 16) {
			                    Wih = Wi.high = M[offset + i * 2]     | 0;
			                    Wil = Wi.low  = M[offset + i * 2 + 1] | 0;
			                } else {
			                    // Gamma0
			                    var gamma0x  = W[i - 15];
			                    var gamma0xh = gamma0x.high;
			                    var gamma0xl = gamma0x.low;
			                    var gamma0h  = ((gamma0xh >>> 1) | (gamma0xl << 31)) ^ ((gamma0xh >>> 8) | (gamma0xl << 24)) ^ (gamma0xh >>> 7);
			                    var gamma0l  = ((gamma0xl >>> 1) | (gamma0xh << 31)) ^ ((gamma0xl >>> 8) | (gamma0xh << 24)) ^ ((gamma0xl >>> 7) | (gamma0xh << 25));

			                    // Gamma1
			                    var gamma1x  = W[i - 2];
			                    var gamma1xh = gamma1x.high;
			                    var gamma1xl = gamma1x.low;
			                    var gamma1h  = ((gamma1xh >>> 19) | (gamma1xl << 13)) ^ ((gamma1xh << 3) | (gamma1xl >>> 29)) ^ (gamma1xh >>> 6);
			                    var gamma1l  = ((gamma1xl >>> 19) | (gamma1xh << 13)) ^ ((gamma1xl << 3) | (gamma1xh >>> 29)) ^ ((gamma1xl >>> 6) | (gamma1xh << 26));

			                    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
			                    var Wi7  = W[i - 7];
			                    var Wi7h = Wi7.high;
			                    var Wi7l = Wi7.low;

			                    var Wi16  = W[i - 16];
			                    var Wi16h = Wi16.high;
			                    var Wi16l = Wi16.low;

			                    Wil = gamma0l + Wi7l;
			                    Wih = gamma0h + Wi7h + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0);
			                    Wil = Wil + gamma1l;
			                    Wih = Wih + gamma1h + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0);
			                    Wil = Wil + Wi16l;
			                    Wih = Wih + Wi16h + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0);

			                    Wi.high = Wih;
			                    Wi.low  = Wil;
			                }

			                var chh  = (eh & fh) ^ (~eh & gh);
			                var chl  = (el & fl) ^ (~el & gl);
			                var majh = (ah & bh) ^ (ah & ch) ^ (bh & ch);
			                var majl = (al & bl) ^ (al & cl) ^ (bl & cl);

			                var sigma0h = ((ah >>> 28) | (al << 4))  ^ ((ah << 30)  | (al >>> 2)) ^ ((ah << 25) | (al >>> 7));
			                var sigma0l = ((al >>> 28) | (ah << 4))  ^ ((al << 30)  | (ah >>> 2)) ^ ((al << 25) | (ah >>> 7));
			                var sigma1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((eh << 23) | (el >>> 9));
			                var sigma1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((el << 23) | (eh >>> 9));

			                // t1 = h + sigma1 + ch + K[i] + W[i]
			                var Ki  = K[i];
			                var Kih = Ki.high;
			                var Kil = Ki.low;

			                var t1l = hl + sigma1l;
			                var t1h = hh + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0);
			                var t1l = t1l + chl;
			                var t1h = t1h + chh + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0);
			                var t1l = t1l + Kil;
			                var t1h = t1h + Kih + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0);
			                var t1l = t1l + Wil;
			                var t1h = t1h + Wih + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0);

			                // t2 = sigma0 + maj
			                var t2l = sigma0l + majl;
			                var t2h = sigma0h + majh + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0);

			                // Update working variables
			                hh = gh;
			                hl = gl;
			                gh = fh;
			                gl = fl;
			                fh = eh;
			                fl = el;
			                el = (dl + t1l) | 0;
			                eh = (dh + t1h + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0;
			                dh = ch;
			                dl = cl;
			                ch = bh;
			                cl = bl;
			                bh = ah;
			                bl = al;
			                al = (t1l + t2l) | 0;
			                ah = (t1h + t2h + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0;
			            }

			            // Intermediate hash value
			            H0l = H0.low  = (H0l + al);
			            H0.high = (H0h + ah + ((H0l >>> 0) < (al >>> 0) ? 1 : 0));
			            H1l = H1.low  = (H1l + bl);
			            H1.high = (H1h + bh + ((H1l >>> 0) < (bl >>> 0) ? 1 : 0));
			            H2l = H2.low  = (H2l + cl);
			            H2.high = (H2h + ch + ((H2l >>> 0) < (cl >>> 0) ? 1 : 0));
			            H3l = H3.low  = (H3l + dl);
			            H3.high = (H3h + dh + ((H3l >>> 0) < (dl >>> 0) ? 1 : 0));
			            H4l = H4.low  = (H4l + el);
			            H4.high = (H4h + eh + ((H4l >>> 0) < (el >>> 0) ? 1 : 0));
			            H5l = H5.low  = (H5l + fl);
			            H5.high = (H5h + fh + ((H5l >>> 0) < (fl >>> 0) ? 1 : 0));
			            H6l = H6.low  = (H6l + gl);
			            H6.high = (H6h + gh + ((H6l >>> 0) < (gl >>> 0) ? 1 : 0));
			            H7l = H7.low  = (H7l + hl);
			            H7.high = (H7h + hh + ((H7l >>> 0) < (hl >>> 0) ? 1 : 0));
			        },

			        _doFinalize: function () {
			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;

			            var nBitsTotal = this._nDataBytes * 8;
			            var nBitsLeft = data.sigBytes * 8;

			            // Add padding
			            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
			            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 30] = Math.floor(nBitsTotal / 0x100000000);
			            dataWords[(((nBitsLeft + 128) >>> 10) << 5) + 31] = nBitsTotal;
			            data.sigBytes = dataWords.length * 4;

			            // Hash final blocks
			            this._process();

			            // Convert hash to 32-bit word array before returning
			            var hash = this._hash.toX32();

			            // Return final computed hash
			            return hash;
			        },

			        clone: function () {
			            var clone = Hasher.clone.call(this);
			            clone._hash = this._hash.clone();

			            return clone;
			        },

			        blockSize: 1024/32
			    });

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA512('message');
			     *     var hash = CryptoJS.SHA512(wordArray);
			     */
			    C.SHA512 = Hasher._createHelper(SHA512);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA512(message, key);
			     */
			    C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
			}());


			return CryptoJS.SHA512;

		})); 
	} (sha512));
	return sha512.exports;
}

var sha384 = {exports: {}};

var hasRequiredSha384;

function requireSha384 () {
	if (hasRequiredSha384) return sha384.exports;
	hasRequiredSha384 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireX64Core(), requireSha512());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_x64 = C.x64;
			    var X64Word = C_x64.Word;
			    var X64WordArray = C_x64.WordArray;
			    var C_algo = C.algo;
			    var SHA512 = C_algo.SHA512;

			    /**
			     * SHA-384 hash algorithm.
			     */
			    var SHA384 = C_algo.SHA384 = SHA512.extend({
			        _doReset: function () {
			            this._hash = new X64WordArray.init([
			                new X64Word.init(0xcbbb9d5d, 0xc1059ed8), new X64Word.init(0x629a292a, 0x367cd507),
			                new X64Word.init(0x9159015a, 0x3070dd17), new X64Word.init(0x152fecd8, 0xf70e5939),
			                new X64Word.init(0x67332667, 0xffc00b31), new X64Word.init(0x8eb44a87, 0x68581511),
			                new X64Word.init(0xdb0c2e0d, 0x64f98fa7), new X64Word.init(0x47b5481d, 0xbefa4fa4)
			            ]);
			        },

			        _doFinalize: function () {
			            var hash = SHA512._doFinalize.call(this);

			            hash.sigBytes -= 16;

			            return hash;
			        }
			    });

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA384('message');
			     *     var hash = CryptoJS.SHA384(wordArray);
			     */
			    C.SHA384 = SHA512._createHelper(SHA384);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA384(message, key);
			     */
			    C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
			}());


			return CryptoJS.SHA384;

		})); 
	} (sha384));
	return sha384.exports;
}

var sha3 = {exports: {}};

var hasRequiredSha3;

function requireSha3 () {
	if (hasRequiredSha3) return sha3.exports;
	hasRequiredSha3 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireX64Core());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function (Math) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var Hasher = C_lib.Hasher;
			    var C_x64 = C.x64;
			    var X64Word = C_x64.Word;
			    var C_algo = C.algo;

			    // Constants tables
			    var RHO_OFFSETS = [];
			    var PI_INDEXES  = [];
			    var ROUND_CONSTANTS = [];

			    // Compute Constants
			    (function () {
			        // Compute rho offset constants
			        var x = 1, y = 0;
			        for (var t = 0; t < 24; t++) {
			            RHO_OFFSETS[x + 5 * y] = ((t + 1) * (t + 2) / 2) % 64;

			            var newX = y % 5;
			            var newY = (2 * x + 3 * y) % 5;
			            x = newX;
			            y = newY;
			        }

			        // Compute pi index constants
			        for (var x = 0; x < 5; x++) {
			            for (var y = 0; y < 5; y++) {
			                PI_INDEXES[x + 5 * y] = y + ((2 * x + 3 * y) % 5) * 5;
			            }
			        }

			        // Compute round constants
			        var LFSR = 0x01;
			        for (var i = 0; i < 24; i++) {
			            var roundConstantMsw = 0;
			            var roundConstantLsw = 0;

			            for (var j = 0; j < 7; j++) {
			                if (LFSR & 0x01) {
			                    var bitPosition = (1 << j) - 1;
			                    if (bitPosition < 32) {
			                        roundConstantLsw ^= 1 << bitPosition;
			                    } else /* if (bitPosition >= 32) */ {
			                        roundConstantMsw ^= 1 << (bitPosition - 32);
			                    }
			                }

			                // Compute next LFSR
			                if (LFSR & 0x80) {
			                    // Primitive polynomial over GF(2): x^8 + x^6 + x^5 + x^4 + 1
			                    LFSR = (LFSR << 1) ^ 0x71;
			                } else {
			                    LFSR <<= 1;
			                }
			            }

			            ROUND_CONSTANTS[i] = X64Word.create(roundConstantMsw, roundConstantLsw);
			        }
			    }());

			    // Reusable objects for temporary values
			    var T = [];
			    (function () {
			        for (var i = 0; i < 25; i++) {
			            T[i] = X64Word.create();
			        }
			    }());

			    /**
			     * SHA-3 hash algorithm.
			     */
			    var SHA3 = C_algo.SHA3 = Hasher.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {number} outputLength
			         *   The desired number of bits in the output hash.
			         *   Only values permitted are: 224, 256, 384, 512.
			         *   Default: 512
			         */
			        cfg: Hasher.cfg.extend({
			            outputLength: 512
			        }),

			        _doReset: function () {
			            var state = this._state = [];
			            for (var i = 0; i < 25; i++) {
			                state[i] = new X64Word.init();
			            }

			            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
			        },

			        _doProcessBlock: function (M, offset) {
			            // Shortcuts
			            var state = this._state;
			            var nBlockSizeLanes = this.blockSize / 2;

			            // Absorb
			            for (var i = 0; i < nBlockSizeLanes; i++) {
			                // Shortcuts
			                var M2i  = M[offset + 2 * i];
			                var M2i1 = M[offset + 2 * i + 1];

			                // Swap endian
			                M2i = (
			                    (((M2i << 8)  | (M2i >>> 24)) & 0x00ff00ff) |
			                    (((M2i << 24) | (M2i >>> 8))  & 0xff00ff00)
			                );
			                M2i1 = (
			                    (((M2i1 << 8)  | (M2i1 >>> 24)) & 0x00ff00ff) |
			                    (((M2i1 << 24) | (M2i1 >>> 8))  & 0xff00ff00)
			                );

			                // Absorb message into state
			                var lane = state[i];
			                lane.high ^= M2i1;
			                lane.low  ^= M2i;
			            }

			            // Rounds
			            for (var round = 0; round < 24; round++) {
			                // Theta
			                for (var x = 0; x < 5; x++) {
			                    // Mix column lanes
			                    var tMsw = 0, tLsw = 0;
			                    for (var y = 0; y < 5; y++) {
			                        var lane = state[x + 5 * y];
			                        tMsw ^= lane.high;
			                        tLsw ^= lane.low;
			                    }

			                    // Temporary values
			                    var Tx = T[x];
			                    Tx.high = tMsw;
			                    Tx.low  = tLsw;
			                }
			                for (var x = 0; x < 5; x++) {
			                    // Shortcuts
			                    var Tx4 = T[(x + 4) % 5];
			                    var Tx1 = T[(x + 1) % 5];
			                    var Tx1Msw = Tx1.high;
			                    var Tx1Lsw = Tx1.low;

			                    // Mix surrounding columns
			                    var tMsw = Tx4.high ^ ((Tx1Msw << 1) | (Tx1Lsw >>> 31));
			                    var tLsw = Tx4.low  ^ ((Tx1Lsw << 1) | (Tx1Msw >>> 31));
			                    for (var y = 0; y < 5; y++) {
			                        var lane = state[x + 5 * y];
			                        lane.high ^= tMsw;
			                        lane.low  ^= tLsw;
			                    }
			                }

			                // Rho Pi
			                for (var laneIndex = 1; laneIndex < 25; laneIndex++) {
			                    var tMsw;
			                    var tLsw;

			                    // Shortcuts
			                    var lane = state[laneIndex];
			                    var laneMsw = lane.high;
			                    var laneLsw = lane.low;
			                    var rhoOffset = RHO_OFFSETS[laneIndex];

			                    // Rotate lanes
			                    if (rhoOffset < 32) {
			                        tMsw = (laneMsw << rhoOffset) | (laneLsw >>> (32 - rhoOffset));
			                        tLsw = (laneLsw << rhoOffset) | (laneMsw >>> (32 - rhoOffset));
			                    } else /* if (rhoOffset >= 32) */ {
			                        tMsw = (laneLsw << (rhoOffset - 32)) | (laneMsw >>> (64 - rhoOffset));
			                        tLsw = (laneMsw << (rhoOffset - 32)) | (laneLsw >>> (64 - rhoOffset));
			                    }

			                    // Transpose lanes
			                    var TPiLane = T[PI_INDEXES[laneIndex]];
			                    TPiLane.high = tMsw;
			                    TPiLane.low  = tLsw;
			                }

			                // Rho pi at x = y = 0
			                var T0 = T[0];
			                var state0 = state[0];
			                T0.high = state0.high;
			                T0.low  = state0.low;

			                // Chi
			                for (var x = 0; x < 5; x++) {
			                    for (var y = 0; y < 5; y++) {
			                        // Shortcuts
			                        var laneIndex = x + 5 * y;
			                        var lane = state[laneIndex];
			                        var TLane = T[laneIndex];
			                        var Tx1Lane = T[((x + 1) % 5) + 5 * y];
			                        var Tx2Lane = T[((x + 2) % 5) + 5 * y];

			                        // Mix rows
			                        lane.high = TLane.high ^ (~Tx1Lane.high & Tx2Lane.high);
			                        lane.low  = TLane.low  ^ (~Tx1Lane.low  & Tx2Lane.low);
			                    }
			                }

			                // Iota
			                var lane = state[0];
			                var roundConstant = ROUND_CONSTANTS[round];
			                lane.high ^= roundConstant.high;
			                lane.low  ^= roundConstant.low;
			            }
			        },

			        _doFinalize: function () {
			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;
			            this._nDataBytes * 8;
			            var nBitsLeft = data.sigBytes * 8;
			            var blockSizeBits = this.blockSize * 32;

			            // Add padding
			            dataWords[nBitsLeft >>> 5] |= 0x1 << (24 - nBitsLeft % 32);
			            dataWords[((Math.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits) >>> 5) - 1] |= 0x80;
			            data.sigBytes = dataWords.length * 4;

			            // Hash final blocks
			            this._process();

			            // Shortcuts
			            var state = this._state;
			            var outputLengthBytes = this.cfg.outputLength / 8;
			            var outputLengthLanes = outputLengthBytes / 8;

			            // Squeeze
			            var hashWords = [];
			            for (var i = 0; i < outputLengthLanes; i++) {
			                // Shortcuts
			                var lane = state[i];
			                var laneMsw = lane.high;
			                var laneLsw = lane.low;

			                // Swap endian
			                laneMsw = (
			                    (((laneMsw << 8)  | (laneMsw >>> 24)) & 0x00ff00ff) |
			                    (((laneMsw << 24) | (laneMsw >>> 8))  & 0xff00ff00)
			                );
			                laneLsw = (
			                    (((laneLsw << 8)  | (laneLsw >>> 24)) & 0x00ff00ff) |
			                    (((laneLsw << 24) | (laneLsw >>> 8))  & 0xff00ff00)
			                );

			                // Squeeze state to retrieve hash
			                hashWords.push(laneLsw);
			                hashWords.push(laneMsw);
			            }

			            // Return final computed hash
			            return new WordArray.init(hashWords, outputLengthBytes);
			        },

			        clone: function () {
			            var clone = Hasher.clone.call(this);

			            var state = clone._state = this._state.slice(0);
			            for (var i = 0; i < 25; i++) {
			                state[i] = state[i].clone();
			            }

			            return clone;
			        }
			    });

			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.SHA3('message');
			     *     var hash = CryptoJS.SHA3(wordArray);
			     */
			    C.SHA3 = Hasher._createHelper(SHA3);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacSHA3(message, key);
			     */
			    C.HmacSHA3 = Hasher._createHmacHelper(SHA3);
			}(Math));


			return CryptoJS.SHA3;

		})); 
	} (sha3));
	return sha3.exports;
}

var ripemd160 = {exports: {}};

var hasRequiredRipemd160;

function requireRipemd160 () {
	if (hasRequiredRipemd160) return ripemd160.exports;
	hasRequiredRipemd160 = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/** @preserve
			(c) 2012 by Cédric Mesnil. All rights reserved.

			Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

			    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
			    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

			THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
			*/

			(function (Math) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var Hasher = C_lib.Hasher;
			    var C_algo = C.algo;

			    // Constants table
			    var _zl = WordArray.create([
			        0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
			        7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
			        3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
			        1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
			        4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13]);
			    var _zr = WordArray.create([
			        5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
			        6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
			        15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
			        8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
			        12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11]);
			    var _sl = WordArray.create([
			         11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
			        7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
			        11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
			          11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
			        9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ]);
			    var _sr = WordArray.create([
			        8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
			        9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
			        9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
			        15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
			        8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ]);

			    var _hl =  WordArray.create([ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E]);
			    var _hr =  WordArray.create([ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000]);

			    /**
			     * RIPEMD160 hash algorithm.
			     */
			    var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
			        _doReset: function () {
			            this._hash  = WordArray.create([0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0]);
			        },

			        _doProcessBlock: function (M, offset) {

			            // Swap endian
			            for (var i = 0; i < 16; i++) {
			                // Shortcuts
			                var offset_i = offset + i;
			                var M_offset_i = M[offset_i];

			                // Swap
			                M[offset_i] = (
			                    (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
			                    (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
			                );
			            }
			            // Shortcut
			            var H  = this._hash.words;
			            var hl = _hl.words;
			            var hr = _hr.words;
			            var zl = _zl.words;
			            var zr = _zr.words;
			            var sl = _sl.words;
			            var sr = _sr.words;

			            // Working variables
			            var al, bl, cl, dl, el;
			            var ar, br, cr, dr, er;

			            ar = al = H[0];
			            br = bl = H[1];
			            cr = cl = H[2];
			            dr = dl = H[3];
			            er = el = H[4];
			            // Computation
			            var t;
			            for (var i = 0; i < 80; i += 1) {
			                t = (al +  M[offset+zl[i]])|0;
			                if (i<16){
				            t +=  f1(bl,cl,dl) + hl[0];
			                } else if (i<32) {
				            t +=  f2(bl,cl,dl) + hl[1];
			                } else if (i<48) {
				            t +=  f3(bl,cl,dl) + hl[2];
			                } else if (i<64) {
				            t +=  f4(bl,cl,dl) + hl[3];
			                } else {// if (i<80) {
				            t +=  f5(bl,cl,dl) + hl[4];
			                }
			                t = t|0;
			                t =  rotl(t,sl[i]);
			                t = (t+el)|0;
			                al = el;
			                el = dl;
			                dl = rotl(cl, 10);
			                cl = bl;
			                bl = t;

			                t = (ar + M[offset+zr[i]])|0;
			                if (i<16){
				            t +=  f5(br,cr,dr) + hr[0];
			                } else if (i<32) {
				            t +=  f4(br,cr,dr) + hr[1];
			                } else if (i<48) {
				            t +=  f3(br,cr,dr) + hr[2];
			                } else if (i<64) {
				            t +=  f2(br,cr,dr) + hr[3];
			                } else {// if (i<80) {
				            t +=  f1(br,cr,dr) + hr[4];
			                }
			                t = t|0;
			                t =  rotl(t,sr[i]) ;
			                t = (t+er)|0;
			                ar = er;
			                er = dr;
			                dr = rotl(cr, 10);
			                cr = br;
			                br = t;
			            }
			            // Intermediate hash value
			            t    = (H[1] + cl + dr)|0;
			            H[1] = (H[2] + dl + er)|0;
			            H[2] = (H[3] + el + ar)|0;
			            H[3] = (H[4] + al + br)|0;
			            H[4] = (H[0] + bl + cr)|0;
			            H[0] =  t;
			        },

			        _doFinalize: function () {
			            // Shortcuts
			            var data = this._data;
			            var dataWords = data.words;

			            var nBitsTotal = this._nDataBytes * 8;
			            var nBitsLeft = data.sigBytes * 8;

			            // Add padding
			            dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
			            dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
			                (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
			                (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
			            );
			            data.sigBytes = (dataWords.length + 1) * 4;

			            // Hash final blocks
			            this._process();

			            // Shortcuts
			            var hash = this._hash;
			            var H = hash.words;

			            // Swap endian
			            for (var i = 0; i < 5; i++) {
			                // Shortcut
			                var H_i = H[i];

			                // Swap
			                H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
			                       (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
			            }

			            // Return final computed hash
			            return hash;
			        },

			        clone: function () {
			            var clone = Hasher.clone.call(this);
			            clone._hash = this._hash.clone();

			            return clone;
			        }
			    });


			    function f1(x, y, z) {
			        return ((x) ^ (y) ^ (z));

			    }

			    function f2(x, y, z) {
			        return (((x)&(y)) | ((~x)&(z)));
			    }

			    function f3(x, y, z) {
			        return (((x) | (~(y))) ^ (z));
			    }

			    function f4(x, y, z) {
			        return (((x) & (z)) | ((y)&(~(z))));
			    }

			    function f5(x, y, z) {
			        return ((x) ^ ((y) |(~(z))));

			    }

			    function rotl(x,n) {
			        return (x<<n) | (x>>>(32-n));
			    }


			    /**
			     * Shortcut function to the hasher's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     *
			     * @return {WordArray} The hash.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hash = CryptoJS.RIPEMD160('message');
			     *     var hash = CryptoJS.RIPEMD160(wordArray);
			     */
			    C.RIPEMD160 = Hasher._createHelper(RIPEMD160);

			    /**
			     * Shortcut function to the HMAC's object interface.
			     *
			     * @param {WordArray|string} message The message to hash.
			     * @param {WordArray|string} key The secret key.
			     *
			     * @return {WordArray} The HMAC.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var hmac = CryptoJS.HmacRIPEMD160(message, key);
			     */
			    C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
			}());


			return CryptoJS.RIPEMD160;

		})); 
	} (ripemd160));
	return ripemd160.exports;
}

var hmac = {exports: {}};

var hasRequiredHmac;

function requireHmac () {
	if (hasRequiredHmac) return hmac.exports;
	hasRequiredHmac = 1;
	(function (module, exports$1) {
(function (root, factory) {
			{
				// CommonJS
				module.exports = factory(requireCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var Base = C_lib.Base;
			    var C_enc = C.enc;
			    var Utf8 = C_enc.Utf8;
			    var C_algo = C.algo;

			    /**
			     * HMAC algorithm.
			     */
			    C_algo.HMAC = Base.extend({
			        /**
			         * Initializes a newly created HMAC.
			         *
			         * @param {Hasher} hasher The hash algorithm to use.
			         * @param {WordArray|string} key The secret key.
			         *
			         * @example
			         *
			         *     var hmacHasher = CryptoJS.algo.HMAC.create(CryptoJS.algo.SHA256, key);
			         */
			        init: function (hasher, key) {
			            // Init hasher
			            hasher = this._hasher = new hasher.init();

			            // Convert string to WordArray, else assume WordArray already
			            if (typeof key == 'string') {
			                key = Utf8.parse(key);
			            }

			            // Shortcuts
			            var hasherBlockSize = hasher.blockSize;
			            var hasherBlockSizeBytes = hasherBlockSize * 4;

			            // Allow arbitrary length keys
			            if (key.sigBytes > hasherBlockSizeBytes) {
			                key = hasher.finalize(key);
			            }

			            // Clamp excess bits
			            key.clamp();

			            // Clone key for inner and outer pads
			            var oKey = this._oKey = key.clone();
			            var iKey = this._iKey = key.clone();

			            // Shortcuts
			            var oKeyWords = oKey.words;
			            var iKeyWords = iKey.words;

			            // XOR keys with pad constants
			            for (var i = 0; i < hasherBlockSize; i++) {
			                oKeyWords[i] ^= 0x5c5c5c5c;
			                iKeyWords[i] ^= 0x36363636;
			            }
			            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

			            // Set initial values
			            this.reset();
			        },

			        /**
			         * Resets this HMAC to its initial state.
			         *
			         * @example
			         *
			         *     hmacHasher.reset();
			         */
			        reset: function () {
			            // Shortcut
			            var hasher = this._hasher;

			            // Reset
			            hasher.reset();
			            hasher.update(this._iKey);
			        },

			        /**
			         * Updates this HMAC with a message.
			         *
			         * @param {WordArray|string} messageUpdate The message to append.
			         *
			         * @return {HMAC} This HMAC instance.
			         *
			         * @example
			         *
			         *     hmacHasher.update('message');
			         *     hmacHasher.update(wordArray);
			         */
			        update: function (messageUpdate) {
			            this._hasher.update(messageUpdate);

			            // Chainable
			            return this;
			        },

			        /**
			         * Finalizes the HMAC computation.
			         * Note that the finalize operation is effectively a destructive, read-once operation.
			         *
			         * @param {WordArray|string} messageUpdate (Optional) A final message update.
			         *
			         * @return {WordArray} The HMAC.
			         *
			         * @example
			         *
			         *     var hmac = hmacHasher.finalize();
			         *     var hmac = hmacHasher.finalize('message');
			         *     var hmac = hmacHasher.finalize(wordArray);
			         */
			        finalize: function (messageUpdate) {
			            // Shortcut
			            var hasher = this._hasher;

			            // Compute HMAC
			            var innerHash = hasher.finalize(messageUpdate);
			            hasher.reset();
			            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

			            return hmac;
			        }
			    });
			}());


		})); 
	} (hmac));
	return hmac.exports;
}

var pbkdf2 = {exports: {}};

var hasRequiredPbkdf2;

function requirePbkdf2 () {
	if (hasRequiredPbkdf2) return pbkdf2.exports;
	hasRequiredPbkdf2 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireSha256(), requireHmac());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var Base = C_lib.Base;
			    var WordArray = C_lib.WordArray;
			    var C_algo = C.algo;
			    var SHA256 = C_algo.SHA256;
			    var HMAC = C_algo.HMAC;

			    /**
			     * Password-Based Key Derivation Function 2 algorithm.
			     */
			    var PBKDF2 = C_algo.PBKDF2 = Base.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
			         * @property {Hasher} hasher The hasher to use. Default: SHA256
			         * @property {number} iterations The number of iterations to perform. Default: 250000
			         */
			        cfg: Base.extend({
			            keySize: 128/32,
			            hasher: SHA256,
			            iterations: 250000
			        }),

			        /**
			         * Initializes a newly created key derivation function.
			         *
			         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
			         *
			         * @example
			         *
			         *     var kdf = CryptoJS.algo.PBKDF2.create();
			         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8 });
			         *     var kdf = CryptoJS.algo.PBKDF2.create({ keySize: 8, iterations: 1000 });
			         */
			        init: function (cfg) {
			            this.cfg = this.cfg.extend(cfg);
			        },

			        /**
			         * Computes the Password-Based Key Derivation Function 2.
			         *
			         * @param {WordArray|string} password The password.
			         * @param {WordArray|string} salt A salt.
			         *
			         * @return {WordArray} The derived key.
			         *
			         * @example
			         *
			         *     var key = kdf.compute(password, salt);
			         */
			        compute: function (password, salt) {
			            // Shortcut
			            var cfg = this.cfg;

			            // Init HMAC
			            var hmac = HMAC.create(cfg.hasher, password);

			            // Initial values
			            var derivedKey = WordArray.create();
			            var blockIndex = WordArray.create([0x00000001]);

			            // Shortcuts
			            var derivedKeyWords = derivedKey.words;
			            var blockIndexWords = blockIndex.words;
			            var keySize = cfg.keySize;
			            var iterations = cfg.iterations;

			            // Generate key
			            while (derivedKeyWords.length < keySize) {
			                var block = hmac.update(salt).finalize(blockIndex);
			                hmac.reset();

			                // Shortcuts
			                var blockWords = block.words;
			                var blockWordsLength = blockWords.length;

			                // Iterations
			                var intermediate = block;
			                for (var i = 1; i < iterations; i++) {
			                    intermediate = hmac.finalize(intermediate);
			                    hmac.reset();

			                    // Shortcut
			                    var intermediateWords = intermediate.words;

			                    // XOR intermediate with block
			                    for (var j = 0; j < blockWordsLength; j++) {
			                        blockWords[j] ^= intermediateWords[j];
			                    }
			                }

			                derivedKey.concat(block);
			                blockIndexWords[0]++;
			            }
			            derivedKey.sigBytes = keySize * 4;

			            return derivedKey;
			        }
			    });

			    /**
			     * Computes the Password-Based Key Derivation Function 2.
			     *
			     * @param {WordArray|string} password The password.
			     * @param {WordArray|string} salt A salt.
			     * @param {Object} cfg (Optional) The configuration options to use for this computation.
			     *
			     * @return {WordArray} The derived key.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var key = CryptoJS.PBKDF2(password, salt);
			     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8 });
			     *     var key = CryptoJS.PBKDF2(password, salt, { keySize: 8, iterations: 1000 });
			     */
			    C.PBKDF2 = function (password, salt, cfg) {
			        return PBKDF2.create(cfg).compute(password, salt);
			    };
			}());


			return CryptoJS.PBKDF2;

		})); 
	} (pbkdf2));
	return pbkdf2.exports;
}

var evpkdf = {exports: {}};

var hasRequiredEvpkdf;

function requireEvpkdf () {
	if (hasRequiredEvpkdf) return evpkdf.exports;
	hasRequiredEvpkdf = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireSha1(), requireHmac());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var Base = C_lib.Base;
			    var WordArray = C_lib.WordArray;
			    var C_algo = C.algo;
			    var MD5 = C_algo.MD5;

			    /**
			     * This key derivation function is meant to conform with EVP_BytesToKey.
			     * www.openssl.org/docs/crypto/EVP_BytesToKey.html
			     */
			    var EvpKDF = C_algo.EvpKDF = Base.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {number} keySize The key size in words to generate. Default: 4 (128 bits)
			         * @property {Hasher} hasher The hash algorithm to use. Default: MD5
			         * @property {number} iterations The number of iterations to perform. Default: 1
			         */
			        cfg: Base.extend({
			            keySize: 128/32,
			            hasher: MD5,
			            iterations: 1
			        }),

			        /**
			         * Initializes a newly created key derivation function.
			         *
			         * @param {Object} cfg (Optional) The configuration options to use for the derivation.
			         *
			         * @example
			         *
			         *     var kdf = CryptoJS.algo.EvpKDF.create();
			         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8 });
			         *     var kdf = CryptoJS.algo.EvpKDF.create({ keySize: 8, iterations: 1000 });
			         */
			        init: function (cfg) {
			            this.cfg = this.cfg.extend(cfg);
			        },

			        /**
			         * Derives a key from a password.
			         *
			         * @param {WordArray|string} password The password.
			         * @param {WordArray|string} salt A salt.
			         *
			         * @return {WordArray} The derived key.
			         *
			         * @example
			         *
			         *     var key = kdf.compute(password, salt);
			         */
			        compute: function (password, salt) {
			            var block;

			            // Shortcut
			            var cfg = this.cfg;

			            // Init hasher
			            var hasher = cfg.hasher.create();

			            // Initial values
			            var derivedKey = WordArray.create();

			            // Shortcuts
			            var derivedKeyWords = derivedKey.words;
			            var keySize = cfg.keySize;
			            var iterations = cfg.iterations;

			            // Generate key
			            while (derivedKeyWords.length < keySize) {
			                if (block) {
			                    hasher.update(block);
			                }
			                block = hasher.update(password).finalize(salt);
			                hasher.reset();

			                // Iterations
			                for (var i = 1; i < iterations; i++) {
			                    block = hasher.finalize(block);
			                    hasher.reset();
			                }

			                derivedKey.concat(block);
			            }
			            derivedKey.sigBytes = keySize * 4;

			            return derivedKey;
			        }
			    });

			    /**
			     * Derives a key from a password.
			     *
			     * @param {WordArray|string} password The password.
			     * @param {WordArray|string} salt A salt.
			     * @param {Object} cfg (Optional) The configuration options to use for this computation.
			     *
			     * @return {WordArray} The derived key.
			     *
			     * @static
			     *
			     * @example
			     *
			     *     var key = CryptoJS.EvpKDF(password, salt);
			     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8 });
			     *     var key = CryptoJS.EvpKDF(password, salt, { keySize: 8, iterations: 1000 });
			     */
			    C.EvpKDF = function (password, salt, cfg) {
			        return EvpKDF.create(cfg).compute(password, salt);
			    };
			}());


			return CryptoJS.EvpKDF;

		})); 
	} (evpkdf));
	return evpkdf.exports;
}

var cipherCore = {exports: {}};

var hasRequiredCipherCore;

function requireCipherCore () {
	if (hasRequiredCipherCore) return cipherCore.exports;
	hasRequiredCipherCore = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEvpkdf());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * Cipher core components.
			 */
			CryptoJS.lib.Cipher || (function (undefined$1) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var Base = C_lib.Base;
			    var WordArray = C_lib.WordArray;
			    var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
			    var C_enc = C.enc;
			    C_enc.Utf8;
			    var Base64 = C_enc.Base64;
			    var C_algo = C.algo;
			    var EvpKDF = C_algo.EvpKDF;

			    /**
			     * Abstract base cipher template.
			     *
			     * @property {number} keySize This cipher's key size. Default: 4 (128 bits)
			     * @property {number} ivSize This cipher's IV size. Default: 4 (128 bits)
			     * @property {number} _ENC_XFORM_MODE A constant representing encryption mode.
			     * @property {number} _DEC_XFORM_MODE A constant representing decryption mode.
			     */
			    var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {WordArray} iv The IV to use for this operation.
			         */
			        cfg: Base.extend(),

			        /**
			         * Creates this cipher in encryption mode.
			         *
			         * @param {WordArray} key The key.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @return {Cipher} A cipher instance.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var cipher = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray });
			         */
			        createEncryptor: function (key, cfg) {
			            return this.create(this._ENC_XFORM_MODE, key, cfg);
			        },

			        /**
			         * Creates this cipher in decryption mode.
			         *
			         * @param {WordArray} key The key.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @return {Cipher} A cipher instance.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var cipher = CryptoJS.algo.AES.createDecryptor(keyWordArray, { iv: ivWordArray });
			         */
			        createDecryptor: function (key, cfg) {
			            return this.create(this._DEC_XFORM_MODE, key, cfg);
			        },

			        /**
			         * Initializes a newly created cipher.
			         *
			         * @param {number} xformMode Either the encryption or decryption transormation mode constant.
			         * @param {WordArray} key The key.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @example
			         *
			         *     var cipher = CryptoJS.algo.AES.create(CryptoJS.algo.AES._ENC_XFORM_MODE, keyWordArray, { iv: ivWordArray });
			         */
			        init: function (xformMode, key, cfg) {
			            // Apply config defaults
			            this.cfg = this.cfg.extend(cfg);

			            // Store transform mode and key
			            this._xformMode = xformMode;
			            this._key = key;

			            // Set initial values
			            this.reset();
			        },

			        /**
			         * Resets this cipher to its initial state.
			         *
			         * @example
			         *
			         *     cipher.reset();
			         */
			        reset: function () {
			            // Reset data buffer
			            BufferedBlockAlgorithm.reset.call(this);

			            // Perform concrete-cipher logic
			            this._doReset();
			        },

			        /**
			         * Adds data to be encrypted or decrypted.
			         *
			         * @param {WordArray|string} dataUpdate The data to encrypt or decrypt.
			         *
			         * @return {WordArray} The data after processing.
			         *
			         * @example
			         *
			         *     var encrypted = cipher.process('data');
			         *     var encrypted = cipher.process(wordArray);
			         */
			        process: function (dataUpdate) {
			            // Append
			            this._append(dataUpdate);

			            // Process available blocks
			            return this._process();
			        },

			        /**
			         * Finalizes the encryption or decryption process.
			         * Note that the finalize operation is effectively a destructive, read-once operation.
			         *
			         * @param {WordArray|string} dataUpdate The final data to encrypt or decrypt.
			         *
			         * @return {WordArray} The data after final processing.
			         *
			         * @example
			         *
			         *     var encrypted = cipher.finalize();
			         *     var encrypted = cipher.finalize('data');
			         *     var encrypted = cipher.finalize(wordArray);
			         */
			        finalize: function (dataUpdate) {
			            // Final data update
			            if (dataUpdate) {
			                this._append(dataUpdate);
			            }

			            // Perform concrete-cipher logic
			            var finalProcessedData = this._doFinalize();

			            return finalProcessedData;
			        },

			        keySize: 128/32,

			        ivSize: 128/32,

			        _ENC_XFORM_MODE: 1,

			        _DEC_XFORM_MODE: 2,

			        /**
			         * Creates shortcut functions to a cipher's object interface.
			         *
			         * @param {Cipher} cipher The cipher to create a helper for.
			         *
			         * @return {Object} An object with encrypt and decrypt shortcut functions.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var AES = CryptoJS.lib.Cipher._createHelper(CryptoJS.algo.AES);
			         */
			        _createHelper: (function () {
			            function selectCipherStrategy(key) {
			                if (typeof key == 'string') {
			                    return PasswordBasedCipher;
			                } else {
			                    return SerializableCipher;
			                }
			            }

			            return function (cipher) {
			                return {
			                    encrypt: function (message, key, cfg) {
			                        return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
			                    },

			                    decrypt: function (ciphertext, key, cfg) {
			                        return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
			                    }
			                };
			            };
			        }())
			    });

			    /**
			     * Abstract base stream cipher template.
			     *
			     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 1 (32 bits)
			     */
			    C_lib.StreamCipher = Cipher.extend({
			        _doFinalize: function () {
			            // Process partial blocks
			            var finalProcessedBlocks = this._process(true);

			            return finalProcessedBlocks;
			        },

			        blockSize: 1
			    });

			    /**
			     * Mode namespace.
			     */
			    var C_mode = C.mode = {};

			    /**
			     * Abstract base block cipher mode template.
			     */
			    var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
			        /**
			         * Creates this mode for encryption.
			         *
			         * @param {Cipher} cipher A block cipher instance.
			         * @param {Array} iv The IV words.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var mode = CryptoJS.mode.CBC.createEncryptor(cipher, iv.words);
			         */
			        createEncryptor: function (cipher, iv) {
			            return this.Encryptor.create(cipher, iv);
			        },

			        /**
			         * Creates this mode for decryption.
			         *
			         * @param {Cipher} cipher A block cipher instance.
			         * @param {Array} iv The IV words.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var mode = CryptoJS.mode.CBC.createDecryptor(cipher, iv.words);
			         */
			        createDecryptor: function (cipher, iv) {
			            return this.Decryptor.create(cipher, iv);
			        },

			        /**
			         * Initializes a newly created mode.
			         *
			         * @param {Cipher} cipher A block cipher instance.
			         * @param {Array} iv The IV words.
			         *
			         * @example
			         *
			         *     var mode = CryptoJS.mode.CBC.Encryptor.create(cipher, iv.words);
			         */
			        init: function (cipher, iv) {
			            this._cipher = cipher;
			            this._iv = iv;
			        }
			    });

			    /**
			     * Cipher Block Chaining mode.
			     */
			    var CBC = C_mode.CBC = (function () {
			        /**
			         * Abstract base CBC mode.
			         */
			        var CBC = BlockCipherMode.extend();

			        /**
			         * CBC encryptor.
			         */
			        CBC.Encryptor = CBC.extend({
			            /**
			             * Processes the data block at offset.
			             *
			             * @param {Array} words The data words to operate on.
			             * @param {number} offset The offset where the block starts.
			             *
			             * @example
			             *
			             *     mode.processBlock(data.words, offset);
			             */
			            processBlock: function (words, offset) {
			                // Shortcuts
			                var cipher = this._cipher;
			                var blockSize = cipher.blockSize;

			                // XOR and encrypt
			                xorBlock.call(this, words, offset, blockSize);
			                cipher.encryptBlock(words, offset);

			                // Remember this block to use with next block
			                this._prevBlock = words.slice(offset, offset + blockSize);
			            }
			        });

			        /**
			         * CBC decryptor.
			         */
			        CBC.Decryptor = CBC.extend({
			            /**
			             * Processes the data block at offset.
			             *
			             * @param {Array} words The data words to operate on.
			             * @param {number} offset The offset where the block starts.
			             *
			             * @example
			             *
			             *     mode.processBlock(data.words, offset);
			             */
			            processBlock: function (words, offset) {
			                // Shortcuts
			                var cipher = this._cipher;
			                var blockSize = cipher.blockSize;

			                // Remember this block to use with next block
			                var thisBlock = words.slice(offset, offset + blockSize);

			                // Decrypt and XOR
			                cipher.decryptBlock(words, offset);
			                xorBlock.call(this, words, offset, blockSize);

			                // This block becomes the previous block
			                this._prevBlock = thisBlock;
			            }
			        });

			        function xorBlock(words, offset, blockSize) {
			            var block;

			            // Shortcut
			            var iv = this._iv;

			            // Choose mixing block
			            if (iv) {
			                block = iv;

			                // Remove IV for subsequent blocks
			                this._iv = undefined$1;
			            } else {
			                block = this._prevBlock;
			            }

			            // XOR blocks
			            for (var i = 0; i < blockSize; i++) {
			                words[offset + i] ^= block[i];
			            }
			        }

			        return CBC;
			    }());

			    /**
			     * Padding namespace.
			     */
			    var C_pad = C.pad = {};

			    /**
			     * PKCS #5/7 padding strategy.
			     */
			    var Pkcs7 = C_pad.Pkcs7 = {
			        /**
			         * Pads data using the algorithm defined in PKCS #5/7.
			         *
			         * @param {WordArray} data The data to pad.
			         * @param {number} blockSize The multiple that the data should be padded to.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     CryptoJS.pad.Pkcs7.pad(wordArray, 4);
			         */
			        pad: function (data, blockSize) {
			            // Shortcut
			            var blockSizeBytes = blockSize * 4;

			            // Count padding bytes
			            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

			            // Create padding word
			            var paddingWord = (nPaddingBytes << 24) | (nPaddingBytes << 16) | (nPaddingBytes << 8) | nPaddingBytes;

			            // Create padding
			            var paddingWords = [];
			            for (var i = 0; i < nPaddingBytes; i += 4) {
			                paddingWords.push(paddingWord);
			            }
			            var padding = WordArray.create(paddingWords, nPaddingBytes);

			            // Add padding
			            data.concat(padding);
			        },

			        /**
			         * Unpads data that had been padded using the algorithm defined in PKCS #5/7.
			         *
			         * @param {WordArray} data The data to unpad.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     CryptoJS.pad.Pkcs7.unpad(wordArray);
			         */
			        unpad: function (data) {
			            // Get number of padding bytes from last byte
			            var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

			            // Remove padding
			            data.sigBytes -= nPaddingBytes;
			        }
			    };

			    /**
			     * Abstract base block cipher template.
			     *
			     * @property {number} blockSize The number of 32-bit words this cipher operates on. Default: 4 (128 bits)
			     */
			    C_lib.BlockCipher = Cipher.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {Mode} mode The block mode to use. Default: CBC
			         * @property {Padding} padding The padding strategy to use. Default: Pkcs7
			         */
			        cfg: Cipher.cfg.extend({
			            mode: CBC,
			            padding: Pkcs7
			        }),

			        reset: function () {
			            var modeCreator;

			            // Reset cipher
			            Cipher.reset.call(this);

			            // Shortcuts
			            var cfg = this.cfg;
			            var iv = cfg.iv;
			            var mode = cfg.mode;

			            // Reset block mode
			            if (this._xformMode == this._ENC_XFORM_MODE) {
			                modeCreator = mode.createEncryptor;
			            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
			                modeCreator = mode.createDecryptor;
			                // Keep at least one block in the buffer for unpadding
			                this._minBufferSize = 1;
			            }

			            if (this._mode && this._mode.__creator == modeCreator) {
			                this._mode.init(this, iv && iv.words);
			            } else {
			                this._mode = modeCreator.call(mode, this, iv && iv.words);
			                this._mode.__creator = modeCreator;
			            }
			        },

			        _doProcessBlock: function (words, offset) {
			            this._mode.processBlock(words, offset);
			        },

			        _doFinalize: function () {
			            var finalProcessedBlocks;

			            // Shortcut
			            var padding = this.cfg.padding;

			            // Finalize
			            if (this._xformMode == this._ENC_XFORM_MODE) {
			                // Pad data
			                padding.pad(this._data, this.blockSize);

			                // Process final blocks
			                finalProcessedBlocks = this._process(true);
			            } else /* if (this._xformMode == this._DEC_XFORM_MODE) */ {
			                // Process final blocks
			                finalProcessedBlocks = this._process(true);

			                // Unpad data
			                padding.unpad(finalProcessedBlocks);
			            }

			            return finalProcessedBlocks;
			        },

			        blockSize: 128/32
			    });

			    /**
			     * A collection of cipher parameters.
			     *
			     * @property {WordArray} ciphertext The raw ciphertext.
			     * @property {WordArray} key The key to this ciphertext.
			     * @property {WordArray} iv The IV used in the ciphering operation.
			     * @property {WordArray} salt The salt used with a key derivation function.
			     * @property {Cipher} algorithm The cipher algorithm.
			     * @property {Mode} mode The block mode used in the ciphering operation.
			     * @property {Padding} padding The padding scheme used in the ciphering operation.
			     * @property {number} blockSize The block size of the cipher.
			     * @property {Format} formatter The default formatting strategy to convert this cipher params object to a string.
			     */
			    var CipherParams = C_lib.CipherParams = Base.extend({
			        /**
			         * Initializes a newly created cipher params object.
			         *
			         * @param {Object} cipherParams An object with any of the possible cipher parameters.
			         *
			         * @example
			         *
			         *     var cipherParams = CryptoJS.lib.CipherParams.create({
			         *         ciphertext: ciphertextWordArray,
			         *         key: keyWordArray,
			         *         iv: ivWordArray,
			         *         salt: saltWordArray,
			         *         algorithm: CryptoJS.algo.AES,
			         *         mode: CryptoJS.mode.CBC,
			         *         padding: CryptoJS.pad.PKCS7,
			         *         blockSize: 4,
			         *         formatter: CryptoJS.format.OpenSSL
			         *     });
			         */
			        init: function (cipherParams) {
			            this.mixIn(cipherParams);
			        },

			        /**
			         * Converts this cipher params object to a string.
			         *
			         * @param {Format} formatter (Optional) The formatting strategy to use.
			         *
			         * @return {string} The stringified cipher params.
			         *
			         * @throws Error If neither the formatter nor the default formatter is set.
			         *
			         * @example
			         *
			         *     var string = cipherParams + '';
			         *     var string = cipherParams.toString();
			         *     var string = cipherParams.toString(CryptoJS.format.OpenSSL);
			         */
			        toString: function (formatter) {
			            return (formatter || this.formatter).stringify(this);
			        }
			    });

			    /**
			     * Format namespace.
			     */
			    var C_format = C.format = {};

			    /**
			     * OpenSSL formatting strategy.
			     */
			    var OpenSSLFormatter = C_format.OpenSSL = {
			        /**
			         * Converts a cipher params object to an OpenSSL-compatible string.
			         *
			         * @param {CipherParams} cipherParams The cipher params object.
			         *
			         * @return {string} The OpenSSL-compatible string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var openSSLString = CryptoJS.format.OpenSSL.stringify(cipherParams);
			         */
			        stringify: function (cipherParams) {
			            var wordArray;

			            // Shortcuts
			            var ciphertext = cipherParams.ciphertext;
			            var salt = cipherParams.salt;

			            // Format
			            if (salt) {
			                wordArray = WordArray.create([0x53616c74, 0x65645f5f]).concat(salt).concat(ciphertext);
			            } else {
			                wordArray = ciphertext;
			            }

			            return wordArray.toString(Base64);
			        },

			        /**
			         * Converts an OpenSSL-compatible string to a cipher params object.
			         *
			         * @param {string} openSSLStr The OpenSSL-compatible string.
			         *
			         * @return {CipherParams} The cipher params object.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var cipherParams = CryptoJS.format.OpenSSL.parse(openSSLString);
			         */
			        parse: function (openSSLStr) {
			            var salt;

			            // Parse base64
			            var ciphertext = Base64.parse(openSSLStr);

			            // Shortcut
			            var ciphertextWords = ciphertext.words;

			            // Test for salt
			            if (ciphertextWords[0] == 0x53616c74 && ciphertextWords[1] == 0x65645f5f) {
			                // Extract salt
			                salt = WordArray.create(ciphertextWords.slice(2, 4));

			                // Remove salt from ciphertext
			                ciphertextWords.splice(0, 4);
			                ciphertext.sigBytes -= 16;
			            }

			            return CipherParams.create({ ciphertext: ciphertext, salt: salt });
			        }
			    };

			    /**
			     * A cipher wrapper that returns ciphertext as a serializable cipher params object.
			     */
			    var SerializableCipher = C_lib.SerializableCipher = Base.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {Formatter} format The formatting strategy to convert cipher param objects to and from a string. Default: OpenSSL
			         */
			        cfg: Base.extend({
			            format: OpenSSLFormatter
			        }),

			        /**
			         * Encrypts a message.
			         *
			         * @param {Cipher} cipher The cipher algorithm to use.
			         * @param {WordArray|string} message The message to encrypt.
			         * @param {WordArray} key The key.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @return {CipherParams} A cipher params object.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key);
			         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv });
			         *     var ciphertextParams = CryptoJS.lib.SerializableCipher.encrypt(CryptoJS.algo.AES, message, key, { iv: iv, format: CryptoJS.format.OpenSSL });
			         */
			        encrypt: function (cipher, message, key, cfg) {
			            // Apply config defaults
			            cfg = this.cfg.extend(cfg);

			            // Encrypt
			            var encryptor = cipher.createEncryptor(key, cfg);
			            var ciphertext = encryptor.finalize(message);

			            // Shortcut
			            var cipherCfg = encryptor.cfg;

			            // Create and return serializable cipher params
			            return CipherParams.create({
			                ciphertext: ciphertext,
			                key: key,
			                iv: cipherCfg.iv,
			                algorithm: cipher,
			                mode: cipherCfg.mode,
			                padding: cipherCfg.padding,
			                blockSize: cipher.blockSize,
			                formatter: cfg.format
			            });
			        },

			        /**
			         * Decrypts serialized ciphertext.
			         *
			         * @param {Cipher} cipher The cipher algorithm to use.
			         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
			         * @param {WordArray} key The key.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @return {WordArray} The plaintext.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, key, { iv: iv, format: CryptoJS.format.OpenSSL });
			         *     var plaintext = CryptoJS.lib.SerializableCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, key, { iv: iv, format: CryptoJS.format.OpenSSL });
			         */
			        decrypt: function (cipher, ciphertext, key, cfg) {
			            // Apply config defaults
			            cfg = this.cfg.extend(cfg);

			            // Convert string to CipherParams
			            ciphertext = this._parse(ciphertext, cfg.format);

			            // Decrypt
			            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);

			            return plaintext;
			        },

			        /**
			         * Converts serialized ciphertext to CipherParams,
			         * else assumed CipherParams already and returns ciphertext unchanged.
			         *
			         * @param {CipherParams|string} ciphertext The ciphertext.
			         * @param {Formatter} format The formatting strategy to use to parse serialized ciphertext.
			         *
			         * @return {CipherParams} The unserialized ciphertext.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var ciphertextParams = CryptoJS.lib.SerializableCipher._parse(ciphertextStringOrParams, format);
			         */
			        _parse: function (ciphertext, format) {
			            if (typeof ciphertext == 'string') {
			                return format.parse(ciphertext, this);
			            } else {
			                return ciphertext;
			            }
			        }
			    });

			    /**
			     * Key derivation function namespace.
			     */
			    var C_kdf = C.kdf = {};

			    /**
			     * OpenSSL key derivation function.
			     */
			    var OpenSSLKdf = C_kdf.OpenSSL = {
			        /**
			         * Derives a key and IV from a password.
			         *
			         * @param {string} password The password to derive from.
			         * @param {number} keySize The size in words of the key to generate.
			         * @param {number} ivSize The size in words of the IV to generate.
			         * @param {WordArray|string} salt (Optional) A 64-bit salt to use. If omitted, a salt will be generated randomly.
			         *
			         * @return {CipherParams} A cipher params object with the key, IV, and salt.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32);
			         *     var derivedParams = CryptoJS.kdf.OpenSSL.execute('Password', 256/32, 128/32, 'saltsalt');
			         */
			        execute: function (password, keySize, ivSize, salt, hasher) {
			            // Generate random salt
			            if (!salt) {
			                salt = WordArray.random(64/8);
			            }

			            // Derive key and IV
			            if (!hasher) {
			                var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);
			            } else {
			                var key = EvpKDF.create({ keySize: keySize + ivSize, hasher: hasher }).compute(password, salt);
			            }


			            // Separate key and IV
			            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
			            key.sigBytes = keySize * 4;

			            // Return params
			            return CipherParams.create({ key: key, iv: iv, salt: salt });
			        }
			    };

			    /**
			     * A serializable cipher wrapper that derives the key from a password,
			     * and returns ciphertext as a serializable cipher params object.
			     */
			    var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {KDF} kdf The key derivation function to use to generate a key and IV from a password. Default: OpenSSL
			         */
			        cfg: SerializableCipher.cfg.extend({
			            kdf: OpenSSLKdf
			        }),

			        /**
			         * Encrypts a message using a password.
			         *
			         * @param {Cipher} cipher The cipher algorithm to use.
			         * @param {WordArray|string} message The message to encrypt.
			         * @param {string} password The password.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @return {CipherParams} A cipher params object.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password');
			         *     var ciphertextParams = CryptoJS.lib.PasswordBasedCipher.encrypt(CryptoJS.algo.AES, message, 'password', { format: CryptoJS.format.OpenSSL });
			         */
			        encrypt: function (cipher, message, password, cfg) {
			            // Apply config defaults
			            cfg = this.cfg.extend(cfg);

			            // Derive key and other params
			            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, cfg.salt, cfg.hasher);

			            // Add IV to config
			            cfg.iv = derivedParams.iv;

			            // Encrypt
			            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);

			            // Mix in derived params
			            ciphertext.mixIn(derivedParams);

			            return ciphertext;
			        },

			        /**
			         * Decrypts serialized ciphertext using a password.
			         *
			         * @param {Cipher} cipher The cipher algorithm to use.
			         * @param {CipherParams|string} ciphertext The ciphertext to decrypt.
			         * @param {string} password The password.
			         * @param {Object} cfg (Optional) The configuration options to use for this operation.
			         *
			         * @return {WordArray} The plaintext.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, formattedCiphertext, 'password', { format: CryptoJS.format.OpenSSL });
			         *     var plaintext = CryptoJS.lib.PasswordBasedCipher.decrypt(CryptoJS.algo.AES, ciphertextParams, 'password', { format: CryptoJS.format.OpenSSL });
			         */
			        decrypt: function (cipher, ciphertext, password, cfg) {
			            // Apply config defaults
			            cfg = this.cfg.extend(cfg);

			            // Convert string to CipherParams
			            ciphertext = this._parse(ciphertext, cfg.format);

			            // Derive key and other params
			            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt, cfg.hasher);

			            // Add IV to config
			            cfg.iv = derivedParams.iv;

			            // Decrypt
			            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);

			            return plaintext;
			        }
			    });
			}());


		})); 
	} (cipherCore));
	return cipherCore.exports;
}

var modeCfb = {exports: {}};

var hasRequiredModeCfb;

function requireModeCfb () {
	if (hasRequiredModeCfb) return modeCfb.exports;
	hasRequiredModeCfb = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * Cipher Feedback block mode.
			 */
			CryptoJS.mode.CFB = (function () {
			    var CFB = CryptoJS.lib.BlockCipherMode.extend();

			    CFB.Encryptor = CFB.extend({
			        processBlock: function (words, offset) {
			            // Shortcuts
			            var cipher = this._cipher;
			            var blockSize = cipher.blockSize;

			            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

			            // Remember this block to use with next block
			            this._prevBlock = words.slice(offset, offset + blockSize);
			        }
			    });

			    CFB.Decryptor = CFB.extend({
			        processBlock: function (words, offset) {
			            // Shortcuts
			            var cipher = this._cipher;
			            var blockSize = cipher.blockSize;

			            // Remember this block to use with next block
			            var thisBlock = words.slice(offset, offset + blockSize);

			            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);

			            // This block becomes the previous block
			            this._prevBlock = thisBlock;
			        }
			    });

			    function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
			        var keystream;

			        // Shortcut
			        var iv = this._iv;

			        // Generate keystream
			        if (iv) {
			            keystream = iv.slice(0);

			            // Remove IV for subsequent blocks
			            this._iv = undefined;
			        } else {
			            keystream = this._prevBlock;
			        }
			        cipher.encryptBlock(keystream, 0);

			        // Encrypt
			        for (var i = 0; i < blockSize; i++) {
			            words[offset + i] ^= keystream[i];
			        }
			    }

			    return CFB;
			}());


			return CryptoJS.mode.CFB;

		})); 
	} (modeCfb));
	return modeCfb.exports;
}

var modeCtr = {exports: {}};

var hasRequiredModeCtr;

function requireModeCtr () {
	if (hasRequiredModeCtr) return modeCtr.exports;
	hasRequiredModeCtr = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * Counter block mode.
			 */
			CryptoJS.mode.CTR = (function () {
			    var CTR = CryptoJS.lib.BlockCipherMode.extend();

			    var Encryptor = CTR.Encryptor = CTR.extend({
			        processBlock: function (words, offset) {
			            // Shortcuts
			            var cipher = this._cipher;
			            var blockSize = cipher.blockSize;
			            var iv = this._iv;
			            var counter = this._counter;

			            // Generate keystream
			            if (iv) {
			                counter = this._counter = iv.slice(0);

			                // Remove IV for subsequent blocks
			                this._iv = undefined;
			            }
			            var keystream = counter.slice(0);
			            cipher.encryptBlock(keystream, 0);

			            // Increment counter
			            counter[blockSize - 1] = (counter[blockSize - 1] + 1) | 0;

			            // Encrypt
			            for (var i = 0; i < blockSize; i++) {
			                words[offset + i] ^= keystream[i];
			            }
			        }
			    });

			    CTR.Decryptor = Encryptor;

			    return CTR;
			}());


			return CryptoJS.mode.CTR;

		})); 
	} (modeCtr));
	return modeCtr.exports;
}

var modeCtrGladman = {exports: {}};

var hasRequiredModeCtrGladman;

function requireModeCtrGladman () {
	if (hasRequiredModeCtrGladman) return modeCtrGladman.exports;
	hasRequiredModeCtrGladman = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/** @preserve
			 * Counter block mode compatible with  Dr Brian Gladman fileenc.c
			 * derived from CryptoJS.mode.CTR
			 * Jan Hruby jhruby.web@gmail.com
			 */
			CryptoJS.mode.CTRGladman = (function () {
			    var CTRGladman = CryptoJS.lib.BlockCipherMode.extend();

				function incWord(word)
				{
					if (((word >> 24) & 0xff) === 0xff) { //overflow
					var b1 = (word >> 16)&0xff;
					var b2 = (word >> 8)&0xff;
					var b3 = word & 0xff;

					if (b1 === 0xff) // overflow b1
					{
					b1 = 0;
					if (b2 === 0xff)
					{
						b2 = 0;
						if (b3 === 0xff)
						{
							b3 = 0;
						}
						else
						{
							++b3;
						}
					}
					else
					{
						++b2;
					}
					}
					else
					{
					++b1;
					}

					word = 0;
					word += (b1 << 16);
					word += (b2 << 8);
					word += b3;
					}
					else
					{
					word += (0x01 << 24);
					}
					return word;
				}

				function incCounter(counter)
				{
					if ((counter[0] = incWord(counter[0])) === 0)
					{
						// encr_data in fileenc.c from  Dr Brian Gladman's counts only with DWORD j < 8
						counter[1] = incWord(counter[1]);
					}
					return counter;
				}

			    var Encryptor = CTRGladman.Encryptor = CTRGladman.extend({
			        processBlock: function (words, offset) {
			            // Shortcuts
			            var cipher = this._cipher;
			            var blockSize = cipher.blockSize;
			            var iv = this._iv;
			            var counter = this._counter;

			            // Generate keystream
			            if (iv) {
			                counter = this._counter = iv.slice(0);

			                // Remove IV for subsequent blocks
			                this._iv = undefined;
			            }

						incCounter(counter);

						var keystream = counter.slice(0);
			            cipher.encryptBlock(keystream, 0);

			            // Encrypt
			            for (var i = 0; i < blockSize; i++) {
			                words[offset + i] ^= keystream[i];
			            }
			        }
			    });

			    CTRGladman.Decryptor = Encryptor;

			    return CTRGladman;
			}());




			return CryptoJS.mode.CTRGladman;

		})); 
	} (modeCtrGladman));
	return modeCtrGladman.exports;
}

var modeOfb = {exports: {}};

var hasRequiredModeOfb;

function requireModeOfb () {
	if (hasRequiredModeOfb) return modeOfb.exports;
	hasRequiredModeOfb = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * Output Feedback block mode.
			 */
			CryptoJS.mode.OFB = (function () {
			    var OFB = CryptoJS.lib.BlockCipherMode.extend();

			    var Encryptor = OFB.Encryptor = OFB.extend({
			        processBlock: function (words, offset) {
			            // Shortcuts
			            var cipher = this._cipher;
			            var blockSize = cipher.blockSize;
			            var iv = this._iv;
			            var keystream = this._keystream;

			            // Generate keystream
			            if (iv) {
			                keystream = this._keystream = iv.slice(0);

			                // Remove IV for subsequent blocks
			                this._iv = undefined;
			            }
			            cipher.encryptBlock(keystream, 0);

			            // Encrypt
			            for (var i = 0; i < blockSize; i++) {
			                words[offset + i] ^= keystream[i];
			            }
			        }
			    });

			    OFB.Decryptor = Encryptor;

			    return OFB;
			}());


			return CryptoJS.mode.OFB;

		})); 
	} (modeOfb));
	return modeOfb.exports;
}

var modeEcb = {exports: {}};

var hasRequiredModeEcb;

function requireModeEcb () {
	if (hasRequiredModeEcb) return modeEcb.exports;
	hasRequiredModeEcb = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * Electronic Codebook block mode.
			 */
			CryptoJS.mode.ECB = (function () {
			    var ECB = CryptoJS.lib.BlockCipherMode.extend();

			    ECB.Encryptor = ECB.extend({
			        processBlock: function (words, offset) {
			            this._cipher.encryptBlock(words, offset);
			        }
			    });

			    ECB.Decryptor = ECB.extend({
			        processBlock: function (words, offset) {
			            this._cipher.decryptBlock(words, offset);
			        }
			    });

			    return ECB;
			}());


			return CryptoJS.mode.ECB;

		})); 
	} (modeEcb));
	return modeEcb.exports;
}

var padAnsix923 = {exports: {}};

var hasRequiredPadAnsix923;

function requirePadAnsix923 () {
	if (hasRequiredPadAnsix923) return padAnsix923.exports;
	hasRequiredPadAnsix923 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * ANSI X.923 padding strategy.
			 */
			CryptoJS.pad.AnsiX923 = {
			    pad: function (data, blockSize) {
			        // Shortcuts
			        var dataSigBytes = data.sigBytes;
			        var blockSizeBytes = blockSize * 4;

			        // Count padding bytes
			        var nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;

			        // Compute last byte position
			        var lastBytePos = dataSigBytes + nPaddingBytes - 1;

			        // Pad
			        data.clamp();
			        data.words[lastBytePos >>> 2] |= nPaddingBytes << (24 - (lastBytePos % 4) * 8);
			        data.sigBytes += nPaddingBytes;
			    },

			    unpad: function (data) {
			        // Get number of padding bytes from last byte
			        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

			        // Remove padding
			        data.sigBytes -= nPaddingBytes;
			    }
			};


			return CryptoJS.pad.Ansix923;

		})); 
	} (padAnsix923));
	return padAnsix923.exports;
}

var padIso10126 = {exports: {}};

var hasRequiredPadIso10126;

function requirePadIso10126 () {
	if (hasRequiredPadIso10126) return padIso10126.exports;
	hasRequiredPadIso10126 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * ISO 10126 padding strategy.
			 */
			CryptoJS.pad.Iso10126 = {
			    pad: function (data, blockSize) {
			        // Shortcut
			        var blockSizeBytes = blockSize * 4;

			        // Count padding bytes
			        var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;

			        // Pad
			        data.concat(CryptoJS.lib.WordArray.random(nPaddingBytes - 1)).
			             concat(CryptoJS.lib.WordArray.create([nPaddingBytes << 24], 1));
			    },

			    unpad: function (data) {
			        // Get number of padding bytes from last byte
			        var nPaddingBytes = data.words[(data.sigBytes - 1) >>> 2] & 0xff;

			        // Remove padding
			        data.sigBytes -= nPaddingBytes;
			    }
			};


			return CryptoJS.pad.Iso10126;

		})); 
	} (padIso10126));
	return padIso10126.exports;
}

var padIso97971 = {exports: {}};

var hasRequiredPadIso97971;

function requirePadIso97971 () {
	if (hasRequiredPadIso97971) return padIso97971.exports;
	hasRequiredPadIso97971 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * ISO/IEC 9797-1 Padding Method 2.
			 */
			CryptoJS.pad.Iso97971 = {
			    pad: function (data, blockSize) {
			        // Add 0x80 byte
			        data.concat(CryptoJS.lib.WordArray.create([0x80000000], 1));

			        // Zero pad the rest
			        CryptoJS.pad.ZeroPadding.pad(data, blockSize);
			    },

			    unpad: function (data) {
			        // Remove zero padding
			        CryptoJS.pad.ZeroPadding.unpad(data);

			        // Remove one more byte -- the 0x80 byte
			        data.sigBytes--;
			    }
			};


			return CryptoJS.pad.Iso97971;

		})); 
	} (padIso97971));
	return padIso97971.exports;
}

var padZeropadding = {exports: {}};

var hasRequiredPadZeropadding;

function requirePadZeropadding () {
	if (hasRequiredPadZeropadding) return padZeropadding.exports;
	hasRequiredPadZeropadding = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * Zero padding strategy.
			 */
			CryptoJS.pad.ZeroPadding = {
			    pad: function (data, blockSize) {
			        // Shortcut
			        var blockSizeBytes = blockSize * 4;

			        // Pad
			        data.clamp();
			        data.sigBytes += blockSizeBytes - ((data.sigBytes % blockSizeBytes) || blockSizeBytes);
			    },

			    unpad: function (data) {
			        // Shortcut
			        var dataWords = data.words;

			        // Unpad
			        var i = data.sigBytes - 1;
			        for (var i = data.sigBytes - 1; i >= 0; i--) {
			            if (((dataWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff)) {
			                data.sigBytes = i + 1;
			                break;
			            }
			        }
			    }
			};


			return CryptoJS.pad.ZeroPadding;

		})); 
	} (padZeropadding));
	return padZeropadding.exports;
}

var padNopadding = {exports: {}};

var hasRequiredPadNopadding;

function requirePadNopadding () {
	if (hasRequiredPadNopadding) return padNopadding.exports;
	hasRequiredPadNopadding = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			/**
			 * A noop padding strategy.
			 */
			CryptoJS.pad.NoPadding = {
			    pad: function () {
			    },

			    unpad: function () {
			    }
			};


			return CryptoJS.pad.NoPadding;

		})); 
	} (padNopadding));
	return padNopadding.exports;
}

var formatHex = {exports: {}};

var hasRequiredFormatHex;

function requireFormatHex () {
	if (hasRequiredFormatHex) return formatHex.exports;
	hasRequiredFormatHex = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function (undefined$1) {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var CipherParams = C_lib.CipherParams;
			    var C_enc = C.enc;
			    var Hex = C_enc.Hex;
			    var C_format = C.format;

			    C_format.Hex = {
			        /**
			         * Converts the ciphertext of a cipher params object to a hexadecimally encoded string.
			         *
			         * @param {CipherParams} cipherParams The cipher params object.
			         *
			         * @return {string} The hexadecimally encoded string.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var hexString = CryptoJS.format.Hex.stringify(cipherParams);
			         */
			        stringify: function (cipherParams) {
			            return cipherParams.ciphertext.toString(Hex);
			        },

			        /**
			         * Converts a hexadecimally encoded ciphertext string to a cipher params object.
			         *
			         * @param {string} input The hexadecimally encoded string.
			         *
			         * @return {CipherParams} The cipher params object.
			         *
			         * @static
			         *
			         * @example
			         *
			         *     var cipherParams = CryptoJS.format.Hex.parse(hexString);
			         */
			        parse: function (input) {
			            var ciphertext = Hex.parse(input);
			            return CipherParams.create({ ciphertext: ciphertext });
			        }
			    };
			}());


			return CryptoJS.format.Hex;

		})); 
	} (formatHex));
	return formatHex.exports;
}

var aes = {exports: {}};

var hasRequiredAes;

function requireAes () {
	if (hasRequiredAes) return aes.exports;
	hasRequiredAes = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEncBase64(), requireMd5(), requireEvpkdf(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var BlockCipher = C_lib.BlockCipher;
			    var C_algo = C.algo;

			    // Lookup tables
			    var SBOX = [];
			    var INV_SBOX = [];
			    var SUB_MIX_0 = [];
			    var SUB_MIX_1 = [];
			    var SUB_MIX_2 = [];
			    var SUB_MIX_3 = [];
			    var INV_SUB_MIX_0 = [];
			    var INV_SUB_MIX_1 = [];
			    var INV_SUB_MIX_2 = [];
			    var INV_SUB_MIX_3 = [];

			    // Compute lookup tables
			    (function () {
			        // Compute double table
			        var d = [];
			        for (var i = 0; i < 256; i++) {
			            if (i < 128) {
			                d[i] = i << 1;
			            } else {
			                d[i] = (i << 1) ^ 0x11b;
			            }
			        }

			        // Walk GF(2^8)
			        var x = 0;
			        var xi = 0;
			        for (var i = 0; i < 256; i++) {
			            // Compute sbox
			            var sx = xi ^ (xi << 1) ^ (xi << 2) ^ (xi << 3) ^ (xi << 4);
			            sx = (sx >>> 8) ^ (sx & 0xff) ^ 0x63;
			            SBOX[x] = sx;
			            INV_SBOX[sx] = x;

			            // Compute multiplication
			            var x2 = d[x];
			            var x4 = d[x2];
			            var x8 = d[x4];

			            // Compute sub bytes, mix columns tables
			            var t = (d[sx] * 0x101) ^ (sx * 0x1010100);
			            SUB_MIX_0[x] = (t << 24) | (t >>> 8);
			            SUB_MIX_1[x] = (t << 16) | (t >>> 16);
			            SUB_MIX_2[x] = (t << 8)  | (t >>> 24);
			            SUB_MIX_3[x] = t;

			            // Compute inv sub bytes, inv mix columns tables
			            var t = (x8 * 0x1010101) ^ (x4 * 0x10001) ^ (x2 * 0x101) ^ (x * 0x1010100);
			            INV_SUB_MIX_0[sx] = (t << 24) | (t >>> 8);
			            INV_SUB_MIX_1[sx] = (t << 16) | (t >>> 16);
			            INV_SUB_MIX_2[sx] = (t << 8)  | (t >>> 24);
			            INV_SUB_MIX_3[sx] = t;

			            // Compute next counter
			            if (!x) {
			                x = xi = 1;
			            } else {
			                x = x2 ^ d[d[d[x8 ^ x2]]];
			                xi ^= d[d[xi]];
			            }
			        }
			    }());

			    // Precomputed Rcon lookup
			    var RCON = [0x00, 0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

			    /**
			     * AES block cipher algorithm.
			     */
			    var AES = C_algo.AES = BlockCipher.extend({
			        _doReset: function () {
			            var t;

			            // Skip reset of nRounds has been set before and key did not change
			            if (this._nRounds && this._keyPriorReset === this._key) {
			                return;
			            }

			            // Shortcuts
			            var key = this._keyPriorReset = this._key;
			            var keyWords = key.words;
			            var keySize = key.sigBytes / 4;

			            // Compute number of rounds
			            var nRounds = this._nRounds = keySize + 6;

			            // Compute number of key schedule rows
			            var ksRows = (nRounds + 1) * 4;

			            // Compute key schedule
			            var keySchedule = this._keySchedule = [];
			            for (var ksRow = 0; ksRow < ksRows; ksRow++) {
			                if (ksRow < keySize) {
			                    keySchedule[ksRow] = keyWords[ksRow];
			                } else {
			                    t = keySchedule[ksRow - 1];

			                    if (!(ksRow % keySize)) {
			                        // Rot word
			                        t = (t << 8) | (t >>> 24);

			                        // Sub word
			                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];

			                        // Mix Rcon
			                        t ^= RCON[(ksRow / keySize) | 0] << 24;
			                    } else if (keySize > 6 && ksRow % keySize == 4) {
			                        // Sub word
			                        t = (SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 0xff] << 16) | (SBOX[(t >>> 8) & 0xff] << 8) | SBOX[t & 0xff];
			                    }

			                    keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
			                }
			            }

			            // Compute inv key schedule
			            var invKeySchedule = this._invKeySchedule = [];
			            for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
			                var ksRow = ksRows - invKsRow;

			                if (invKsRow % 4) {
			                    var t = keySchedule[ksRow];
			                } else {
			                    var t = keySchedule[ksRow - 4];
			                }

			                if (invKsRow < 4 || ksRow <= 4) {
			                    invKeySchedule[invKsRow] = t;
			                } else {
			                    invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[(t >>> 16) & 0xff]] ^
			                                               INV_SUB_MIX_2[SBOX[(t >>> 8) & 0xff]] ^ INV_SUB_MIX_3[SBOX[t & 0xff]];
			                }
			            }
			        },

			        encryptBlock: function (M, offset) {
			            this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
			        },

			        decryptBlock: function (M, offset) {
			            // Swap 2nd and 4th rows
			            var t = M[offset + 1];
			            M[offset + 1] = M[offset + 3];
			            M[offset + 3] = t;

			            this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);

			            // Inv swap 2nd and 4th rows
			            var t = M[offset + 1];
			            M[offset + 1] = M[offset + 3];
			            M[offset + 3] = t;
			        },

			        _doCryptBlock: function (M, offset, keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX) {
			            // Shortcut
			            var nRounds = this._nRounds;

			            // Get input, add round key
			            var s0 = M[offset]     ^ keySchedule[0];
			            var s1 = M[offset + 1] ^ keySchedule[1];
			            var s2 = M[offset + 2] ^ keySchedule[2];
			            var s3 = M[offset + 3] ^ keySchedule[3];

			            // Key schedule row counter
			            var ksRow = 4;

			            // Rounds
			            for (var round = 1; round < nRounds; round++) {
			                // Shift rows, sub bytes, mix columns, add round key
			                var t0 = SUB_MIX_0[s0 >>> 24] ^ SUB_MIX_1[(s1 >>> 16) & 0xff] ^ SUB_MIX_2[(s2 >>> 8) & 0xff] ^ SUB_MIX_3[s3 & 0xff] ^ keySchedule[ksRow++];
			                var t1 = SUB_MIX_0[s1 >>> 24] ^ SUB_MIX_1[(s2 >>> 16) & 0xff] ^ SUB_MIX_2[(s3 >>> 8) & 0xff] ^ SUB_MIX_3[s0 & 0xff] ^ keySchedule[ksRow++];
			                var t2 = SUB_MIX_0[s2 >>> 24] ^ SUB_MIX_1[(s3 >>> 16) & 0xff] ^ SUB_MIX_2[(s0 >>> 8) & 0xff] ^ SUB_MIX_3[s1 & 0xff] ^ keySchedule[ksRow++];
			                var t3 = SUB_MIX_0[s3 >>> 24] ^ SUB_MIX_1[(s0 >>> 16) & 0xff] ^ SUB_MIX_2[(s1 >>> 8) & 0xff] ^ SUB_MIX_3[s2 & 0xff] ^ keySchedule[ksRow++];

			                // Update state
			                s0 = t0;
			                s1 = t1;
			                s2 = t2;
			                s3 = t3;
			            }

			            // Shift rows, sub bytes, add round key
			            var t0 = ((SBOX[s0 >>> 24] << 24) | (SBOX[(s1 >>> 16) & 0xff] << 16) | (SBOX[(s2 >>> 8) & 0xff] << 8) | SBOX[s3 & 0xff]) ^ keySchedule[ksRow++];
			            var t1 = ((SBOX[s1 >>> 24] << 24) | (SBOX[(s2 >>> 16) & 0xff] << 16) | (SBOX[(s3 >>> 8) & 0xff] << 8) | SBOX[s0 & 0xff]) ^ keySchedule[ksRow++];
			            var t2 = ((SBOX[s2 >>> 24] << 24) | (SBOX[(s3 >>> 16) & 0xff] << 16) | (SBOX[(s0 >>> 8) & 0xff] << 8) | SBOX[s1 & 0xff]) ^ keySchedule[ksRow++];
			            var t3 = ((SBOX[s3 >>> 24] << 24) | (SBOX[(s0 >>> 16) & 0xff] << 16) | (SBOX[(s1 >>> 8) & 0xff] << 8) | SBOX[s2 & 0xff]) ^ keySchedule[ksRow++];

			            // Set output
			            M[offset]     = t0;
			            M[offset + 1] = t1;
			            M[offset + 2] = t2;
			            M[offset + 3] = t3;
			        },

			        keySize: 256/32
			    });

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.AES.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.AES.decrypt(ciphertext, key, cfg);
			     */
			    C.AES = BlockCipher._createHelper(AES);
			}());


			return CryptoJS.AES;

		})); 
	} (aes));
	return aes.exports;
}

var tripledes = {exports: {}};

var hasRequiredTripledes;

function requireTripledes () {
	if (hasRequiredTripledes) return tripledes.exports;
	hasRequiredTripledes = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEncBase64(), requireMd5(), requireEvpkdf(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var WordArray = C_lib.WordArray;
			    var BlockCipher = C_lib.BlockCipher;
			    var C_algo = C.algo;

			    // Permuted Choice 1 constants
			    var PC1 = [
			        57, 49, 41, 33, 25, 17, 9,  1,
			        58, 50, 42, 34, 26, 18, 10, 2,
			        59, 51, 43, 35, 27, 19, 11, 3,
			        60, 52, 44, 36, 63, 55, 47, 39,
			        31, 23, 15, 7,  62, 54, 46, 38,
			        30, 22, 14, 6,  61, 53, 45, 37,
			        29, 21, 13, 5,  28, 20, 12, 4
			    ];

			    // Permuted Choice 2 constants
			    var PC2 = [
			        14, 17, 11, 24, 1,  5,
			        3,  28, 15, 6,  21, 10,
			        23, 19, 12, 4,  26, 8,
			        16, 7,  27, 20, 13, 2,
			        41, 52, 31, 37, 47, 55,
			        30, 40, 51, 45, 33, 48,
			        44, 49, 39, 56, 34, 53,
			        46, 42, 50, 36, 29, 32
			    ];

			    // Cumulative bit shift constants
			    var BIT_SHIFTS = [1,  2,  4,  6,  8,  10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];

			    // SBOXes and round permutation constants
			    var SBOX_P = [
			        {
			            0x0: 0x808200,
			            0x10000000: 0x8000,
			            0x20000000: 0x808002,
			            0x30000000: 0x2,
			            0x40000000: 0x200,
			            0x50000000: 0x808202,
			            0x60000000: 0x800202,
			            0x70000000: 0x800000,
			            0x80000000: 0x202,
			            0x90000000: 0x800200,
			            0xa0000000: 0x8200,
			            0xb0000000: 0x808000,
			            0xc0000000: 0x8002,
			            0xd0000000: 0x800002,
			            0xe0000000: 0x0,
			            0xf0000000: 0x8202,
			            0x8000000: 0x0,
			            0x18000000: 0x808202,
			            0x28000000: 0x8202,
			            0x38000000: 0x8000,
			            0x48000000: 0x808200,
			            0x58000000: 0x200,
			            0x68000000: 0x808002,
			            0x78000000: 0x2,
			            0x88000000: 0x800200,
			            0x98000000: 0x8200,
			            0xa8000000: 0x808000,
			            0xb8000000: 0x800202,
			            0xc8000000: 0x800002,
			            0xd8000000: 0x8002,
			            0xe8000000: 0x202,
			            0xf8000000: 0x800000,
			            0x1: 0x8000,
			            0x10000001: 0x2,
			            0x20000001: 0x808200,
			            0x30000001: 0x800000,
			            0x40000001: 0x808002,
			            0x50000001: 0x8200,
			            0x60000001: 0x200,
			            0x70000001: 0x800202,
			            0x80000001: 0x808202,
			            0x90000001: 0x808000,
			            0xa0000001: 0x800002,
			            0xb0000001: 0x8202,
			            0xc0000001: 0x202,
			            0xd0000001: 0x800200,
			            0xe0000001: 0x8002,
			            0xf0000001: 0x0,
			            0x8000001: 0x808202,
			            0x18000001: 0x808000,
			            0x28000001: 0x800000,
			            0x38000001: 0x200,
			            0x48000001: 0x8000,
			            0x58000001: 0x800002,
			            0x68000001: 0x2,
			            0x78000001: 0x8202,
			            0x88000001: 0x8002,
			            0x98000001: 0x800202,
			            0xa8000001: 0x202,
			            0xb8000001: 0x808200,
			            0xc8000001: 0x800200,
			            0xd8000001: 0x0,
			            0xe8000001: 0x8200,
			            0xf8000001: 0x808002
			        },
			        {
			            0x0: 0x40084010,
			            0x1000000: 0x4000,
			            0x2000000: 0x80000,
			            0x3000000: 0x40080010,
			            0x4000000: 0x40000010,
			            0x5000000: 0x40084000,
			            0x6000000: 0x40004000,
			            0x7000000: 0x10,
			            0x8000000: 0x84000,
			            0x9000000: 0x40004010,
			            0xa000000: 0x40000000,
			            0xb000000: 0x84010,
			            0xc000000: 0x80010,
			            0xd000000: 0x0,
			            0xe000000: 0x4010,
			            0xf000000: 0x40080000,
			            0x800000: 0x40004000,
			            0x1800000: 0x84010,
			            0x2800000: 0x10,
			            0x3800000: 0x40004010,
			            0x4800000: 0x40084010,
			            0x5800000: 0x40000000,
			            0x6800000: 0x80000,
			            0x7800000: 0x40080010,
			            0x8800000: 0x80010,
			            0x9800000: 0x0,
			            0xa800000: 0x4000,
			            0xb800000: 0x40080000,
			            0xc800000: 0x40000010,
			            0xd800000: 0x84000,
			            0xe800000: 0x40084000,
			            0xf800000: 0x4010,
			            0x10000000: 0x0,
			            0x11000000: 0x40080010,
			            0x12000000: 0x40004010,
			            0x13000000: 0x40084000,
			            0x14000000: 0x40080000,
			            0x15000000: 0x10,
			            0x16000000: 0x84010,
			            0x17000000: 0x4000,
			            0x18000000: 0x4010,
			            0x19000000: 0x80000,
			            0x1a000000: 0x80010,
			            0x1b000000: 0x40000010,
			            0x1c000000: 0x84000,
			            0x1d000000: 0x40004000,
			            0x1e000000: 0x40000000,
			            0x1f000000: 0x40084010,
			            0x10800000: 0x84010,
			            0x11800000: 0x80000,
			            0x12800000: 0x40080000,
			            0x13800000: 0x4000,
			            0x14800000: 0x40004000,
			            0x15800000: 0x40084010,
			            0x16800000: 0x10,
			            0x17800000: 0x40000000,
			            0x18800000: 0x40084000,
			            0x19800000: 0x40000010,
			            0x1a800000: 0x40004010,
			            0x1b800000: 0x80010,
			            0x1c800000: 0x0,
			            0x1d800000: 0x4010,
			            0x1e800000: 0x40080010,
			            0x1f800000: 0x84000
			        },
			        {
			            0x0: 0x104,
			            0x100000: 0x0,
			            0x200000: 0x4000100,
			            0x300000: 0x10104,
			            0x400000: 0x10004,
			            0x500000: 0x4000004,
			            0x600000: 0x4010104,
			            0x700000: 0x4010000,
			            0x800000: 0x4000000,
			            0x900000: 0x4010100,
			            0xa00000: 0x10100,
			            0xb00000: 0x4010004,
			            0xc00000: 0x4000104,
			            0xd00000: 0x10000,
			            0xe00000: 0x4,
			            0xf00000: 0x100,
			            0x80000: 0x4010100,
			            0x180000: 0x4010004,
			            0x280000: 0x0,
			            0x380000: 0x4000100,
			            0x480000: 0x4000004,
			            0x580000: 0x10000,
			            0x680000: 0x10004,
			            0x780000: 0x104,
			            0x880000: 0x4,
			            0x980000: 0x100,
			            0xa80000: 0x4010000,
			            0xb80000: 0x10104,
			            0xc80000: 0x10100,
			            0xd80000: 0x4000104,
			            0xe80000: 0x4010104,
			            0xf80000: 0x4000000,
			            0x1000000: 0x4010100,
			            0x1100000: 0x10004,
			            0x1200000: 0x10000,
			            0x1300000: 0x4000100,
			            0x1400000: 0x100,
			            0x1500000: 0x4010104,
			            0x1600000: 0x4000004,
			            0x1700000: 0x0,
			            0x1800000: 0x4000104,
			            0x1900000: 0x4000000,
			            0x1a00000: 0x4,
			            0x1b00000: 0x10100,
			            0x1c00000: 0x4010000,
			            0x1d00000: 0x104,
			            0x1e00000: 0x10104,
			            0x1f00000: 0x4010004,
			            0x1080000: 0x4000000,
			            0x1180000: 0x104,
			            0x1280000: 0x4010100,
			            0x1380000: 0x0,
			            0x1480000: 0x10004,
			            0x1580000: 0x4000100,
			            0x1680000: 0x100,
			            0x1780000: 0x4010004,
			            0x1880000: 0x10000,
			            0x1980000: 0x4010104,
			            0x1a80000: 0x10104,
			            0x1b80000: 0x4000004,
			            0x1c80000: 0x4000104,
			            0x1d80000: 0x4010000,
			            0x1e80000: 0x4,
			            0x1f80000: 0x10100
			        },
			        {
			            0x0: 0x80401000,
			            0x10000: 0x80001040,
			            0x20000: 0x401040,
			            0x30000: 0x80400000,
			            0x40000: 0x0,
			            0x50000: 0x401000,
			            0x60000: 0x80000040,
			            0x70000: 0x400040,
			            0x80000: 0x80000000,
			            0x90000: 0x400000,
			            0xa0000: 0x40,
			            0xb0000: 0x80001000,
			            0xc0000: 0x80400040,
			            0xd0000: 0x1040,
			            0xe0000: 0x1000,
			            0xf0000: 0x80401040,
			            0x8000: 0x80001040,
			            0x18000: 0x40,
			            0x28000: 0x80400040,
			            0x38000: 0x80001000,
			            0x48000: 0x401000,
			            0x58000: 0x80401040,
			            0x68000: 0x0,
			            0x78000: 0x80400000,
			            0x88000: 0x1000,
			            0x98000: 0x80401000,
			            0xa8000: 0x400000,
			            0xb8000: 0x1040,
			            0xc8000: 0x80000000,
			            0xd8000: 0x400040,
			            0xe8000: 0x401040,
			            0xf8000: 0x80000040,
			            0x100000: 0x400040,
			            0x110000: 0x401000,
			            0x120000: 0x80000040,
			            0x130000: 0x0,
			            0x140000: 0x1040,
			            0x150000: 0x80400040,
			            0x160000: 0x80401000,
			            0x170000: 0x80001040,
			            0x180000: 0x80401040,
			            0x190000: 0x80000000,
			            0x1a0000: 0x80400000,
			            0x1b0000: 0x401040,
			            0x1c0000: 0x80001000,
			            0x1d0000: 0x400000,
			            0x1e0000: 0x40,
			            0x1f0000: 0x1000,
			            0x108000: 0x80400000,
			            0x118000: 0x80401040,
			            0x128000: 0x0,
			            0x138000: 0x401000,
			            0x148000: 0x400040,
			            0x158000: 0x80000000,
			            0x168000: 0x80001040,
			            0x178000: 0x40,
			            0x188000: 0x80000040,
			            0x198000: 0x1000,
			            0x1a8000: 0x80001000,
			            0x1b8000: 0x80400040,
			            0x1c8000: 0x1040,
			            0x1d8000: 0x80401000,
			            0x1e8000: 0x400000,
			            0x1f8000: 0x401040
			        },
			        {
			            0x0: 0x80,
			            0x1000: 0x1040000,
			            0x2000: 0x40000,
			            0x3000: 0x20000000,
			            0x4000: 0x20040080,
			            0x5000: 0x1000080,
			            0x6000: 0x21000080,
			            0x7000: 0x40080,
			            0x8000: 0x1000000,
			            0x9000: 0x20040000,
			            0xa000: 0x20000080,
			            0xb000: 0x21040080,
			            0xc000: 0x21040000,
			            0xd000: 0x0,
			            0xe000: 0x1040080,
			            0xf000: 0x21000000,
			            0x800: 0x1040080,
			            0x1800: 0x21000080,
			            0x2800: 0x80,
			            0x3800: 0x1040000,
			            0x4800: 0x40000,
			            0x5800: 0x20040080,
			            0x6800: 0x21040000,
			            0x7800: 0x20000000,
			            0x8800: 0x20040000,
			            0x9800: 0x0,
			            0xa800: 0x21040080,
			            0xb800: 0x1000080,
			            0xc800: 0x20000080,
			            0xd800: 0x21000000,
			            0xe800: 0x1000000,
			            0xf800: 0x40080,
			            0x10000: 0x40000,
			            0x11000: 0x80,
			            0x12000: 0x20000000,
			            0x13000: 0x21000080,
			            0x14000: 0x1000080,
			            0x15000: 0x21040000,
			            0x16000: 0x20040080,
			            0x17000: 0x1000000,
			            0x18000: 0x21040080,
			            0x19000: 0x21000000,
			            0x1a000: 0x1040000,
			            0x1b000: 0x20040000,
			            0x1c000: 0x40080,
			            0x1d000: 0x20000080,
			            0x1e000: 0x0,
			            0x1f000: 0x1040080,
			            0x10800: 0x21000080,
			            0x11800: 0x1000000,
			            0x12800: 0x1040000,
			            0x13800: 0x20040080,
			            0x14800: 0x20000000,
			            0x15800: 0x1040080,
			            0x16800: 0x80,
			            0x17800: 0x21040000,
			            0x18800: 0x40080,
			            0x19800: 0x21040080,
			            0x1a800: 0x0,
			            0x1b800: 0x21000000,
			            0x1c800: 0x1000080,
			            0x1d800: 0x40000,
			            0x1e800: 0x20040000,
			            0x1f800: 0x20000080
			        },
			        {
			            0x0: 0x10000008,
			            0x100: 0x2000,
			            0x200: 0x10200000,
			            0x300: 0x10202008,
			            0x400: 0x10002000,
			            0x500: 0x200000,
			            0x600: 0x200008,
			            0x700: 0x10000000,
			            0x800: 0x0,
			            0x900: 0x10002008,
			            0xa00: 0x202000,
			            0xb00: 0x8,
			            0xc00: 0x10200008,
			            0xd00: 0x202008,
			            0xe00: 0x2008,
			            0xf00: 0x10202000,
			            0x80: 0x10200000,
			            0x180: 0x10202008,
			            0x280: 0x8,
			            0x380: 0x200000,
			            0x480: 0x202008,
			            0x580: 0x10000008,
			            0x680: 0x10002000,
			            0x780: 0x2008,
			            0x880: 0x200008,
			            0x980: 0x2000,
			            0xa80: 0x10002008,
			            0xb80: 0x10200008,
			            0xc80: 0x0,
			            0xd80: 0x10202000,
			            0xe80: 0x202000,
			            0xf80: 0x10000000,
			            0x1000: 0x10002000,
			            0x1100: 0x10200008,
			            0x1200: 0x10202008,
			            0x1300: 0x2008,
			            0x1400: 0x200000,
			            0x1500: 0x10000000,
			            0x1600: 0x10000008,
			            0x1700: 0x202000,
			            0x1800: 0x202008,
			            0x1900: 0x0,
			            0x1a00: 0x8,
			            0x1b00: 0x10200000,
			            0x1c00: 0x2000,
			            0x1d00: 0x10002008,
			            0x1e00: 0x10202000,
			            0x1f00: 0x200008,
			            0x1080: 0x8,
			            0x1180: 0x202000,
			            0x1280: 0x200000,
			            0x1380: 0x10000008,
			            0x1480: 0x10002000,
			            0x1580: 0x2008,
			            0x1680: 0x10202008,
			            0x1780: 0x10200000,
			            0x1880: 0x10202000,
			            0x1980: 0x10200008,
			            0x1a80: 0x2000,
			            0x1b80: 0x202008,
			            0x1c80: 0x200008,
			            0x1d80: 0x0,
			            0x1e80: 0x10000000,
			            0x1f80: 0x10002008
			        },
			        {
			            0x0: 0x100000,
			            0x10: 0x2000401,
			            0x20: 0x400,
			            0x30: 0x100401,
			            0x40: 0x2100401,
			            0x50: 0x0,
			            0x60: 0x1,
			            0x70: 0x2100001,
			            0x80: 0x2000400,
			            0x90: 0x100001,
			            0xa0: 0x2000001,
			            0xb0: 0x2100400,
			            0xc0: 0x2100000,
			            0xd0: 0x401,
			            0xe0: 0x100400,
			            0xf0: 0x2000000,
			            0x8: 0x2100001,
			            0x18: 0x0,
			            0x28: 0x2000401,
			            0x38: 0x2100400,
			            0x48: 0x100000,
			            0x58: 0x2000001,
			            0x68: 0x2000000,
			            0x78: 0x401,
			            0x88: 0x100401,
			            0x98: 0x2000400,
			            0xa8: 0x2100000,
			            0xb8: 0x100001,
			            0xc8: 0x400,
			            0xd8: 0x2100401,
			            0xe8: 0x1,
			            0xf8: 0x100400,
			            0x100: 0x2000000,
			            0x110: 0x100000,
			            0x120: 0x2000401,
			            0x130: 0x2100001,
			            0x140: 0x100001,
			            0x150: 0x2000400,
			            0x160: 0x2100400,
			            0x170: 0x100401,
			            0x180: 0x401,
			            0x190: 0x2100401,
			            0x1a0: 0x100400,
			            0x1b0: 0x1,
			            0x1c0: 0x0,
			            0x1d0: 0x2100000,
			            0x1e0: 0x2000001,
			            0x1f0: 0x400,
			            0x108: 0x100400,
			            0x118: 0x2000401,
			            0x128: 0x2100001,
			            0x138: 0x1,
			            0x148: 0x2000000,
			            0x158: 0x100000,
			            0x168: 0x401,
			            0x178: 0x2100400,
			            0x188: 0x2000001,
			            0x198: 0x2100000,
			            0x1a8: 0x0,
			            0x1b8: 0x2100401,
			            0x1c8: 0x100401,
			            0x1d8: 0x400,
			            0x1e8: 0x2000400,
			            0x1f8: 0x100001
			        },
			        {
			            0x0: 0x8000820,
			            0x1: 0x20000,
			            0x2: 0x8000000,
			            0x3: 0x20,
			            0x4: 0x20020,
			            0x5: 0x8020820,
			            0x6: 0x8020800,
			            0x7: 0x800,
			            0x8: 0x8020000,
			            0x9: 0x8000800,
			            0xa: 0x20800,
			            0xb: 0x8020020,
			            0xc: 0x820,
			            0xd: 0x0,
			            0xe: 0x8000020,
			            0xf: 0x20820,
			            0x80000000: 0x800,
			            0x80000001: 0x8020820,
			            0x80000002: 0x8000820,
			            0x80000003: 0x8000000,
			            0x80000004: 0x8020000,
			            0x80000005: 0x20800,
			            0x80000006: 0x20820,
			            0x80000007: 0x20,
			            0x80000008: 0x8000020,
			            0x80000009: 0x820,
			            0x8000000a: 0x20020,
			            0x8000000b: 0x8020800,
			            0x8000000c: 0x0,
			            0x8000000d: 0x8020020,
			            0x8000000e: 0x8000800,
			            0x8000000f: 0x20000,
			            0x10: 0x20820,
			            0x11: 0x8020800,
			            0x12: 0x20,
			            0x13: 0x800,
			            0x14: 0x8000800,
			            0x15: 0x8000020,
			            0x16: 0x8020020,
			            0x17: 0x20000,
			            0x18: 0x0,
			            0x19: 0x20020,
			            0x1a: 0x8020000,
			            0x1b: 0x8000820,
			            0x1c: 0x8020820,
			            0x1d: 0x20800,
			            0x1e: 0x820,
			            0x1f: 0x8000000,
			            0x80000010: 0x20000,
			            0x80000011: 0x800,
			            0x80000012: 0x8020020,
			            0x80000013: 0x20820,
			            0x80000014: 0x20,
			            0x80000015: 0x8020000,
			            0x80000016: 0x8000000,
			            0x80000017: 0x8000820,
			            0x80000018: 0x8020820,
			            0x80000019: 0x8000020,
			            0x8000001a: 0x8000800,
			            0x8000001b: 0x0,
			            0x8000001c: 0x20800,
			            0x8000001d: 0x820,
			            0x8000001e: 0x20020,
			            0x8000001f: 0x8020800
			        }
			    ];

			    // Masks that select the SBOX input
			    var SBOX_MASK = [
			        0xf8000001, 0x1f800000, 0x01f80000, 0x001f8000,
			        0x0001f800, 0x00001f80, 0x000001f8, 0x8000001f
			    ];

			    /**
			     * DES block cipher algorithm.
			     */
			    var DES = C_algo.DES = BlockCipher.extend({
			        _doReset: function () {
			            // Shortcuts
			            var key = this._key;
			            var keyWords = key.words;

			            // Select 56 bits according to PC1
			            var keyBits = [];
			            for (var i = 0; i < 56; i++) {
			                var keyBitPos = PC1[i] - 1;
			                keyBits[i] = (keyWords[keyBitPos >>> 5] >>> (31 - keyBitPos % 32)) & 1;
			            }

			            // Assemble 16 subkeys
			            var subKeys = this._subKeys = [];
			            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
			                // Create subkey
			                var subKey = subKeys[nSubKey] = [];

			                // Shortcut
			                var bitShift = BIT_SHIFTS[nSubKey];

			                // Select 48 bits according to PC2
			                for (var i = 0; i < 24; i++) {
			                    // Select from the left 28 key bits
			                    subKey[(i / 6) | 0] |= keyBits[((PC2[i] - 1) + bitShift) % 28] << (31 - i % 6);

			                    // Select from the right 28 key bits
			                    subKey[4 + ((i / 6) | 0)] |= keyBits[28 + (((PC2[i + 24] - 1) + bitShift) % 28)] << (31 - i % 6);
			                }

			                // Since each subkey is applied to an expanded 32-bit input,
			                // the subkey can be broken into 8 values scaled to 32-bits,
			                // which allows the key to be used without expansion
			                subKey[0] = (subKey[0] << 1) | (subKey[0] >>> 31);
			                for (var i = 1; i < 7; i++) {
			                    subKey[i] = subKey[i] >>> ((i - 1) * 4 + 3);
			                }
			                subKey[7] = (subKey[7] << 5) | (subKey[7] >>> 27);
			            }

			            // Compute inverse subkeys
			            var invSubKeys = this._invSubKeys = [];
			            for (var i = 0; i < 16; i++) {
			                invSubKeys[i] = subKeys[15 - i];
			            }
			        },

			        encryptBlock: function (M, offset) {
			            this._doCryptBlock(M, offset, this._subKeys);
			        },

			        decryptBlock: function (M, offset) {
			            this._doCryptBlock(M, offset, this._invSubKeys);
			        },

			        _doCryptBlock: function (M, offset, subKeys) {
			            // Get input
			            this._lBlock = M[offset];
			            this._rBlock = M[offset + 1];

			            // Initial permutation
			            exchangeLR.call(this, 4,  0x0f0f0f0f);
			            exchangeLR.call(this, 16, 0x0000ffff);
			            exchangeRL.call(this, 2,  0x33333333);
			            exchangeRL.call(this, 8,  0x00ff00ff);
			            exchangeLR.call(this, 1,  0x55555555);

			            // Rounds
			            for (var round = 0; round < 16; round++) {
			                // Shortcuts
			                var subKey = subKeys[round];
			                var lBlock = this._lBlock;
			                var rBlock = this._rBlock;

			                // Feistel function
			                var f = 0;
			                for (var i = 0; i < 8; i++) {
			                    f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
			                }
			                this._lBlock = rBlock;
			                this._rBlock = lBlock ^ f;
			            }

			            // Undo swap from last round
			            var t = this._lBlock;
			            this._lBlock = this._rBlock;
			            this._rBlock = t;

			            // Final permutation
			            exchangeLR.call(this, 1,  0x55555555);
			            exchangeRL.call(this, 8,  0x00ff00ff);
			            exchangeRL.call(this, 2,  0x33333333);
			            exchangeLR.call(this, 16, 0x0000ffff);
			            exchangeLR.call(this, 4,  0x0f0f0f0f);

			            // Set output
			            M[offset] = this._lBlock;
			            M[offset + 1] = this._rBlock;
			        },

			        keySize: 64/32,

			        ivSize: 64/32,

			        blockSize: 64/32
			    });

			    // Swap bits across the left and right words
			    function exchangeLR(offset, mask) {
			        var t = ((this._lBlock >>> offset) ^ this._rBlock) & mask;
			        this._rBlock ^= t;
			        this._lBlock ^= t << offset;
			    }

			    function exchangeRL(offset, mask) {
			        var t = ((this._rBlock >>> offset) ^ this._lBlock) & mask;
			        this._lBlock ^= t;
			        this._rBlock ^= t << offset;
			    }

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.DES.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.DES.decrypt(ciphertext, key, cfg);
			     */
			    C.DES = BlockCipher._createHelper(DES);

			    /**
			     * Triple-DES block cipher algorithm.
			     */
			    var TripleDES = C_algo.TripleDES = BlockCipher.extend({
			        _doReset: function () {
			            // Shortcuts
			            var key = this._key;
			            var keyWords = key.words;
			            // Make sure the key length is valid (64, 128 or >= 192 bit)
			            if (keyWords.length !== 2 && keyWords.length !== 4 && keyWords.length < 6) {
			                throw new Error('Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.');
			            }

			            // Extend the key according to the keying options defined in 3DES standard
			            var key1 = keyWords.slice(0, 2);
			            var key2 = keyWords.length < 4 ? keyWords.slice(0, 2) : keyWords.slice(2, 4);
			            var key3 = keyWords.length < 6 ? keyWords.slice(0, 2) : keyWords.slice(4, 6);

			            // Create DES instances
			            this._des1 = DES.createEncryptor(WordArray.create(key1));
			            this._des2 = DES.createEncryptor(WordArray.create(key2));
			            this._des3 = DES.createEncryptor(WordArray.create(key3));
			        },

			        encryptBlock: function (M, offset) {
			            this._des1.encryptBlock(M, offset);
			            this._des2.decryptBlock(M, offset);
			            this._des3.encryptBlock(M, offset);
			        },

			        decryptBlock: function (M, offset) {
			            this._des3.decryptBlock(M, offset);
			            this._des2.encryptBlock(M, offset);
			            this._des1.decryptBlock(M, offset);
			        },

			        keySize: 192/32,

			        ivSize: 64/32,

			        blockSize: 64/32
			    });

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.TripleDES.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.TripleDES.decrypt(ciphertext, key, cfg);
			     */
			    C.TripleDES = BlockCipher._createHelper(TripleDES);
			}());


			return CryptoJS.TripleDES;

		})); 
	} (tripledes));
	return tripledes.exports;
}

var rc4 = {exports: {}};

var hasRequiredRc4;

function requireRc4 () {
	if (hasRequiredRc4) return rc4.exports;
	hasRequiredRc4 = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEncBase64(), requireMd5(), requireEvpkdf(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var StreamCipher = C_lib.StreamCipher;
			    var C_algo = C.algo;

			    /**
			     * RC4 stream cipher algorithm.
			     */
			    var RC4 = C_algo.RC4 = StreamCipher.extend({
			        _doReset: function () {
			            // Shortcuts
			            var key = this._key;
			            var keyWords = key.words;
			            var keySigBytes = key.sigBytes;

			            // Init sbox
			            var S = this._S = [];
			            for (var i = 0; i < 256; i++) {
			                S[i] = i;
			            }

			            // Key setup
			            for (var i = 0, j = 0; i < 256; i++) {
			                var keyByteIndex = i % keySigBytes;
			                var keyByte = (keyWords[keyByteIndex >>> 2] >>> (24 - (keyByteIndex % 4) * 8)) & 0xff;

			                j = (j + S[i] + keyByte) % 256;

			                // Swap
			                var t = S[i];
			                S[i] = S[j];
			                S[j] = t;
			            }

			            // Counters
			            this._i = this._j = 0;
			        },

			        _doProcessBlock: function (M, offset) {
			            M[offset] ^= generateKeystreamWord.call(this);
			        },

			        keySize: 256/32,

			        ivSize: 0
			    });

			    function generateKeystreamWord() {
			        // Shortcuts
			        var S = this._S;
			        var i = this._i;
			        var j = this._j;

			        // Generate keystream word
			        var keystreamWord = 0;
			        for (var n = 0; n < 4; n++) {
			            i = (i + 1) % 256;
			            j = (j + S[i]) % 256;

			            // Swap
			            var t = S[i];
			            S[i] = S[j];
			            S[j] = t;

			            keystreamWord |= S[(S[i] + S[j]) % 256] << (24 - n * 8);
			        }

			        // Update counters
			        this._i = i;
			        this._j = j;

			        return keystreamWord;
			    }

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.RC4.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.RC4.decrypt(ciphertext, key, cfg);
			     */
			    C.RC4 = StreamCipher._createHelper(RC4);

			    /**
			     * Modified RC4 stream cipher algorithm.
			     */
			    var RC4Drop = C_algo.RC4Drop = RC4.extend({
			        /**
			         * Configuration options.
			         *
			         * @property {number} drop The number of keystream words to drop. Default 192
			         */
			        cfg: RC4.cfg.extend({
			            drop: 192
			        }),

			        _doReset: function () {
			            RC4._doReset.call(this);

			            // Drop
			            for (var i = this.cfg.drop; i > 0; i--) {
			                generateKeystreamWord.call(this);
			            }
			        }
			    });

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.RC4Drop.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.RC4Drop.decrypt(ciphertext, key, cfg);
			     */
			    C.RC4Drop = StreamCipher._createHelper(RC4Drop);
			}());


			return CryptoJS.RC4;

		})); 
	} (rc4));
	return rc4.exports;
}

var rabbit = {exports: {}};

var hasRequiredRabbit;

function requireRabbit () {
	if (hasRequiredRabbit) return rabbit.exports;
	hasRequiredRabbit = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEncBase64(), requireMd5(), requireEvpkdf(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var StreamCipher = C_lib.StreamCipher;
			    var C_algo = C.algo;

			    // Reusable objects
			    var S  = [];
			    var C_ = [];
			    var G  = [];

			    /**
			     * Rabbit stream cipher algorithm
			     */
			    var Rabbit = C_algo.Rabbit = StreamCipher.extend({
			        _doReset: function () {
			            // Shortcuts
			            var K = this._key.words;
			            var iv = this.cfg.iv;

			            // Swap endian
			            for (var i = 0; i < 4; i++) {
			                K[i] = (((K[i] << 8)  | (K[i] >>> 24)) & 0x00ff00ff) |
			                       (((K[i] << 24) | (K[i] >>> 8))  & 0xff00ff00);
			            }

			            // Generate initial state values
			            var X = this._X = [
			                K[0], (K[3] << 16) | (K[2] >>> 16),
			                K[1], (K[0] << 16) | (K[3] >>> 16),
			                K[2], (K[1] << 16) | (K[0] >>> 16),
			                K[3], (K[2] << 16) | (K[1] >>> 16)
			            ];

			            // Generate initial counter values
			            var C = this._C = [
			                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
			                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
			                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
			                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
			            ];

			            // Carry bit
			            this._b = 0;

			            // Iterate the system four times
			            for (var i = 0; i < 4; i++) {
			                nextState.call(this);
			            }

			            // Modify the counters
			            for (var i = 0; i < 8; i++) {
			                C[i] ^= X[(i + 4) & 7];
			            }

			            // IV setup
			            if (iv) {
			                // Shortcuts
			                var IV = iv.words;
			                var IV_0 = IV[0];
			                var IV_1 = IV[1];

			                // Generate four subvectors
			                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
			                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
			                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
			                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

			                // Modify counter values
			                C[0] ^= i0;
			                C[1] ^= i1;
			                C[2] ^= i2;
			                C[3] ^= i3;
			                C[4] ^= i0;
			                C[5] ^= i1;
			                C[6] ^= i2;
			                C[7] ^= i3;

			                // Iterate the system four times
			                for (var i = 0; i < 4; i++) {
			                    nextState.call(this);
			                }
			            }
			        },

			        _doProcessBlock: function (M, offset) {
			            // Shortcut
			            var X = this._X;

			            // Iterate the system
			            nextState.call(this);

			            // Generate four keystream words
			            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
			            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
			            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
			            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

			            for (var i = 0; i < 4; i++) {
			                // Swap endian
			                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
			                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

			                // Encrypt
			                M[offset + i] ^= S[i];
			            }
			        },

			        blockSize: 128/32,

			        ivSize: 64/32
			    });

			    function nextState() {
			        // Shortcuts
			        var X = this._X;
			        var C = this._C;

			        // Save old counter values
			        for (var i = 0; i < 8; i++) {
			            C_[i] = C[i];
			        }

			        // Calculate new counter values
			        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
			        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
			        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
			        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
			        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
			        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
			        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
			        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
			        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

			        // Calculate the g-values
			        for (var i = 0; i < 8; i++) {
			            var gx = X[i] + C[i];

			            // Construct high and low argument for squaring
			            var ga = gx & 0xffff;
			            var gb = gx >>> 16;

			            // Calculate high and low result of squaring
			            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
			            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

			            // High XOR low
			            G[i] = gh ^ gl;
			        }

			        // Calculate new state values
			        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
			        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
			        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
			        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
			        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
			        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
			        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
			        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
			    }

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.Rabbit.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.Rabbit.decrypt(ciphertext, key, cfg);
			     */
			    C.Rabbit = StreamCipher._createHelper(Rabbit);
			}());


			return CryptoJS.Rabbit;

		})); 
	} (rabbit));
	return rabbit.exports;
}

var rabbitLegacy = {exports: {}};

var hasRequiredRabbitLegacy;

function requireRabbitLegacy () {
	if (hasRequiredRabbitLegacy) return rabbitLegacy.exports;
	hasRequiredRabbitLegacy = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEncBase64(), requireMd5(), requireEvpkdf(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var StreamCipher = C_lib.StreamCipher;
			    var C_algo = C.algo;

			    // Reusable objects
			    var S  = [];
			    var C_ = [];
			    var G  = [];

			    /**
			     * Rabbit stream cipher algorithm.
			     *
			     * This is a legacy version that neglected to convert the key to little-endian.
			     * This error doesn't affect the cipher's security,
			     * but it does affect its compatibility with other implementations.
			     */
			    var RabbitLegacy = C_algo.RabbitLegacy = StreamCipher.extend({
			        _doReset: function () {
			            // Shortcuts
			            var K = this._key.words;
			            var iv = this.cfg.iv;

			            // Generate initial state values
			            var X = this._X = [
			                K[0], (K[3] << 16) | (K[2] >>> 16),
			                K[1], (K[0] << 16) | (K[3] >>> 16),
			                K[2], (K[1] << 16) | (K[0] >>> 16),
			                K[3], (K[2] << 16) | (K[1] >>> 16)
			            ];

			            // Generate initial counter values
			            var C = this._C = [
			                (K[2] << 16) | (K[2] >>> 16), (K[0] & 0xffff0000) | (K[1] & 0x0000ffff),
			                (K[3] << 16) | (K[3] >>> 16), (K[1] & 0xffff0000) | (K[2] & 0x0000ffff),
			                (K[0] << 16) | (K[0] >>> 16), (K[2] & 0xffff0000) | (K[3] & 0x0000ffff),
			                (K[1] << 16) | (K[1] >>> 16), (K[3] & 0xffff0000) | (K[0] & 0x0000ffff)
			            ];

			            // Carry bit
			            this._b = 0;

			            // Iterate the system four times
			            for (var i = 0; i < 4; i++) {
			                nextState.call(this);
			            }

			            // Modify the counters
			            for (var i = 0; i < 8; i++) {
			                C[i] ^= X[(i + 4) & 7];
			            }

			            // IV setup
			            if (iv) {
			                // Shortcuts
			                var IV = iv.words;
			                var IV_0 = IV[0];
			                var IV_1 = IV[1];

			                // Generate four subvectors
			                var i0 = (((IV_0 << 8) | (IV_0 >>> 24)) & 0x00ff00ff) | (((IV_0 << 24) | (IV_0 >>> 8)) & 0xff00ff00);
			                var i2 = (((IV_1 << 8) | (IV_1 >>> 24)) & 0x00ff00ff) | (((IV_1 << 24) | (IV_1 >>> 8)) & 0xff00ff00);
			                var i1 = (i0 >>> 16) | (i2 & 0xffff0000);
			                var i3 = (i2 << 16)  | (i0 & 0x0000ffff);

			                // Modify counter values
			                C[0] ^= i0;
			                C[1] ^= i1;
			                C[2] ^= i2;
			                C[3] ^= i3;
			                C[4] ^= i0;
			                C[5] ^= i1;
			                C[6] ^= i2;
			                C[7] ^= i3;

			                // Iterate the system four times
			                for (var i = 0; i < 4; i++) {
			                    nextState.call(this);
			                }
			            }
			        },

			        _doProcessBlock: function (M, offset) {
			            // Shortcut
			            var X = this._X;

			            // Iterate the system
			            nextState.call(this);

			            // Generate four keystream words
			            S[0] = X[0] ^ (X[5] >>> 16) ^ (X[3] << 16);
			            S[1] = X[2] ^ (X[7] >>> 16) ^ (X[5] << 16);
			            S[2] = X[4] ^ (X[1] >>> 16) ^ (X[7] << 16);
			            S[3] = X[6] ^ (X[3] >>> 16) ^ (X[1] << 16);

			            for (var i = 0; i < 4; i++) {
			                // Swap endian
			                S[i] = (((S[i] << 8)  | (S[i] >>> 24)) & 0x00ff00ff) |
			                       (((S[i] << 24) | (S[i] >>> 8))  & 0xff00ff00);

			                // Encrypt
			                M[offset + i] ^= S[i];
			            }
			        },

			        blockSize: 128/32,

			        ivSize: 64/32
			    });

			    function nextState() {
			        // Shortcuts
			        var X = this._X;
			        var C = this._C;

			        // Save old counter values
			        for (var i = 0; i < 8; i++) {
			            C_[i] = C[i];
			        }

			        // Calculate new counter values
			        C[0] = (C[0] + 0x4d34d34d + this._b) | 0;
			        C[1] = (C[1] + 0xd34d34d3 + ((C[0] >>> 0) < (C_[0] >>> 0) ? 1 : 0)) | 0;
			        C[2] = (C[2] + 0x34d34d34 + ((C[1] >>> 0) < (C_[1] >>> 0) ? 1 : 0)) | 0;
			        C[3] = (C[3] + 0x4d34d34d + ((C[2] >>> 0) < (C_[2] >>> 0) ? 1 : 0)) | 0;
			        C[4] = (C[4] + 0xd34d34d3 + ((C[3] >>> 0) < (C_[3] >>> 0) ? 1 : 0)) | 0;
			        C[5] = (C[5] + 0x34d34d34 + ((C[4] >>> 0) < (C_[4] >>> 0) ? 1 : 0)) | 0;
			        C[6] = (C[6] + 0x4d34d34d + ((C[5] >>> 0) < (C_[5] >>> 0) ? 1 : 0)) | 0;
			        C[7] = (C[7] + 0xd34d34d3 + ((C[6] >>> 0) < (C_[6] >>> 0) ? 1 : 0)) | 0;
			        this._b = (C[7] >>> 0) < (C_[7] >>> 0) ? 1 : 0;

			        // Calculate the g-values
			        for (var i = 0; i < 8; i++) {
			            var gx = X[i] + C[i];

			            // Construct high and low argument for squaring
			            var ga = gx & 0xffff;
			            var gb = gx >>> 16;

			            // Calculate high and low result of squaring
			            var gh = ((((ga * ga) >>> 17) + ga * gb) >>> 15) + gb * gb;
			            var gl = (((gx & 0xffff0000) * gx) | 0) + (((gx & 0x0000ffff) * gx) | 0);

			            // High XOR low
			            G[i] = gh ^ gl;
			        }

			        // Calculate new state values
			        X[0] = (G[0] + ((G[7] << 16) | (G[7] >>> 16)) + ((G[6] << 16) | (G[6] >>> 16))) | 0;
			        X[1] = (G[1] + ((G[0] << 8)  | (G[0] >>> 24)) + G[7]) | 0;
			        X[2] = (G[2] + ((G[1] << 16) | (G[1] >>> 16)) + ((G[0] << 16) | (G[0] >>> 16))) | 0;
			        X[3] = (G[3] + ((G[2] << 8)  | (G[2] >>> 24)) + G[1]) | 0;
			        X[4] = (G[4] + ((G[3] << 16) | (G[3] >>> 16)) + ((G[2] << 16) | (G[2] >>> 16))) | 0;
			        X[5] = (G[5] + ((G[4] << 8)  | (G[4] >>> 24)) + G[3]) | 0;
			        X[6] = (G[6] + ((G[5] << 16) | (G[5] >>> 16)) + ((G[4] << 16) | (G[4] >>> 16))) | 0;
			        X[7] = (G[7] + ((G[6] << 8)  | (G[6] >>> 24)) + G[5]) | 0;
			    }

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.RabbitLegacy.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.RabbitLegacy.decrypt(ciphertext, key, cfg);
			     */
			    C.RabbitLegacy = StreamCipher._createHelper(RabbitLegacy);
			}());


			return CryptoJS.RabbitLegacy;

		})); 
	} (rabbitLegacy));
	return rabbitLegacy.exports;
}

var blowfish = {exports: {}};

var hasRequiredBlowfish;

function requireBlowfish () {
	if (hasRequiredBlowfish) return blowfish.exports;
	hasRequiredBlowfish = 1;
	(function (module, exports$1) {
(function (root, factory, undef) {
			{
				// CommonJS
				module.exports = factory(requireCore(), requireEncBase64(), requireMd5(), requireEvpkdf(), requireCipherCore());
			}
		}(commonjsGlobal, function (CryptoJS) {

			(function () {
			    // Shortcuts
			    var C = CryptoJS;
			    var C_lib = C.lib;
			    var BlockCipher = C_lib.BlockCipher;
			    var C_algo = C.algo;

			    const N = 16;

			    //Origin pbox and sbox, derived from PI
			    const ORIG_P = [
			        0x243F6A88, 0x85A308D3, 0x13198A2E, 0x03707344,
			        0xA4093822, 0x299F31D0, 0x082EFA98, 0xEC4E6C89,
			        0x452821E6, 0x38D01377, 0xBE5466CF, 0x34E90C6C,
			        0xC0AC29B7, 0xC97C50DD, 0x3F84D5B5, 0xB5470917,
			        0x9216D5D9, 0x8979FB1B
			    ];

			    const ORIG_S = [
			        [   0xD1310BA6, 0x98DFB5AC, 0x2FFD72DB, 0xD01ADFB7,
			            0xB8E1AFED, 0x6A267E96, 0xBA7C9045, 0xF12C7F99,
			            0x24A19947, 0xB3916CF7, 0x0801F2E2, 0x858EFC16,
			            0x636920D8, 0x71574E69, 0xA458FEA3, 0xF4933D7E,
			            0x0D95748F, 0x728EB658, 0x718BCD58, 0x82154AEE,
			            0x7B54A41D, 0xC25A59B5, 0x9C30D539, 0x2AF26013,
			            0xC5D1B023, 0x286085F0, 0xCA417918, 0xB8DB38EF,
			            0x8E79DCB0, 0x603A180E, 0x6C9E0E8B, 0xB01E8A3E,
			            0xD71577C1, 0xBD314B27, 0x78AF2FDA, 0x55605C60,
			            0xE65525F3, 0xAA55AB94, 0x57489862, 0x63E81440,
			            0x55CA396A, 0x2AAB10B6, 0xB4CC5C34, 0x1141E8CE,
			            0xA15486AF, 0x7C72E993, 0xB3EE1411, 0x636FBC2A,
			            0x2BA9C55D, 0x741831F6, 0xCE5C3E16, 0x9B87931E,
			            0xAFD6BA33, 0x6C24CF5C, 0x7A325381, 0x28958677,
			            0x3B8F4898, 0x6B4BB9AF, 0xC4BFE81B, 0x66282193,
			            0x61D809CC, 0xFB21A991, 0x487CAC60, 0x5DEC8032,
			            0xEF845D5D, 0xE98575B1, 0xDC262302, 0xEB651B88,
			            0x23893E81, 0xD396ACC5, 0x0F6D6FF3, 0x83F44239,
			            0x2E0B4482, 0xA4842004, 0x69C8F04A, 0x9E1F9B5E,
			            0x21C66842, 0xF6E96C9A, 0x670C9C61, 0xABD388F0,
			            0x6A51A0D2, 0xD8542F68, 0x960FA728, 0xAB5133A3,
			            0x6EEF0B6C, 0x137A3BE4, 0xBA3BF050, 0x7EFB2A98,
			            0xA1F1651D, 0x39AF0176, 0x66CA593E, 0x82430E88,
			            0x8CEE8619, 0x456F9FB4, 0x7D84A5C3, 0x3B8B5EBE,
			            0xE06F75D8, 0x85C12073, 0x401A449F, 0x56C16AA6,
			            0x4ED3AA62, 0x363F7706, 0x1BFEDF72, 0x429B023D,
			            0x37D0D724, 0xD00A1248, 0xDB0FEAD3, 0x49F1C09B,
			            0x075372C9, 0x80991B7B, 0x25D479D8, 0xF6E8DEF7,
			            0xE3FE501A, 0xB6794C3B, 0x976CE0BD, 0x04C006BA,
			            0xC1A94FB6, 0x409F60C4, 0x5E5C9EC2, 0x196A2463,
			            0x68FB6FAF, 0x3E6C53B5, 0x1339B2EB, 0x3B52EC6F,
			            0x6DFC511F, 0x9B30952C, 0xCC814544, 0xAF5EBD09,
			            0xBEE3D004, 0xDE334AFD, 0x660F2807, 0x192E4BB3,
			            0xC0CBA857, 0x45C8740F, 0xD20B5F39, 0xB9D3FBDB,
			            0x5579C0BD, 0x1A60320A, 0xD6A100C6, 0x402C7279,
			            0x679F25FE, 0xFB1FA3CC, 0x8EA5E9F8, 0xDB3222F8,
			            0x3C7516DF, 0xFD616B15, 0x2F501EC8, 0xAD0552AB,
			            0x323DB5FA, 0xFD238760, 0x53317B48, 0x3E00DF82,
			            0x9E5C57BB, 0xCA6F8CA0, 0x1A87562E, 0xDF1769DB,
			            0xD542A8F6, 0x287EFFC3, 0xAC6732C6, 0x8C4F5573,
			            0x695B27B0, 0xBBCA58C8, 0xE1FFA35D, 0xB8F011A0,
			            0x10FA3D98, 0xFD2183B8, 0x4AFCB56C, 0x2DD1D35B,
			            0x9A53E479, 0xB6F84565, 0xD28E49BC, 0x4BFB9790,
			            0xE1DDF2DA, 0xA4CB7E33, 0x62FB1341, 0xCEE4C6E8,
			            0xEF20CADA, 0x36774C01, 0xD07E9EFE, 0x2BF11FB4,
			            0x95DBDA4D, 0xAE909198, 0xEAAD8E71, 0x6B93D5A0,
			            0xD08ED1D0, 0xAFC725E0, 0x8E3C5B2F, 0x8E7594B7,
			            0x8FF6E2FB, 0xF2122B64, 0x8888B812, 0x900DF01C,
			            0x4FAD5EA0, 0x688FC31C, 0xD1CFF191, 0xB3A8C1AD,
			            0x2F2F2218, 0xBE0E1777, 0xEA752DFE, 0x8B021FA1,
			            0xE5A0CC0F, 0xB56F74E8, 0x18ACF3D6, 0xCE89E299,
			            0xB4A84FE0, 0xFD13E0B7, 0x7CC43B81, 0xD2ADA8D9,
			            0x165FA266, 0x80957705, 0x93CC7314, 0x211A1477,
			            0xE6AD2065, 0x77B5FA86, 0xC75442F5, 0xFB9D35CF,
			            0xEBCDAF0C, 0x7B3E89A0, 0xD6411BD3, 0xAE1E7E49,
			            0x00250E2D, 0x2071B35E, 0x226800BB, 0x57B8E0AF,
			            0x2464369B, 0xF009B91E, 0x5563911D, 0x59DFA6AA,
			            0x78C14389, 0xD95A537F, 0x207D5BA2, 0x02E5B9C5,
			            0x83260376, 0x6295CFA9, 0x11C81968, 0x4E734A41,
			            0xB3472DCA, 0x7B14A94A, 0x1B510052, 0x9A532915,
			            0xD60F573F, 0xBC9BC6E4, 0x2B60A476, 0x81E67400,
			            0x08BA6FB5, 0x571BE91F, 0xF296EC6B, 0x2A0DD915,
			            0xB6636521, 0xE7B9F9B6, 0xFF34052E, 0xC5855664,
			            0x53B02D5D, 0xA99F8FA1, 0x08BA4799, 0x6E85076A   ],
			        [   0x4B7A70E9, 0xB5B32944, 0xDB75092E, 0xC4192623,
			            0xAD6EA6B0, 0x49A7DF7D, 0x9CEE60B8, 0x8FEDB266,
			            0xECAA8C71, 0x699A17FF, 0x5664526C, 0xC2B19EE1,
			            0x193602A5, 0x75094C29, 0xA0591340, 0xE4183A3E,
			            0x3F54989A, 0x5B429D65, 0x6B8FE4D6, 0x99F73FD6,
			            0xA1D29C07, 0xEFE830F5, 0x4D2D38E6, 0xF0255DC1,
			            0x4CDD2086, 0x8470EB26, 0x6382E9C6, 0x021ECC5E,
			            0x09686B3F, 0x3EBAEFC9, 0x3C971814, 0x6B6A70A1,
			            0x687F3584, 0x52A0E286, 0xB79C5305, 0xAA500737,
			            0x3E07841C, 0x7FDEAE5C, 0x8E7D44EC, 0x5716F2B8,
			            0xB03ADA37, 0xF0500C0D, 0xF01C1F04, 0x0200B3FF,
			            0xAE0CF51A, 0x3CB574B2, 0x25837A58, 0xDC0921BD,
			            0xD19113F9, 0x7CA92FF6, 0x94324773, 0x22F54701,
			            0x3AE5E581, 0x37C2DADC, 0xC8B57634, 0x9AF3DDA7,
			            0xA9446146, 0x0FD0030E, 0xECC8C73E, 0xA4751E41,
			            0xE238CD99, 0x3BEA0E2F, 0x3280BBA1, 0x183EB331,
			            0x4E548B38, 0x4F6DB908, 0x6F420D03, 0xF60A04BF,
			            0x2CB81290, 0x24977C79, 0x5679B072, 0xBCAF89AF,
			            0xDE9A771F, 0xD9930810, 0xB38BAE12, 0xDCCF3F2E,
			            0x5512721F, 0x2E6B7124, 0x501ADDE6, 0x9F84CD87,
			            0x7A584718, 0x7408DA17, 0xBC9F9ABC, 0xE94B7D8C,
			            0xEC7AEC3A, 0xDB851DFA, 0x63094366, 0xC464C3D2,
			            0xEF1C1847, 0x3215D908, 0xDD433B37, 0x24C2BA16,
			            0x12A14D43, 0x2A65C451, 0x50940002, 0x133AE4DD,
			            0x71DFF89E, 0x10314E55, 0x81AC77D6, 0x5F11199B,
			            0x043556F1, 0xD7A3C76B, 0x3C11183B, 0x5924A509,
			            0xF28FE6ED, 0x97F1FBFA, 0x9EBABF2C, 0x1E153C6E,
			            0x86E34570, 0xEAE96FB1, 0x860E5E0A, 0x5A3E2AB3,
			            0x771FE71C, 0x4E3D06FA, 0x2965DCB9, 0x99E71D0F,
			            0x803E89D6, 0x5266C825, 0x2E4CC978, 0x9C10B36A,
			            0xC6150EBA, 0x94E2EA78, 0xA5FC3C53, 0x1E0A2DF4,
			            0xF2F74EA7, 0x361D2B3D, 0x1939260F, 0x19C27960,
			            0x5223A708, 0xF71312B6, 0xEBADFE6E, 0xEAC31F66,
			            0xE3BC4595, 0xA67BC883, 0xB17F37D1, 0x018CFF28,
			            0xC332DDEF, 0xBE6C5AA5, 0x65582185, 0x68AB9802,
			            0xEECEA50F, 0xDB2F953B, 0x2AEF7DAD, 0x5B6E2F84,
			            0x1521B628, 0x29076170, 0xECDD4775, 0x619F1510,
			            0x13CCA830, 0xEB61BD96, 0x0334FE1E, 0xAA0363CF,
			            0xB5735C90, 0x4C70A239, 0xD59E9E0B, 0xCBAADE14,
			            0xEECC86BC, 0x60622CA7, 0x9CAB5CAB, 0xB2F3846E,
			            0x648B1EAF, 0x19BDF0CA, 0xA02369B9, 0x655ABB50,
			            0x40685A32, 0x3C2AB4B3, 0x319EE9D5, 0xC021B8F7,
			            0x9B540B19, 0x875FA099, 0x95F7997E, 0x623D7DA8,
			            0xF837889A, 0x97E32D77, 0x11ED935F, 0x16681281,
			            0x0E358829, 0xC7E61FD6, 0x96DEDFA1, 0x7858BA99,
			            0x57F584A5, 0x1B227263, 0x9B83C3FF, 0x1AC24696,
			            0xCDB30AEB, 0x532E3054, 0x8FD948E4, 0x6DBC3128,
			            0x58EBF2EF, 0x34C6FFEA, 0xFE28ED61, 0xEE7C3C73,
			            0x5D4A14D9, 0xE864B7E3, 0x42105D14, 0x203E13E0,
			            0x45EEE2B6, 0xA3AAABEA, 0xDB6C4F15, 0xFACB4FD0,
			            0xC742F442, 0xEF6ABBB5, 0x654F3B1D, 0x41CD2105,
			            0xD81E799E, 0x86854DC7, 0xE44B476A, 0x3D816250,
			            0xCF62A1F2, 0x5B8D2646, 0xFC8883A0, 0xC1C7B6A3,
			            0x7F1524C3, 0x69CB7492, 0x47848A0B, 0x5692B285,
			            0x095BBF00, 0xAD19489D, 0x1462B174, 0x23820E00,
			            0x58428D2A, 0x0C55F5EA, 0x1DADF43E, 0x233F7061,
			            0x3372F092, 0x8D937E41, 0xD65FECF1, 0x6C223BDB,
			            0x7CDE3759, 0xCBEE7460, 0x4085F2A7, 0xCE77326E,
			            0xA6078084, 0x19F8509E, 0xE8EFD855, 0x61D99735,
			            0xA969A7AA, 0xC50C06C2, 0x5A04ABFC, 0x800BCADC,
			            0x9E447A2E, 0xC3453484, 0xFDD56705, 0x0E1E9EC9,
			            0xDB73DBD3, 0x105588CD, 0x675FDA79, 0xE3674340,
			            0xC5C43465, 0x713E38D8, 0x3D28F89E, 0xF16DFF20,
			            0x153E21E7, 0x8FB03D4A, 0xE6E39F2B, 0xDB83ADF7   ],
			        [   0xE93D5A68, 0x948140F7, 0xF64C261C, 0x94692934,
			            0x411520F7, 0x7602D4F7, 0xBCF46B2E, 0xD4A20068,
			            0xD4082471, 0x3320F46A, 0x43B7D4B7, 0x500061AF,
			            0x1E39F62E, 0x97244546, 0x14214F74, 0xBF8B8840,
			            0x4D95FC1D, 0x96B591AF, 0x70F4DDD3, 0x66A02F45,
			            0xBFBC09EC, 0x03BD9785, 0x7FAC6DD0, 0x31CB8504,
			            0x96EB27B3, 0x55FD3941, 0xDA2547E6, 0xABCA0A9A,
			            0x28507825, 0x530429F4, 0x0A2C86DA, 0xE9B66DFB,
			            0x68DC1462, 0xD7486900, 0x680EC0A4, 0x27A18DEE,
			            0x4F3FFEA2, 0xE887AD8C, 0xB58CE006, 0x7AF4D6B6,
			            0xAACE1E7C, 0xD3375FEC, 0xCE78A399, 0x406B2A42,
			            0x20FE9E35, 0xD9F385B9, 0xEE39D7AB, 0x3B124E8B,
			            0x1DC9FAF7, 0x4B6D1856, 0x26A36631, 0xEAE397B2,
			            0x3A6EFA74, 0xDD5B4332, 0x6841E7F7, 0xCA7820FB,
			            0xFB0AF54E, 0xD8FEB397, 0x454056AC, 0xBA489527,
			            0x55533A3A, 0x20838D87, 0xFE6BA9B7, 0xD096954B,
			            0x55A867BC, 0xA1159A58, 0xCCA92963, 0x99E1DB33,
			            0xA62A4A56, 0x3F3125F9, 0x5EF47E1C, 0x9029317C,
			            0xFDF8E802, 0x04272F70, 0x80BB155C, 0x05282CE3,
			            0x95C11548, 0xE4C66D22, 0x48C1133F, 0xC70F86DC,
			            0x07F9C9EE, 0x41041F0F, 0x404779A4, 0x5D886E17,
			            0x325F51EB, 0xD59BC0D1, 0xF2BCC18F, 0x41113564,
			            0x257B7834, 0x602A9C60, 0xDFF8E8A3, 0x1F636C1B,
			            0x0E12B4C2, 0x02E1329E, 0xAF664FD1, 0xCAD18115,
			            0x6B2395E0, 0x333E92E1, 0x3B240B62, 0xEEBEB922,
			            0x85B2A20E, 0xE6BA0D99, 0xDE720C8C, 0x2DA2F728,
			            0xD0127845, 0x95B794FD, 0x647D0862, 0xE7CCF5F0,
			            0x5449A36F, 0x877D48FA, 0xC39DFD27, 0xF33E8D1E,
			            0x0A476341, 0x992EFF74, 0x3A6F6EAB, 0xF4F8FD37,
			            0xA812DC60, 0xA1EBDDF8, 0x991BE14C, 0xDB6E6B0D,
			            0xC67B5510, 0x6D672C37, 0x2765D43B, 0xDCD0E804,
			            0xF1290DC7, 0xCC00FFA3, 0xB5390F92, 0x690FED0B,
			            0x667B9FFB, 0xCEDB7D9C, 0xA091CF0B, 0xD9155EA3,
			            0xBB132F88, 0x515BAD24, 0x7B9479BF, 0x763BD6EB,
			            0x37392EB3, 0xCC115979, 0x8026E297, 0xF42E312D,
			            0x6842ADA7, 0xC66A2B3B, 0x12754CCC, 0x782EF11C,
			            0x6A124237, 0xB79251E7, 0x06A1BBE6, 0x4BFB6350,
			            0x1A6B1018, 0x11CAEDFA, 0x3D25BDD8, 0xE2E1C3C9,
			            0x44421659, 0x0A121386, 0xD90CEC6E, 0xD5ABEA2A,
			            0x64AF674E, 0xDA86A85F, 0xBEBFE988, 0x64E4C3FE,
			            0x9DBC8057, 0xF0F7C086, 0x60787BF8, 0x6003604D,
			            0xD1FD8346, 0xF6381FB0, 0x7745AE04, 0xD736FCCC,
			            0x83426B33, 0xF01EAB71, 0xB0804187, 0x3C005E5F,
			            0x77A057BE, 0xBDE8AE24, 0x55464299, 0xBF582E61,
			            0x4E58F48F, 0xF2DDFDA2, 0xF474EF38, 0x8789BDC2,
			            0x5366F9C3, 0xC8B38E74, 0xB475F255, 0x46FCD9B9,
			            0x7AEB2661, 0x8B1DDF84, 0x846A0E79, 0x915F95E2,
			            0x466E598E, 0x20B45770, 0x8CD55591, 0xC902DE4C,
			            0xB90BACE1, 0xBB8205D0, 0x11A86248, 0x7574A99E,
			            0xB77F19B6, 0xE0A9DC09, 0x662D09A1, 0xC4324633,
			            0xE85A1F02, 0x09F0BE8C, 0x4A99A025, 0x1D6EFE10,
			            0x1AB93D1D, 0x0BA5A4DF, 0xA186F20F, 0x2868F169,
			            0xDCB7DA83, 0x573906FE, 0xA1E2CE9B, 0x4FCD7F52,
			            0x50115E01, 0xA70683FA, 0xA002B5C4, 0x0DE6D027,
			            0x9AF88C27, 0x773F8641, 0xC3604C06, 0x61A806B5,
			            0xF0177A28, 0xC0F586E0, 0x006058AA, 0x30DC7D62,
			            0x11E69ED7, 0x2338EA63, 0x53C2DD94, 0xC2C21634,
			            0xBBCBEE56, 0x90BCB6DE, 0xEBFC7DA1, 0xCE591D76,
			            0x6F05E409, 0x4B7C0188, 0x39720A3D, 0x7C927C24,
			            0x86E3725F, 0x724D9DB9, 0x1AC15BB4, 0xD39EB8FC,
			            0xED545578, 0x08FCA5B5, 0xD83D7CD3, 0x4DAD0FC4,
			            0x1E50EF5E, 0xB161E6F8, 0xA28514D9, 0x6C51133C,
			            0x6FD5C7E7, 0x56E14EC4, 0x362ABFCE, 0xDDC6C837,
			            0xD79A3234, 0x92638212, 0x670EFA8E, 0x406000E0  ],
			        [   0x3A39CE37, 0xD3FAF5CF, 0xABC27737, 0x5AC52D1B,
			            0x5CB0679E, 0x4FA33742, 0xD3822740, 0x99BC9BBE,
			            0xD5118E9D, 0xBF0F7315, 0xD62D1C7E, 0xC700C47B,
			            0xB78C1B6B, 0x21A19045, 0xB26EB1BE, 0x6A366EB4,
			            0x5748AB2F, 0xBC946E79, 0xC6A376D2, 0x6549C2C8,
			            0x530FF8EE, 0x468DDE7D, 0xD5730A1D, 0x4CD04DC6,
			            0x2939BBDB, 0xA9BA4650, 0xAC9526E8, 0xBE5EE304,
			            0xA1FAD5F0, 0x6A2D519A, 0x63EF8CE2, 0x9A86EE22,
			            0xC089C2B8, 0x43242EF6, 0xA51E03AA, 0x9CF2D0A4,
			            0x83C061BA, 0x9BE96A4D, 0x8FE51550, 0xBA645BD6,
			            0x2826A2F9, 0xA73A3AE1, 0x4BA99586, 0xEF5562E9,
			            0xC72FEFD3, 0xF752F7DA, 0x3F046F69, 0x77FA0A59,
			            0x80E4A915, 0x87B08601, 0x9B09E6AD, 0x3B3EE593,
			            0xE990FD5A, 0x9E34D797, 0x2CF0B7D9, 0x022B8B51,
			            0x96D5AC3A, 0x017DA67D, 0xD1CF3ED6, 0x7C7D2D28,
			            0x1F9F25CF, 0xADF2B89B, 0x5AD6B472, 0x5A88F54C,
			            0xE029AC71, 0xE019A5E6, 0x47B0ACFD, 0xED93FA9B,
			            0xE8D3C48D, 0x283B57CC, 0xF8D56629, 0x79132E28,
			            0x785F0191, 0xED756055, 0xF7960E44, 0xE3D35E8C,
			            0x15056DD4, 0x88F46DBA, 0x03A16125, 0x0564F0BD,
			            0xC3EB9E15, 0x3C9057A2, 0x97271AEC, 0xA93A072A,
			            0x1B3F6D9B, 0x1E6321F5, 0xF59C66FB, 0x26DCF319,
			            0x7533D928, 0xB155FDF5, 0x03563482, 0x8ABA3CBB,
			            0x28517711, 0xC20AD9F8, 0xABCC5167, 0xCCAD925F,
			            0x4DE81751, 0x3830DC8E, 0x379D5862, 0x9320F991,
			            0xEA7A90C2, 0xFB3E7BCE, 0x5121CE64, 0x774FBE32,
			            0xA8B6E37E, 0xC3293D46, 0x48DE5369, 0x6413E680,
			            0xA2AE0810, 0xDD6DB224, 0x69852DFD, 0x09072166,
			            0xB39A460A, 0x6445C0DD, 0x586CDECF, 0x1C20C8AE,
			            0x5BBEF7DD, 0x1B588D40, 0xCCD2017F, 0x6BB4E3BB,
			            0xDDA26A7E, 0x3A59FF45, 0x3E350A44, 0xBCB4CDD5,
			            0x72EACEA8, 0xFA6484BB, 0x8D6612AE, 0xBF3C6F47,
			            0xD29BE463, 0x542F5D9E, 0xAEC2771B, 0xF64E6370,
			            0x740E0D8D, 0xE75B1357, 0xF8721671, 0xAF537D5D,
			            0x4040CB08, 0x4EB4E2CC, 0x34D2466A, 0x0115AF84,
			            0xE1B00428, 0x95983A1D, 0x06B89FB4, 0xCE6EA048,
			            0x6F3F3B82, 0x3520AB82, 0x011A1D4B, 0x277227F8,
			            0x611560B1, 0xE7933FDC, 0xBB3A792B, 0x344525BD,
			            0xA08839E1, 0x51CE794B, 0x2F32C9B7, 0xA01FBAC9,
			            0xE01CC87E, 0xBCC7D1F6, 0xCF0111C3, 0xA1E8AAC7,
			            0x1A908749, 0xD44FBD9A, 0xD0DADECB, 0xD50ADA38,
			            0x0339C32A, 0xC6913667, 0x8DF9317C, 0xE0B12B4F,
			            0xF79E59B7, 0x43F5BB3A, 0xF2D519FF, 0x27D9459C,
			            0xBF97222C, 0x15E6FC2A, 0x0F91FC71, 0x9B941525,
			            0xFAE59361, 0xCEB69CEB, 0xC2A86459, 0x12BAA8D1,
			            0xB6C1075E, 0xE3056A0C, 0x10D25065, 0xCB03A442,
			            0xE0EC6E0E, 0x1698DB3B, 0x4C98A0BE, 0x3278E964,
			            0x9F1F9532, 0xE0D392DF, 0xD3A0342B, 0x8971F21E,
			            0x1B0A7441, 0x4BA3348C, 0xC5BE7120, 0xC37632D8,
			            0xDF359F8D, 0x9B992F2E, 0xE60B6F47, 0x0FE3F11D,
			            0xE54CDA54, 0x1EDAD891, 0xCE6279CF, 0xCD3E7E6F,
			            0x1618B166, 0xFD2C1D05, 0x848FD2C5, 0xF6FB2299,
			            0xF523F357, 0xA6327623, 0x93A83531, 0x56CCCD02,
			            0xACF08162, 0x5A75EBB5, 0x6E163697, 0x88D273CC,
			            0xDE966292, 0x81B949D0, 0x4C50901B, 0x71C65614,
			            0xE6C6C7BD, 0x327A140A, 0x45E1D006, 0xC3F27B9A,
			            0xC9AA53FD, 0x62A80F00, 0xBB25BFE2, 0x35BDD2F6,
			            0x71126905, 0xB2040222, 0xB6CBCF7C, 0xCD769C2B,
			            0x53113EC0, 0x1640E3D3, 0x38ABBD60, 0x2547ADF0,
			            0xBA38209C, 0xF746CE76, 0x77AFA1C5, 0x20756060,
			            0x85CBFE4E, 0x8AE88DD8, 0x7AAAF9B0, 0x4CF9AA7E,
			            0x1948C25C, 0x02FB8A8C, 0x01C36AE4, 0xD6EBE1F9,
			            0x90D4F869, 0xA65CDEA0, 0x3F09252D, 0xC208E69F,
			            0xB74E6132, 0xCE77E25B, 0x578FDFE3, 0x3AC372E6  ]
			    ];

			    var BLOWFISH_CTX = {
			        pbox: [],
			        sbox: []
			    };

			    function F(ctx, x){
			        let a = (x >> 24) & 0xFF;
			        let b = (x >> 16) & 0xFF;
			        let c = (x >> 8) & 0xFF;
			        let d = x & 0xFF;

			        let y = ctx.sbox[0][a] + ctx.sbox[1][b];
			        y = y ^ ctx.sbox[2][c];
			        y = y + ctx.sbox[3][d];

			        return y;
			    }

			    function BlowFish_Encrypt(ctx, left, right){
			        let Xl = left;
			        let Xr = right;
			        let temp;

			        for(let i = 0; i < N; ++i){
			            Xl = Xl ^ ctx.pbox[i];
			            Xr = F(ctx, Xl) ^ Xr;

			            temp = Xl;
			            Xl = Xr;
			            Xr = temp;
			        }

			        temp = Xl;
			        Xl = Xr;
			        Xr = temp;

			        Xr = Xr ^ ctx.pbox[N];
			        Xl = Xl ^ ctx.pbox[N + 1];

			        return {left: Xl, right: Xr};
			    }

			    function BlowFish_Decrypt(ctx, left, right){
			        let Xl = left;
			        let Xr = right;
			        let temp;

			        for(let i = N + 1; i > 1; --i){
			            Xl = Xl ^ ctx.pbox[i];
			            Xr = F(ctx, Xl) ^ Xr;

			            temp = Xl;
			            Xl = Xr;
			            Xr = temp;
			        }

			        temp = Xl;
			        Xl = Xr;
			        Xr = temp;

			        Xr = Xr ^ ctx.pbox[1];
			        Xl = Xl ^ ctx.pbox[0];

			        return {left: Xl, right: Xr};
			    }

			    /**
			     * Initialization ctx's pbox and sbox.
			     *
			     * @param {Object} ctx The object has pbox and sbox.
			     * @param {Array} key An array of 32-bit words.
			     * @param {int} keysize The length of the key.
			     *
			     * @example
			     *
			     *     BlowFishInit(BLOWFISH_CTX, key, 128/32);
			     */
			    function BlowFishInit(ctx, key, keysize)
			    {
			        for(let Row = 0; Row < 4; Row++)
			        {
			            ctx.sbox[Row] = [];
			            for(let Col = 0; Col < 256; Col++)
			            {
			                ctx.sbox[Row][Col] = ORIG_S[Row][Col];
			            }
			        }

			        let keyIndex = 0;
			        for(let index = 0; index < N + 2; index++)
			        {
			            ctx.pbox[index] = ORIG_P[index] ^ key[keyIndex];
			            keyIndex++;
			            if(keyIndex >= keysize)
			            {
			                keyIndex = 0;
			            }
			        }

			        let Data1 = 0;
			        let Data2 = 0;
			        let res = 0;
			        for(let i = 0; i < N + 2; i += 2)
			        {
			            res = BlowFish_Encrypt(ctx, Data1, Data2);
			            Data1 = res.left;
			            Data2 = res.right;
			            ctx.pbox[i] = Data1;
			            ctx.pbox[i + 1] = Data2;
			        }

			        for(let i = 0; i < 4; i++)
			        {
			            for(let j = 0; j < 256; j += 2)
			            {
			                res = BlowFish_Encrypt(ctx, Data1, Data2);
			                Data1 = res.left;
			                Data2 = res.right;
			                ctx.sbox[i][j] = Data1;
			                ctx.sbox[i][j + 1] = Data2;
			            }
			        }

			        return true;
			    }

			    /**
			     * Blowfish block cipher algorithm.
			     */
			    var Blowfish = C_algo.Blowfish = BlockCipher.extend({
			        _doReset: function () {
			            // Skip reset of nRounds has been set before and key did not change
			            if (this._keyPriorReset === this._key) {
			                return;
			            }

			            // Shortcuts
			            var key = this._keyPriorReset = this._key;
			            var keyWords = key.words;
			            var keySize = key.sigBytes / 4;

			            //Initialization pbox and sbox
			            BlowFishInit(BLOWFISH_CTX, keyWords, keySize);
			        },

			        encryptBlock: function (M, offset) {
			            var res = BlowFish_Encrypt(BLOWFISH_CTX, M[offset], M[offset + 1]);
			            M[offset] = res.left;
			            M[offset + 1] = res.right;
			        },

			        decryptBlock: function (M, offset) {
			            var res = BlowFish_Decrypt(BLOWFISH_CTX, M[offset], M[offset + 1]);
			            M[offset] = res.left;
			            M[offset + 1] = res.right;
			        },

			        blockSize: 64/32,

			        keySize: 128/32,

			        ivSize: 64/32
			    });

			    /**
			     * Shortcut functions to the cipher's object interface.
			     *
			     * @example
			     *
			     *     var ciphertext = CryptoJS.Blowfish.encrypt(message, key, cfg);
			     *     var plaintext  = CryptoJS.Blowfish.decrypt(ciphertext, key, cfg);
			     */
			    C.Blowfish = BlockCipher._createHelper(Blowfish);
			}());


			return CryptoJS.Blowfish;

		})); 
	} (blowfish));
	return blowfish.exports;
}

(function (module, exports$1) {
(function (root, factory, undef) {
		{
			// CommonJS
			module.exports = factory(requireCore(), requireX64Core(), requireLibTypedarrays(), requireEncUtf16(), requireEncBase64(), requireEncBase64url(), requireMd5(), requireSha1(), requireSha256(), requireSha224(), requireSha512(), requireSha384(), requireSha3(), requireRipemd160(), requireHmac(), requirePbkdf2(), requireEvpkdf(), requireCipherCore(), requireModeCfb(), requireModeCtr(), requireModeCtrGladman(), requireModeOfb(), requireModeEcb(), requirePadAnsix923(), requirePadIso10126(), requirePadIso97971(), requirePadZeropadding(), requirePadNopadding(), requireFormatHex(), requireAes(), requireTripledes(), requireRc4(), requireRabbit(), requireRabbitLegacy(), requireBlowfish());
		}
	}(commonjsGlobal, function (CryptoJS) {

		return CryptoJS;

	})); 
} (cryptoJs));

var cryptoJsExports = cryptoJs.exports;
var CryptoJS = /*@__PURE__*/getDefaultExportFromCjs(cryptoJsExports);

const generatePeerRoomId = (organizationId, userOneId, userTwoId, applicationId) => {
    const [userIdA, userIdB] = [userOneId, userTwoId].sort();
    const concatenatedString = `${organizationId}-${userIdA}-${userIdB}-${applicationId}`;
    const roomId = CryptoJS.SHA256(concatenatedString).toString();
    return roomId;
};
const RECEIVER_TYPE = {
    USER: "user",
    PEER: "user",
    GROUP: "group"
};
const GROUP_TYPE = {
    PUBLIC: "public",
    PRIVATE: "private",
    PASSWORD: "password"
};
const GROUP_MEMBER_SCOPE = {
    ADMIN: "Admin",
    MODERATOR: "Moderator",
    PARTICIPANT: "Participant",
    OWNER: "Owner"
};

var ActionTypes;
(function (ActionTypes) {
    ActionTypes["GENERATE_TOKEN"] = "generate_token";
    ActionTypes["VALIDATE_APPLICATION_USER"] = "validate_application_user";
    ActionTypes["RENEW_SESSION"] = "renew_session";
    ActionTypes["GET_ROOMS_BY_USER_ID"] = "get_rooms_by_user_id";
    ActionTypes["CREATE_GROUP_CHAT"] = "create_group_chat";
    ActionTypes["ADD_PARTICIPANT"] = "add_participant";
})(ActionTypes || (ActionTypes = {}));

class GenerateTokenRequest {
    constructor(appId, secretKey) {
        this.request_id = 'notegtest1';
        this.timestamp = new Date().toISOString();
        this.action = ActionTypes.GENERATE_TOKEN;
        this.data = {
            app_id: appId,
            secret_key: secretKey,
        };
    }
}

class ValidateApplicationUserRequest {
    constructor(organizationId, appId, userId) {
        this.request_id = `validate_user_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = ActionTypes.VALIDATE_APPLICATION_USER;
        this.data = {
            organization_id: organizationId,
            app_id: appId,
            user_id: userId
        };
    }
}

class RenewTokenRequest {
    constructor(renewToken) {
        this.request_id = "notegtest1";
        this.timestamp = new Date().toISOString();
        this.action = ActionTypes.RENEW_SESSION;
        this.data = {
            renew_token: renewToken
        };
    }
}

class GetRoomsByUserIdRequest {
    constructor(userId, organizationId, applicationId) {
        this.request_id = `get_rooms_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = ActionTypes.GET_ROOMS_BY_USER_ID;
        this.data = {
            user_id: userId,
            organization_id: organizationId,
            application_id: applicationId
        };
    }
}

class CreateGroupRequest {
    constructor(group, adminId, adminName, organizationId, applicationId) {
        this.request_id = `create_group_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = ActionTypes.CREATE_GROUP_CHAT;
        this.group_name = group.getName();
        this.application_id = applicationId;
        const isProtected = group.getType() === "password";
        const groupPassword = group.getPassword();
        this.data = {
            admin_id: adminId,
            user_id: organizationId,
            room_type: group.getType(),
            participants: [
                {
                    user_id: adminId,
                    user_name: adminName
                }
            ],
            is_protected: isProtected
        };
        if (isProtected) {
            if (groupPassword) {
                this.data.password = groupPassword;
                console.log("🔐 [CreateGroupRequest] Password included in request for protected group");
            }
            else {
                console.warn("⚠️ [CreateGroupRequest] Protected group but no password provided!");
            }
        }
    }
}

class CreateGroupWithMembersRequest {
    constructor(group, adminId, adminName, organizationId, applicationId, members) {
        this.request_id = `create_group_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = ActionTypes.CREATE_GROUP_CHAT;
        this.group_name = group.getName();
        this.application_id = applicationId;
        const participants = [
            {
                user_id: adminId,
                user_name: adminName
            },
            ...members.map(member => ({
                user_id: member.getUid(),
                user_name: member.getName() || ""
            }))
        ];
        const isProtected = group.getType() === "password";
        const groupPassword = group.getPassword();
        this.data = {
            admin_id: adminId,
            user_id: organizationId,
            room_type: group.getType(),
            participants: participants,
            is_protected: isProtected
        };
        if (isProtected) {
            if (groupPassword) {
                this.data.password = groupPassword;
                console.log("🔐 [CreateGroupWithMembersRequest] Password included in request for protected group");
            }
            else {
                console.warn("⚠️ [CreateGroupWithMembersRequest] Protected group but no password provided!");
            }
        }
    }
}

class AddMembersRequest {
    constructor(roomId, organizationId, members, defaultRole, groupName = "") {
        this.request_id = `add_members_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = 'add_participant'; // Match backend API action
        this.data = {
            room_id: roomId,
            organization_id: organizationId,
            group_name: groupName,
            participants: members.map(member => ({
                user_id: member.getUid(),
                user_name: member.getName() || ""
            })),
            user_role: defaultRole
        };
    }
}

class GetParticipantsRequest {
    constructor(roomId, organizationId) {
        this.request_id = `get_participants_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = 'get_participants';
        this.data = {
            room_id: roomId,
            organization_id: organizationId
        };
    }
}

/**
 * TextMessageGroup - A dedicated message class for group chat messages.
 * Separate from TextMessage (peer) to handle group-specific fields like mentions, fileInfo, messageType etc.
 */
class GroupUser {
    constructor(uid, name) {
        this.uid = uid;
        this.name = name;
    }
    getUid() { return this.uid; }
    getName() { return this.name; }
    getAvatar() { return this.avatar; }
    getStatus() { return this.status; }
    getMetadata() { return this.metadata; }
    setAvatar(avatar) { this.avatar = avatar; }
    setStatus(status) { this.status = status; }
    setMetadata(metadata) { this.metadata = metadata; }
}
class TextMessageGroup {
    constructor(roomId, text) {
        this.id = "";
        this.senderId = "";
        this.senderName = "";
        this.sentAt = "";
        this.status = "";
        this.messageType = "text"; // text | file | image | video | audio
        this.mentions = [];
        this.replyToMessageId = "";
        this.replyToUserId = "";
        this.replyToText = "";
        this.replyType = ""; // "thread" | "quote" | "reply"
        this.fileId = "";
        this.fileInfo = null;
        this.editedAt = "";
        this.editedBy = "";
        this.deletedAt = "";
        this.deletedBy = "";
        this.sender = null;
        this.roomId = roomId;
        this.text = text;
    }
    // ─── Getters ───────────────────────────────────────────────
    getId() { return this.id; }
    getRoomId() { return this.roomId; }
    getText() { return this.text; }
    getSenderId() { return this.senderId; }
    getSenderName() { return this.senderName; }
    getSentAt() { return this.sentAt; }
    getStatus() { return this.status; }
    getMessageType() { return this.messageType; }
    getMentions() { return this.mentions; }
    getReplyToMessageId() { return this.replyToMessageId; }
    getReplyToUserId() { return this.replyToUserId; }
    getReplyToText() { return this.replyToText; }
    getReplyType() { return this.replyType; }
    getFileId() { return this.fileId; }
    getFileInfo() { return this.fileInfo; }
    getEditedAt() { return this.editedAt; }
    getEditedBy() { return this.editedBy; }
    getDeletedAt() { return this.deletedAt; }
    getDeletedBy() { return this.deletedBy; }
    getSender() { return this.sender; }
    // ─── Public setters (for the SDK consumer) ─────────────────
    setText(text) { this.text = text; }
    setMentions(mentions) { this.mentions = mentions; }
    setReplyToMessageId(replyToMessageId) { this.replyToMessageId = replyToMessageId; }
    setReplyToUserId(replyToUserId) { this.replyToUserId = replyToUserId; }
    setReplyToText(replyToText) { this.replyToText = replyToText; }
    setReplyType(replyType) { this.replyType = replyType; }
    setFileId(fileId) { this.fileId = fileId; }
    // ─── Internal setters (prefixed with _) ────────────────────
    _setId(id) { this.id = id; }
    _setRoomId(roomId) { this.roomId = roomId; }
    _setSenderId(senderId) { this.senderId = senderId; }
    _setSenderName(senderName) { this.senderName = senderName; }
    _setSentAt(sentAt) { this.sentAt = sentAt; }
    _setStatus(status) { this.status = status; }
    _setMessageType(messageType) { this.messageType = messageType; }
    _setMentions(mentions) { this.mentions = mentions; }
    _setReplyToMessageId(replyToMessageId) { this.replyToMessageId = replyToMessageId; }
    _setReplyToUserId(replyToUserId) { this.replyToUserId = replyToUserId; }
    _setReplyToText(replyToText) { this.replyToText = replyToText; }
    _setReplyType(replyType) { this.replyType = replyType; }
    _setFileId(fileId) { this.fileId = fileId; }
    _setFileInfo(fileInfo) { this.fileInfo = fileInfo; }
    _setEditedAt(editedAt) { this.editedAt = editedAt; }
    _setEditedBy(editedBy) { this.editedBy = editedBy; }
    _setDeletedAt(deletedAt) { this.deletedAt = deletedAt; }
    _setDeletedBy(deletedBy) { this.deletedBy = deletedBy; }
    _setSender(sender) {
        this.sender = sender;
        this.senderId = sender.uid;
        this.senderName = sender.name;
    }
}

/**
 * Error Handler for PeerChat SDK
 * Handles SDK initialization errors and socket error handling
 */
class PeerChatErrorHandler {
    /**
     * Common SDK initialization validation
     * Returns error message if validation fails, null if valid
     */
    static validateSDKInitialization(params) {
        if (!params.socket) {
            return `[PeerChat] Socket not initialized. Call init() first.`;
        }
        if (!params.userId || !params.userId.trim()) {
            return `[PeerChat] User not logged in. Call login() first.`;
        }
        if (!params.organizationId || !params.organizationId.trim()) {
            return `[PeerChat] SDK not initialized. Call init() first.`;
        }
        if (!params.applicationId || !params.applicationId.trim()) {
            return `[PeerChat] SDK not initialized. Call init() first.`;
        }
        return null;
    }
    /**
     * Handle socket connection errors
     */
    static handleSocketConnectionError(error, context) {
        console.error(`❌ [PeerChat] Socket connection error in ${context}:`, error);
    }
    /**
     * Handle socket emit errors
     */
    static handleSocketEmitError(event, error, context) {
        console.error(`❌ [PeerChat] Socket emit error in ${context} for event "${event}":`, error);
    }
    /**
     * Handle SDK initialization errors
     */
    static handleSDKInitializationError(error, context) {
        const errorMessage = `[PeerChat] ${context}: ${error}`;
        console.error(`❌ ${errorMessage}`);
        return new Error(errorMessage);
    }
    /**
     * Handle socket initialization errors
     */
    static handleSocketError(error, context) {
        const errorMessage = `[PeerChat] Socket Error in ${context}: ${error}`;
        console.error(`❌ ${errorMessage}`);
        return new Error(errorMessage);
    }
    /**
     * Handle socket error events from backend
     */
    static handleSocketErrorEvent(error, context) {
        console.error(`❌ [PeerChat] ${context} Error:`, error);
        if (error.roomId) {
            console.error(`   Room ID: ${error.roomId}`);
        }
        if (error.messageId) {
            console.error(`   Message ID: ${error.messageId}`);
        }
        console.error(`   Error: ${error.error}`);
    }
    /**
     * Validate required fields for operations
     */
    static validateRequiredFields(fields, requiredFields, context) {
        const missingFields = [];
        for (const field of requiredFields) {
            if (!fields[field] || (typeof fields[field] === 'string' && !fields[field].trim())) {
                missingFields.push(field);
            }
        }
        if (missingFields.length > 0) {
            const errorMessage = `Missing required fields in ${context}: ${missingFields.join(', ')}`;
            console.error(`❌ [PeerChat] ${errorMessage}`);
            return new Error(errorMessage);
        }
        return null;
    }
    /**
     * Handle room join errors
     */
    static handleRoomJoinError(error, roomId) {
        const errorMessage = roomId
            ? `[PeerChat] Failed to join room ${roomId}: ${error}`
            : `[PeerChat] Failed to join room: ${error}`;
        console.error(`❌ ${errorMessage}`);
        return new Error(errorMessage);
    }
    /**
     * Handle message send errors
     */
    static handleMessageSendError(error, roomId) {
        const errorMessage = roomId
            ? `[PeerChat] Failed to send message in room ${roomId}: ${error}`
            : `[PeerChat] Failed to send message: ${error}`;
        console.error(`❌ ${errorMessage}`);
        return new Error(errorMessage);
    }
    /**
     * Handle message receive errors
     */
    static handleMessageReceiveError(error, roomId) {
        const errorMessage = roomId
            ? `[PeerChat] Error receiving message in room ${roomId}: ${error}`
            : `[PeerChat] Error receiving message: ${error}`;
        console.error(`❌ ${errorMessage}`);
    }
    /**
     * Handle message edit errors
     */
    static handleMessageEditError(error, context = "editMessage") {
        this.handleSocketErrorEvent(error, context);
    }
    /**
     * Handle API error responses with status codes
     * Returns structured result for handling different error scenarios
     */
    static handleApiErrorResponse(response, context = "API Request", defaultPage = 1) {
        const statusCode = response.status;
        const errorMessage = response.message || "Failed to process request";
        response.error_code || "UNKNOWN_ERROR";
        if (statusCode === 404) {
            // No data found - return empty result (not an error)
            console.log(`📭 [PeerChat] ${context}: No data found (404)`);
            return {
                isError: false,
                isEmptyResult: true,
                emptyResult: {
                    messages: [],
                    currentPage: defaultPage,
                    totalPages: 0,
                    totalChats: 0
                }
            };
        }
        else if (statusCode === 409) {
            // Action mismatch
            const error = new Error(`Action mismatch: ${errorMessage}`);
            console.error(`❌ [PeerChat] ${context}: ${error.message}`);
            return {
                isError: true,
                error
            };
        }
        else if (statusCode === 500) {
            // Server error
            const error = new Error(`Server error: ${errorMessage}`);
            console.error(`❌ [PeerChat] ${context}: ${error.message}`);
            return {
                isError: true,
                error
            };
        }
        else {
            // Other errors
            const error = new Error(`Failed to process request (${statusCode}): ${errorMessage}`);
            console.error(`❌ [PeerChat] ${context}: ${error.message}`);
            return {
                isError: true,
                error
            };
        }
    }
    /**
     * Handle axios error responses
     * Handles network errors, API errors, and other axios-specific errors
     */
    static handleAxiosError(error, context = "API Request", defaultPage = 1) {
        if (error.response) {
            // API responded with error status
            const statusCode = error.response.status;
            const errorData = error.response.data || {};
            const errorMessage = errorData.message || error.message || "Failed to process request";
            errorData.error_code || "API_ERROR";
            if (statusCode === 404) {
                // No data found - return empty result
                console.log(`📭 [PeerChat] ${context}: No data found (404)`);
                return {
                    isError: false,
                    isEmptyResult: true,
                    emptyResult: {
                        messages: [],
                        currentPage: defaultPage,
                        totalPages: 0,
                        totalChats: 0
                    }
                };
            }
            else if (statusCode === 409) {
                const apiError = new Error(`Action mismatch: ${errorMessage}`);
                console.error(`❌ [PeerChat] ${context}: ${apiError.message}`);
                return {
                    isError: true,
                    error: apiError
                };
            }
            else if (statusCode === 500) {
                const apiError = new Error(`Server error: ${errorMessage}`);
                console.error(`❌ [PeerChat] ${context}: ${apiError.message}`);
                return {
                    isError: true,
                    error: apiError
                };
            }
            else {
                const apiError = new Error(`API error (${statusCode}): ${errorMessage}`);
                console.error(`❌ [PeerChat] ${context}: ${apiError.message}`);
                return {
                    isError: true,
                    error: apiError
                };
            }
        }
        else if (error.request) {
            // Network error - request was made but no response received
            const networkError = new Error(`Network error: Unable to connect to server. Please check your connection.`);
            console.error(`❌ [PeerChat] ${context}: ${networkError.message}`);
            return {
                isError: true,
                error: networkError
            };
        }
        else {
            // Other errors
            const otherError = new Error(`Failed to process request: ${error.message || "Unknown error"}`);
            console.error(`❌ [PeerChat] ${context}: ${otherError.message}`);
            return {
                isError: true,
                error: otherError
            };
        }
    }
}

// Message types enum for group media
const GROUP_MESSAGE_TYPE = {
    TEXT: "text",
    FILE: "file",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio"
};
/**
 * MediaMessageGroup - A dedicated media message class for group chat.
 * Handles media messages (files, images, videos, audio) in group conversations.
 */
class MediaMessageGroup {
    constructor(receiverId, file, messageType, receiverType) {
        this.id = "";
        this.senderId = "";
        this.senderName = "";
        this.sentAt = "";
        this.status = "";
        this.text = "";
        this.fileId = "";
        this.fileInfo = null;
        this.mentions = [];
        this.replyToMessageId = "";
        this.replyToUserId = "";
        this.replyToText = "";
        this.replyType = "";
        this.sender = null;
        this.attachmentUrl = null;
        this.data = {};
        this.receiverId = receiverId;
        this.file = file;
        this.messageType = messageType;
        this.receiverType = receiverType;
    }
    // ─── Getters ───────────────────────────────────────────────
    getReceiverId() { return this.receiverId; }
    getRoomId() { return this.receiverId; }
    getFile() { return this.file; }
    getMessageType() { return this.messageType; }
    getReceiverType() { return this.receiverType; }
    getId() { return this.id; }
    getSenderId() { return this.senderId; }
    getSenderName() { return this.senderName; }
    getSentAt() { return this.sentAt; }
    getStatus() { return this.status; }
    getText() { return this.text; }
    getFileId() { return this.fileId; }
    getFileInfo() { return this.fileInfo; }
    getMentions() { return this.mentions; }
    getReplyToMessageId() { return this.replyToMessageId; }
    getReplyToUserId() { return this.replyToUserId; }
    getReplyToText() { return this.replyToText; }
    getReplyType() { return this.replyType; }
    getSender() { return this.sender; }
    getUrl() { return this.attachmentUrl; }
    // ─── Public setters (for the SDK consumer) ─────────────────
    setText(text) { this.text = text; }
    setMentions(mentions) { this.mentions = mentions; }
    setReplyToMessageId(id) { this.replyToMessageId = id; }
    setReplyToUserId(id) { this.replyToUserId = id; }
    setReplyToText(text) { this.replyToText = text; }
    setReplyType(type) { this.replyType = type; }
    // ─── Internal setters (prefixed with _) ────────────────────
    _setId(id) { this.id = id; }
    _setSenderId(senderId) { this.senderId = senderId; }
    _setSenderName(senderName) { this.senderName = senderName; }
    _setSentAt(sentAt) { this.sentAt = sentAt; }
    _setStatus(status) { this.status = status; }
    _setText(text) { this.text = text; }
    _setMessageType(messageType) { this.messageType = messageType; }
    _setFileId(fileId) { this.fileId = fileId; }
    _setFileInfo(fileInfo) {
        this.fileInfo = fileInfo;
        if (fileInfo) {
            let absoluteUrl = fileInfo.downloadUrl || fileInfo.download_url || '';
            const fileId = fileInfo.fileId || fileInfo.file_id || '';
            if (!absoluteUrl && fileId) {
                absoluteUrl = `${apiUrl}/chat/download/${fileId}`;
            }
            if (absoluteUrl && !absoluteUrl.startsWith('http') && !absoluteUrl.startsWith('blob:')) {
                const cleanPath = absoluteUrl.startsWith('/') ? absoluteUrl.substring(1) : absoluteUrl;
                absoluteUrl = `${apiUrl}/${cleanPath}`;
            }
            if (absoluteUrl) {
                this.fileInfo = { ...fileInfo, downloadUrl: absoluteUrl };
                this.fileInfo.attachmentUrl = absoluteUrl;
                this.attachmentUrl = absoluteUrl;
                this.data = {
                    attachments: [{
                            url: absoluteUrl,
                            mimeType: fileInfo.mimeType || '',
                            name: fileInfo.originalName || '',
                            size: fileInfo.size || 0
                        }],
                    url: absoluteUrl
                };
            }
        }
    }
    _setMentions(mentions) { this.mentions = mentions; }
    _setReplyToMessageId(id) { this.replyToMessageId = id; }
    _setReplyToUserId(id) { this.replyToUserId = id; }
    _setReplyToText(text) { this.replyToText = text; }
    _setReplyType(type) { this.replyType = type; }
    _setSender(sender) {
        this.sender = sender;
        this.senderId = sender.uid;
        this.senderName = sender.name;
    }
    _setAttachmentUrl(url) { this.attachmentUrl = url; }
    async _setFileInfoAndLoadUrl(fileInfo) {
        this.fileInfo = fileInfo;
        this.fileId = fileInfo.fileId;
        if ((this.messageType === 'image') && fileInfo.fileId) {
            try {
                const blob = await GroupMediaService.downloadFile(fileInfo.fileId);
                if (blob) {
                    this.attachmentUrl = window.URL.createObjectURL(blob);
                    this.fileInfo.attachmentUrl = this.attachmentUrl;
                    this.data = {
                        attachments: [{
                                url: this.attachmentUrl,
                                mimeType: fileInfo.mimeType,
                                name: fileInfo.originalName,
                                size: fileInfo.size
                            }],
                        url: this.attachmentUrl
                    };
                }
            }
            catch (error) {
                console.error('❌ [MediaMessageGroup] Failed to auto-load image URL:', error);
            }
        }
        else if (fileInfo.fileId) {
            this.data = {
                attachments: [{
                        url: '',
                        mimeType: fileInfo.mimeType,
                        name: fileInfo.originalName,
                        size: fileInfo.size
                    }]
            };
        }
    }
}
/**
 * GroupMediaService - Handles file upload / download / info for group chat.
 * Uses uploadSource = 'group_chat' to distinguish from peer uploads.
 */
class GroupMediaService {
    static setOrganizationId(orgId) {
        this.organizationId = orgId;
    }
    static setApplicationId(appId) {
        this.applicationId = appId;
    }
    /**
     * Upload a file for a group chat message.
     */
    static async uploadFile(file, roomId, userId, userName, messageId, uploadSource = 'group_chat') {
        try {
            if (!this.organizationId || !this.organizationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("SDK not initialized. Call init() first.", "uploadFile");
            }
            if (!this.applicationId || !this.applicationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("SDK not initialized. Call init() first.", "uploadFile");
            }
            if (!file) {
                throw new Error("File is required to upload");
            }
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error("Room ID is required and must be a non-empty string");
            }
            if (!userId || typeof userId !== 'string' || !userId.trim()) {
                throw new Error("User ID is required and must be a non-empty string");
            }
            if (!userName || typeof userName !== 'string' || !userName.trim()) {
                throw new Error("User name is required and must be a non-empty string");
            }
            if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
                throw new Error("Message ID is required for file upload (backend requirement)");
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('organizationId', this.organizationId.trim());
            formData.append('applicationId', this.applicationId.trim());
            formData.append('userId', userId.trim());
            formData.append('userName', userName.trim());
            formData.append('roomId', roomId.trim());
            formData.append('messageId', messageId.trim());
            formData.append('uploadSource', uploadSource.trim());
            console.log('📤 [GroupMediaService] Uploading file:', file.name, 'to room:', roomId);
            const response = await axios.post(`${apiUrl}/chat/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true
            });
            if (!response || !response.data) {
                throw new Error("Invalid response from server: missing data");
            }
            if (response.data.status === 200 && response.data.data) {
                const fileData = response.data.data;
                if (!fileData.fileId || !fileData.originalName || !fileData.size || !fileData.mimeType || !fileData.downloadUrl) {
                    throw new Error("Invalid response from server: missing file data fields");
                }
                console.log('✅ [GroupMediaService] File uploaded successfully:', fileData.fileId);
                return {
                    fileId: fileData.fileId,
                    originalName: fileData.originalName,
                    size: fileData.size,
                    mimeType: fileData.mimeType,
                    downloadUrl: fileData.downloadUrl
                };
            }
            else {
                throw new Error(response.data.message || "File upload failed");
            }
        }
        catch (error) {
            if (error.response) {
                const statusCode = error.response.status;
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || error.message || "File upload failed";
                if (statusCode === 400) {
                    throw new Error(`Bad request: ${errorMessage}`);
                }
                else if (statusCode === 413) {
                    throw new Error(`File too large: ${errorMessage}`);
                }
                else if (statusCode === 500) {
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`File upload failed (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Download a file by fileId. Returns a Blob.
     */
    static async downloadFile(fileId) {
        try {
            if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
                throw new Error("File ID is required and must be a non-empty string");
            }
            console.log('📥 [GroupMediaService] Downloading file:', fileId);
            const response = await axios.get(`${apiUrl}/chat/download/${fileId.trim()}`, {
                responseType: 'blob',
                withCredentials: true
            });
            if (response.status === 200 && response.data instanceof Blob) {
                console.log('✅ [GroupMediaService] File downloaded successfully');
                return response.data;
            }
            else {
                throw new Error("Invalid response from server: expected Blob");
            }
        }
        catch (error) {
            if (error.response) {
                const statusCode = error.response.status;
                let errorMessage = error.message || "File download failed";
                if (error.response.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text();
                        const parsed = JSON.parse(text);
                        errorMessage = parsed.message || errorMessage;
                    }
                    catch { /* ignore */ }
                }
                if (statusCode === 404) {
                    throw new Error(`File not found: ${errorMessage}`);
                }
                else {
                    throw new Error(`File download failed (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Get file metadata by fileId.
     */
    static async getFileInfo(fileId) {
        try {
            if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
                throw new Error("File ID is required and must be a non-empty string");
            }
            console.log('📋 [GroupMediaService] Getting file info:', fileId);
            const response = await axios.get(`${apiUrl}/chat/file-info/${fileId.trim()}`, { withCredentials: true });
            if (!response || !response.data) {
                throw new Error("Invalid response from server: missing data");
            }
            if (response.data.status === 200 && response.data.data) {
                const fileData = response.data.data;
                if (!fileData.fileId || !fileData.originalName || !fileData.size || !fileData.mimeType || !fileData.downloadUrl) {
                    throw new Error("Invalid response from server: missing file data fields");
                }
                console.log('✅ [GroupMediaService] File info retrieved successfully');
                return {
                    fileId: fileData.fileId,
                    originalName: fileData.originalName,
                    size: fileData.size,
                    mimeType: fileData.mimeType,
                    uploadedBy: fileData.uploadedBy,
                    uploadedAt: fileData.uploadedAt,
                    downloadUrl: fileData.downloadUrl
                };
            }
            else {
                throw new Error(response.data.message || "Failed to get file info");
            }
        }
        catch (error) {
            if (error.response) {
                const statusCode = error.response.status;
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || error.message || "Failed to get file info";
                if (statusCode === 404) {
                    throw new Error(`File not found: ${errorMessage}`);
                }
                else {
                    throw new Error(`Failed to get file info (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            else {
                throw error;
            }
        }
    }
}
GroupMediaService.organizationId = "";
GroupMediaService.applicationId = "";

class Group {
    constructor(name, groupType, password, icon, description, guid) {
        if (guid && !/^[a-zA-Z0-9_-]+$/.test(guid)) {
            throw new Error("Invalid GUID: Only alphanumeric, underscore, hyphen allowed");
        }
        const validTypes = Object.values(GROUP_TYPE);
        if (!validTypes.includes(groupType)) {
            throw new Error(`Invalid group type: Must be one of ${validTypes.join(", ")}`);
        }
        if (groupType === GROUP_TYPE.PASSWORD && !password) {
            throw new Error("Password is required for password-protected groups");
        }
        this.guid = guid || "";
        this.name = name;
        this.groupType = groupType;
        this.password = password;
        this.icon = icon;
        this.description = description;
    }
    getGuid() { return this.guid; }
    getName() { return this.name; }
    getType() { return this.groupType; }
    getPassword() { return this.password; }
    getIcon() { return this.icon; }
    getDescription() { return this.description; }
    getOwner() { return this.owner; }
    getCreatedAt() { return this.createdAt; }
    getMembersCount() { return this.membersCount; }
    getHasJoined() { return this.hasJoined; }
    _setGuid(guid) { this.guid = guid; }
    _setOwner(owner) { this.owner = owner; }
    _setCreatedAt(timestamp) { this.createdAt = timestamp; }
    _setMembersCount(count) { this.membersCount = count; }
    _setHasJoined(hasJoined) { this.hasJoined = hasJoined; }
}

class GroupMember {
    constructor(uid, scope, name) {
        const validScopes = Object.values(GROUP_MEMBER_SCOPE);
        if (!validScopes.includes(scope)) {
            throw new Error(`Invalid scope: Must be one of ${validScopes.join(", ")}`);
        }
        this.uid = uid;
        this.scope = scope;
        this.name = name;
    }
    getUid() { return this.uid; }
    getName() { return this.name; }
    getScope() { return this.scope; }
    setName(name) { this.name = name; }
}

class GroupMessagesRequestBuilder {
    constructor() {
        this.guid = "";
        this.limit = 30;
        this.page = 1;
        this.includeDeleted = false;
        this.userGroupStatus = "Active";
        this.userGroupUpdatedAt = "";
        this.password = "";
    }
    setGUID(guid) {
        if (!guid || typeof guid !== 'string' || !guid.trim()) {
            throw new Error("GUID is required and must be a non-empty string");
        }
        this.guid = guid.trim();
        return this;
    }
    setLimit(limit) {
        if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
            throw new Error("Limit must be a positive number");
        }
        this.limit = Math.min(100, Math.max(1, Math.floor(limit)));
        return this;
    }
    setPage(page) {
        if (typeof page !== 'number' || isNaN(page) || page < 1) {
            throw new Error("Page must be a positive number");
        }
        this.page = Math.max(1, Math.floor(page));
        return this;
    }
    setIncludeDeleted(include) {
        if (typeof include !== 'boolean') {
            throw new Error("includeDeleted must be a boolean");
        }
        this.includeDeleted = include;
        return this;
    }
    setUserGroupStatus(status) {
        if (!status || typeof status !== 'string' || !status.trim()) {
            throw new Error("User group status must be a non-empty string");
        }
        this.userGroupStatus = status.trim();
        return this;
    }
    setUserGroupUpdatedAt(timestamp) {
        if (!timestamp || typeof timestamp !== 'string' || !timestamp.trim()) {
            throw new Error("Timestamp must be a non-empty string");
        }
        this.userGroupUpdatedAt = timestamp.trim();
        return this;
    }
    setPassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error("Password must be a non-empty string");
        }
        this.password = password;
        return this;
    }
    build() {
        if (!this.guid || !this.guid.trim()) {
            throw new Error("GUID is required. Call setGUID() before build().");
        }
        return new GroupMessagesRequest(this.guid, this.limit, this.page, this.includeDeleted, this.userGroupStatus, this.userGroupUpdatedAt, this.password, null);
    }
}
class GroupMessagesRequest {
    constructor(guid, limit, page, includeDeleted, userGroupStatus, userGroupUpdatedAt, password, fetchFunction) {
        this.hasMore = true;
        this.guid = guid;
        this.limit = limit;
        this.currentPage = page;
        this.includeDeleted = includeDeleted;
        this.userGroupStatus = userGroupStatus;
        this.userGroupUpdatedAt = userGroupUpdatedAt;
        this.password = password;
        this.fetchFunction = fetchFunction;
    }
    async fetchPrevious() {
        if (!this.hasMore) {
            console.log('📭 [GroupMessagesRequest] No more messages to fetch');
            return [];
        }
        try {
            // Use the injected fetch function or get it dynamically
            const GroupChat = this.fetchFunction || (await Promise.resolve().then(function () { return GroupChat$1; })).default;
            const result = await GroupChat.fetchPreviousMessages(this.guid, {
                limit: this.limit,
                page: this.currentPage,
                includeDeleted: this.includeDeleted,
                userGroupStatus: this.userGroupStatus,
                userGroupUpdatedAt: this.userGroupUpdatedAt,
                password: this.password
            });
            if (!result.messages || result.messages.length === 0) {
                this.hasMore = false;
                return [];
            }
            if (this.currentPage >= result.totalPages) {
                this.hasMore = false;
            }
            else {
                this.currentPage++;
            }
            return result.messages;
        }
        catch (error) {
            console.error('❌ [GroupMessagesRequest] fetchPrevious failed:', error);
            // Soft errors (404, 403, no data) — return empty, don't crash
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
            if (errorMessage.includes('not found') ||
                errorMessage.includes('access denied') ||
                errorMessage.includes('no data found') ||
                errorMessage.includes('password required') ||
                errorMessage.includes('invalid password')) {
                console.log('📭 [GroupMessagesRequest] Group has no messages or access denied, returning empty array');
                this.hasMore = false;
                return [];
            }
            throw error;
        }
    }
    hasMoreMessages() {
        return this.hasMore;
    }
    reset() {
        this.currentPage = 1;
        this.hasMore = true;
    }
}

class GroupChat {
    static setOrganizationId(orgId) {
        this.organizationId = orgId;
        GroupMediaService.setOrganizationId(orgId);
    }
    static setApplicationId(appId) {
        this.applicationId = appId;
        GroupMediaService.setApplicationId(appId);
    }
    static setUserId(userId) {
        this.userId = userId;
    }
    static setUserName(userName) {
        this.userName = userName;
    }
    static setSocket(socket) {
        this.socket = socket;
        console.log('🔌 [GroupChat] Socket attached');
        socket.on('connect', () => {
            if (this.currentRoomId) {
                console.log('🔄 [GroupChat] Socket reconnected, re-joining room:', this.currentRoomId);
                socket.emit('joinGroup', { roomId: this.currentRoomId, userId: this.userId, userName: this.userName });
            }
        });
        // Register the receiveGroupMessage handler (room-based broadcast)
        this.receiveGroupMessage();
        socket.on("GroupMessageReactionUpdated", (payload) => {
            console.log("👍 [GroupChat] GroupMessageReactionUpdated event fired!");
            if (!payload) {
                console.error("❌ [GroupChat] GroupMessageReactionUpdated: payload is missing");
                return;
            }
            if (!payload.action || !payload.messageId || !payload.roomId || !payload.userId || !payload.emojiId) {
                console.error("❌ [GroupChat] GroupMessageReactionUpdated: missing required fields", payload);
                return;
            }
            this.listeners.forEach((listener, id) => {
                console.log(`👍 [GroupChat] Notifying listener: ${id} (reaction)`);
                if (payload.action === "react") {
                    listener.onMessageReactionAdded?.(payload);
                }
                else if (payload.action === "unreact") {
                    listener.onMessageReactionRemoved?.(payload);
                }
            });
        });
        socket.on("GroupMessageReactionError", (error) => {
            console.error('❌ [GroupChat] GroupMessageReactionError:', error);
        });
        socket.on("groupMessageEdited", (payload) => {
            console.log("✏️ [GroupChat] groupMessageEdited event fired!");
            if (!payload) {
                console.error("❌ [GroupChat] groupMessageEdited: payload is missing");
                return;
            }
            if (!payload.roomId || !payload.messageId || !payload.userId || !payload.userName) {
                console.error("❌ [GroupChat] groupMessageEdited: missing required fields", payload);
                return;
            }
            const textMessageGroup = new TextMessageGroup(payload.roomId, payload.newMessage || "");
            textMessageGroup._setId(payload.messageId);
            textMessageGroup._setSenderId(payload.userId);
            textMessageGroup._setSenderName(payload.userName);
            if (payload.edited_at) {
                textMessageGroup._setEditedAt(payload.edited_at);
            }
            textMessageGroup._setEditedBy(payload.userId);
            textMessageGroup._setStatus("delivered");
            const sender = new GroupUser(payload.userId, payload.userName);
            textMessageGroup._setSender(sender);
            this.listeners.forEach((listener, id) => {
                console.log(`✏️ [GroupChat] Notifying listener: ${id} (message edited)`);
                listener.onMessageEdited?.(textMessageGroup);
            });
        });
        socket.on("editGroupMessageError", (error) => {
            PeerChatErrorHandler.handleMessageEditError(error, "editGroupMessage");
        });
        socket.on("groupMessageError", (error) => {
            console.error('❌ [GroupChat] groupMessageError received:', error);
            if (error.status === "banned" && error.roomId && error.userId === this.userId) {
                this.bannedRooms.add(error.roomId);
                console.log(`🚫 [GroupChat] User ${this.userId} is banned from room ${error.roomId}`);
                const bannedUser = new GroupUser(this.userId, this.userName);
                const bannedFrom = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, error.roomId);
                this.listeners.forEach((listener, id) => {
                    console.log(`🚫 [GroupChat] Notifying listener: ${id} (user banned)`);
                    listener.onGroupMemberBanned?.(bannedUser, new GroupUser('', ''), bannedFrom, error.error);
                });
            }
        });
        socket.on("groupMessageDeleted", (payload) => {
            if (!payload) {
                return;
            }
            if (!payload.room_id || !payload.user_id || !payload.message_id) {
                return;
            }
            const textMessageGroup = new TextMessageGroup(payload.room_id, "");
            textMessageGroup._setId(payload.message_id);
            textMessageGroup._setSenderId(payload.user_id);
            textMessageGroup._setDeletedAt(new Date().toISOString());
            textMessageGroup._setDeletedBy(payload.user_id);
            textMessageGroup._setStatus("deleted");
            this.listeners.forEach((listener, id) => {
                console.log(`🗑️ [GroupChat] Notifying listener: ${id} (message deleted)`);
                listener.onMessageDeleted?.(textMessageGroup);
            });
        });
        socket.on("participantBanned", (payload) => {
            console.log("🚫 [GroupChat] participantBanned event fired!", payload);
            if (!payload) {
                console.error("❌ [GroupChat] participantBanned: payload is missing");
                return;
            }
            if (!payload.group_id || !payload.participant_id || !payload.admin_id) {
                console.error("❌ [GroupChat] participantBanned: missing required fields", payload);
                return;
            }
            try {
                const bannedUser = new GroupUser(payload.participant_id, payload.participant_id);
                const bannedBy = new GroupUser(payload.admin_id, payload.admin_id);
                const bannedFrom = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.group_id);
                if (payload.participant_id === this.userId) {
                    console.log(`🚫 [GroupChat] Current user ${this.userId} is banned from room ${payload.group_id}`);
                    this.bannedRooms.add(payload.group_id);
                }
                this.listeners.forEach((listener, id) => {
                    console.log(`🚫 [GroupChat] Notifying listener: ${id} (member banned)`);
                    listener.onGroupMemberBanned?.(bannedUser, bannedBy, bannedFrom, payload.ban_reason);
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing participantBanned event:", error);
            }
        });
        socket.on("userBannedFromGroup", (payload) => {
            console.log("🚫 [GroupChat] userBannedFromGroup event fired!", payload);
            if (!payload) {
                console.error("❌ [GroupChat] userBannedFromGroup: payload is missing");
                return;
            }
            if (!payload.group_id || !payload.participant_id || !payload.banned_by) {
                console.error("❌ [GroupChat] userBannedFromGroup: missing required fields", payload);
                return;
            }
            try {
                const bannedUser = new GroupUser(payload.participant_id, payload.participant_id);
                const bannedBy = new GroupUser(payload.banned_by, payload.banned_by);
                const bannedFrom = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.group_id);
                if (payload.participant_id === this.userId) {
                    console.log(`🚫 [GroupChat] Current user ${this.userId} is banned from room ${payload.group_id}`);
                    this.bannedRooms.add(payload.group_id);
                }
                this.listeners.forEach((listener, id) => {
                    console.log(`🚫 [GroupChat] Notifying listener: ${id} (user banned from group)`);
                    listener.onGroupMemberBanned?.(bannedUser, bannedBy, bannedFrom, payload.ban_reason);
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing userBannedFromGroup event:", error);
            }
        });
        socket.on("participantDirectUnbanned", (payload) => {
            console.log("✅ [GroupChat] participantDirectUnbanned event fired!", payload);
            if (!payload) {
                console.error("❌ [GroupChat] participantDirectUnbanned: payload is missing");
                return;
            }
            if (!payload.room_id || !payload.user_id || !payload.unbanned_by) {
                console.error("❌ [GroupChat] participantDirectUnbanned: missing required fields", payload);
                return;
            }
            try {
                const unbannedUser = new GroupUser(payload.user_id, payload.user_id);
                const unbannedBy = new GroupUser(payload.unbanned_by, payload.unbanned_by);
                const unbannedFrom = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.room_id);
                if (payload.user_id === this.userId) {
                    console.log(`✅ [GroupChat] Current user ${this.userId} is unbanned from room ${payload.room_id}`);
                    this.bannedRooms.delete(payload.room_id);
                }
                this.listeners.forEach((listener, id) => {
                    console.log(`✅ [GroupChat] Notifying listener: ${id} (member unbanned)`);
                    listener.onGroupMemberUnbanned?.(unbannedUser, unbannedBy, unbannedFrom, payload.unban_reason);
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing participantDirectUnbanned event:", error);
            }
        });
        socket.on("userUnbannedFromGroup", (payload) => {
            console.log("✅ [GroupChat] userUnbannedFromGroup event fired!", payload);
            if (!payload) {
                console.error("❌ [GroupChat] userUnbannedFromGroup: payload is missing");
                return;
            }
            if (!payload.room_id || !payload.user_id || !payload.unbanned_by) {
                console.error("❌ [GroupChat] userUnbannedFromGroup: missing required fields", payload);
                return;
            }
            try {
                const unbannedUser = new GroupUser(payload.user_id, payload.user_id);
                const unbannedBy = new GroupUser(payload.unbanned_by, payload.unbanned_by);
                const unbannedFrom = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.room_id);
                if (payload.user_id === this.userId) {
                    console.log(`✅ [GroupChat] Current user ${this.userId} is unbanned from room ${payload.room_id}`);
                    this.bannedRooms.delete(payload.room_id);
                }
                this.listeners.forEach((listener, id) => {
                    console.log(`✅ [GroupChat] Notifying listener: ${id} (user unbanned from group)`);
                    listener.onGroupMemberUnbanned?.(unbannedUser, unbannedBy, unbannedFrom, payload.unban_reason);
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing userUnbannedFromGroup event:", error);
            }
        });
        socket.on("roleUpdated", (payload) => {
            console.log("🔄 [GroupChat] roleUpdated event fired!", payload);
            if (payload === null || payload === undefined) {
                console.error("❌ [GroupChat] roleUpdated: payload is null or undefined");
                return;
            }
            if (typeof payload !== 'object') {
                console.error("❌ [GroupChat] roleUpdated: payload is not an object", typeof payload);
                return;
            }
            try {
                const updatedUser = new GroupUser(payload.target_user_id, payload.target_user_id);
                const updatedBy = new GroupUser(payload.updated_by, payload.updated_by);
                const group = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.room_id);
                const newScope = payload.new_role;
                this.listeners.forEach((listener, id) => {
                    console.log(`🔄 [GroupChat] Notifying listener: ${id} (member scope changed)`);
                    listener.onGroupMemberScopeChanged?.(updatedUser, updatedBy, group, newScope, "");
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing roleUpdated event:", error);
            }
        });
        socket.on("roleUpdateError", (payload) => {
            console.error("❌ [GroupChat] roleUpdateError:", payload?.error);
        });
        // Handle ownership transferred event
        socket.on("ownershipTransferred", (payload) => {
            console.log("👑 [GroupChat] ownershipTransferred event fired!", payload);
            if (!payload) {
                console.error("❌ [GroupChat] ownershipTransferred: payload is missing");
                return;
            }
            if (!payload.room_id || !payload.former_owner_id || !payload.new_owner_id) {
                console.error("❌ [GroupChat] ownershipTransferred: missing required fields", payload);
                return;
            }
            try {
                const group = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.room_id);
                const formerOwner = new GroupUser(payload.former_owner_id, payload.former_owner_id);
                const newOwner = new GroupUser(payload.new_owner_id, payload.new_owner_id);
                this.listeners.forEach((listener, id) => {
                    console.log(`👑 [GroupChat] Notifying listener: ${id} (ownership transferred)`);
                    listener.onOwnershipTransferred?.(formerOwner, newOwner, group, payload.transferred_at || new Date().toISOString());
                });
                // If the current user was the former owner, clear the room
                if (payload.former_owner_id === this.userId && this.currentRoomId === payload.room_id) {
                    console.log(`🔄 [GroupChat] Clearing current room as ownership was transferred from current user`);
                    this.currentRoomId = null;
                }
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing ownershipTransferred event:", error);
            }
        });
        socket.on("groupDissolved", (payload) => {
            console.log("💥 [GroupChat] groupDissolved event fired!", payload);
            if (!payload) {
                console.error("❌ [GroupChat] groupDissolved: payload is missing");
                return;
            }
            if (!payload.room_id || !payload.owner_id) {
                console.error("❌ [GroupChat] groupDissolved: missing required fields", payload);
                return;
            }
            try {
                const group = new Group('Group', GROUP_TYPE.PUBLIC, undefined, undefined, undefined, payload.room_id);
                this.listeners.forEach((listener, id) => {
                    console.log(`💥 [GroupChat] Notifying listener: ${id} (group dissolved)`);
                    listener.onGroupDissolved?.(group, payload.owner_id, payload.dissolved_at || new Date().toISOString());
                });
                if (this.currentRoomId === payload.room_id) {
                    console.log(`🔄 [GroupChat] Clearing current room as group was dissolved`);
                    this.currentRoomId = null;
                }
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing groupDissolved event:", error);
            }
        });
        socket.on("newGroupCreated", (payload) => {
            console.log("🆕 [GroupChat] newGroupCreated event fired!", payload);
            if (!payload || !payload.roomId || !payload.groupName) {
                console.error("❌ [GroupChat] newGroupCreated: payload is missing required fields", payload);
                return;
            }
            try {
                this.listeners.forEach((listener, id) => {
                    console.log(`🆕 [GroupChat] Notifying listener: ${id} (new group created)`);
                    listener.onNewGroupCreated?.(payload.roomId, payload.groupName, payload.organizationId, payload.applicationId, payload.adminId, payload.userRole, payload.participants);
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing newGroupCreated event:", error);
            }
        });
        socket.on("participantAdded", (payload) => {
            console.log("👥 [GroupChat] participantAdded event fired!", payload);
            if (!payload || !payload.roomId || !payload.groupName || !payload.newParticipants) {
                console.error("❌ [GroupChat] participantAdded: payload is missing required fields", payload);
                return;
            }
            try {
                this.listeners.forEach((listener, id) => {
                    console.log(`👥 [GroupChat] Notifying listener: ${id} (participant added)`);
                    listener.onParticipantAdded?.(payload.roomId, payload.groupName, payload.newParticipants, payload.addedBy, payload.isCurrentUserAdded, payload.currentUserRole, payload.allParticipants);
                });
            }
            catch (error) {
                console.error("❌ [GroupChat] Error processing participantAdded event:", error);
            }
        });
    }
    static async joinGroup(roomId, password) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error("Room ID is required and must be a non-empty string");
            }
            const trimmedRoomId = roomId.trim();
            if (!this.socket || this.socket.disconnected || !this.socket.connected) {
                throw new Error("Socket is not connected. Please reconnect and try again.");
            }
            if (password && password.trim()) {
                console.log("🔐 [GroupChat] Password provided, verifying for password-protected group...");
                try {
                    const verified = await this._verifyGroupPassword(trimmedRoomId, password.trim());
                    if (!verified) {
                        throw new Error("Invalid password. Please provide the correct password.");
                    }
                    console.log("✅ [GroupChat] Password verified successfully, proceeding to join group");
                }
                catch (verifyError) {
                    throw new Error(`Password verification failed: ${verifyError.message || "Invalid password"}`);
                }
            }
            console.log("🚪 [GroupChat] Joining group room...");
            console.log(`👤 [GroupChat] User joining: ${this.userId} (${this.userName})`);
            console.log(`🏠 [GroupChat] Room ID: ${trimmedRoomId}`);
            this.socket.emit("joinGroup", { roomId: trimmedRoomId, userId: this.userId, userName: this.userName });
            this.currentRoomId = trimmedRoomId; // ✅ Track current room for reactions
            console.log(`✅ [GroupChat] Successfully joined room!`);
            console.log(`👤 [GroupChat] User ${this.userId} (${this.userName}) joined room ${trimmedRoomId}`);
            return trimmedRoomId;
        }
        catch (error) {
            if (error instanceof Error) {
                PeerChatErrorHandler.handleRoomJoinError(error.message, roomId?.trim());
                throw error;
            }
            const errorMessage = error?.message || String(error) || "Unknown error in joinGroup";
            PeerChatErrorHandler.handleRoomJoinError(errorMessage, roomId?.trim());
            throw new Error(errorMessage);
        }
    }
    static sendGroupMessage(textMessageGroup) {
        return new Promise((resolve, reject) => {
            try {
                if (!textMessageGroup) {
                    reject(new Error("TextMessageGroup object is required"));
                    return;
                }
                if (!this.socket) {
                    reject(new Error("Socket not initialized. Call SamparkChat.init() first."));
                    return;
                }
                if (typeof this.socket.emit !== 'function') {
                    reject(new Error("Invalid socket: emit method not available"));
                    return;
                }
                if (this.socket.disconnected) {
                    reject(new Error("Socket is disconnected. Please reconnect and try again."));
                    return;
                }
                if (!this.socket.connected) {
                    reject(new Error("Socket is not connected. Please wait for connection and try again."));
                    return;
                }
                if (!this.userId || typeof this.userId !== 'string' || this.userId.trim().length === 0) {
                    reject(new Error("User not logged in. Call SamparkChat.login() first."));
                    return;
                }
                if (!this.userName || typeof this.userName !== 'string') {
                    reject(new Error("User name is missing. Call SamparkChat.login() first."));
                    return;
                }
                if (!this.organizationId || typeof this.organizationId !== 'string' || this.organizationId.trim().length === 0) {
                    reject(new Error("SDK not initialized. Organization ID is missing. Call SamparkChat.init() first."));
                    return;
                }
                if (!this.applicationId || typeof this.applicationId !== 'string' || this.applicationId.trim().length === 0) {
                    reject(new Error("SDK not initialized. Application ID is missing. Call SamparkChat.init() first."));
                    return;
                }
                const roomId = textMessageGroup.getRoomId();
                if (!roomId || typeof roomId !== 'string' || roomId.trim().length === 0) {
                    reject(new Error("Room ID is required to send a group message"));
                    return;
                }
                if (this.bannedRooms.has(roomId)) {
                    console.warn(`🚫 [GroupChat] User ${this.userId} is banned from room ${roomId}`);
                    reject(new Error("You are banned from this group and cannot send messages"));
                    return;
                }
                const text = textMessageGroup.getText();
                if (!text || typeof text !== 'string' || !text.trim()) {
                    reject(new Error("Message text cannot be empty"));
                    return;
                }
                const trimmedText = text.trim();
                if (trimmedText.length > 10000) {
                    reject(new Error("Message text is too long. Maximum length is 10000 characters."));
                    return;
                }
                // Prepare message payload matching backend "sendGroupMessage" event
                let messagePayload;
                try {
                    const replyToMessageId = textMessageGroup.getReplyToMessageId() || null;
                    messagePayload = {
                        organizationId: this.organizationId,
                        roomId: roomId,
                        message: trimmedText,
                        userId: this.userId,
                        userName: this.userName,
                        applicationId: this.applicationId,
                        mentions: textMessageGroup.getMentions() || [],
                        replyToMessageId: replyToMessageId,
                        replyToUserId: replyToMessageId ? (textMessageGroup.getReplyToUserId() || null) : null,
                        replyToText: replyToMessageId ? (textMessageGroup.getReplyToText() || null) : null,
                        fileId: textMessageGroup.getFileId() || null,
                        replyType: replyToMessageId ? (textMessageGroup.getReplyType() || "reply") : null
                    };
                    if (!messagePayload.organizationId || !messagePayload.roomId || !messagePayload.userId || !messagePayload.applicationId) {
                        reject(new Error("Invalid message payload: missing required fields"));
                        return;
                    }
                }
                catch (payloadError) {
                    reject(new Error(`Failed to prepare message payload: ${payloadError.message || payloadError}`));
                    return;
                }
                // Set up error handlers before emitting
                const errorHandler = (error) => {
                    console.error('❌ [GroupChat] Socket error while sending group message:', error);
                    reject(new Error(`Failed to send message: ${error.message || error || 'Socket error'}`));
                };
                const disconnectHandler = () => {
                    console.error('❌ [GroupChat] Socket disconnected while sending group message');
                    reject(new Error("Socket disconnected while sending message. Please reconnect and try again."));
                };
                const messageErrorHandler = (error) => {
                    if (error.roomId === roomId && error.userId === this.userId) {
                        this.socket?.removeListener('error', errorHandler);
                        this.socket?.removeListener('disconnect', disconnectHandler);
                        this.socket?.removeListener('groupMessageError', messageErrorHandler);
                        console.error('❌ [GroupChat] Message rejected by backend:', error.error);
                        reject(new Error(error.error || 'Failed to send message'));
                    }
                };
                this.socket.once('error', errorHandler);
                this.socket.once('disconnect', disconnectHandler);
                this.socket.once('groupMessageError', messageErrorHandler);
                // Emit "sendGroupMessage" to backend
                try {
                    this.socket.emit("sendGroupMessage", messagePayload);
                    console.log('✅ [GroupChat] Group message sent to backend');
                    resolve(textMessageGroup);
                }
                catch (emitError) {
                    this.socket?.removeListener('error', errorHandler);
                    this.socket?.removeListener('disconnect', disconnectHandler);
                    this.socket?.removeListener('groupMessageError', messageErrorHandler);
                    reject(new Error(`Failed to emit message: ${emitError.message || emitError}`));
                    return;
                }
            }
            catch (error) {
                console.error("❌ [GroupChat] Unexpected error sending group message:", error);
                if (error instanceof Error) {
                    reject(error);
                }
                else if (typeof error === 'string') {
                    reject(new Error(error));
                }
                else {
                    reject(new Error(`Failed to send group message: ${error.message || String(error)}`));
                }
            }
        });
    }
    static sendMediaMessage(mediaMessageGroup) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!mediaMessageGroup) {
                    reject(new Error("MediaMessageGroup object is required"));
                    return;
                }
                if (!this.socket || this.socket.disconnected || !this.socket.connected) {
                    reject(new Error("Socket is not connected. Please reconnect and try again."));
                    return;
                }
                if (!this.userId || !this.userName) {
                    reject(new Error("User not logged in. Call SamparkChat.login() first."));
                    return;
                }
                if (!this.organizationId || !this.applicationId) {
                    reject(new Error("SDK not initialized. Call SamparkChat.init() first."));
                    return;
                }
                const roomId = mediaMessageGroup.getRoomId();
                if (!roomId || !roomId.trim()) {
                    reject(new Error("Room ID is required to send a media message"));
                    return;
                }
                if (this.bannedRooms.has(roomId)) {
                    console.warn(`🚫 [GroupChat] User ${this.userId} is banned from room ${roomId}`);
                    reject(new Error("You are banned from this group and cannot send messages"));
                    return;
                }
                const file = mediaMessageGroup.getFile();
                if (!file) {
                    reject(new Error("File is required to send a media message"));
                    return;
                }
                const tempMessageId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
                let uploadResult;
                try {
                    uploadResult = await GroupMediaService.uploadFile(file, roomId, this.userId, this.userName, tempMessageId, 'group_chat');
                }
                catch (uploadError) {
                    reject(new Error(`File upload failed: ${uploadError.message || uploadError}`));
                    return;
                }
                let messageType = mediaMessageGroup.getMessageType();
                if (!messageType || messageType === 'file') {
                    const mime = uploadResult.mimeType || '';
                    if (mime.startsWith('image/')) {
                        messageType = 'image';
                    }
                    else if (mime.startsWith('video/')) {
                        messageType = 'video';
                    }
                    else if (mime.startsWith('audio/')) {
                        messageType = 'audio';
                    }
                    else {
                        messageType = 'file';
                    }
                }
                const captionText = mediaMessageGroup.getText() || file.name || '';
                const replyToMessageId = mediaMessageGroup.getReplyToMessageId() || null;
                const messagePayload = {
                    organizationId: this.organizationId,
                    roomId: roomId,
                    message: captionText,
                    userId: this.userId,
                    userName: this.userName,
                    applicationId: this.applicationId,
                    mentions: mediaMessageGroup.getMentions() || [],
                    replyToMessageId: replyToMessageId,
                    replyToUserId: replyToMessageId ? (mediaMessageGroup.getReplyToUserId() || null) : null,
                    replyToText: replyToMessageId ? (mediaMessageGroup.getReplyToText() || null) : null,
                    fileId: uploadResult.fileId,
                    replyType: replyToMessageId ? (mediaMessageGroup.getReplyType() || "reply") : null
                };
                try {
                    this.socket.emit("sendGroupMessage", messagePayload);
                }
                catch (emitError) {
                    reject(new Error(`Failed to emit media message: ${emitError.message || emitError}`));
                    return;
                }
                mediaMessageGroup._setFileId(uploadResult.fileId);
                mediaMessageGroup._setMessageType(messageType);
                mediaMessageGroup._setSenderId(this.userId);
                mediaMessageGroup._setSenderName(this.userName);
                mediaMessageGroup._setSentAt(new Date().toISOString());
                mediaMessageGroup._setStatus("sent");
                mediaMessageGroup._setText(captionText);
                mediaMessageGroup._setSender(new GroupUser(this.userId, this.userName));
                if (messageType === 'image' && file) {
                    mediaMessageGroup._setFileInfo(uploadResult);
                    try {
                        const blobUrl = (typeof window !== 'undefined') ? window.URL.createObjectURL(file) : '';
                        if (blobUrl) {
                            mediaMessageGroup._setAttachmentUrl(blobUrl);
                            uploadResult.attachmentUrl = blobUrl;
                            mediaMessageGroup.data = {
                                attachments: [{
                                        url: blobUrl,
                                        mimeType: uploadResult.mimeType,
                                        name: uploadResult.originalName,
                                        size: uploadResult.size
                                    }],
                                url: blobUrl
                            };
                        }
                    }
                    catch (blobErr) {
                        console.warn('⚠️ [GroupChat] Could not create blob URL for sender image:', blobErr);
                    }
                }
                else {
                    mediaMessageGroup._setFileInfo(uploadResult);
                }
                // Sender echo — notify listeners so sender sees their own media message
                this.listeners.forEach((listener) => {
                    listener.onMediaMessageReceived?.(mediaMessageGroup);
                });
                console.log('✅ [GroupChat] Group media message sent successfully');
                resolve(mediaMessageGroup);
            }
            catch (error) {
                console.error("❌ [GroupChat] Unexpected error sending group media message:", error);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
    static receiveGroupMessage() {
        if (!this.socket) {
            console.warn('⚠️ [GroupChat] receiveGroupMessage: Socket not initialized');
            return;
        }
        this.socket.removeAllListeners("receiveGroupMessage");
        console.log('🔌 [GroupChat] Registering receiveGroupMessage listener');
        this.socket.on("receiveGroupMessage", (message, userId, userName, roomId, time, messageId, mentions, replyToMessageId, replyToUserId, replyToText, messageType, fileInfo, replyType) => {
            if (this.bannedRooms.has(roomId)) {
                console.log(`🚫 [GroupChat] Skipping message - current user is banned from room ${roomId}`);
                return;
            }
            const textMessageGroup = new TextMessageGroup(roomId, message);
            textMessageGroup._setId(messageId);
            textMessageGroup._setSenderId(userId);
            textMessageGroup._setSenderName(userName);
            textMessageGroup._setSentAt(time);
            textMessageGroup._setStatus("delivered");
            textMessageGroup._setMessageType(messageType || "text");
            textMessageGroup._setMentions(mentions || []);
            if (replyToMessageId) {
                textMessageGroup._setReplyToMessageId(replyToMessageId);
            }
            if (replyToUserId) {
                textMessageGroup._setReplyToUserId(replyToUserId);
            }
            if (replyToText) {
                textMessageGroup._setReplyToText(replyToText);
            }
            if (replyType) {
                textMessageGroup._setReplyType(replyType);
            }
            if (fileInfo) {
                textMessageGroup._setFileInfo(fileInfo);
            }
            const sender = new GroupUser(userId, userName);
            textMessageGroup._setSender(sender);
            const resolvedType = messageType || "text";
            const isMedia = resolvedType !== "text" && fileInfo;
            if (isMedia) {
                const dummyFile = new File([], fileInfo?.originalName || "file", { type: fileInfo?.mimeType || "application/octet-stream" });
                const mediaMsg = new MediaMessageGroup(roomId, dummyFile, resolvedType, "group");
                mediaMsg._setId(messageId);
                mediaMsg._setSenderId(userId);
                mediaMsg._setSenderName(userName);
                mediaMsg._setSentAt(time);
                mediaMsg._setStatus("delivered");
                mediaMsg._setMessageType(resolvedType);
                mediaMsg._setText(message);
                mediaMsg._setMentions(mentions || []);
                if (replyToMessageId)
                    mediaMsg._setReplyToMessageId(replyToMessageId);
                if (replyToUserId)
                    mediaMsg._setReplyToUserId(replyToUserId);
                if (replyToText)
                    mediaMsg._setReplyToText(replyToText);
                if (replyType)
                    mediaMsg._setReplyType(replyType);
                mediaMsg._setSender(new GroupUser(userId, userName));
                if (fileInfo) {
                    const fileId = fileInfo.fileId || fileInfo.file_id || "";
                    let attachmentUrl = fileInfo.downloadUrl || fileInfo.download_url;
                    if (!attachmentUrl && fileId) {
                        attachmentUrl = `${apiUrl}/chat/download/${fileId}`;
                    }
                    if (attachmentUrl && !attachmentUrl.startsWith('http')) {
                        const cleanPath = attachmentUrl.startsWith('/') ? attachmentUrl.substring(1) : attachmentUrl;
                        attachmentUrl = `${apiUrl}/${cleanPath}`;
                    }
                    const enhancedFileInfo = {
                        ...fileInfo,
                        fileId: fileId,
                        attachmentUrl: attachmentUrl,
                        downloadUrl: attachmentUrl,
                        originalName: fileInfo.originalName || fileInfo.original_name || fileInfo.name,
                        mimeType: fileInfo.mimeType || fileInfo.mime_type || fileInfo.type
                    };
                    mediaMsg._setFileInfo(enhancedFileInfo);
                    if (attachmentUrl) {
                        mediaMsg.data = {
                            attachments: [{
                                    url: attachmentUrl,
                                    mimeType: enhancedFileInfo.mimeType,
                                    name: enhancedFileInfo.originalName,
                                    size: enhancedFileInfo.size || 0
                                }],
                            url: attachmentUrl
                        };
                        mediaMsg._setAttachmentUrl(attachmentUrl);
                    }
                }
                console.log('📩 [GroupChat] Media message detected, notifying', this.listeners.size, 'listeners');
                this.listeners.forEach((listener, id) => {
                    console.log(`📩 [GroupChat] Notifying listener: ${id} (media)`);
                    listener.onMediaMessageReceived?.(mediaMsg);
                });
            }
            else {
                console.log('📩 [GroupChat] TextMessageGroup created, notifying', this.listeners.size, 'listeners');
                this.listeners.forEach((listener, id) => {
                    console.log(`📩 [GroupChat] Notifying listener: ${id}`);
                    listener.onGroupTextMessageReceived?.(textMessageGroup);
                });
            }
        });
    }
    static addMessageListener(id, listener) {
        console.log('👂 [GroupChat] Adding listener:', id);
        console.log('   - Has group text message callback:', !!listener.onGroupTextMessageReceived);
        console.log('   - Has media message callback:', !!listener.onMediaMessageReceived);
        console.log('   - Has reaction callbacks:', !!(listener.onMessageReactionAdded || listener.onMessageReactionRemoved));
        console.log('   - Has message edited callback:', !!listener.onMessageEdited);
        console.log('   - Has message deleted callback:', !!listener.onMessageDeleted);
        console.log('   - Has member banned callback:', !!listener.onGroupMemberBanned);
        console.log('   - Has member unbanned callback:', !!listener.onGroupMemberUnbanned);
        console.log('   - Has member scope changed callback:', !!listener.onGroupMemberScopeChanged);
        this.listeners.set(id, listener);
    }
    static addGroupListener(id, listener) {
        // Alias for addMessageListener to match CometChat API pattern
        this.addMessageListener(id, listener);
    }
    static removeMessageListener(id) {
        this.listeners.delete(id);
    }
    static removeGroupListener(id) {
        // Alias for removeMessageListener to match CometChat API pattern
        this.removeMessageListener(id);
    }
    static addReaction(messageId, emojiId, roomId, emojiType) {
        if (!this.socket) {
            console.warn("[GroupChat] addReaction: socket not ready");
            return;
        }
        if (!this.userId) {
            console.warn("[GroupChat] addReaction: user not logged in");
            return;
        }
        if (!this.organizationId) {
            console.warn("[GroupChat] addReaction: SDK not initialized");
            return;
        }
        // ✅ Use provided roomId or fallback to currentRoomId (CometChat style)
        const finalRoomId = roomId || this.currentRoomId;
        if (!finalRoomId) {
            console.warn("[GroupChat] addReaction: roomId is required. Provide roomId or join a group first", {
                messageId,
                emojiId
            });
            return;
        }
        if (!messageId || !emojiId) {
            console.warn("[GroupChat] addReaction: missing messageId or emojiId", {
                messageId,
                emojiId
            });
            return;
        }
        console.log('👍 [GroupChat] Adding reaction:', { roomId: finalRoomId, messageId, emojiId });
        const payload = {
            orgId: this.organizationId,
            roomId: finalRoomId,
            messageId: messageId,
            userId: this.userId,
            userName: this.userName,
            emojiId: emojiId,
            emojiType: emojiType || ""
        };
        this.socket.emit("ReactToGroupMessage", payload);
    }
    static removeReaction(messageId, emojiId, roomId) {
        if (!this.socket) {
            console.warn("[GroupChat] removeReaction: socket not ready");
            return;
        }
        if (!this.userId) {
            console.warn("[GroupChat] removeReaction: user not logged in");
            return;
        }
        if (!this.organizationId) {
            console.warn("[GroupChat] removeReaction: SDK not initialized");
            return;
        }
        const finalRoomId = roomId || this.currentRoomId;
        if (!finalRoomId) {
            console.warn("[GroupChat] removeReaction: roomId is required. Provide roomId or join a group first", {
                messageId,
                emojiId
            });
            return;
        }
        if (!messageId || !emojiId) {
            console.warn("[GroupChat] removeReaction: missing messageId or emojiId", {
                messageId,
                emojiId
            });
            return;
        }
        console.log('👎 [GroupChat] Removing reaction:', { roomId: finalRoomId, messageId, emojiId });
        const payload = {
            orgId: this.organizationId,
            roomId: finalRoomId,
            messageId: messageId,
            userId: this.userId,
            emojiId: emojiId
        };
        this.socket.emit("unreactToGroupMessage", payload);
    }
    static editMessage(textMessageGroup) {
        return new Promise((resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                const messageId = textMessageGroup.getId();
                if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Message ID is required to edit a message", "editMessage"));
                    return;
                }
                const roomId = this.currentRoomId;
                if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Room ID is required. Please join a group first.", "editMessage"));
                    return;
                }
                const newMessage = textMessageGroup.getText();
                if (!newMessage || typeof newMessage !== 'string' || !newMessage.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Message text cannot be empty", "editMessage"));
                    return;
                }
                if (!this.organizationId || typeof this.organizationId !== 'string' || !this.organizationId.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Organization ID is required", "editMessage"));
                    return;
                }
                if (!this.userId || typeof this.userId !== 'string' || !this.userId.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("User ID is required", "editMessage"));
                    return;
                }
                const userName = this.userName || this.userId;
                if (!this.socket) {
                    reject(PeerChatErrorHandler.handleSocketError("Socket not initialized", "editMessage"));
                    return;
                }
                if (this.socket.disconnected) {
                    reject(PeerChatErrorHandler.handleSocketError("Socket is disconnected. Please reconnect and try again.", "editMessage"));
                    return;
                }
                if (!this.socket.connected) {
                    reject(PeerChatErrorHandler.handleSocketError("Socket is not connected. Please wait for connection and try again.", "editMessage"));
                    return;
                }
                const payload = {
                    orgId: this.organizationId.trim(),
                    roomId: roomId.trim(),
                    messageId: messageId.trim(),
                    userId: this.userId.trim(),
                    newMessage: newMessage.trim(),
                    userName: userName.trim()
                };
                console.log('✏️ [GroupChat] editMessage - Sending payload:', payload);
                console.log('✏️ [GroupChat] editMessage - Current roomId:', this.currentRoomId);
                console.log('✏️ [GroupChat] editMessage - Message roomId from TextMessageGroup:', textMessageGroup.getRoomId());
                try {
                    this.socket.emit("editGroupMessage", payload);
                    textMessageGroup._setEditedAt(new Date().toISOString());
                    textMessageGroup._setEditedBy(this.userId);
                    resolve(textMessageGroup);
                }
                catch (emitError) {
                    PeerChatErrorHandler.handleSocketEmitError("editGroupMessage", emitError, "editMessage");
                    reject(new Error(`[GroupChat] editMessage: Socket emit failed - ${emitError.message || "Unknown error"}`));
                    return;
                }
            }
            catch (error) {
                const errorMessage = error.message || "Unknown error in editMessage";
                reject(PeerChatErrorHandler.handleSDKInitializationError(errorMessage, "editMessage"));
            }
        });
    }
    static deleteMessage(messageId, roomId, scope = 'me') {
        return new Promise(async (resolve, reject) => {
            if (!this.userId) {
                reject(new Error("User not logged in"));
                return;
            }
            if (!this.organizationId) {
                reject(new Error("SDK not initialized"));
                return;
            }
            if (!messageId) {
                reject(new Error("Message ID is required to delete a message"));
                return;
            }
            if (!roomId) {
                reject(new Error("Room ID is required to delete a message"));
                return;
            }
            try {
                const response = await axios.post(`${apiUrl}/chat/deleteSingleGroupChat`, {
                    action: 'delete_single_group_chat',
                    data: {
                        room_id: roomId,
                        organization_id: this.organizationId,
                        user_id: this.userId,
                        message_id: messageId,
                        scope: scope
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    console.log('✅ [GroupChat] Message deleted successfully');
                    const textMessageGroup = new TextMessageGroup(roomId, "");
                    textMessageGroup._setId(messageId);
                    textMessageGroup._setDeletedAt(new Date().toISOString());
                    textMessageGroup._setDeletedBy(this.userId);
                    textMessageGroup._setStatus("deleted");
                    resolve(textMessageGroup);
                }
                else {
                    reject(new Error(response.data?.message || "Failed to delete message"));
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to delete message:', error);
                reject(new Error(error.response?.data?.message || error.message || "Failed to delete message"));
            }
        });
    }
    static createGroupWithMembers(group, members, banMembers) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!group) {
                    reject(new Error("Group object is required"));
                    return;
                }
                if (!members || !Array.isArray(members) || members.length === 0) {
                    reject(new Error("Members array is required and must contain at least one member"));
                    return;
                }
                const validMembers = members.filter(member => {
                    if (!member || typeof member.getUid !== 'function') {
                        return false;
                    }
                    const uid = member.getUid();
                    return uid && typeof uid === 'string' && uid.trim().length > 0;
                });
                if (validMembers.length === 0) {
                    reject(new Error("No valid members provided. Each member must be a valid GroupMember object."));
                    return;
                }
                const memberUids = validMembers.map(m => m.getUid());
                const memberNames = validMembers.map(m => m.getName() || "");
                const createdGroup = await this.createGroup(group.getName(), group.getType(), group.getPassword(), memberUids, memberNames);
                resolve(createdGroup);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    static addParticipant(roomId, groupName, members, userRole = GROUP_MEMBER_SCOPE.PARTICIPANT) {
        const membersList = [];
        for (const member of members) {
            if (member instanceof GroupMember) {
                membersList.push(member);
            }
            else if (typeof member === 'object' && 'userId' in member) {
                const obj = member;
                membersList.push(new GroupMember(obj.userId, userRole, obj.userName));
            }
            else if (typeof member === 'string') {
                membersList.push(new GroupMember(member, userRole));
            }
        }
        return this.addMembersToGroup(roomId, membersList);
    }
    static async getgroups() {
        console.log("🏠 GroupChat :: Fetching groups...");
        if (!this.organizationId || !this.applicationId) {
            console.error("❌ GroupChat :: SDK not initialized or missing IDs");
            throw new Error("SDK not initialized. Call init() first.");
        }
        if (!this.userId) {
            console.error("❌ GroupChat :: User not logged in");
            throw new Error("User not logged in. Call login() first.");
        }
        try {
            const requestBody = new GetRoomsByUserIdRequest(this.userId, this.organizationId, this.applicationId);
            console.log("📤 GroupChat :: Sending request:", requestBody);
            const response = await axios.post(`${apiUrl}/chat/getRoomsById`, requestBody, { withCredentials: true });
            const rooms = response.data.data?.rooms || [];
            // Filter out groups where the user has left, been removed, or banned
            const activeRooms = rooms.filter((room) => {
                const userStatus = room.status || room.user_status || room.membership_status;
                if (userStatus && (userStatus === 'left' || userStatus === 'removed' || userStatus === 'banned')) {
                    console.log(`🚫 GroupChat :: Filtering out group ${room.group_name || room.room_id} with status: ${userStatus}`);
                    return false;
                }
                return true;
            });
            console.log("🏠 Groups retrieved:", activeRooms.length, "(filtered from", rooms.length, "total)");
            console.log("📊 Groups list fetched successfully", activeRooms);
            return activeRooms;
        }
        catch (error) {
            console.error("❌ GroupChat :: Failed to fetch groups");
            console.error("🔴 Error details:", error.response?.data || error.message);
            throw error;
        }
    }
    static createGroup(groupOrName, groupType, password, memberUids, memberNames) {
        return new Promise(async (resolve, reject) => {
            try {
                let group;
                let trimmedGroupName;
                let groupTypeValue;
                let passwordValue;
                if (groupOrName instanceof Group) {
                    group = groupOrName;
                    trimmedGroupName = group.getName();
                    groupTypeValue = group.getType();
                    passwordValue = group.getPassword();
                }
                else {
                    if (!groupOrName || typeof groupOrName !== 'string') {
                        reject(new Error("Group name is required and must be a non-empty string"));
                        return;
                    }
                    trimmedGroupName = groupOrName.trim();
                    if (trimmedGroupName.length === 0) {
                        reject(new Error("Group name cannot be empty"));
                        return;
                    }
                    if (!groupType || typeof groupType !== 'string') {
                        reject(new Error("Group type is required and must be a string"));
                        return;
                    }
                    groupTypeValue = groupType;
                    passwordValue = password;
                    try {
                        group = new Group(trimmedGroupName, groupTypeValue, passwordValue);
                    }
                    catch (groupError) {
                        reject(new Error(`Failed to create Group object: ${groupError.message || groupError}`));
                        return;
                    }
                }
                const validGroupTypes = Object.values(GROUP_TYPE);
                if (!validGroupTypes.includes(groupTypeValue)) {
                    reject(new Error(`Invalid group type. Must be one of: ${validGroupTypes.join(", ")}`));
                    return;
                }
                if (groupTypeValue === GROUP_TYPE.PASSWORD) {
                    if (!passwordValue || typeof passwordValue !== 'string' || passwordValue.trim().length === 0) {
                        reject(new Error("Password is required for password-protected groups"));
                        return;
                    }
                }
                if (!this.organizationId || typeof this.organizationId !== 'string' || this.organizationId.trim().length === 0) {
                    reject(new Error("SDK not initialized. Call SamparkChat.init() first."));
                    return;
                }
                if (!this.applicationId || typeof this.applicationId !== 'string' || this.applicationId.trim().length === 0) {
                    reject(new Error("SDK not initialized. Application ID is missing. Call SamparkChat.init() first."));
                    return;
                }
                if (!this.userId || typeof this.userId !== 'string' || this.userId.trim().length === 0) {
                    reject(new Error("User not logged in. Call SamparkChat.login() first."));
                    return;
                }
                if (!this.userName || typeof this.userName !== 'string') {
                    reject(new Error("User name is missing. Call SamparkChat.login() first."));
                    return;
                }
                let members;
                if (memberUids !== undefined && memberUids !== null) {
                    if (!Array.isArray(memberUids)) {
                        reject(new Error("memberUids must be an array"));
                        return;
                    }
                    const validMemberUids = memberUids.filter(uid => uid && typeof uid === 'string' && uid.trim().length > 0);
                    if (memberUids.length > 0 && validMemberUids.length === 0) {
                        reject(new Error("All member user IDs must be non-empty strings"));
                        return;
                    }
                    if (memberNames !== undefined && memberNames !== null) {
                        if (!Array.isArray(memberNames)) {
                            reject(new Error("memberNames must be an array"));
                            return;
                        }
                        if (memberNames.length !== memberUids.length) {
                            reject(new Error("memberNames array length must match memberUids array length"));
                            return;
                        }
                    }
                    try {
                        members = validMemberUids.map((uid, index) => {
                            const memberName = memberNames && memberNames[index]
                                ? (typeof memberNames[index] === 'string' ? memberNames[index].trim() : undefined)
                                : undefined;
                            return new GroupMember(uid.trim(), GROUP_MEMBER_SCOPE.PARTICIPANT, memberName);
                        });
                    }
                    catch (memberError) {
                        reject(new Error(`Failed to create GroupMember objects: ${memberError.message || memberError}`));
                        return;
                    }
                }
                const hasMembers = members && Array.isArray(members) && members.length > 0;
                console.log(`🏗️ [GroupChat] Creating group${hasMembers ? ' with members' : ''}:`, trimmedGroupName);
                console.log(`👤 [GroupChat] Creating group as user: ${this.userId} (${this.userName})`);
                console.log(`🔒 [GroupChat] Group type: ${groupTypeValue}`);
                let requestBody;
                try {
                    if (hasMembers && members) {
                        requestBody = new CreateGroupWithMembersRequest(group, this.userId, this.userName, this.organizationId, this.applicationId, members);
                    }
                    else {
                        requestBody = new CreateGroupRequest(group, this.userId, this.userName, this.organizationId, this.applicationId);
                    }
                }
                catch (requestError) {
                    console.error("❌ [GroupChat] Failed to create request body:", requestError);
                    reject(new Error(`Failed to create request: ${requestError.message || requestError}`));
                    return;
                }
                if (!requestBody) {
                    reject(new Error("Failed to create request body"));
                    return;
                }
                console.log(`📤 [GroupChat] Sending create group${hasMembers ? ' with members' : ''} request...`);
                console.log(`📦 [GroupChat] Request body:`, JSON.stringify(requestBody, null, 2));
                let response;
                try {
                    response = await axios.post(`${apiUrl}/chat/createGroupChat`, requestBody, { withCredentials: true });
                }
                catch (axiosError) {
                    console.error("❌ [GroupChat] API request failed:", axiosError);
                    const errorMessage = axiosError.response?.data?.message || axiosError.message || "Failed to create group";
                    reject(new Error(errorMessage));
                    return;
                }
                if (!response) {
                    reject(new Error("No response received from server"));
                    return;
                }
                if (!response.data) {
                    reject(new Error("Invalid response: missing data"));
                    return;
                }
                if (response.data.status === 200) {
                    if (!response.data.data) {
                        reject(new Error("Invalid response: missing data object"));
                        return;
                    }
                    if (!response.data.data.room_id || typeof response.data.data.room_id !== 'string') {
                        reject(new Error("Invalid response: missing or invalid room_id"));
                        return;
                    }
                    const roomId = response.data.data.room_id;
                    let createdGroup;
                    try {
                        createdGroup = new Group(group.getName(), group.getType(), group.getPassword(), group.getIcon(), group.getDescription(), roomId);
                    }
                    catch (groupError) {
                        reject(new Error(`Failed to create Group object from response: ${groupError.message || groupError}`));
                        return;
                    }
                    try {
                        createdGroup._setOwner(this.userId);
                        createdGroup._setCreatedAt(Date.now());
                        const membersCount = hasMembers && members ? members.length + 1 : 1; // +1 for the admin/owner
                        createdGroup._setMembersCount(membersCount);
                        createdGroup._setHasJoined(true);
                    }
                    catch (setError) {
                        console.warn("⚠️ [GroupChat] Warning: Failed to set some group properties:", setError);
                    }
                    console.log(`✅ [GroupChat] Group created${hasMembers ? ' with members' : ''} successfully!`);
                    console.log(`👤 [GroupChat] Group created by user: ${this.userId} (${this.userName})`);
                    console.log(`🏠 [GroupChat] Group Room ID: ${roomId}`);
                    console.log(`📝 [GroupChat] Group Name: ${group.getName()}`);
                    console.log(`🔒 [GroupChat] Group Type: ${group.getType()}`);
                    if (group.getType() === GROUP_TYPE.PASSWORD && group.getPassword()) {
                        try {
                            console.log("🔐 [GroupChat] Setting password for protected group...");
                            await this.setGroupPassword(roomId, group.getPassword());
                            console.log("✅ [GroupChat] Password set successfully for protected group");
                        }
                        catch (passwordError) {
                            console.error("❌ [GroupChat] Failed to set password for protected group:", passwordError);
                        }
                    }
                    resolve(createdGroup);
                }
                else {
                    const errorMessage = response.data?.message || response.data?.error || "Group creation failed";
                    const statusCode = response.data?.status || "unknown";
                    reject(new Error(`Group creation failed (status: ${statusCode}): ${errorMessage}`));
                }
            }
            catch (error) {
                console.error("❌ [GroupChat] Unexpected error creating group:", error);
                if (error instanceof Error) {
                    reject(error);
                }
                else if (typeof error === 'string') {
                    reject(new Error(error));
                }
                else {
                    reject(new Error(`Failed to create group: ${error.message || String(error)}`));
                }
            }
        });
    }
    static addMembersToGroup(guid, membersList, groupName) {
        return new Promise(async (resolve, reject) => {
            try {
                if (!this.organizationId || typeof this.organizationId !== 'string' || !this.organizationId.trim()) {
                    reject(new Error("SDK not initialized. Call SamparkChat.init() first."));
                    return;
                }
                if (!this.applicationId || typeof this.applicationId !== 'string' || !this.applicationId.trim()) {
                    reject(new Error("SDK not initialized. Application ID is missing. Call SamparkChat.init() first."));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                if (!membersList || !Array.isArray(membersList) || membersList.length === 0) {
                    reject(new Error("Members list is required and must contain at least one GroupMember object"));
                    return;
                }
                const validGroupMembers = [];
                for (const member of membersList) {
                    if (!(member instanceof GroupMember)) {
                        reject(new Error(`Invalid member: Expected GroupMember object, got ${typeof member}. Use: new GroupMember(uid, scope, name)`));
                        return;
                    }
                    const uid = member.getUid();
                    if (!uid || typeof uid !== 'string' || !uid.trim()) {
                        console.warn(`⚠️ [GroupChat] Skipping member with invalid UID: ${uid}`);
                        continue;
                    }
                    validGroupMembers.push(member);
                }
                if (validGroupMembers.length === 0) {
                    reject(new Error("No valid members provided. All members must be valid GroupMember objects with non-empty UIDs."));
                    return;
                }
                let roleToAssign = GROUP_MEMBER_SCOPE.PARTICIPANT;
                if (validGroupMembers.length > 0) {
                    const firstMemberScope = validGroupMembers[0].getScope();
                    const validRoles = Object.values(GROUP_MEMBER_SCOPE);
                    if (validRoles.includes(firstMemberScope)) {
                        roleToAssign = firstMemberScope;
                    }
                }
                const finalGroupName = groupName && typeof groupName === 'string' && groupName.trim()
                    ? groupName.trim()
                    : "";
                const requestBody = new AddMembersRequest(trimmedGuid, this.organizationId.trim(), validGroupMembers, roleToAssign, finalGroupName);
                const response = await axios.post(`${apiUrl}/chat/addParticipants`, requestBody, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    const responseData = response.data.data;
                    const result = {
                        room_id: responseData?.room_id || trimmedGuid,
                        addedParticipants: responseData?.addedParticipants || [],
                        existingParticipants: responseData?.existingParticipants || [],
                        assignedRole: responseData?.assignedRole || roleToAssign,
                        totalAdded: responseData?.addedParticipants?.length || 0,
                        totalExisting: responseData?.existingParticipants?.length || 0,
                        totalProcessed: (responseData?.addedParticipants?.length || 0) + (responseData?.existingParticipants?.length || 0)
                    };
                    // Socket event will automatically trigger onMemberAddedToGroup listeners
                    // No need for manual trigger - backend emits 'membersAddedToGroup' event
                    resolve(result);
                }
                else {
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: response.data?.message || "Failed to add members",
                        error_code: response.data?.error_code || 'ADD_PARTICIPANT_ERROR',
                        data: response.data?.data
                    }, "Add Members to Group");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error("Failed to add members"));
                    }
                }
            }
            catch (error) {
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Add Members to Group");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to add members"));
                }
            }
        });
    }
    static leaveGroup(guid) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                console.log('🚪 [GroupChat] Leaving group:', trimmedGuid);
                console.log(`👤 [GroupChat] User leaving: ${this.userId} (${this.userName})`);
                const response = await axios.post(`${apiUrl}/chat/updateGroupStatusByParticipant`, {
                    action: 'update_group_status_by_participant',
                    data: {
                        organization_id: this.organizationId.trim(),
                        participant_id: this.userId.trim(),
                        group_id: trimmedGuid,
                        group_status: 'left',
                        action_type: 'leave'
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    console.log('✅ [GroupChat] Successfully left group:', trimmedGuid);
                    if (this.currentRoomId === trimmedGuid) {
                        console.log('🔄 [GroupChat] Cleared current room ID after leaving');
                        this.currentRoomId = null;
                    }
                    resolve({
                        success: true,
                        group_id: trimmedGuid
                    });
                }
                else {
                    const errorMessage = response.data?.message || "Failed to leave group";
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: errorMessage,
                        error_code: response.data?.error_code || 'LEAVE_GROUP_ERROR',
                        data: response.data?.data
                    }, "Leave Group");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error(errorMessage));
                    }
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to leave group:', error);
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Leave Group");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to leave group"));
                }
            }
        });
    }
    static transferOwnershipAndLeave(guid, newOwnerUid) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                if (!newOwnerUid || typeof newOwnerUid !== 'string' || !newOwnerUid.trim()) {
                    reject(new Error("New owner UID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                const trimmedNewOwnerUid = newOwnerUid.trim();
                if (trimmedNewOwnerUid === this.userId.trim()) {
                    reject(new Error("Cannot transfer ownership to yourself"));
                    return;
                }
                console.log('👑 [GroupChat] Transferring ownership and leaving group:', trimmedGuid);
                console.log(`👤 [GroupChat] Current owner: ${this.userId}, New owner: ${trimmedNewOwnerUid}`);
                const response = await axios.post(`${apiUrl}/chat/transferOwnershipAndLeave`, {
                    action: 'transfer_ownership_and_leave',
                    data: {
                        room_id: trimmedGuid,
                        organization_id: this.organizationId.trim(),
                        application_id: this.applicationId.trim(),
                        current_owner_id: this.userId.trim(),
                        new_owner_id: trimmedNewOwnerUid
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    console.log('✅ [GroupChat] Ownership transferred and left group successfully');
                    // Emit socket event to notify all group members in real-time
                    if (this.socket && this.socket.connected) {
                        console.log('📡 [GroupChat] Emitting LeaveGroupByTransferOwnership socket event...');
                        this.socket.emit('LeaveGroupByTransferOwnership', {
                            userId: this.userId.trim(),
                            roomId: trimmedGuid
                        });
                    }
                    if (this.currentRoomId === trimmedGuid) {
                        console.log('🔄 [GroupChat] Cleared current room ID after ownership transfer');
                        this.currentRoomId = null;
                    }
                    const responseData = response.data.data;
                    resolve({
                        success: true,
                        room_id: responseData?.room_id || trimmedGuid,
                        former_owner_id: responseData?.former_owner_id || this.userId.trim(),
                        new_owner_id: responseData?.new_owner_id || trimmedNewOwnerUid,
                        transferred_at: responseData?.transferred_at || new Date().toISOString()
                    });
                }
                else {
                    const errorMessage = response.data?.message || "Failed to transfer ownership";
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: errorMessage,
                        error_code: response.data?.error_code || 'TRANSFER_OWNERSHIP_ERROR',
                        data: response.data?.data
                    }, "Transfer Ownership");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error(errorMessage));
                    }
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to transfer ownership:', error);
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Transfer Ownership");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to transfer ownership"));
                }
            }
        });
    }
    static ownerDeleteAndExitGroup(guid) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                const response = await axios.post(`${apiUrl}/chat/ownerDeleteAndExitGroup`, {
                    action: 'owner_delete_and_exit_group',
                    data: {
                        room_id: trimmedGuid,
                        organization_id: this.organizationId.trim(),
                        application_id: this.applicationId.trim(),
                        owner_id: this.userId.trim()
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    if (this.socket && this.socket.connected) {
                        console.log('📡 [GroupChat] Emitting ownerDeleteAndExitGroup socket event...');
                        this.socket.emit('ownerDeleteAndExitGroup', {
                            room_id: trimmedGuid,
                            organization_id: this.organizationId.trim(),
                            owner_id: this.userId.trim(),
                            application_id: this.applicationId.trim()
                        });
                    }
                    if (this.currentRoomId === trimmedGuid) {
                        console.log('🔄 [GroupChat] Cleared current room ID after group deletion');
                        this.currentRoomId = null;
                    }
                    const responseData = response.data.data;
                    resolve({
                        success: true,
                        room_id: responseData?.room_id || trimmedGuid,
                        participants_removed: responseData?.participants_removed || 0,
                        dissolved_at: responseData?.dissolved_at || new Date().toISOString()
                    });
                }
                else {
                    const errorMessage = response.data?.message || "Failed to delete group";
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: errorMessage,
                        error_code: response.data?.error_code || 'OWNER_DELETE_EXIT_GROUP_ERROR',
                        data: response.data?.data
                    }, "Delete Group");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error(errorMessage));
                    }
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to delete group:', error);
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Delete Group");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to delete group"));
                }
            }
        });
    }
    static kickGroupMember(guid, uid) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                if (!uid || typeof uid !== 'string' || !uid.trim()) {
                    reject(new Error("User UID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                const trimmedUid = uid.trim();
                if (trimmedUid === this.userId.trim()) {
                    reject(new Error("Cannot kick yourself from the group. Use leaveGroup() instead."));
                    return;
                }
                console.log('👢 [GroupChat] Kicking member from group:', { groupId: trimmedGuid, memberId: trimmedUid });
                console.log(`👤 [GroupChat] Kicked by: ${this.userId} (${this.userName})`);
                const response = await axios.post(`${apiUrl}/chat/updateGroupStatusByParticipant`, {
                    action: 'update_group_status_by_participant',
                    data: {
                        organization_id: this.organizationId.trim(),
                        participant_id: trimmedUid,
                        group_id: trimmedGuid,
                        group_status: 'removed',
                        removed_by: this.userId.trim(),
                        action_type: 'remove'
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    console.log('✅ [GroupChat] Successfully kicked member from group:', { groupId: trimmedGuid, memberId: trimmedUid });
                    resolve({
                        success: true,
                        group_id: trimmedGuid,
                        participant_id: trimmedUid
                    });
                }
                else {
                    const errorMessage = response.data?.message || "Failed to kick group member";
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: errorMessage,
                        error_code: response.data?.error_code || 'KICK_GROUP_MEMBER_ERROR',
                        data: response.data?.data
                    }, "Kick Group Member");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error(errorMessage));
                    }
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to kick group member:', error);
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Kick Group Member");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to kick group member"));
                }
            }
        });
    }
    static banGroupMember(guid, uid, banReason) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                if (!uid || typeof uid !== 'string' || !uid.trim()) {
                    reject(new Error("User UID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                const trimmedUid = uid.trim();
                if (trimmedUid === this.userId.trim()) {
                    reject(new Error("Cannot ban yourself from the group."));
                    return;
                }
                console.log('🚫 [GroupChat] Banning member from group:', { groupId: trimmedGuid, memberId: trimmedUid, banReason });
                console.log(`👤 [GroupChat] Banned by: ${this.userId} (${this.userName})`);
                const response = await axios.post(`${apiUrl}/chat/banGroupParticipant`, {
                    action: 'ban_group_participant',
                    data: {
                        organization_id: this.organizationId.trim(),
                        participant_id: trimmedUid,
                        group_id: trimmedGuid,
                        application_id: this.applicationId.trim(),
                        admin_id: this.userId.trim(),
                        ban_reason: banReason || 'No reason provided'
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    const responseData = response.data.data || {};
                    const bannedAt = responseData.banned_at || new Date().toISOString();
                    const banReasonValue = responseData.ban_reason || banReason || 'No reason provided';
                    console.log('✅ [GroupChat] Successfully banned member from group:', {
                        groupId: trimmedGuid,
                        memberId: trimmedUid,
                        bannedBy: responseData.banned_by || this.userId,
                        bannedAt,
                        banReason: banReasonValue
                    });
                    resolve({
                        success: true,
                        group_id: trimmedGuid,
                        participant_id: trimmedUid,
                        banned_by: responseData.banned_by || this.userId,
                        banned_at: bannedAt,
                        ban_reason: banReasonValue
                    });
                }
                else {
                    const errorMessage = response.data?.message || "Failed to ban group member";
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: errorMessage,
                        error_code: response.data?.error_code || 'BAN_GROUP_MEMBER_ERROR',
                        data: response.data?.data
                    }, "Ban Group Member");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error(errorMessage));
                    }
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to ban group member:', error);
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Ban Group Member");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to ban group member"));
                }
            }
        });
    }
    static unbanGroupMember(guid, uid, unbanReason) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                if (!uid || typeof uid !== 'string' || !uid.trim()) {
                    reject(new Error("User UID is required and must be a non-empty string"));
                    return;
                }
                const trimmedGuid = guid.trim();
                const trimmedUid = uid.trim();
                console.log('✅ [GroupChat] Unbanning member from group:', { groupId: trimmedGuid, memberId: trimmedUid, unbanReason });
                console.log(`👤 [GroupChat] Unbanned by: ${this.userId} (${this.userName})`);
                const response = await axios.post(`${apiUrl}/chat/directUnbanParticipant`, {
                    action: 'direct_unban_participant',
                    data: {
                        organization_id: this.organizationId.trim(),
                        user_id: trimmedUid,
                        room_id: trimmedGuid,
                        application_id: this.applicationId.trim(),
                        admin_id: this.userId.trim(),
                        admin_reason: unbanReason || 'Direct unban by admin'
                    }
                }, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    const responseData = response.data.data || {};
                    const unbannedAt = responseData.unbanned_at || new Date().toISOString();
                    const unbanReasonValue = responseData.unban_reason || unbanReason || 'Direct unban by admin';
                    console.log('✅ [GroupChat] Successfully unbanned member from group:', {
                        groupId: trimmedGuid,
                        memberId: trimmedUid,
                        unbannedBy: responseData.unbanned_by || this.userId,
                        unbannedAt,
                        unbanReason: unbanReasonValue
                    });
                    resolve({
                        success: true,
                        room_id: trimmedGuid,
                        user_id: trimmedUid,
                        unbanned_by: responseData.unbanned_by || this.userId,
                        unbanned_at: unbannedAt,
                        unban_reason: unbanReasonValue
                    });
                }
                else {
                    const errorMessage = response.data?.message || "Failed to unban group member";
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: response.data?.status || response.status,
                        message: errorMessage,
                        error_code: response.data?.error_code || 'DIRECT_UNBAN_PARTICIPANT_ERROR',
                        data: response.data?.data
                    }, "Unban Group Member");
                    if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error(errorMessage));
                    }
                }
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to unban group member:', error);
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Unban Group Member");
                if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error(error.message || "Failed to unban group member"));
                }
            }
        });
    }
    static updateGroupMemberScope(guid, uid, newScope) {
        return new Promise((resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!guid || typeof guid !== 'string' || !guid.trim()) {
                    reject(new Error("Group GUID is required and must be a non-empty string"));
                    return;
                }
                if (!uid || typeof uid !== 'string' || !uid.trim()) {
                    reject(new Error("User UID is required and must be a non-empty string"));
                    return;
                }
                const validScopes = Object.values(GROUP_MEMBER_SCOPE).filter(s => s !== GROUP_MEMBER_SCOPE.OWNER);
                if (!newScope || !validScopes.includes(newScope)) {
                    reject(new Error(`Invalid scope. Must be one of: ${validScopes.join(", ")}`));
                    return;
                }
                const trimmedGuid = guid.trim();
                const trimmedUid = uid.trim();
                if (!this.socket || this.socket.disconnected || !this.socket.connected) {
                    reject(new Error("Socket is not connected. Please reconnect and try again."));
                    return;
                }
                console.log('🔄 [GroupChat] Updating member scope via socket:', {
                    groupId: trimmedGuid,
                    memberId: trimmedUid,
                    newScope,
                    updatedBy: this.userId
                });
                const onRoleUpdated = (payload) => {
                    if (payload.room_id === trimmedGuid && payload.target_user_id === trimmedUid) {
                        cleanup();
                        console.log('✅ [GroupChat] Successfully updated member scope:', payload);
                        resolve({
                            success: true,
                            room_id: payload.room_id,
                            target_user_id: payload.target_user_id,
                            new_role: payload.new_role,
                            updated_by: payload.updated_by
                        });
                    }
                };
                const onRoleUpdateError = (payload) => {
                    cleanup();
                    console.error('❌ [GroupChat] Role update error from server:', payload.error);
                    reject(new Error(payload.error || "Failed to update member scope"));
                };
                const cleanup = () => {
                    this.socket?.removeListener('roleUpdated', onRoleUpdated);
                    this.socket?.removeListener('roleUpdateError', onRoleUpdateError);
                };
                this.socket.on('roleUpdated', onRoleUpdated);
                this.socket.on('roleUpdateError', onRoleUpdateError);
                this.socket.emit('updateParticipantRole', {
                    room_id: trimmedGuid,
                    organization_id: this.organizationId.trim(),
                    application_id: this.applicationId.trim(),
                    current_user_id: this.userId.trim(),
                    target_user_id: trimmedUid,
                    new_role: newScope
                });
            }
            catch (error) {
                console.error('❌ [GroupChat] Failed to update member scope:', error);
                reject(new Error(error.message || "Failed to update member scope"));
            }
        });
    }
    static async uploadFile(file, roomId, userId, userName, messageId, uploadSource = 'group_chat') {
        return GroupMediaService.uploadFile(file, roomId, userId, userName, messageId, uploadSource);
    }
    static async downloadFile(fileId) {
        return GroupMediaService.downloadFile(fileId);
    }
    static async getFileInfo(fileId) {
        return GroupMediaService.getFileInfo(fileId);
    }
    static async getParticipant(roomId) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                    reject(new Error("Room ID is required and must be a non-empty string"));
                    return;
                }
                const trimmedRoomId = roomId.trim();
                const payload = new GetParticipantsRequest(trimmedRoomId, this.organizationId);
                const response = await axios.post(`${apiUrl}/chat/getParticipents`, payload, { withCredentials: true });
                if (response.data && response.data.status === 200) {
                    const responseData = response.data.data;
                    if (!responseData) {
                        console.warn("⚠️ [GroupChat] Response data is missing");
                        reject(new Error("Invalid response: Response data is missing"));
                        return;
                    }
                    const participants = responseData.participants;
                    if (!participants) {
                        console.warn("⚠️ [GroupChat] Participants field is missing, returning empty array");
                        resolve({
                            room_id: responseData.room_id || trimmedRoomId,
                            participants: []
                        });
                        return;
                    }
                    if (!Array.isArray(participants)) {
                        console.warn("⚠️ [GroupChat] Participants is not an array, returning empty array");
                        resolve({
                            room_id: responseData.room_id || trimmedRoomId,
                            participants: []
                        });
                        return;
                    }
                    resolve({
                        room_id: responseData.room_id || trimmedRoomId,
                        participants: participants
                    });
                }
                else {
                    const statusCode = response.data?.status || response.status;
                    const errorResult = PeerChatErrorHandler.handleApiErrorResponse({
                        status: statusCode,
                        message: response.data?.message || "Failed to retrieve participants",
                        error_code: response.data?.error_code || 'GET_PARTICIPANTS_ERROR',
                        data: response.data?.data
                    }, "Get Participants");
                    if (statusCode === 404) {
                        reject(new Error("Group chat not found. The specified room does not exist."));
                    }
                    else if (errorResult.isError && errorResult.error) {
                        reject(errorResult.error);
                    }
                    else {
                        reject(new Error("Failed to retrieve participants"));
                    }
                }
            }
            catch (error) {
                const errorResult = PeerChatErrorHandler.handleAxiosError(error, "Get Participants");
                if (error.response?.status === 404) {
                    reject(new Error("Group chat not found. The specified room does not exist."));
                }
                else if (errorResult.isError && errorResult.error) {
                    reject(errorResult.error);
                }
                else {
                    reject(new Error("Failed to retrieve participants"));
                }
            }
        });
    }
    static async fetchPreviousMessages(groupId, options = {}) {
        const validationError = PeerChatErrorHandler.validateSDKInitialization({
            socket: this.socket,
            userId: this.userId,
            organizationId: this.organizationId,
            applicationId: this.applicationId
        });
        if (validationError) {
            throw new Error(validationError);
        }
        if (!groupId || typeof groupId !== 'string' || !groupId.trim()) {
            throw PeerChatErrorHandler.handleSDKInitializationError("groupId is required and must be a non-empty string", "fetchPreviousMessages");
        }
        const { limit = 100, page = 1, includeDeleted = false, userGroupStatus = 'Active', userGroupUpdatedAt, password } = options;
        if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
            throw PeerChatErrorHandler.handleSDKInitializationError("limit must be a positive number", "fetchPreviousMessages");
        }
        if (typeof page !== 'number' || isNaN(page) || page < 1) {
            throw PeerChatErrorHandler.handleSDKInitializationError("page must be a positive number", "fetchPreviousMessages");
        }
        const safePage = Math.max(1, Math.floor(page));
        const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
        try {
            console.log('📥 [GroupChat] Fetching previous messages:', { groupId, limit: safeLimit, page: safePage });
            const requestData = {
                room_id: groupId.trim(),
                organization_id: this.organizationId.trim(),
                user_id: this.userId.trim(),
                page: safePage,
                limit: safeLimit,
                include_deleted: includeDeleted,
                user_group_status: userGroupStatus
            };
            if (userGroupUpdatedAt && typeof userGroupUpdatedAt === 'string' && userGroupUpdatedAt.trim()) {
                requestData.user_group_updated_at = userGroupUpdatedAt.trim();
            }
            if (password && typeof password === 'string' && password.trim()) {
                requestData.password = password.trim();
            }
            const response = await axios.post(`${apiUrl}/chat/getPaginatedGroupChat`, {
                action: 'get_group_chat',
                data: requestData
            }, { withCredentials: true });
            if (!response.data || response.data.status !== 200) {
                const apiResult = PeerChatErrorHandler.handleApiErrorResponse({
                    status: response.data?.status,
                    message: response.data?.message || response.data?.error || "Failed to fetch messages"
                }, "fetchPreviousMessages", safePage);
                if (apiResult.isEmptyResult && apiResult.emptyResult) {
                    return { ...apiResult.emptyResult, participantGroupStatus: undefined };
                }
                if (apiResult.isError && apiResult.error) {
                    throw apiResult.error;
                }
                throw new Error("Failed to fetch messages");
            }
            const { chats, currentPage, totalPages, totalChats, participant_group_status } = response.data.data;
            const messages = (chats || []).map((chat) => {
                const messageText = chat.chat || chat.message || chat.text || chat.content || "";
                const senderId = chat.user || chat.sender_id || chat.user_id || "";
                const senderName = chat.user_name || chat.sender_name || senderId || "";
                const textMessageGroup = new TextMessageGroup(groupId, messageText);
                textMessageGroup._setId(chat.message_id || chat.id || chat._id || "");
                textMessageGroup._setSenderId(senderId);
                textMessageGroup._setSenderName(senderName);
                textMessageGroup._setSentAt(chat.created_at || chat.timestamp || chat.sent_at || "");
                textMessageGroup._setStatus(chat.status || "delivered");
                if (chat.reactions && Array.isArray(chat.reactions)) {
                    textMessageGroup.reactionsData = chat.reactions;
                }
                if (chat.reply_to_message_id || chat.parent_message_id) {
                    textMessageGroup._setReplyToMessageId(chat.reply_to_message_id || chat.parent_message_id || "");
                }
                if (chat.reply_to_user_id) {
                    textMessageGroup._setReplyToUserId(chat.reply_to_user_id);
                }
                if (chat.reply_to_text || chat.parent_message_text) {
                    textMessageGroup._setReplyToText(chat.reply_to_text || chat.parent_message_text || "");
                }
                if (chat.reply_type) {
                    textMessageGroup._setReplyType(chat.reply_type);
                }
                if (chat.edited_at) {
                    textMessageGroup._setEditedAt(chat.edited_at);
                }
                if (chat.edited_by) {
                    textMessageGroup._setEditedBy(chat.edited_by);
                }
                if (chat.deleted_at) {
                    textMessageGroup._setDeletedAt(chat.deleted_at);
                }
                if (chat.deleted_by) {
                    textMessageGroup._setDeletedBy(chat.deleted_by);
                }
                const chatMessageType = chat.message_type || chat.messageType || undefined;
                const chatFileInfo = chat.file_info || chat.fileInfo || undefined;
                if (chatMessageType && chatMessageType !== 'text') {
                    textMessageGroup.messageType = chatMessageType;
                }
                if (chatFileInfo) {
                    const fileId = chatFileInfo.fileId || chatFileInfo.file_id || chat.file_id || "";
                    let attachmentUrl = chatFileInfo.downloadUrl || chatFileInfo.download_url;
                    if (!attachmentUrl && fileId) {
                        attachmentUrl = `${apiUrl}/chat/download/${fileId}`;
                    }
                    if (attachmentUrl && !attachmentUrl.startsWith('http')) {
                        const cleanPath = attachmentUrl.startsWith('/') ? attachmentUrl.substring(1) : attachmentUrl;
                        attachmentUrl = `${apiUrl}/${cleanPath}`;
                    }
                    const fileInfo = {
                        ...chatFileInfo,
                        fileId: fileId,
                        attachmentUrl: attachmentUrl,
                        downloadUrl: attachmentUrl,
                        originalName: chatFileInfo.originalName || chatFileInfo.original_name || chatFileInfo.name,
                        mimeType: chatFileInfo.mimeType || chatFileInfo.mime_type || chatFileInfo.type
                    };
                    textMessageGroup.fileInfo = fileInfo;
                    if (!textMessageGroup.data) {
                        textMessageGroup.data = {};
                    }
                    if (attachmentUrl) {
                        textMessageGroup.data.attachments = [{
                                url: attachmentUrl,
                                mimeType: fileInfo.mimeType
                            }];
                        textMessageGroup.data.url = attachmentUrl;
                        // Add direct attachment property for easier access
                        textMessageGroup.attachmentUrl = attachmentUrl;
                    }
                    console.log('📎 [GroupChat] Extracted fileInfo from history:', {
                        messageId: textMessageGroup.getId && textMessageGroup.getId(),
                        messageType: chatMessageType,
                        fileId: fileId,
                        fileName: fileInfo.originalName,
                        downloadUrl: attachmentUrl,
                        hasUrl: !!attachmentUrl
                    });
                }
                const sender = new GroupUser(senderId, senderName);
                textMessageGroup._setSender(sender);
                return textMessageGroup;
            });
            return {
                messages,
                currentPage: currentPage || safePage,
                totalPages: totalPages || 1,
                totalChats: totalChats || messages.length,
                participantGroupStatus: participant_group_status
            };
        }
        catch (error) {
            if (error instanceof Error && !error.message.includes('Request failed')) {
                const lowerMsg = error.message.toLowerCase();
                if (lowerMsg.includes('no data found') ||
                    lowerMsg.includes('not found') ||
                    lowerMsg.includes('access denied') ||
                    lowerMsg.includes('password required') ||
                    lowerMsg.includes('invalid password')) {
                    console.log('📭 [GroupChat] fetchPreviousMessages:', error.message);
                    return {
                        messages: [],
                        currentPage: safePage,
                        totalPages: 0,
                        totalChats: 0
                    };
                }
                throw error;
            }
            const axiosResult = PeerChatErrorHandler.handleAxiosError(error, "fetchPreviousMessages", safePage);
            if (axiosResult.isEmptyResult && axiosResult.emptyResult) {
                return { ...axiosResult.emptyResult, participantGroupStatus: undefined };
            }
            if (axiosResult.isError && axiosResult.error) {
                throw axiosResult.error;
            }
            throw new Error(error.message || "Failed to fetch messages");
        }
    }
    static async _verifyGroupPassword(roomId, password) {
        try {
            if (!this.organizationId || typeof this.organizationId !== 'string' || !this.organizationId.trim()) {
                throw new Error("SDK not initialized. Call SamparkChat.init() first.");
            }
            if (!this.userId || typeof this.userId !== 'string' || !this.userId.trim()) {
                throw new Error("User not logged in. Call SamparkChat.login() first.");
            }
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error("Room ID is required");
            }
            if (!password || typeof password !== 'string' || !password.trim()) {
                throw new Error("Password is required");
            }
            console.log('🔐 [GroupChat] Verifying group password for room:', roomId);
            const response = await axios.post(`${apiUrl}/chat/verifyGroupPassword`, {
                action: 'verify_group_password',
                data: {
                    room_id: roomId.trim(),
                    organization_id: this.organizationId.trim(),
                    user_id: this.userId.trim(),
                    password: password.trim()
                }
            }, { withCredentials: true });
            if (response.data && response.data.status === 200) {
                const verified = response.data.data?.verified === true;
                console.log('✅ [GroupChat] Password verification result:', verified);
                return verified;
            }
            else {
                console.error('❌ [GroupChat] Password verification failed:', response.data?.message);
                return false;
            }
        }
        catch (error) {
            console.error('❌ [GroupChat] Failed to verify group password:', error);
            if (error.response?.data?.status === 401) {
                // Invalid password
                return false;
            }
            throw new Error(error.response?.data?.message || error.message || "Failed to verify password");
        }
    }
    static async setGroupPassword(roomId, password) {
        try {
            if (!this.organizationId || typeof this.organizationId !== 'string' || !this.organizationId.trim()) {
                throw new Error("SDK not initialized. Call SamparkChat.init() first.");
            }
            if (!this.userId || typeof this.userId !== 'string' || !this.userId.trim()) {
                throw new Error("User not logged in. Call SamparkChat.login() first.");
            }
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error("Room ID is required");
            }
            if (!password || typeof password !== 'string' || !password.trim()) {
                throw new Error("Password is required");
            }
            console.log('🔐 [GroupChat] Setting group password for room:', roomId);
            const response = await axios.post(`${apiUrl}/chat/setGroupPassword`, {
                action: 'set_group_password',
                data: {
                    room_id: roomId.trim(),
                    organization_id: this.organizationId.trim(),
                    user_id: this.userId.trim(),
                    password: password.trim()
                }
            }, { withCredentials: true });
            if (response.data && response.data.status === 200) {
                console.log('✅ [GroupChat] Password set successfully');
                return;
            }
            else {
                const errorMessage = response.data?.message || "Failed to set password";
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            console.error('❌ [GroupChat] Failed to set group password:', error);
            throw new Error(error.response?.data?.message || error.message || "Failed to set password");
        }
    }
}
GroupChat.organizationId = "";
GroupChat.applicationId = "";
GroupChat.userId = "";
GroupChat.userName = "";
GroupChat.socket = null;
GroupChat.listeners = new Map();
GroupChat.currentRoomId = null;
GroupChat.groupPasswords = new Map();
GroupChat.bannedRooms = new Set();
GroupChat.Group = Group;
GroupChat.GroupMember = GroupMember;
GroupChat.GROUP_MEMBER_SCOPE = GROUP_MEMBER_SCOPE;
class GroupReactionRequestBuilder {
    constructor() {
        this.messageId = "";
        this.limit = 10;
    }
    setMessageId(messageId) {
        this.messageId = messageId;
        return this;
    }
    setLimit(limit) {
        this.limit = Math.min(50, Math.max(1, limit));
        return this;
    }
    build() {
        if (!this.messageId || !this.messageId.trim()) {
            throw new Error("Message ID is required. Call setMessageId() before build().");
        }
        return new GroupReactionRequest(this.messageId, this.limit);
    }
}
class GroupReactionRequest {
    constructor(messageId, limit) {
        this.messageId = messageId;
        this.limit = limit;
    }
    async fetchNext() {
        try {
            console.log('👍 [GroupReactionRequest] Fetching reactions for group message:', this.messageId);
            console.log('⚠️ [GroupReactionRequest] Mock reactions - implement backend endpoint for real data');
            return [];
        }
        catch (error) {
            console.error('❌ [GroupReactionRequest] Failed to fetch group reactions:', error);
            throw error;
        }
    }
    async fetchPrevious() {
        return this.fetchNext();
    }
}

var GroupChat$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    GroupMessagesRequest: GroupMessagesRequest,
    GroupMessagesRequestBuilder: GroupMessagesRequestBuilder,
    GroupReactionRequest: GroupReactionRequest,
    GroupReactionRequestBuilder: GroupReactionRequestBuilder,
    default: GroupChat
});

class GroupMembersRequestBuilder {
    constructor() {
        this.guid = "";
        this.limit = 30;
    }
    setGUID(guid) {
        if (!guid || typeof guid !== 'string' || !guid.trim()) {
            throw new Error("GUID is required and must be a non-empty string");
        }
        this.guid = guid.trim();
        return this;
    }
    setLimit(limit) {
        if (!limit || typeof limit !== 'number' || isNaN(limit) || !isFinite(limit) || limit <= 0) {
            throw new Error("Limit must be a positive finite number");
        }
        this.limit = Math.min(100, Math.max(1, Math.floor(limit)));
        return this;
    }
    build() {
        if (!this.guid || !this.guid.trim()) {
            throw new Error("GUID is required. Call setGUID() before build().");
        }
        return new GroupMembersRequest(this.guid, this.limit);
    }
}
class GroupMembersRequest {
    constructor(guid, limit) {
        if (!guid || typeof guid !== 'string' || !guid.trim()) {
            throw new Error("GUID is required and must be a non-empty string");
        }
        if (!limit || typeof limit !== 'number' || isNaN(limit) || !isFinite(limit) || limit <= 0) {
            throw new Error("Limit must be a positive finite number");
        }
        this.guid = guid.trim();
        this.limit = Math.floor(limit);
    }
    async fetchNext() {
        try {
            console.log('👥 [GroupMembersRequest] Fetching group members for GUID:', this.guid);
            const response = await GroupChat.getParticipant(this.guid);
            // getParticipant returns { room_id, participants } object
            const participants = response?.participants;
            if (!participants || !Array.isArray(participants) || participants.length === 0) {
                console.log('📭 [GroupMembersRequest] No participants found or invalid response');
                console.log('📭 [GroupMembersRequest] Response:', response);
                return [];
            }
            // Convert participants to GroupMember objects
            const groupMembers = [];
            for (let i = 0; i < Math.min(participants.length, this.limit); i++) {
                const participant = participants[i];
                if (!participant || typeof participant !== 'object') {
                    continue;
                }
                // Skip banned participants — they should be fetched via BannedMembersRequestBuilder
                // Also skip left and removed participants — they are no longer active members
                const participantStatus = (participant.status || '').toString().trim().toLowerCase();
                const participantGroupStatus = (participant.participant_group_status || '').toString().trim().toLowerCase();
                if (participantStatus === 'banned' || participantGroupStatus === 'banned' ||
                    participantStatus === 'left' || participantGroupStatus === 'left' ||
                    participantStatus === 'removed' || participantGroupStatus === 'removed') {
                    console.log(`🚫 [GroupMembersRequest] Skipping participant with status: ${participantStatus || participantGroupStatus}`);
                    continue;
                }
                try {
                    const uid = (participant.user_id || participant.participant_id || participant.id || participant.uid || "").toString().trim();
                    if (!uid) {
                        continue;
                    }
                    const name = (participant.user_name || participant.name || participant.participant_name || "").toString().trim() || undefined;
                    let scope = GROUP_MEMBER_SCOPE.PARTICIPANT;
                    const roleValue = (participant.user_role || participant.role || participant.scope || "").toString().trim();
                    const validScopes = Object.values(GROUP_MEMBER_SCOPE);
                    if (validScopes.includes(roleValue)) {
                        scope = roleValue;
                        console.log(`✅ [GroupMembersRequest] Assigned scope "${scope}" to ${uid}`);
                    }
                    else {
                        console.log(`⚠️ [GroupMembersRequest] Role value "${roleValue}" not in valid scopes, using default PARTICIPANT`);
                    }
                    const groupMember = new GroupMember(uid, scope, name);
                    groupMembers.push(groupMember);
                }
                catch (error) {
                    console.error('❌ [GroupMembersRequest] Error creating GroupMember:', error);
                    continue;
                }
            }
            console.log('✅ [GroupMembersRequest] Group members fetched successfully:', groupMembers.length);
            return groupMembers;
        }
        catch (error) {
            console.error('❌ [GroupMembersRequest] fetchNext failed:', error);
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
            if (errorMessage.includes('access denied') ||
                errorMessage.includes('forbidden') ||
                errorMessage.includes('not found') ||
                errorMessage.includes('404') ||
                errorMessage.includes('403')) {
                return [];
            }
            throw error;
        }
    }
    async fetchPrevious() {
        return this.fetchNext();
    }
}

class BannedMembersRequestBuilder {
    constructor(guid) {
        this.guid = "";
        this.limit = 30;
        if (guid) {
            if (typeof guid !== 'string' || !guid.trim()) {
                throw new Error("GUID must be a non-empty string");
            }
            this.guid = guid.trim();
        }
    }
    setGUID(guid) {
        if (!guid || typeof guid !== 'string' || !guid.trim()) {
            throw new Error("GUID is required and must be a non-empty string");
        }
        this.guid = guid.trim();
        return this;
    }
    setLimit(limit) {
        if (limit === null || limit === undefined || typeof limit !== 'number' || isNaN(limit) || !isFinite(limit) || limit <= 0) {
            throw new Error("Limit must be a positive finite number");
        }
        this.limit = Math.min(100, Math.max(1, Math.floor(limit)));
        return this;
    }
    build() {
        if (!this.guid || !this.guid.trim()) {
            throw new Error("GUID is required. Call setGUID() or pass GUID in constructor before build().");
        }
        return new BannedMembersRequest(this.guid, this.limit);
    }
}
class BannedMembersRequest {
    constructor(guid, limit) {
        this.page = 1;
        this.hasMore = true;
        this.isDestroyed = false;
        this.cachedBannedMembers = null;
        if (!guid || typeof guid !== 'string' || !guid.trim()) {
            throw new Error("[BannedMembersRequest] GUID is required and must be a non-empty string");
        }
        if (typeof limit !== 'number' || isNaN(limit) || !isFinite(limit) || limit < 1 || limit > 100) {
            throw new Error("[BannedMembersRequest] Limit must be a number between 1 and 100");
        }
        this.guid = guid.trim();
        this.limit = Math.floor(limit);
    }
    async fetchNext() {
        if (this.isDestroyed) {
            throw new Error("[BannedMembersRequest] Cannot use destroyed BannedMembersRequest instance");
        }
        if (!this.hasMore) {
            console.log('📭 [BannedMembersRequest] No more banned members to fetch');
            return [];
        }
        try {
            // Dynamically import to avoid circular dependency
            const GroupChatModule = await Promise.resolve().then(function () { return GroupChat$1; });
            const GroupChat = GroupChatModule.default;
            // Validate SDK initialization
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: GroupChat.socket,
                userId: GroupChat.userId,
                organizationId: GroupChat.organizationId,
                applicationId: GroupChat.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            console.log('🚫 [BannedMembersRequest] Fetching banned members for GUID:', this.guid, '| page:', this.page, '| limit:', this.limit);
            // Fetch all participants using the existing getParticipant method
            // We only need to fetch from the API once, then paginate locally
            if (!this.cachedBannedMembers) {
                const response = await GroupChat.getParticipant(this.guid);
                const participants = response?.participants;
                if (!participants || !Array.isArray(participants)) {
                    console.log('📭 [BannedMembersRequest] No participants found or invalid response');
                    this.hasMore = false;
                    this.cachedBannedMembers = [];
                    return [];
                }
                // Filter only banned participants
                const bannedParticipants = participants.filter((participant) => {
                    if (!participant || typeof participant !== 'object') {
                        return false;
                    }
                    const groupStatus = (participant.participant_group_status || '').toString().trim().toLowerCase();
                    const status = (participant.status || '').toString().trim().toLowerCase();
                    return groupStatus === 'banned' || status === 'banned';
                });
                if (bannedParticipants.length === 0) {
                    console.log('📭 [BannedMembersRequest] No banned members found in group:', this.guid);
                    this.hasMore = false;
                    this.cachedBannedMembers = [];
                    return [];
                }
                // Convert banned participants to GroupMember objects
                const bannedMembers = [];
                for (const participant of bannedParticipants) {
                    try {
                        const uid = (participant.user_id || participant.participant_id || participant.id || participant.uid || "").toString().trim();
                        if (!uid) {
                            console.warn('⚠️ [BannedMembersRequest] Skipping participant with no UID');
                            continue;
                        }
                        const name = (participant.user_name || participant.name || participant.participant_name || "").toString().trim() || undefined;
                        let scope = GROUP_MEMBER_SCOPE.PARTICIPANT;
                        const roleValue = (participant.user_role || participant.role || participant.scope || "").toString().trim();
                        const validScopes = Object.values(GROUP_MEMBER_SCOPE);
                        if (validScopes.includes(roleValue)) {
                            scope = roleValue;
                        }
                        const groupMember = new GroupMember(uid, scope, name);
                        // Attach ban metadata to the member for consumer use
                        groupMember.bannedAt = participant.banned_at || null;
                        groupMember.bannedBy = participant.banned_by || null;
                        groupMember.banReason = participant.ban_reason || null;
                        groupMember.participantGroupStatus = participant.participant_group_status || 'banned';
                        bannedMembers.push(groupMember);
                    }
                    catch (memberError) {
                        console.error('❌ [BannedMembersRequest] Error creating GroupMember for banned participant:', memberError);
                        continue;
                    }
                }
                this.cachedBannedMembers = bannedMembers;
                console.log(`🚫 [BannedMembersRequest] Total banned members found: ${bannedMembers.length}`);
            }
            // Apply pagination on the cached banned members
            const startIndex = (this.page - 1) * this.limit;
            const endIndex = startIndex + this.limit;
            const paginatedMembers = this.cachedBannedMembers.slice(startIndex, endIndex);
            const totalPages = Math.ceil(this.cachedBannedMembers.length / this.limit);
            console.log('✅ [BannedMembersRequest] Banned members fetched successfully:', {
                count: paginatedMembers.length,
                total: this.cachedBannedMembers.length,
                currentPage: this.page,
                totalPages
            });
            // Update pagination state
            this.hasMore = this.page < totalPages;
            if (this.hasMore) {
                this.page++;
            }
            return paginatedMembers;
        }
        catch (error) {
            console.error('❌ [BannedMembersRequest] fetchNext failed:', {
                error: error.message,
                guid: this.guid,
                page: this.page,
                limit: this.limit
            });
            // Handle axios/network errors
            if (error.response) {
                const statusCode = error.response.status;
                const errorMessage = error.response.data?.message || error.message || "Failed to fetch banned members";
                if (statusCode === 400) {
                    this.hasMore = false;
                    throw new Error(`Bad request: ${errorMessage}`);
                }
                else if (statusCode === 403) {
                    this.hasMore = false;
                    throw new Error(`Access denied: ${errorMessage}`);
                }
                else if (statusCode === 404) {
                    console.log('📭 [BannedMembersRequest] Group not found (404), returning empty list');
                    this.hasMore = false;
                    return [];
                }
                else if (statusCode === 500) {
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`API error (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            // Soft errors — return empty instead of crashing
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
            if (errorMessage.includes('not found') ||
                errorMessage.includes('access denied') ||
                errorMessage.includes('forbidden') ||
                errorMessage.includes('404') ||
                errorMessage.includes('403')) {
                console.log('📭 [BannedMembersRequest] Soft error, returning empty list');
                this.hasMore = false;
                return [];
            }
            throw error;
        }
    }
    /**
     * Alias for fetchNext — fetches the previous page (same data, for API compatibility)
     */
    async fetchPrevious() {
        return this.fetchNext();
    }
    /**
     * Check if more banned members are available to fetch
     */
    hasMoreMembers() {
        return this.hasMore && !this.isDestroyed;
    }
    /**
     * Reset pagination to start from the beginning and clear cached data
     */
    reset() {
        if (this.isDestroyed) {
            console.warn("[BannedMembersRequest] Cannot reset destroyed instance");
            return;
        }
        this.page = 1;
        this.hasMore = true;
        this.cachedBannedMembers = null;
        console.log('🔄 [BannedMembersRequest] Reset to page 1, cache cleared');
    }
    /**
     * Get current page number
     */
    getCurrentPage() {
        return this.page;
    }
    /**
     * Get the GUID this request is for
     */
    getGUID() {
        return this.guid;
    }
    /**
     * Destroy the request instance — prevents further use
     */
    destroy() {
        this.isDestroyed = true;
        this.hasMore = false;
        this.cachedBannedMembers = null;
        console.log('🗑️ [BannedMembersRequest] Instance destroyed');
    }
}

class GetApplicationParticipantsRequest {
    constructor(organizationId, appId) {
        this.request_id = `get_participants_${Date.now()}`;
        this.timestamp = new Date().toISOString();
        this.action = 'get_application_participants';
        this.data = {
            organization_id: organizationId,
            app_id: appId,
        };
    }
}

class User {
    constructor(uid, name) {
        this.uid = uid;
        this.name = name;
    }
    getUid() { return this.uid; }
    getName() { return this.name; }
    getAvatar() { return this.avatar; }
    getStatus() { return this.status; }
    getMetadata() { return this.metadata; }
    setAvatar(avatar) { this.avatar = avatar; }
    setStatus(status) { this.status = status; }
    setMetadata(metadata) { this.metadata = metadata; }
}
class TextMessage {
    constructor(receiverId, text, receiverType = RECEIVER_TYPE.USER) {
        this.id = "";
        this.senderId = "";
        this.senderName = "";
        this.sentAt = "";
        this.status = "";
        this.editedAt = "";
        this.editedBy = "";
        this.deletedAt = "";
        this.deletedBy = "";
        this.parentMessageId = "";
        this.replyToUserId = "";
        this.replyToText = "";
        this.replyType = ""; // "thread" or "quote"
        this.sender = null;
        this.receiver = null;
        this.receiverId = receiverId;
        this.text = text;
        this.receiverType = receiverType;
    }
    getId() { return this.id; }
    getReceiverId() { return this.receiverId; }
    getSenderId() { return this.senderId; }
    getSenderName() { return this.senderName; }
    getText() { return this.text; }
    getSentAt() { return this.sentAt; }
    getStatus() { return this.status; }
    getReceiverType() { return this.receiverType; }
    getEditedAt() { return this.editedAt; }
    getEditedBy() { return this.editedBy; }
    getDeletedAt() { return this.deletedAt; }
    getDeletedBy() { return this.deletedBy; }
    getParentMessageId() { return this.parentMessageId; }
    getReplyToUserId() { return this.replyToUserId; }
    getReplyToText() { return this.replyToText; }
    getReplyType() { return this.replyType; }
    getSender() { return this.sender; }
    getReceiver() { return this.receiver; }
    _setId(id) { this.id = id; }
    _setSenderId(senderId) { this.senderId = senderId; }
    _setSenderName(senderName) { this.senderName = senderName; }
    _setSentAt(sentAt) { this.sentAt = sentAt; }
    _setStatus(status) { this.status = status; }
    _setEditedAt(editedAt) { this.editedAt = editedAt; }
    _setEditedBy(editedBy) { this.editedBy = editedBy; }
    _setDeletedAt(deletedAt) { this.deletedAt = deletedAt; }
    _setDeletedBy(deletedBy) { this.deletedBy = deletedBy; }
    _setParentMessageId(parentMessageId) { this.parentMessageId = parentMessageId; }
    _setReplyToUserId(replyToUserId) { this.replyToUserId = replyToUserId; }
    _setReplyToText(replyToText) { this.replyToText = replyToText; }
    _setReplyType(replyType) { this.replyType = replyType; }
    setText(text) { this.text = text; }
    setId(id) { this.id = id; }
    setParentMessageId(parentMessageId) { this.parentMessageId = parentMessageId; }
    setReplyToUserId(replyToUserId) { this.replyToUserId = replyToUserId; }
    setReplyToText(replyToText) { this.replyToText = replyToText; }
    setReplyType(replyType) { this.replyType = replyType; }
    _setSender(sender) {
        this.sender = sender;
        this.senderId = sender.uid;
        this.senderName = sender.name;
    }
    _setReceiver(receiver) {
        this.receiver = receiver;
        this.receiverId = receiver.uid;
    }
}

class BlockedUsersRequestBuilder {
    constructor() {
        this.limit = 30;
        this.direction = "BOTH";
    }
    setLimit(limit) {
        if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
            console.warn("[BlockedUsersRequestBuilder] Invalid limit, using default 30");
            this.limit = 30;
        }
        else {
            this.limit = Math.min(100, Math.max(1, Math.floor(limit)));
        }
        return this;
    }
    setDirection(direction) {
        const validDirections = ["BLOCKED_BY_ME", "HAS_BLOCKED_ME", "BOTH"];
        if (validDirections.includes(direction)) {
            this.direction = direction;
        }
        else {
            console.warn("[BlockedUsersRequestBuilder] Invalid direction, using default 'BOTH'");
            this.direction = "BOTH";
        }
        return this;
    }
    build() {
        try {
            return new BlockedUsersRequest(this.limit, this.direction);
        }
        catch (error) {
            console.error("[BlockedUsersRequestBuilder] Failed to build BlockedUsersRequest:", error);
            throw new Error("Failed to build BlockedUsersRequest: " + error.message);
        }
    }
}
class BlockedUsersRequest {
    constructor(limit, direction) {
        this.page = 1;
        this.hasMore = true;
        this.isDestroyed = false;
        if (typeof limit !== 'number' || limit < 1 || limit > 100) {
            throw new Error("[BlockedUsersRequest] Limit must be a number between 1 and 100");
        }
        this.limit = Math.floor(limit);
        this.direction = direction;
    }
    async fetchNext() {
        if (this.isDestroyed) {
            throw new Error("[BlockedUsersRequest] Cannot use destroyed BlockedUsersRequest instance");
        }
        if (!this.hasMore) {
            console.log('📭 [BlockedUsersRequest] No more blocked users to fetch');
            return [];
        }
        try {
            const PeerChatModule = await Promise.resolve().then(function () { return PeerChat$1; });
            const PeerChat = PeerChatModule.default;
            const organizationId = PeerChat.organizationId;
            const applicationId = PeerChat.applicationId;
            const userId = PeerChat.userId;
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: PeerChat.socket,
                userId: userId,
                organizationId: organizationId,
                applicationId: applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            const roomId = PeerChat.currentRoomId;
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error("Room ID is required. Join a room first using joinroom() before fetching blocked users.");
            }
            if (!organizationId || typeof organizationId !== 'string' || !organizationId.trim()) {
                throw new Error("Organization ID is required");
            }
            if (!userId || typeof userId !== 'string' || !userId.trim()) {
                throw new Error("User ID is required");
            }
            console.log('🚫 [BlockedUsersRequest] Fetching blocked users:', {
                limit: this.limit,
                page: this.page,
                direction: this.direction,
                roomId: roomId.trim()
            });
            const response = await axios.post(`${apiUrl}/chat/getBlockedUsers`, {
                action: 'get_blocked_users',
                data: {
                    room_id: roomId.trim(),
                    organization_id: organizationId.trim(),
                    user_id: userId.trim()
                }
            }, { withCredentials: true });
            if (response.data && response.data.status === 200) {
                const { blocked_by_user = [], blocked_this_user = [] } = response.data.data;
                // Validate response data structure
                if (!Array.isArray(blocked_by_user) || !Array.isArray(blocked_this_user)) {
                    throw new Error("Invalid response format: blocked_by_user and blocked_this_user must be arrays");
                }
                // Filter based on direction and extract user IDs
                let userIds = [];
                if (this.direction === 'BLOCKED_BY_ME' || this.direction === 'BOTH') {
                    // blocked_by_user: we blocked them, so get blocked_user_id
                    blocked_by_user.forEach((block) => {
                        if (block && block.blocked_user_id && typeof block.blocked_user_id === 'string') {
                            userIds.push(block.blocked_user_id.trim());
                        }
                    });
                }
                if (this.direction === 'HAS_BLOCKED_ME' || this.direction === 'BOTH') {
                    // blocked_this_user: they blocked us, so get blocker_user_id
                    blocked_this_user.forEach((block) => {
                        if (block && block.blocker_user_id && typeof block.blocker_user_id === 'string') {
                            userIds.push(block.blocker_user_id.trim());
                        }
                    });
                }
                // Remove duplicates and empty strings
                userIds = [...new Set(userIds.filter(id => id && id.trim().length > 0))];
                // Apply pagination
                const startIndex = (this.page - 1) * this.limit;
                const endIndex = startIndex + this.limit;
                const paginatedUserIds = userIds.slice(startIndex, endIndex);
                const totalPages = Math.ceil(userIds.length / this.limit);
                console.log('✅ [BlockedUsersRequest] Blocked users fetched successfully:', {
                    count: paginatedUserIds.length,
                    total: userIds.length,
                    currentPage: this.page,
                    totalPages
                });
                // Convert to User objects
                const users = paginatedUserIds.map((userId) => {
                    return new User(userId, userId);
                });
                // Update pagination state
                this.hasMore = this.page < totalPages;
                if (this.hasMore) {
                    this.page++;
                }
                console.log(`🚫 [BlockedUsersRequest] Fetched ${users.length} blocked users, hasMore: ${this.hasMore}`);
                return users;
            }
            else {
                // Handle backend error responses
                const statusCode = response.data?.status;
                const errorMessage = response.data?.message || "Failed to fetch blocked users";
                if (statusCode === 400) {
                    // Bad request - missing fields or invalid data
                    this.hasMore = false;
                    throw new Error(`Bad request: ${errorMessage}`);
                }
                else if (statusCode === 403) {
                    // Access denied - user not participant
                    this.hasMore = false;
                    throw new Error(`Access denied: ${errorMessage}`);
                }
                else if (statusCode === 404) {
                    // Room not found - return empty array (not an error for this use case)
                    console.log('📭 [BlockedUsersRequest] Room not found, returning empty list');
                    this.hasMore = false;
                    return [];
                }
                else if (statusCode === 409) {
                    // Action mismatch
                    throw new Error(`Action mismatch: ${errorMessage}`);
                }
                else if (statusCode === 500) {
                    // Server error
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`Failed to fetch blocked users: ${errorMessage}`);
                }
            }
        }
        catch (error) {
            console.error('❌ [BlockedUsersRequest] fetchNext failed:', {
                error: error.message,
                page: this.page,
                limit: this.limit,
                direction: this.direction
            });
            // Handle axios errors
            if (error.response) {
                const statusCode = error.response.status;
                const errorMessage = error.response.data?.message || error.message || "Failed to fetch blocked users";
                if (statusCode === 400) {
                    this.hasMore = false;
                    throw new Error(`Bad request: ${errorMessage}`);
                }
                else if (statusCode === 403) {
                    this.hasMore = false;
                    throw new Error(`Access denied: ${errorMessage}`);
                }
                else if (statusCode === 404) {
                    // Room not found - return empty array
                    console.log('📭 [BlockedUsersRequest] Room not found (404), returning empty list');
                    this.hasMore = false;
                    return [];
                }
                else if (statusCode === 409) {
                    throw new Error(`Action mismatch: ${errorMessage}`);
                }
                else if (statusCode === 500) {
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`API error (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                // Network error
                throw new Error(`Network error: Unable to connect to server. Please check your connection.`);
            }
            else {
                // Other errors (validation errors, etc.)
                throw error;
            }
        }
    }
    /**
     * Check if more blocked users are available
     */
    hasMoreUsers() {
        return this.hasMore && !this.isDestroyed;
    }
    /**
     * Reset pagination to start from beginning
     */
    reset() {
        if (this.isDestroyed) {
            console.warn("[BlockedUsersRequest] Cannot reset destroyed instance");
            return;
        }
        this.page = 1;
        this.hasMore = true;
        console.log('🔄 [BlockedUsersRequest] Reset to page 1');
    }
    /**
     * Get current page number
     */
    getCurrentPage() {
        return this.page;
    }
    /**
     * Get direction filter
     */
    getDirection() {
        return this.direction;
    }
    /**
     * Destroy the request instance
     */
    destroy() {
        this.isDestroyed = true;
        this.hasMore = false;
        console.log('🗑 [BlockedUsersRequest] Instance destroyed');
    }
}
BlockedUsersRequest.directions = {
    BLOCKED_BY_ME: "BLOCKED_BY_ME",
    HAS_BLOCKED_ME: "HAS_BLOCKED_ME",
    BOTH: "BOTH"
};

// Message types enum following CometChat pattern
const MESSAGE_TYPE = {
    TEXT: "text",
    FILE: "file",
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio"
};
/**
 * MediaMessage class following CometChat pattern
 * Handles media messages (files, images, videos, audio)
 */
class MediaMessage {
    constructor(receiverId, file, messageType, receiverType) {
        this.id = "";
        this.senderId = "";
        this.senderName = "";
        this.sentAt = "";
        this.status = "";
        this.fileInfo = null;
        this.attachmentUrl = null;
        this.data = {};
        this.receiverId = receiverId;
        this.file = file;
        this.messageType = messageType;
        this.receiverType = receiverType;
    }
    // Getters
    getReceiverId() { return this.receiverId; }
    getFile() { return this.file; }
    getMessageType() { return this.messageType; }
    getReceiverType() { return this.receiverType; }
    getId() { return this.id; }
    getSenderId() { return this.senderId; }
    getSenderName() { return this.senderName; }
    getSentAt() { return this.sentAt; }
    getStatus() { return this.status; }
    getFileInfo() { return this.fileInfo; }
    getParentMessageId() { return this.parentMessageId; }
    getReplyToUserId() { return this.replyToUserId; }
    getReplyToText() { return this.replyToText; }
    getReplyType() { return this.replyType; }
    getSender() { return this.sender; }
    getReceiver() { return this.receiver; }
    getUrl() {
        return this.attachmentUrl;
    }
    _setId(id) { this.id = id; }
    _setSenderId(senderId) { this.senderId = senderId; }
    _setSenderName(senderName) { this.senderName = senderName; }
    _setSentAt(sentAt) { this.sentAt = sentAt; }
    _setStatus(status) { this.status = status; }
    _setParentMessageId(parentMessageId) { this.parentMessageId = parentMessageId; }
    _setReplyToUserId(replyToUserId) { this.replyToUserId = replyToUserId; }
    _setReplyToText(replyToText) { this.replyToText = replyToText; }
    _setReplyType(replyType) { this.replyType = replyType; }
    _setSender(sender) { this.sender = sender; }
    _setReceiver(receiver) { this.receiver = receiver; }
    async _setFileInfoAndLoadUrl(fileInfo) {
        this.fileInfo = fileInfo;
        if (this.messageType === 'image' && fileInfo.fileId) {
            try {
                const blob = await MediaService.downloadFile(fileInfo.fileId);
                if (blob) {
                    this.attachmentUrl = window.URL.createObjectURL(blob);
                    this.fileInfo.attachmentUrl = this.attachmentUrl;
                    this.data = {
                        attachments: [{
                                url: this.attachmentUrl,
                                mimeType: fileInfo.mimeType,
                                name: fileInfo.originalName,
                                size: fileInfo.size
                            }],
                        url: this.attachmentUrl
                    };
                }
            }
            catch (error) {
                console.error('❌ [MediaMessage] Failed to auto-load image URL:', error);
            }
        }
        else if (fileInfo.fileId) {
            this.data = {
                attachments: [{
                        url: '',
                        mimeType: fileInfo.mimeType,
                        name: fileInfo.originalName,
                        size: fileInfo.size
                    }]
            };
        }
    }
    _setFileInfo(fileInfo) {
        this.fileInfo = fileInfo;
        if (fileInfo) {
            let absoluteUrl = fileInfo.downloadUrl || fileInfo.download_url || '';
            const fileId = fileInfo.fileId || fileInfo.file_id || '';
            if (!absoluteUrl && fileId) {
                absoluteUrl = `${apiUrl}/chat/download/${fileId}`;
            }
            if (absoluteUrl && !absoluteUrl.startsWith('http') && !absoluteUrl.startsWith('blob:')) {
                const cleanPath = absoluteUrl.startsWith('/') ? absoluteUrl.substring(1) : absoluteUrl;
                absoluteUrl = `${apiUrl}/${cleanPath}`;
            }
            if (absoluteUrl) {
                this.fileInfo = { ...fileInfo, downloadUrl: absoluteUrl };
                this.fileInfo.attachmentUrl = absoluteUrl;
                this.attachmentUrl = absoluteUrl;
                this.data = {
                    attachments: [{
                            url: absoluteUrl,
                            mimeType: fileInfo.mimeType || '',
                            name: fileInfo.originalName || '',
                            size: fileInfo.size || 0
                        }],
                    url: absoluteUrl
                };
            }
        }
    }
}
class MediaService {
    static setOrganizationId(orgId) {
        this.organizationId = orgId;
    }
    static setApplicationId(appId) {
        this.applicationId = appId;
    }
    static async uploadFile(file, roomId, userId, userName, messageId, // Required by backend uploadFile endpoint
    uploadSource = 'peer_chat') {
        try {
            if (!this.organizationId || !this.organizationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("SDK not initialized. Call init() first.", "uploadFile");
            }
            if (!this.applicationId || !this.applicationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("SDK not initialized. Call init() first.", "uploadFile");
            }
            if (!file) {
                throw new Error("File is required to upload");
            }
            if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
                throw new Error("Room ID is required and must be a non-empty string");
            }
            if (!userId || typeof userId !== 'string' || !userId.trim()) {
                throw new Error("User ID is required and must be a non-empty string");
            }
            if (!userName || typeof userName !== 'string' || !userName.trim()) {
                throw new Error("User name is required and must be a non-empty string");
            }
            // Message ID is required by backend uploadFile endpoint for file metadata association
            // Note: This is a temporary ID for upload; the actual messageId is generated by backend socket handler
            if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
                throw new Error("Message ID is required for file upload (backend requirement)");
            }
            if (!uploadSource || typeof uploadSource !== 'string' || !uploadSource.trim()) {
                throw new Error("Upload source is required and must be a non-empty string");
            }
            const formData = new FormData();
            formData.append('file', file);
            formData.append('organizationId', this.organizationId.trim());
            formData.append('applicationId', this.applicationId.trim());
            formData.append('userId', userId.trim());
            formData.append('userName', userName.trim());
            formData.append('roomId', roomId.trim());
            formData.append('messageId', messageId.trim()); // Required by backend for file metadata
            formData.append('uploadSource', uploadSource.trim());
            console.log('📤 [MediaService] Uploading file:', file.name, 'to room:', roomId);
            const response = await axios.post(`${apiUrl}/chat/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true
            });
            if (!response || !response.data) {
                throw new Error("Invalid response from server: missing data");
            }
            if (response.data.status === 200 && response.data.data) {
                const fileData = response.data.data;
                if (!fileData.fileId || !fileData.originalName || !fileData.size || !fileData.mimeType || !fileData.downloadUrl) {
                    throw new Error("Invalid response from server: missing file data fields");
                }
                console.log('✅ [MediaService] File uploaded successfully:', fileData.fileId);
                return {
                    fileId: fileData.fileId,
                    originalName: fileData.originalName,
                    size: fileData.size,
                    mimeType: fileData.mimeType,
                    downloadUrl: fileData.downloadUrl
                };
            }
            else {
                const errorMessage = response.data.message || "File upload failed";
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            if (error.response) {
                const statusCode = error.response.status;
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || error.message || "File upload failed";
                if (statusCode === 400) {
                    throw new Error(`Bad request: ${errorMessage}`);
                }
                else if (statusCode === 404) {
                    throw new Error(`Not found: ${errorMessage}`);
                }
                else if (statusCode === 500) {
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`File upload failed (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            else {
                throw error;
            }
        }
    }
    static async downloadFile(fileId) {
        try {
            if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
                throw new Error("File ID is required and must be a non-empty string");
            }
            console.log('📥 [MediaService] Downloading file:', fileId);
            const response = await axios.get(`${apiUrl}/chat/download/${fileId.trim()}`, {
                responseType: 'blob',
                withCredentials: true
            });
            if (response.status === 200 && response.data instanceof Blob) {
                console.log('✅ [MediaService] File downloaded successfully');
                return response.data;
            }
            else {
                throw new Error("Invalid response from server: expected Blob");
            }
        }
        catch (error) {
            if (error.response) {
                const statusCode = error.response.status;
                const errorData = error.response.data || {};
                let errorMessage = errorData.message || error.message || "File download failed";
                if (error.response.data instanceof Blob) {
                    try {
                        const text = await error.response.data.text();
                        const parsed = JSON.parse(text);
                        errorMessage = parsed.message || errorMessage;
                    }
                    catch {
                    }
                }
                if (statusCode === 404) {
                    throw new Error(`File not found: ${errorMessage}`);
                }
                else if (statusCode === 500) {
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`File download failed (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            else {
                throw error;
            }
        }
    }
    static async getFileInfo(fileId) {
        try {
            if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
                throw new Error("File ID is required and must be a non-empty string");
            }
            console.log('📋 [MediaService] Getting file info:', fileId);
            const response = await axios.get(`${apiUrl}/chat/file-info/${fileId.trim()}`, {
                withCredentials: true
            });
            if (!response || !response.data) {
                throw new Error("Invalid response from server: missing data");
            }
            if (response.data.status === 200 && response.data.data) {
                const fileData = response.data.data;
                if (!fileData.fileId || !fileData.originalName || !fileData.size || !fileData.mimeType || !fileData.downloadUrl) {
                    throw new Error("Invalid response from server: missing file data fields");
                }
                console.log('✅ [MediaService] File info retrieved successfully');
                return {
                    fileId: fileData.fileId,
                    originalName: fileData.originalName,
                    size: fileData.size,
                    mimeType: fileData.mimeType,
                    uploadedBy: fileData.uploadedBy,
                    uploadedAt: fileData.uploadedAt,
                    downloadUrl: fileData.downloadUrl
                };
            }
            else {
                const errorMessage = response.data.message || "Failed to get file info";
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            if (error.response) {
                const statusCode = error.response.status;
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || error.message || "Failed to get file info";
                if (statusCode === 404) {
                    throw new Error(`File not found: ${errorMessage}`);
                }
                else if (statusCode === 500) {
                    throw new Error(`Server error: ${errorMessage}`);
                }
                else {
                    throw new Error(`Failed to get file info (${statusCode}): ${errorMessage}`);
                }
            }
            else if (error.request) {
                throw new Error("Network error: Unable to connect to server. Please check your connection.");
            }
            else {
                throw error;
            }
        }
    }
}
MediaService.organizationId = "";
MediaService.applicationId = "";

class MessagesRequestBuilder {
    constructor() {
        this.uid = "";
        this.limit = 30;
        this.page = 1;
        this.includeDeleted = false;
        this.parentMessageId = "";
        this.hideReplies = false;
    }
    setUID(uid) {
        if (!uid || typeof uid !== 'string' || !uid.trim()) {
            throw new Error("UID is required and must be a non-empty string");
        }
        this.uid = uid.trim();
        return this;
    }
    setLimit(limit) {
        if (typeof limit !== 'number' || isNaN(limit) || limit < 1) {
            throw new Error("Limit must be a positive number");
        }
        this.limit = Math.min(100, Math.max(1, Math.floor(limit)));
        return this;
    }
    setPage(page) {
        if (typeof page !== 'number' || isNaN(page) || page < 1) {
            throw new Error("Page must be a positive number");
        }
        this.page = Math.max(1, Math.floor(page));
        return this;
    }
    setIncludeDeleted(include) {
        if (typeof include !== 'boolean') {
            throw new Error("includeDeleted must be a boolean");
        }
        this.includeDeleted = include;
        return this;
    }
    setParentMessageId(parentId) {
        if (!parentId || typeof parentId !== 'string') {
            throw new Error("Parent message ID must be a non-empty string");
        }
        this.parentMessageId = parentId.trim();
        return this;
    }
    setHideReplies(hide) {
        if (typeof hide !== 'boolean') {
            throw new Error("hideReplies must be a boolean");
        }
        this.hideReplies = hide;
        return this;
    }
    build() {
        if (!this.uid || !this.uid.trim()) {
            throw new Error("UID is required. Call setUID() before build().");
        }
        return new MessagesRequest(this.uid, this.limit, this.page, this.includeDeleted, this.parentMessageId, this.hideReplies);
    }
}
class MessagesRequest {
    constructor(uid, limit, page, includeDeleted, parentMessageId, hideReplies) {
        this.hasMore = true;
        this.uid = uid;
        this.limit = limit;
        this.currentPage = page;
        this.includeDeleted = includeDeleted;
        this.parentMessageId = parentMessageId;
        this.hideReplies = hideReplies;
    }
    async fetchPrevious() {
        if (!this.hasMore) {
            console.log('📭 [MessagesRequest] No more messages to fetch');
            return [];
        }
        try {
            const PeerChat = (await Promise.resolve().then(function () { return PeerChat$1; })).default;
            const result = await PeerChat.fetchPreviousMessages(this.uid, {
                limit: this.limit,
                page: this.currentPage,
                includeDeleted: this.includeDeleted,
                parentMessageId: this.parentMessageId,
                hideReplies: this.hideReplies
            });
            if (!result.messages || result.messages.length === 0) {
                this.hasMore = false;
                return [];
            }
            if (this.currentPage >= result.totalPages) {
                this.hasMore = false;
            }
            else {
                this.currentPage++;
            }
            return result.messages;
        }
        catch (error) {
            console.error('❌ [MessagesRequest] fetchPrevious failed:', error);
            const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
            if (errorMessage.includes('not found') ||
                errorMessage.includes('access denied') ||
                errorMessage.includes('no data found') ||
                errorMessage.includes('blocked') ||
                errorMessage.includes('unauthorized')) {
                console.log('📭 [MessagesRequest] User has no messages or access denied, returning empty array');
                this.hasMore = false;
                return [];
            }
            throw error;
        }
    }
    hasMoreMessages() {
        return this.hasMore;
    }
    reset() {
        this.currentPage = 1;
        this.hasMore = true;
    }
}

class TypingIndicator {
    constructor(receiverId, receiverType) {
        this.receiverId = receiverId;
        this.receiverType = receiverType;
    }
    getReceiver() { return this.receiverId; }
    getReceiverType() { return this.receiverType; }
    getSender() { return this.sender; }
    _setSender(sender) { this.sender = sender; }
}
class PeerChat {
    static setOrganizationId(orgId) {
        this.organizationId = orgId;
        MediaService.setOrganizationId(orgId);
    }
    static setApplicationId(appId) {
        this.applicationId = appId;
        MediaService.setApplicationId(appId);
    }
    static setUserId(userId) { this.userId = userId; }
    static setUserName(userName) { this.userName = userName; }
    static setSocket(socket) {
        this.socket = socket;
        socket.on("receiveMessage", (message, senderId, senderName, roomId, time, messageId, replyToMessageId, replyToUserId, replyToText, messageType, fileInfo, status, replyType) => {
            try {
                if (!messageId || !senderId || !roomId) {
                    console.error('❌ [PeerChat] Invalid message received - missing required fields:', { messageId, senderId, roomId });
                    return;
                }
                if (this.currentRoomId && roomId !== this.currentRoomId) {
                    PeerChatErrorHandler.handleMessageReceiveError(`Received message from different room. Expected: ${this.currentRoomId}, Got: ${roomId}`, roomId);
                    console.warn('⚠️ [PeerChat] Processing message anyway...');
                }
                if (messageType && messageType !== 'text' && fileInfo) {
                    if (!fileInfo.fileId || !fileInfo.originalName) {
                        console.error('❌ [PeerChat] Invalid fileInfo in media message:', fileInfo);
                        return;
                    }
                    const dummyFile = new File([''], fileInfo.originalName || 'file', { type: fileInfo.mimeType || 'application/octet-stream' });
                    const mediaMessage = new MediaMessage(this.currentPeerId || senderId, dummyFile, messageType, RECEIVER_TYPE.USER);
                    mediaMessage._setId(messageId);
                    mediaMessage._setSenderId(senderId);
                    mediaMessage._setSenderName(senderName || senderId);
                    mediaMessage._setSentAt(time);
                    mediaMessage._setStatus(status || "delivered");
                    mediaMessage._setFileInfo(fileInfo);
                    if (replyToMessageId) {
                        mediaMessage._setParentMessageId(replyToMessageId);
                    }
                    if (replyToUserId) {
                        mediaMessage._setReplyToUserId(replyToUserId);
                    }
                    if (replyToText) {
                        mediaMessage._setReplyToText(replyToText);
                    }
                    if (replyType) {
                        mediaMessage._setReplyType(replyType);
                    }
                    const sender = new User(senderId, senderName || senderId);
                    mediaMessage._setSender(sender);
                    if (this.userId && this.userName) {
                        const receiver = new User(this.userId, this.userName);
                        mediaMessage._setReceiver(receiver);
                    }
                    if (!mediaMessage.getId()) {
                        console.error('❌ [PeerChat] MediaMessage missing ID before notifying listeners');
                        return;
                    }
                    this.listeners.forEach((listener, id) => {
                        console.log(`📎 [PeerChat] Notifying listener: ${id} (media message)`);
                        try {
                            listener.onMediaMessageReceived?.(mediaMessage);
                        }
                        catch (listenerError) {
                            console.error(`❌ [PeerChat] Error in listener ${id}:`, listenerError);
                        }
                    });
                }
                else {
                    const textMessage = new TextMessage(this.currentPeerId || senderId, message, RECEIVER_TYPE.USER);
                    textMessage._setId(messageId);
                    textMessage._setSenderId(senderId);
                    textMessage._setSenderName(senderName);
                    textMessage._setSentAt(time);
                    textMessage._setStatus(status || "delivered");
                    if (messageType) {
                        textMessage.messageType = messageType;
                    }
                    if (fileInfo) {
                        textMessage.fileInfo = fileInfo;
                    }
                    if (replyToMessageId) {
                        textMessage._setParentMessageId(replyToMessageId);
                    }
                    if (replyToUserId) {
                        textMessage._setReplyToUserId(replyToUserId);
                    }
                    if (replyToText) {
                        textMessage._setReplyToText(replyToText);
                    }
                    if (replyType) {
                        textMessage._setReplyType(replyType);
                    }
                    const receiverType = textMessage.getReceiverType();
                    if (receiverType !== RECEIVER_TYPE.USER) {
                        console.error('❌ [PeerChat] CRITICAL: receiverType mismatch!');
                        console.error('❌ Expected: "user", Got:', receiverType);
                        return;
                    }
                    const sender = new User(senderId, senderName);
                    textMessage._setSender(sender);
                    if (this.userId && this.userName) {
                        const receiver = new User(this.userId, this.userName);
                        textMessage._setReceiver(receiver);
                    }
                    this.listeners.forEach((listener, id) => {
                        console.log(`📩 [PeerChat] Notifying listener: ${id} (text message)`);
                        listener.onTextMessageReceived?.(textMessage);
                    });
                }
            }
            catch (error) {
                PeerChatErrorHandler.handleMessageReceiveError(error.message || "Unknown error processing received message", roomId);
                PeerChatErrorHandler.handleSocketConnectionError(error, "receiveMessage");
            }
        });
        socket.on("messageReactionUpdated", (payload) => {
            console.log('👍 [PeerChat] messageReactionUpdated event fired!');
            if (!payload) {
                console.error("❌ [PeerChat] messageReactionUpdated: payload is missing");
                return;
            }
            if (!payload.action || !payload.messageId || !payload.roomId || !payload.userId || !payload.emojiId) {
                console.error("❌ [PeerChat] messageReactionUpdated: missing required fields", payload);
                return;
            }
            console.log('👍 [PeerChat] Action:', payload.action);
            console.log('👍 [PeerChat] Message ID:', payload.messageId);
            console.log('👍 [PeerChat] Emoji:', payload.emojiId);
            this.listeners.forEach((listener, id) => {
                console.log(`👍 [PeerChat] Notifying listener: ${id} (reaction)`);
                if (payload.action === "react") {
                    listener.onMessageReactionAdded?.(payload);
                }
                else if (payload.action === "unreact") {
                    listener.onMessageReactionRemoved?.(payload);
                }
            });
        });
        socket.on("messageReactionError", (error) => {
            PeerChatErrorHandler.handleSocketErrorEvent(error, "messageReaction");
        });
        socket.on("peerMessageEdited", (payload) => {
            console.log('✏️ [PeerChat] peerMessageEdited event fired!');
            if (!payload) {
                console.error("❌ [PeerChat] peerMessageEdited: payload is missing");
                return;
            }
            if (!payload.roomId || !payload.messageId || !payload.userId || !payload.userName) {
                console.error("❌ [PeerChat] peerMessageEdited: missing required fields", payload);
                return;
            }
            if (!payload.messageId.trim()) {
                console.error("❌ [PeerChat] peerMessageEdited: messageId is empty or invalid", payload);
                return;
            }
            if (!payload.userId.trim()) {
                console.error("❌ [PeerChat] peerMessageEdited: userId is empty or invalid", payload);
                return;
            }
            if (!payload.roomId.trim()) {
                console.error("❌ [PeerChat] peerMessageEdited: roomId is empty or invalid", payload);
                return;
            }
            const newMessageText = payload.newMessage || "";
            if (!newMessageText.trim()) {
                console.warn("⚠️ [PeerChat] peerMessageEdited: newMessage is empty, using empty string");
            }
            console.log('✏️ [PeerChat] Message ID:', payload.messageId);
            console.log('✏️ [PeerChat] New message:', newMessageText);
            console.log('✏️ [PeerChat] Edited by:', payload.userName, '(', payload.userId, ')');
            const textMessage = new TextMessage(this.currentPeerId || payload.userId, newMessageText, RECEIVER_TYPE.USER);
            textMessage._setId(payload.messageId);
            textMessage._setSenderId(payload.userId);
            textMessage._setSenderName(payload.userName);
            if (payload.edited_at) {
                textMessage._setEditedAt(payload.edited_at);
            }
            textMessage._setEditedBy(payload.userId);
            const sender = new User(payload.userId, payload.userName);
            textMessage._setSender(sender);
            if (this.userId && this.userName) {
                const receiver = new User(this.userId, this.userName);
                textMessage._setReceiver(receiver);
            }
            this.listeners.forEach((listener, id) => {
                console.log(`✏️ [PeerChat] Notifying listener: ${id} (message edited)`);
                listener.onMessageEdited?.(textMessage);
            });
        });
        socket.on("editPeerMessageError", (error) => {
            PeerChatErrorHandler.handleMessageEditError(error, "editPeerMessage");
        });
        socket.on("peerMessageDeleted", (payload) => {
            try {
                if (!payload) {
                    PeerChatErrorHandler.handleMessageReceiveError("peerMessageDeleted: payload is missing");
                    return;
                }
                if (!payload.room_id || !payload.user_id || !payload.message_id) {
                    PeerChatErrorHandler.handleMessageReceiveError(`peerMessageDeleted: missing required fields (room_id, user_id, message_id)`, payload.room_id);
                    return;
                }
                if (this.currentRoomId && payload.room_id !== this.currentRoomId) {
                    PeerChatErrorHandler.handleMessageReceiveError(`Received delete event from different room. Expected: ${this.currentRoomId}, Got: ${payload.room_id}`, payload.room_id);
                    console.warn('⚠️ [PeerChat] Processing delete event anyway...');
                }
                console.log('🗑️ [PeerChat] peerMessageDeleted event fired!');
                console.log('🗑️ [PeerChat] Deleted by:', payload.user_id);
                console.log('🗑️ [PeerChat] Room ID:', payload.room_id);
                console.log('🗑️ [PeerChat] Message ID:', payload.message_id);
                const textMessage = new TextMessage(this.currentPeerId || payload.user_id, "", RECEIVER_TYPE.USER);
                textMessage._setId(payload.message_id);
                textMessage._setSenderId(payload.user_id);
                textMessage._setDeletedAt(new Date().toISOString());
                textMessage._setDeletedBy(payload.user_id);
                textMessage._setStatus("deleted");
                this.listeners.forEach((listener, id) => {
                    console.log(`🗑️ [PeerChat] Notifying listener: ${id} (message deleted)`);
                    listener.onMessageDeleted?.(textMessage);
                });
            }
            catch (error) {
                PeerChatErrorHandler.handleMessageReceiveError(error.message || "Unknown error processing peerMessageDeleted", payload?.room_id);
            }
        });
        socket.on("peerConversationDeleted", (payload) => {
            console.log('🗑️ [PeerChat] peerConversationDeleted event fired!');
            if (!payload) {
                console.error("❌ [PeerChat] peerConversationDeleted: payload is missing");
                return;
            }
            if (!payload.room_id || !payload.user_id || !payload.deleted_at) {
                console.error("❌ [PeerChat] peerConversationDeleted: missing required fields", payload);
                return;
            }
            console.log('🗑️ [PeerChat] Conversation deleted for user:', payload.user_id, 'in room:', payload.room_id);
            this.listeners.forEach((listener, id) => {
                console.log(`🗑️ [PeerChat] Notifying listener: ${id} (conversation deleted)`);
                // Add onConversationDeleted callback to PeerListener if needed
            });
        });
        socket.on("peerTypingStatus", (payload) => {
            console.log('⌨️ [PeerChat] peerTypingStatus event fired!');
            if (!payload) {
                console.error("❌ [PeerChat] peerTypingStatus: payload is missing");
                return;
            }
            if (!payload.userId || !payload.userName || !payload.room_id) {
                console.error("❌ [PeerChat] peerTypingStatus: missing required fields", payload);
                return;
            }
            // Only handle typing events for current room
            if (payload.room_id !== this.currentRoomId) {
                console.log('⌨️ [PeerChat] Ignoring typing event for different room:', payload.room_id);
                return;
            }
            // Don't handle our own typing events
            if (payload.userId === this.userId) {
                console.log('⌨️ [PeerChat] Ignoring own typing event');
                return;
            }
            console.log('⌨️ [PeerChat] User typing status:', payload.userId, 'isTyping:', payload.isTyping);
            // Create typing indicator
            const typingIndicator = new TypingIndicator(payload.userId, RECEIVER_TYPE.USER);
            const sender = new User(payload.userId, payload.userName);
            sender.setAvatar(""); // Avatar not provided in typing event
            sender.setStatus("online");
            typingIndicator._setSender(sender);
            // Notify all listeners
            this.listeners.forEach((listener, id) => {
                console.log(`⌨️ [PeerChat] Notifying listener: ${id} (typing ${payload.isTyping ? 'started' : 'ended'})`);
                if (payload.isTyping) {
                    listener.onTypingStarted?.(typingIndicator);
                }
                else {
                    listener.onTypingEnded?.(typingIndicator);
                }
            });
        });
        socket.on("currentOnlineUsers", (data) => {
            try {
                if (!data?.organizationId || !Array.isArray(data.onlineUsers)) {
                    console.warn('⚠️ [PeerChat] Invalid currentOnlineUsers data');
                    return;
                }
                if (!this.onlineUsers.has(data.organizationId)) {
                    this.onlineUsers.set(data.organizationId, new Set());
                }
                const orgOnlineUsers = this.onlineUsers.get(data.organizationId);
                const previousOnlineUsers = new Set(orgOnlineUsers);
                orgOnlineUsers.clear();
                data.onlineUsers.forEach(userId => {
                    if (userId && typeof userId === 'string' && userId.trim() && userId !== this.userId) {
                        const trimmedUserId = userId.trim();
                        orgOnlineUsers.add(trimmedUserId);
                        if (!previousOnlineUsers.has(trimmedUserId)) {
                            const user = new User(trimmedUserId, trimmedUserId);
                            user.setStatus('online');
                            console.log('✅ [PeerChat] New online user detected:', trimmedUserId);
                            this.userListeners.forEach((listener) => {
                                try {
                                    listener.onUserOnline?.(user);
                                }
                                catch (err) {
                                    console.error('❌ [PeerChat] Error in onUserOnline:', err);
                                }
                            });
                        }
                    }
                });
                console.log('✅ [PeerChat] Online users updated:', data.organizationId, 'Count:', orgOnlineUsers.size);
                console.log('👥 [PeerChat] Online user IDs:', Array.from(orgOnlineUsers).join(', '));
            }
            catch (error) {
                console.error('❌ [PeerChat] Error handling currentOnlineUsers:', error);
            }
        });
        socket.on("userStatusChanged", (data) => {
            try {
                if (!data?.organizationId || !data?.userId || !data?.status) {
                    console.warn('⚠️ [PeerChat] Invalid userStatusChanged data');
                    return;
                }
                if (data.userId === this.userId)
                    return;
                if (!this.onlineUsers.has(data.organizationId)) {
                    this.onlineUsers.set(data.organizationId, new Set());
                }
                const orgOnlineUsers = this.onlineUsers.get(data.organizationId);
                const user = new User(data.userId, data.userId);
                user.setStatus(data.status);
                if (data.status === "online") {
                    orgOnlineUsers.add(data.userId);
                    console.log('✅ [PeerChat] User online:', data.userId);
                    this.userListeners.forEach((listener) => {
                        try {
                            listener.onUserOnline?.(user);
                        }
                        catch (err) {
                            console.error('❌ [PeerChat] Error in onUserOnline:', err);
                        }
                    });
                }
                else if (data.status === "offline") {
                    orgOnlineUsers.delete(data.userId);
                    console.log('❌ [PeerChat] User offline:', data.userId);
                    this.userListeners.forEach((listener) => {
                        try {
                            listener.onUserOffline?.(user);
                        }
                        catch (err) {
                            console.error('❌ [PeerChat] Error in onUserOffline:', err);
                        }
                    });
                }
            }
            catch (error) {
                console.error('❌ [PeerChat] Error handling userStatusChanged:', error);
            }
        });
        socket.on("userBlocked", (data) => {
            try {
                console.log('🚫 [PeerChat] userBlocked event received:', data);
                if (!data?.room_id || !data?.blocker_user_id || !data?.blocked_user_id) {
                    console.warn('⚠️ [PeerChat] Invalid userBlocked data:', data);
                    return;
                }
                if (this.currentRoomId && data.room_id === this.currentRoomId) {
                    console.log('✅ [PeerChat] Notifying listeners about user blocked');
                    this.listeners.forEach((listener, id) => {
                        try {
                            listener.onUserBlocked?.(data);
                        }
                        catch (err) {
                            console.error('❌ [PeerChat] Error in onUserBlocked:', err);
                        }
                    });
                }
                else {
                    console.log('⚠️ [PeerChat] userBlocked event for different room, ignoring');
                }
            }
            catch (error) {
                console.error('❌ [PeerChat] Error handling userBlocked:', error);
            }
        });
        socket.on("userUnblocked", (data) => {
            try {
                console.log('✅ [PeerChat] userUnblocked event received:', data);
                if (!data?.room_id || !data?.blocker_user_id || !data?.blocked_user_id) {
                    console.warn('⚠️ [PeerChat] Invalid userUnblocked data:', data);
                    return;
                }
                if (this.currentRoomId && data.room_id === this.currentRoomId) {
                    console.log('✅ [PeerChat] Notifying listeners about user unblocked');
                    this.listeners.forEach((listener, id) => {
                        try {
                            listener.onUserUnblocked?.(data);
                        }
                        catch (err) {
                            console.error('❌ [PeerChat] Error in onUserUnblocked:', err);
                        }
                    });
                }
                else {
                    console.log('⚠️ [PeerChat] userUnblocked event for different room, ignoring');
                }
            }
            catch (error) {
                console.error('❌ [PeerChat] Error handling userUnblocked:', error);
            }
        });
    }
    static addUserListener(listenerId, listener) {
        if (!listenerId || typeof listenerId !== 'string' || !listenerId.trim()) {
            throw new Error("Listener ID is required and must be a non-empty string");
        }
        if (!listener || typeof listener !== 'object' || Array.isArray(listener)) {
            throw new Error("Listener object is required");
        }
        console.log(`👥 [PeerChat] Adding UserListener: ${listenerId}`);
        this.userListeners.set(listenerId.trim(), listener);
        if (listener.onUserOnline && this.organizationId) {
            const orgOnlineUsers = this.onlineUsers.get(this.organizationId);
            if (orgOnlineUsers && orgOnlineUsers.size > 0) {
                console.log(`👥 [PeerChat] Notifying new listener about ${orgOnlineUsers.size} already online users`);
                orgOnlineUsers.forEach(userId => {
                    try {
                        const user = new User(userId, userId);
                        user.setStatus('online');
                        listener.onUserOnline?.(user);
                    }
                    catch (err) {
                        console.error('❌ [PeerChat] Error notifying about existing online user:', err);
                    }
                });
            }
        }
    }
    static removeUserListener(listenerId) {
        if (!listenerId || typeof listenerId !== 'string') {
            console.warn('⚠️ [PeerChat] Invalid listenerId');
            return;
        }
        const existed = this.userListeners.delete(listenerId.trim());
        console.log(`👥 [PeerChat] ${existed ? 'Removed' : 'Not found'} UserListener: ${listenerId}`);
    }
    static getOnlineUsers(organizationId) {
        try {
            const orgId = organizationId || this.organizationId;
            if (!orgId || typeof orgId !== 'string' || !orgId.trim()) {
                return [];
            }
            const orgOnlineUsers = this.onlineUsers.get(orgId.trim());
            return orgOnlineUsers ? Array.from(orgOnlineUsers) : [];
        }
        catch (error) {
            console.error('❌ [PeerChat] Error in getOnlineUsers:', error);
            return [];
        }
    }
    static notifyUserOnline() {
        try {
            if (!this.socket?.connected || !this.userId || !this.organizationId || !this.applicationId) {
                console.warn('⚠️ [PeerChat] Cannot notify user online - missing requirements');
                return;
            }
            console.log('👥 [PeerChat] Emitting userOnline event');
            this.socket.emit("userOnline", {
                userId: this.userId,
                organizationId: this.organizationId,
                userName: this.userName || 'Unknown',
                applicationId: this.applicationId
            });
        }
        catch (error) {
            console.error('❌ [PeerChat] Error in notifyUserOnline:', error);
        }
    }
    static joinRoom(peerId) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            if (this.currentPeerId === peerId && this.currentRoomId) {
                console.log("✅ [PeerChat] Already in room:", this.currentRoomId);
                return this.currentRoomId;
            }
            const roomId = generatePeerRoomId(this.organizationId, this.userId, peerId, this.applicationId);
            if (!roomId) {
                throw PeerChatErrorHandler.handleRoomJoinError("Failed to generate room ID");
            }
            this.currentRoomId = roomId;
            this.currentPeerId = peerId;
            try {
                if (!this.socket) {
                    throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "joinRoom");
                }
                this.socket.emit("joinRoom", roomId);
                console.log("🚪 [PeerChat] Joining room:", roomId, "for peer:", peerId);
                return roomId;
            }
            catch (emitError) {
                PeerChatErrorHandler.handleSocketEmitError("joinRoom", emitError, "joinRoom");
                throw PeerChatErrorHandler.handleRoomJoinError(emitError.message || "Socket emit failed", roomId);
            }
        }
        catch (error) {
            PeerChatErrorHandler.handleRoomJoinError(error.message || "Unknown error", this.currentRoomId || undefined);
            return undefined;
        }
    }
    static joinroom(peerId) {
        return this.joinRoom(peerId);
    }
    static sendMessage(textMessage) {
        return new Promise((resolve, reject) => {
            try {
                const receiverType = textMessage.getReceiverType();
                if (receiverType !== RECEIVER_TYPE.USER) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError(`Wrong message type! Expected "user", got "${receiverType}"`, "sendMessage"));
                    return;
                }
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                const text = textMessage.getText();
                if (!text || !text.trim()) {
                    reject(PeerChatErrorHandler.handleMessageSendError("Message text cannot be empty"));
                    return;
                }
                const receiverId = textMessage.getReceiverId();
                if (!receiverId) {
                    reject(PeerChatErrorHandler.handleMessageSendError("Receiver ID is required"));
                    return;
                }
                const roomId = this.joinRoom(receiverId);
                if (!roomId) {
                    reject(PeerChatErrorHandler.handleMessageSendError("Failed to join room", roomId));
                    return;
                }
                const messagePayload = {
                    userId: this.userId,
                    peerId: receiverId,
                    orgId: this.organizationId,
                    roomId: roomId,
                    message: text.trim(),
                    userName: this.userName,
                    applicationId: this.applicationId
                };
                const receiver = textMessage.getReceiver();
                if (receiver && receiver.getName()) {
                    messagePayload.peerName = receiver.getName();
                }
                else {
                    messagePayload.peerName = receiverId;
                }
                // Add file support
                const fileInfo = textMessage.fileInfo;
                if (fileInfo && fileInfo.fileId) {
                    messagePayload.fileId = fileInfo.fileId;
                }
                const parentMessageId = textMessage.getParentMessageId();
                if (parentMessageId) {
                    messagePayload.replyToMessageId = parentMessageId;
                    messagePayload.replyToUserId = textMessage.getReplyToUserId() || "";
                    messagePayload.replyToText = textMessage.getReplyToText() || "";
                    messagePayload.replyType = textMessage.getReplyType() || "reply";
                }
                try {
                    if (!this.socket) {
                        throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "sendMessage");
                    }
                    this.socket.emit("sendMessage", messagePayload);
                    textMessage._setSenderId(this.userId);
                    textMessage._setSenderName(this.userName);
                    textMessage._setSentAt(new Date().toISOString());
                    textMessage._setStatus("sent");
                    const sender = new User(this.userId, this.userName);
                    textMessage._setSender(sender);
                    const receiverUser = new User(receiverId, receiverId);
                    textMessage._setReceiver(receiverUser);
                    resolve(textMessage);
                }
                catch (emitError) {
                    PeerChatErrorHandler.handleSocketEmitError("sendMessage", emitError, "sendMessage");
                    reject(PeerChatErrorHandler.handleMessageSendError(emitError.message || "Socket emit failed", roomId));
                }
            }
            catch (error) {
                const errorMessage = error.message || "Unknown error in sendMessage";
                reject(PeerChatErrorHandler.handleMessageSendError(errorMessage, this.currentRoomId || undefined));
            }
        });
    }
    static addMessageListener(id, listener) {
        console.log('👂 [PeerChat] Adding listener:', id);
        console.log('   - Has text message callback:', !!listener.onTextMessageReceived);
        console.log('   - Has media message callback:', !!listener.onMediaMessageReceived);
        console.log('   - Has reaction callbacks:', !!(listener.onMessageReactionAdded || listener.onMessageReactionRemoved));
        console.log('   - Has message edited callback:', !!listener.onMessageEdited);
        console.log('   - Has message deleted callback:', !!listener.onMessageDeleted);
        console.log('   - Has typing callbacks:', !!(listener.onTypingStarted || listener.onTypingEnded));
        this.listeners.set(id, listener);
    }
    static removeMessageListener(id) {
        console.log('🗑 [PeerChat] Removing listener:', id);
        this.listeners.delete(id);
    }
    static addReaction(messageId, emojiId, roomId, emojiType) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                console.error(validationError);
                return;
            }
            if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
                console.error("[PeerChat] addReaction: messageId is required and must be a non-empty string");
                return;
            }
            if (!emojiId || typeof emojiId !== 'string' || !emojiId.trim()) {
                console.error("[PeerChat] addReaction: emojiId is required and must be a non-empty string");
                return;
            }
            const finalRoomId = roomId || this.currentRoomId;
            if (!finalRoomId || !finalRoomId.trim()) {
                console.error("[PeerChat] addReaction: roomId is required. Provide roomId parameter or join a room first using joinroom()");
                return;
            }
            if (emojiType !== undefined && typeof emojiType !== 'string') {
                console.warn("[PeerChat] addReaction: emojiType should be a string, ignoring invalid value");
                emojiType = undefined;
            }
            const payload = {
                orgId: this.organizationId,
                roomId: finalRoomId.trim(),
                messageId: messageId.trim(),
                userId: this.userId,
                userName: this.userName || "",
                emojiId: emojiId.trim(),
                emojiType: (emojiType && typeof emojiType === 'string') ? emojiType.trim() : ""
            };
            if (!this.socket) {
                throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "addReaction");
            }
            try {
                this.socket.emit("reactToMessage", payload);
            }
            catch (emitError) {
                PeerChatErrorHandler.handleSocketEmitError("reactToMessage", emitError, "addReaction");
            }
        }
        catch (error) {
            PeerChatErrorHandler.handleSocketConnectionError(error, "addReaction");
        }
    }
    static removeReaction(messageId, emojiId, roomId) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                console.error(validationError);
                return;
            }
            if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
                console.error("[PeerChat] removeReaction: messageId is required and must be a non-empty string");
                return;
            }
            if (!emojiId || typeof emojiId !== 'string' || !emojiId.trim()) {
                console.error("[PeerChat] removeReaction: emojiId is required and must be a non-empty string");
                return;
            }
            const finalRoomId = roomId || this.currentRoomId;
            if (!finalRoomId || !finalRoomId.trim()) {
                console.error("[PeerChat] removeReaction: roomId is required. Provide roomId parameter or join a room first using joinroom()");
                return;
            }
            const payload = {
                orgId: this.organizationId,
                roomId: finalRoomId.trim(),
                messageId: messageId.trim(),
                userId: this.userId,
                emojiId: emojiId.trim()
            };
            if (!this.socket) {
                throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "removeReaction");
            }
            try {
                this.socket.emit("unreactToMessage", payload);
            }
            catch (emitError) {
                PeerChatErrorHandler.handleSocketEmitError("unreactToMessage", emitError, "removeReaction");
            }
        }
        catch (error) {
            PeerChatErrorHandler.handleSocketConnectionError(error, "removeReaction");
        }
    }
    static sendmessage(textMessage) {
        return this.sendMessage(textMessage);
    }
    static isFileMessage(message) {
        const messageType = message.messageType;
        return messageType && messageType !== 'text';
    }
    static getMessageFileInfo(message) {
        return message.fileInfo || null;
    }
    static getMessageType(message) {
        return message.messageType || 'text';
    }
    static async sendMediaMessage(mediaMessage) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            const receiverType = mediaMessage.getReceiverType();
            if (receiverType !== RECEIVER_TYPE.USER) {
                throw PeerChatErrorHandler.handleSDKInitializationError(`PeerChat can only send USER media messages, received: ${receiverType}`, "sendMediaMessage");
            }
            const file = mediaMessage.getFile();
            const receiverId = mediaMessage.getReceiverId();
            if (!file) {
                throw new Error("File is required to send a media message");
            }
            if (!receiverId) {
                throw new Error("Receiver ID is required to send a media message");
            }
            const roomId = this.joinRoom(receiverId);
            if (!roomId) {
                throw PeerChatErrorHandler.handleRoomJoinError("Failed to join room", roomId);
            }
            const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            console.log('📤 [PeerChat] Uploading file:', file.name, 'with temp ID:', tempId);
            const uploadResult = await MediaService.uploadFile(file, roomId, this.userId, this.userName, tempId, 'peer_chat');
            const messagePayload = {
                userId: this.userId,
                peerId: receiverId,
                orgId: this.organizationId,
                roomId: roomId,
                message: file.name,
                userName: this.userName,
                applicationId: this.applicationId,
                fileId: uploadResult.fileId
            };
            const parentMessageId = mediaMessage.getParentMessageId();
            if (parentMessageId) {
                messagePayload.replyToMessageId = parentMessageId;
                messagePayload.replyToUserId = mediaMessage.getReplyToUserId() || "";
                messagePayload.replyToText = mediaMessage.getReplyToText() || "";
                messagePayload.replyType = mediaMessage.getReplyType() || "reply";
            }
            if (!this.socket) {
                throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "sendMediaMessage");
            }
            try {
                this.socket.emit("sendMessage", messagePayload);
            }
            catch (emitError) {
                PeerChatErrorHandler.handleSocketEmitError("sendMessage", emitError, "sendMediaMessage");
                throw new Error(`Failed to send media message: ${emitError.message || "Socket emit failed"}`);
            }
            // Message ID will be set by backend response via socket listener
            // Don't set it here as backend generates it
            mediaMessage._setSenderId(this.userId);
            mediaMessage._setSenderName(this.userName);
            mediaMessage._setSentAt(new Date().toISOString());
            mediaMessage._setStatus("sent");
            mediaMessage._setFileInfo(uploadResult);
            const sender = new User(this.userId, this.userName);
            mediaMessage._setSender(sender);
            const receiver = new User(receiverId, receiverId);
            mediaMessage._setReceiver(receiver);
            console.log('✅ [PeerChat] Media message sent successfully');
            return mediaMessage;
        }
        catch (error) {
            console.error('❌ [PeerChat] Failed to send media message:', error);
            throw error;
        }
    }
    static async uploadFile(file, roomId, userId, userName, messageId, uploadSource = 'peer_chat') {
        return MediaService.uploadFile(file, roomId, userId, userName, messageId, uploadSource);
    }
    static async downloadFile(fileId) {
        return MediaService.downloadFile(fileId);
    }
    static async getFileInfo(fileId) {
        return MediaService.getFileInfo(fileId);
    }
    static editMessage(textMessage) {
        return new Promise((resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                const receiverType = textMessage.getReceiverType();
                if (receiverType !== RECEIVER_TYPE.USER) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError(`Wrong message type! Expected "user", got "${receiverType}"`, "editMessage"));
                    return;
                }
                const messageId = textMessage.getId();
                if (!messageId || !messageId.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Message ID is required", "editMessage"));
                    return;
                }
                const receiverId = textMessage.getReceiverId();
                if (!receiverId || !receiverId.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Receiver ID is required", "editMessage"));
                    return;
                }
                const roomId = this.joinRoom(receiverId);
                if (!roomId) {
                    reject(PeerChatErrorHandler.handleRoomJoinError("Failed to join room", roomId));
                    return;
                }
                const newMessage = textMessage.getText();
                if (!newMessage || !newMessage.trim()) {
                    reject(PeerChatErrorHandler.handleSDKInitializationError("Message text cannot be empty", "editMessage"));
                    return;
                }
                const payload = {
                    orgId: this.organizationId,
                    roomId: roomId,
                    messageId: messageId.trim(),
                    userId: this.userId,
                    newMessage: newMessage.trim(),
                    userName: this.userName || this.userId
                };
                try {
                    if (!this.socket) {
                        throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "editMessage");
                    }
                    this.socket.emit("editPeerMessage", payload);
                    textMessage._setEditedAt(new Date().toISOString());
                    textMessage._setEditedBy(this.userId);
                    resolve(textMessage);
                }
                catch (emitError) {
                    PeerChatErrorHandler.handleSocketEmitError("editPeerMessage", emitError, "editMessage");
                    reject(new Error(`[PeerChat] editMessage: Socket emit failed - ${emitError.message || "Unknown error"}`));
                }
            }
            catch (error) {
                const errorMessage = error.message || "Unknown error in editMessage";
                reject(PeerChatErrorHandler.handleSDKInitializationError(errorMessage, "editMessage"));
            }
        });
    }
    static deleteMessage(messageId, scope = 'me', receiverId) {
        return new Promise(async (resolve, reject) => {
            try {
                const validationError = PeerChatErrorHandler.validateSDKInitialization({
                    socket: this.socket,
                    userId: this.userId,
                    organizationId: this.organizationId,
                    applicationId: this.applicationId
                });
                if (validationError) {
                    reject(new Error(validationError));
                    return;
                }
                if (!messageId || typeof messageId !== 'string' || !messageId.trim()) {
                    reject(new Error("Message ID is required and must be a non-empty string"));
                    return;
                }
                let roomId = this.currentRoomId || undefined;
                if (receiverId) {
                    const trimmedReceiverId = receiverId.trim();
                    if (this.currentPeerId !== trimmedReceiverId) {
                        reject(new Error(`Receiver ID mismatch. Current peer: ${this.currentPeerId}, Provided: ${trimmedReceiverId}. Please join the room first.`));
                        return;
                    }
                }
                if (!roomId || !roomId.trim()) {
                    reject(new Error("Room ID is required. Please join a room first using joinroom() before deleting messages."));
                    return;
                }
                const payload = {
                    action: 'delete_single_peer_chat',
                    data: {
                        room_id: roomId.trim(),
                        organization_id: this.organizationId,
                        user_id: this.userId,
                        message_id: messageId.trim(),
                        scope: scope
                    }
                };
                try {
                    const response = await axios.post(`${apiUrl}/chat/deleteSinglePeerChat`, payload, { withCredentials: true });
                    if (response.data && response.data.status === 200) {
                        console.log('✅ [PeerChat] Message deleted successfully');
                        const textMessage = new TextMessage(receiverId || this.currentPeerId || "", "", RECEIVER_TYPE.USER);
                        textMessage._setId(messageId);
                        textMessage._setDeletedAt(new Date().toISOString());
                        textMessage._setDeletedBy(this.userId);
                        textMessage._setStatus("deleted");
                        resolve(textMessage);
                    }
                    else {
                        const errorMessage = response.data?.message || "Failed to delete message";
                        console.error('❌ [PeerChat] Delete message failed:', errorMessage);
                        reject(new Error(errorMessage));
                    }
                }
                catch (apiError) {
                    const errorMessage = apiError.response?.data?.message || apiError.message || "Failed to delete message";
                    console.error('❌ [PeerChat] API error deleting message:', errorMessage);
                    reject(new Error(errorMessage));
                }
            }
            catch (error) {
                const errorMessage = error.message || "Unknown error in deleteMessage";
                console.error('❌ [PeerChat] Error in deleteMessage:', errorMessage);
                reject(new Error(errorMessage));
            }
        });
    }
    static async deleteConversation(UID, type) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            if (!UID || typeof UID !== 'string' || UID.trim().length === 0) {
                throw PeerChatErrorHandler.handleSDKInitializationError("UID must be a non-empty string", "deleteConversation");
            }
            if (type !== "user") {
                throw PeerChatErrorHandler.handleSDKInitializationError('Type must be "user" for peer conversations', "deleteConversation");
            }
            const trimmedUID = UID.trim();
            if (this.currentPeerId !== trimmedUID || !this.currentRoomId) {
                throw new Error(`Not in room with peer ${trimmedUID}. Please join the room first using joinroom(${trimmedUID}) before deleting the conversation.`);
            }
            const roomId = this.currentRoomId;
            console.log('🗑️ [PeerChat] Deleting conversation with peer:', UID, 'Room:', roomId);
            const requestPayload = {
                action: 'delete_peer_conversation',
                data: {
                    room_id: roomId,
                    organization_id: this.organizationId.trim(),
                    user_id: this.userId.trim()
                }
            };
            const response = await axios.post(`${apiUrl}/chat/deletePeerConversation`, requestPayload, { withCredentials: true });
            // Validate response
            if (!response || !response.data) {
                throw new Error("Invalid response from server: missing data");
            }
            // Check response status
            if (response.data.status === 200 && response.data.data) {
                const { room_id, user_id, deleted_at } = response.data.data;
                if (!room_id || !user_id || !deleted_at) {
                    throw new Error("Invalid response from server: missing required fields in response data");
                }
                console.log('✅ [PeerChat] Conversation deleted successfully');
                return {
                    room_id: room_id,
                    user_id: user_id,
                    deleted_at: deleted_at
                };
            }
            else {
                const errorMessage = response.data.message || "Failed to delete conversation";
                throw new Error(errorMessage);
            }
        }
        catch (error) {
            if (error.response && error.response.status === 404) {
                const errorData = error.response.data || {};
                const errorMessage = errorData.message || error.message || "Conversation not found";
                throw new Error(`Conversation not found: ${errorMessage}`);
            }
            const errorResult = PeerChatErrorHandler.handleAxiosError(error, "deleteConversation");
            if (errorResult.isError && errorResult.error) {
                if (error.response) {
                    const statusCode = error.response.status;
                    const errorData = error.response.data || {};
                    const errorMessage = errorData.message || error.message || "Failed to delete conversation";
                    if (statusCode === 400) {
                        throw new Error(`Invalid request: ${errorMessage}`);
                    }
                    else if (statusCode === 403) {
                        throw new Error(`Access denied: ${errorMessage}`);
                    }
                }
                throw errorResult.error;
            }
            else {
                throw errorResult.error || new Error("Failed to delete conversation: Unknown error");
            }
        }
    }
    static startTyping(typingNotification) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                PeerChatErrorHandler.handleSDKInitializationError(validationError, "startTyping");
                return;
            }
            if (!typingNotification) {
                PeerChatErrorHandler.handleSDKInitializationError("TypingIndicator is required", "startTyping");
                return;
            }
            if (typingNotification.getReceiverType() !== RECEIVER_TYPE.USER) {
                PeerChatErrorHandler.handleSDKInitializationError(`PeerChat can only send typing indicators to USER, received: ${typingNotification.getReceiverType()}`, "startTyping");
                return;
            }
            const receiverId = typingNotification.getReceiver();
            if (!receiverId || typeof receiverId !== 'string' || receiverId.trim().length === 0) {
                PeerChatErrorHandler.handleSDKInitializationError("Receiver ID is required and must be a non-empty string", "startTyping");
                return;
            }
            if (!this.userName || typeof this.userName !== 'string' || this.userName.trim().length === 0) {
                PeerChatErrorHandler.handleSDKInitializationError("User name is required for typing indicator", "startTyping");
                return;
            }
            const trimmedReceiverId = receiverId.trim();
            let roomId;
            if (this.currentPeerId === trimmedReceiverId && this.currentRoomId) {
                roomId = this.currentRoomId;
                console.log('⌨️ [PeerChat] Using existing room ID for typing:', roomId);
            }
            else {
                console.log('⌨️ [PeerChat] Room not joined, joining room first...');
                roomId = this.joinRoom(trimmedReceiverId);
                if (!roomId) {
                    PeerChatErrorHandler.handleRoomJoinError("Failed to join room for typing indicator");
                    return;
                }
            }
            console.log('⌨️ [PeerChat] Starting typing indicator for receiver:', trimmedReceiverId, 'room:', roomId);
            // Emit typing event to server
            try {
                if (!this.socket) {
                    throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "startTyping");
                }
                this.socket.emit('peerTyping', {
                    room_id: roomId,
                    userId: this.userId,
                    userName: this.userName
                });
                console.log('✅ [PeerChat] Typing indicator started successfully');
            }
            catch (emitError) {
                PeerChatErrorHandler.handleSocketEmitError("peerTyping", emitError, "startTyping");
            }
        }
        catch (error) {
            PeerChatErrorHandler.handleSocketConnectionError(error, "startTyping");
        }
    }
    static endTyping(typingNotification) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                PeerChatErrorHandler.handleSDKInitializationError(validationError, "endTyping");
                return;
            }
            if (!typingNotification) {
                PeerChatErrorHandler.handleSDKInitializationError("TypingIndicator is required", "endTyping");
                return;
            }
            if (typingNotification.getReceiverType() !== RECEIVER_TYPE.USER) {
                PeerChatErrorHandler.handleSDKInitializationError(`PeerChat can only send typing indicators to USER, received: ${typingNotification.getReceiverType()}`, "endTyping");
                return;
            }
            const receiverId = typingNotification.getReceiver();
            if (!receiverId || typeof receiverId !== 'string' || receiverId.trim().length === 0) {
                PeerChatErrorHandler.handleSDKInitializationError("Receiver ID is required and must be a non-empty string", "endTyping");
                return;
            }
            if (!this.userName || typeof this.userName !== 'string' || this.userName.trim().length === 0) {
                PeerChatErrorHandler.handleSDKInitializationError("User name is required for typing indicator", "endTyping");
                return;
            }
            const trimmedReceiverId = receiverId.trim();
            let roomId;
            if (this.currentPeerId === trimmedReceiverId && this.currentRoomId) {
                roomId = this.currentRoomId;
                console.log('⌨️ [PeerChat] Using existing room ID for typing:', roomId);
            }
            else {
                console.log('⌨️ [PeerChat] Room not joined, joining room first...');
                roomId = this.joinRoom(trimmedReceiverId);
                if (!roomId) {
                    PeerChatErrorHandler.handleRoomJoinError("Failed to join room for typing indicator");
                    return;
                }
            }
            console.log('⌨️ [PeerChat] Ending typing indicator for receiver:', trimmedReceiverId, 'room:', roomId);
            // Emit stop typing event to server
            try {
                if (!this.socket) {
                    throw PeerChatErrorHandler.handleSocketError("Socket not initialized", "endTyping");
                }
                this.socket.emit('peerStopTyping', {
                    room_id: roomId,
                    userId: this.userId,
                    userName: this.userName
                });
                console.log('✅ [PeerChat] Typing indicator ended successfully');
            }
            catch (emitError) {
                PeerChatErrorHandler.handleSocketEmitError("peerStopTyping", emitError, "endTyping");
            }
        }
        catch (error) {
            PeerChatErrorHandler.handleSocketConnectionError(error, "endTyping");
        }
    }
    static async getapplictionuserlist() {
        const validationError = PeerChatErrorHandler.validateSDKInitialization({
            socket: this.socket,
            userId: this.userId,
            organizationId: this.organizationId,
            applicationId: this.applicationId
        });
        if (validationError) {
            throw new Error(validationError);
        }
        try {
            const requestBody = new GetApplicationParticipantsRequest(this.organizationId, this.applicationId);
            const response = await axios.post(`${apiUrl}/user/getApplicationParticipants`, requestBody, { withCredentials: true });
            const participants = response.data.data?.participants || [];
            const filteredParticipants = participants.filter((p) => p.participant_id !== this.userId);
            return filteredParticipants;
        }
        catch (error) {
            console.error("❌ PeerChat :: Failed to fetch user list");
            throw error;
        }
    }
    static async fetchPreviousMessages(peerId, options = {}) {
        const validationError = PeerChatErrorHandler.validateSDKInitialization({
            socket: this.socket,
            userId: this.userId,
            organizationId: this.organizationId,
            applicationId: this.applicationId
        });
        if (validationError) {
            throw new Error(validationError);
        }
        if (!peerId || typeof peerId !== 'string' || !peerId.trim()) {
            throw new Error("peerId is required and must be a non-empty string");
        }
        if (this.currentPeerId !== peerId || !this.currentRoomId || !this.currentRoomId.trim()) {
            throw new Error("Room not found. Please call joinRoom(peerId) first before fetching messages. Only existing rooms have chats.");
        }
        const roomId = this.currentRoomId;
        const { limit = 100, page = 1, includeDeleted = false } = options;
        const normalizedLimit = typeof limit === 'number' && limit >= 1 && limit <= 100
            ? Math.floor(limit)
            : 100;
        const normalizedPage = typeof page === 'number' && page >= 1
            ? Math.floor(page)
            : 1;
        try {
            const requestData = {
                room_id: roomId.trim(),
                organization_id: this.organizationId,
                user_id: this.userId,
                page: normalizedPage,
                limit: normalizedLimit,
                include_deleted: Boolean(includeDeleted)
            };
            const response = await axios.post(`${apiUrl}/chat/getPaginatedPeerChat`, {
                action: 'get_peer_chat',
                data: requestData
            }, { withCredentials: true });
            if (response.data && response.data.status === 200) {
                const { chats, currentPage, totalPages, totalChats } = response.data.data || {};
                console.log('✅ [PeerChat] Messages fetched successfully:', {
                    count: chats?.length || 0,
                    currentPage: currentPage || normalizedPage,
                    totalPages: totalPages || 0,
                    totalChats: totalChats || 0
                });
                const messages = (chats || []).map((chat) => {
                    const messageText = chat.chat || chat.message || chat.text || chat.content || "";
                    const senderId = chat.user || chat.sender_id || chat.user_id || chat.from_user_id || "";
                    const textMessage = new TextMessage(chat.receiver_id || chat.peer_id || peerId, messageText, RECEIVER_TYPE.USER);
                    textMessage._setId(chat.message_id || chat.id || chat._id || "");
                    textMessage._setSenderId(senderId);
                    textMessage._setSenderName(chat.sender_name || chat.user_name || chat.from_user_name || senderId || "");
                    textMessage._setSentAt(chat.created_at || chat.timestamp || chat.sent_at || chat.time || "");
                    textMessage._setStatus(chat.status || "delivered");
                    if (chat.reactions && Array.isArray(chat.reactions)) {
                        textMessage.reactionsData = chat.reactions;
                    }
                    if (chat.reply_to_message_id || chat.parent_message_id) {
                        textMessage._setParentMessageId(chat.reply_to_message_id || chat.parent_message_id || "");
                    }
                    if (chat.reply_to_user_id) {
                        textMessage._setReplyToUserId(chat.reply_to_user_id);
                    }
                    if (chat.reply_to_text || chat.parent_message_text) {
                        textMessage._setReplyToText(chat.reply_to_text || chat.parent_message_text || "");
                    }
                    if (chat.reply_type) {
                        textMessage._setReplyType(chat.reply_type);
                    }
                    if (chat.edited_at) {
                        textMessage._setEditedAt(chat.edited_at);
                    }
                    if (chat.edited_by) {
                        textMessage._setEditedBy(chat.edited_by);
                    }
                    if (chat.deleted_at) {
                        textMessage._setDeletedAt(chat.deleted_at);
                    }
                    if (chat.deleted_by) {
                        textMessage._setDeletedBy(chat.deleted_by);
                    }
                    if (chat.message_type && chat.message_type !== 'text') {
                        textMessage.messageType = chat.message_type;
                    }
                    const fileInfoData = chat.file_info || chat.fileInfo;
                    if (fileInfoData) {
                        const fileId = fileInfoData.fileId || fileInfoData.file_id || chat.file_id || "";
                        let attachmentUrl = fileInfoData.downloadUrl || fileInfoData.download_url;
                        if (!attachmentUrl && fileId) {
                            attachmentUrl = `${apiUrl}/chat/download/${fileId}`;
                        }
                        if (attachmentUrl && !attachmentUrl.startsWith('http')) {
                            const cleanPath = attachmentUrl.startsWith('/') ? attachmentUrl.substring(1) : attachmentUrl;
                            attachmentUrl = `${apiUrl}/${cleanPath}`;
                        }
                        const fileInfo = {
                            fileId: fileId,
                            originalName: fileInfoData.originalName || fileInfoData.original_name || fileInfoData.name || "",
                            size: fileInfoData.size || 0,
                            mimeType: fileInfoData.mimeType || fileInfoData.mime_type || fileInfoData.type || "",
                            attachmentUrl: attachmentUrl,
                            downloadUrl: attachmentUrl
                        };
                        if (fileInfo.fileId || attachmentUrl) {
                            textMessage.fileInfo = fileInfo;
                            if (!textMessage.data) {
                                textMessage.data = {};
                            }
                            if (attachmentUrl) {
                                textMessage.data.attachments = [{
                                        url: attachmentUrl,
                                        mimeType: fileInfo.mimeType
                                    }];
                                textMessage.data.url = attachmentUrl;
                                textMessage.attachmentUrl = attachmentUrl;
                            }
                            console.log('📎 [PeerChat] Extracted fileInfo from history:', {
                                messageId: textMessage.getId(),
                                messageType: chat.message_type || chat.messageType,
                                fileId: fileInfo.fileId,
                                fileName: fileInfo.originalName,
                                downloadUrl: attachmentUrl,
                                hasUrl: !!attachmentUrl
                            });
                        }
                    }
                    const sender = new User(senderId, chat.user_name || chat.sender_name || senderId || "");
                    textMessage._setSender(sender);
                    const receiver = new User(peerId, peerId);
                    textMessage._setReceiver(receiver);
                    return textMessage;
                });
                return {
                    messages,
                    currentPage: currentPage || normalizedPage,
                    totalPages: totalPages || 0,
                    totalChats: totalChats || 0
                };
            }
            else {
                const errorResult = PeerChatErrorHandler.handleApiErrorResponse(response.data, "fetchPreviousMessages", normalizedPage);
                if (errorResult.isError && errorResult.error) {
                    throw errorResult.error;
                }
                else if (errorResult.isEmptyResult && errorResult.emptyResult) {
                    return errorResult.emptyResult;
                }
                else {
                    throw new Error("Failed to fetch messages: Unknown error");
                }
            }
        }
        catch (error) {
            const errorResult = PeerChatErrorHandler.handleAxiosError(error, "fetchPreviousMessages", normalizedPage);
            if (errorResult.isError && errorResult.error) {
                throw errorResult.error;
            }
            else if (errorResult.isEmptyResult && errorResult.emptyResult) {
                return errorResult.emptyResult;
            }
            else {
                throw new Error("Failed to fetch messages: Unknown error");
            }
        }
    }
    static async blockUsers(usersList, roomId) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            if (!Array.isArray(usersList) || usersList.length === 0) {
                throw PeerChatErrorHandler.handleSDKInitializationError("usersList must be a non-empty array of user IDs", "blockUsers");
            }
            const validUserIds = usersList.filter(uid => typeof uid === 'string' && uid.trim().length > 0);
            if (validUserIds.length === 0) {
                throw PeerChatErrorHandler.handleSDKInitializationError("No valid user IDs found in usersList", "blockUsers");
            }
            if (!this.organizationId || typeof this.organizationId !== 'string' || !this.organizationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("Organization ID is required", "blockUsers");
            }
            if (!this.applicationId || typeof this.applicationId !== 'string' || !this.applicationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("Application ID is required", "blockUsers");
            }
            if (!this.userId || typeof this.userId !== 'string' || !this.userId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("User ID is required", "blockUsers");
            }
            const results = {};
            for (const blockedUserId of validUserIds) {
                try {
                    if (this.userId === blockedUserId) {
                        results[blockedUserId] = 'fail';
                        console.error(`❌ [PeerChat] Cannot block yourself: ${blockedUserId}`);
                        continue;
                    }
                    const finalRoomId = roomId || this.currentRoomId;
                    if (!finalRoomId || typeof finalRoomId !== 'string' || !finalRoomId.trim()) {
                        results[blockedUserId] = 'fail';
                        console.error(`❌ [PeerChat] Room ID is required for blocking user ${blockedUserId}. Provide roomId parameter or join a room first using joinroom()`);
                        continue;
                    }
                    const response = await axios.post(`${apiUrl}/chat/blockUser`, {
                        action: 'block_user',
                        data: {
                            room_id: finalRoomId.trim(),
                            organization_id: this.organizationId.trim(),
                            blocker_user_id: this.userId.trim(),
                            blocked_user_id: blockedUserId.trim()
                        }
                    }, { withCredentials: true });
                    if (response.data && response.data.status === 200) {
                        results[blockedUserId] = 'success';
                        console.log(`✅ [PeerChat] User ${blockedUserId} blocked successfully`);
                    }
                    else {
                        const statusCode = response.data?.status;
                        const errorMessage = response.data?.message || "Failed to block user";
                        if (statusCode === 400) {
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Failed to block user ${blockedUserId}: ${errorMessage}`);
                        }
                        else if (statusCode === 403) {
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Access denied for blocking user ${blockedUserId}: ${errorMessage}`);
                        }
                        else if (statusCode === 404) {
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Room not found for blocking user ${blockedUserId}`);
                        }
                        else {
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Failed to block user ${blockedUserId}: ${errorMessage}`);
                        }
                    }
                }
                catch (blockError) {
                    results[blockedUserId] = 'fail';
                    const errorMessage = blockError.response?.data?.message || blockError.message || "Unknown error";
                    const statusCode = blockError.response?.status;
                    if (statusCode === 400) {
                        console.error(`❌ [PeerChat] Bad request for blocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 403) {
                        console.error(`❌ [PeerChat] Access denied for blocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 404) {
                        console.error(`❌ [PeerChat] Room not found for blocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 409) {
                        console.error(`❌ [PeerChat] Action mismatch for blocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 500) {
                        console.error(`❌ [PeerChat] Server error for blocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else {
                        console.error(`❌ [PeerChat] Failed to block user ${blockedUserId}: ${errorMessage}`);
                    }
                }
            }
            const successCount = Object.values(results).filter(r => r === 'success').length;
            console.log(`✅ [PeerChat] Block operation completed: ${successCount}/${validUserIds.length} successful`);
            return results;
        }
        catch (error) {
            console.error('❌ [PeerChat] Failed to block users:', error);
            if (error instanceof Error) {
                throw error;
            }
            const errorResult = PeerChatErrorHandler.handleAxiosError(error, "blockUsers");
            if (errorResult.isError && errorResult.error) {
                throw errorResult.error;
            }
            else {
                throw new Error(error.response?.data?.message || error.message || "Failed to block users");
            }
        }
    }
    static async unblockUsers(usersList, roomId) {
        try {
            const validationError = PeerChatErrorHandler.validateSDKInitialization({
                socket: this.socket,
                userId: this.userId,
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
            if (validationError) {
                throw new Error(validationError);
            }
            if (!Array.isArray(usersList) || usersList.length === 0) {
                throw PeerChatErrorHandler.handleSDKInitializationError("usersList must be a non-empty array of user IDs", "unblockUsers");
            }
            const validUserIds = usersList.filter(uid => typeof uid === 'string' && uid.trim().length > 0);
            if (validUserIds.length === 0) {
                throw PeerChatErrorHandler.handleSDKInitializationError("No valid user IDs found in usersList", "unblockUsers");
            }
            if (!this.organizationId || typeof this.organizationId !== 'string' || !this.organizationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("Organization ID is required", "unblockUsers");
            }
            if (!this.applicationId || typeof this.applicationId !== 'string' || !this.applicationId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("Application ID is required", "unblockUsers");
            }
            // Validate userId
            if (!this.userId || typeof this.userId !== 'string' || !this.userId.trim()) {
                throw PeerChatErrorHandler.handleSDKInitializationError("User ID is required", "unblockUsers");
            }
            const results = {};
            for (const blockedUserId of validUserIds) {
                try {
                    const finalRoomId = roomId || this.currentRoomId;
                    if (!finalRoomId || typeof finalRoomId !== 'string' || !finalRoomId.trim()) {
                        results[blockedUserId] = 'fail';
                        console.error(`❌ [PeerChat] Room ID is required for unblocking user ${blockedUserId}. Provide roomId parameter or join a room first using joinroom()`);
                        continue;
                    }
                    console.log('✅ [PeerChat] Unblocking user:', blockedUserId, 'in room:', finalRoomId);
                    const response = await axios.post(`${apiUrl}/chat/unblockUser`, {
                        action: 'unblock_user',
                        data: {
                            room_id: finalRoomId.trim(),
                            organization_id: this.organizationId.trim(),
                            blocker_user_id: this.userId.trim(),
                            blocked_user_id: blockedUserId.trim()
                        }
                    }, { withCredentials: true });
                    // Handle response based on status code
                    if (response.data && response.data.status === 200) {
                        results[blockedUserId] = 'success';
                        console.log(`✅ [PeerChat] User ${blockedUserId} unblocked successfully`);
                    }
                    else {
                        // Handle backend error responses
                        const statusCode = response.data?.status;
                        const errorMessage = response.data?.message || "Failed to unblock user";
                        if (statusCode === 400) {
                            // User is not blocked or invalid request
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Failed to unblock user ${blockedUserId}: ${errorMessage}`);
                        }
                        else if (statusCode === 403) {
                            // Access denied
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Access denied for unblocking user ${blockedUserId}: ${errorMessage}`);
                        }
                        else if (statusCode === 404) {
                            // Room not found
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Room not found for unblocking user ${blockedUserId}: ${errorMessage}`);
                        }
                        else {
                            results[blockedUserId] = 'fail';
                            console.error(`❌ [PeerChat] Failed to unblock user ${blockedUserId}: ${errorMessage}`);
                        }
                    }
                }
                catch (unblockError) {
                    results[blockedUserId] = 'fail';
                    const errorMessage = unblockError.response?.data?.message || unblockError.message || "Unknown error";
                    const statusCode = unblockError.response?.status;
                    if (statusCode === 400) {
                        console.error(`❌ [PeerChat] Bad request for unblocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 403) {
                        console.error(`❌ [PeerChat] Access denied for unblocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 404) {
                        console.error(`❌ [PeerChat] Room not found for unblocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 409) {
                        console.error(`❌ [PeerChat] Action mismatch for unblocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else if (statusCode === 500) {
                        console.error(`❌ [PeerChat] Server error for unblocking user ${blockedUserId}: ${errorMessage}`);
                    }
                    else {
                        console.error(`❌ [PeerChat] Failed to unblock user ${blockedUserId}: ${errorMessage}`);
                    }
                }
            }
            const successCount = Object.values(results).filter(r => r === 'success').length;
            console.log(`✅ [PeerChat] Unblock operation completed: ${successCount}/${validUserIds.length} successful`);
            return results;
        }
        catch (error) {
            console.error('❌ [PeerChat] Failed to unblock users:', error);
            if (error instanceof Error) {
                throw error;
            }
            const errorResult = PeerChatErrorHandler.handleAxiosError(error, "unblockUsers");
            if (errorResult.isError && errorResult.error) {
                throw errorResult.error;
            }
            else {
                throw new Error(error.response?.data?.message || error.message || "Failed to unblock users");
            }
        }
    }
}
PeerChat.organizationId = "";
PeerChat.applicationId = "";
PeerChat.userId = "";
PeerChat.userName = "";
PeerChat.socket = null;
PeerChat.currentRoomId = null;
PeerChat.currentPeerId = null;
PeerChat.listeners = new Map();
PeerChat.userListeners = new Map();
PeerChat.onlineUsers = new Map(); // organizationId -> Set<userId>
PeerChat.MESSAGE_TYPE = MESSAGE_TYPE;
PeerChat.RECEIVER_TYPE = RECEIVER_TYPE;
PeerChat.MessagesRequestBuilder = MessagesRequestBuilder;
PeerChat.MessagesRequest = MessagesRequest;

var PeerChat$1 = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BlockedUsersRequest: BlockedUsersRequest,
    BlockedUsersRequestBuilder: BlockedUsersRequestBuilder,
    MESSAGE_TYPE: MESSAGE_TYPE,
    MediaMessage: MediaMessage,
    MessagesRequest: MessagesRequest,
    MessagesRequestBuilder: MessagesRequestBuilder,
    TypingIndicator: TypingIndicator,
    default: PeerChat
});

const handlers = {
    TextMessage: TextMessage,
    addPeerMessageListener: function (id, listener) {
        if (!listener) {
            console.error('❌ [HANDLER] Invalid listener: listener object required');
            return;
        }
        PeerChat.addMessageListener(id, listener);
    },
    removePeerMessageListener: function (id) {
        PeerChat.removeMessageListener(id);
    },
    addGroupMessageListener: function (id, listener) {
        if (!listener) {
            console.error('❌ [HANDLER] Invalid listener: listener object required');
            return;
        }
        GroupChat.addMessageListener(id, listener);
    },
    removeGroupMessageListener: function (id) {
        GroupChat.removeMessageListener(id);
    },
};

class SamparkChat {
    static addLoginListener(listenerID, listener) {
        console.log(`📌 Adding LoginListener: ${listenerID}`);
        this.loginListeners.set(listenerID, listener);
    }
    static removeLoginListener(listenerID) {
        console.log(`🗑 Removing LoginListener: ${listenerID}`);
        this.loginListeners.delete(listenerID);
    }
    static notifyLoginSuccess(user) {
        this.loginListeners.forEach(listener => {
            listener.loginSuccess?.(user);
        });
    }
    static notifyLoginFailure(error) {
        this.loginListeners.forEach(listener => {
            listener.loginFailure?.(error);
        });
    }
    static notifyLogoutSuccess() {
        this.loginListeners.forEach(listener => {
            listener.logoutSuccess?.();
        });
    }
    static notifyLogoutFailure(error) {
        this.loginListeners.forEach(listener => {
            listener.logoutFailure?.(error);
        });
    }
    static init(appId, secretKey) {
        if (this.initialized) {
            return Promise.resolve({
                organizationId: this.organizationId,
                applicationId: this.applicationId
            });
        }
        return axios
            .post(`${apiUrl}/meeting/generateToken`, new GenerateTokenRequest(appId, secretKey))
            .then(res => {
            try {
                const data = res.data.data;
                if (!data) {
                    throw new Error("Invalid API response: no data returned");
                }
                if (!data.user_id && !data.organization_id) {
                    throw new Error("Invalid API response: missing organization ID");
                }
                if (!data.application_id && !data.app_id) {
                    throw new Error("Invalid API response: missing application ID");
                }
                this.organizationId = data.user_id || data.organization_id;
                this.applicationId = data.application_id || data.app_id;
                GroupChat.setOrganizationId(this.organizationId);
                GroupChat.setApplicationId(this.applicationId);
                PeerChat.setOrganizationId(this.organizationId);
                PeerChat.setApplicationId(this.applicationId);
                try {
                    console.log('🔌 [SamparkChat] Initializing websocket connection...');
                    this.socket = lookup(apiUrl, {
                        transports: ["websocket"],
                        reconnection: true,
                        autoConnect: true,
                        withCredentials: true
                    });
                    this.socket.on('connect_error', (error) => {
                        console.error('❌ [SamparkChat] WebSocket connection error:', error);
                    });
                    this.socket.on('disconnect', (reason) => {
                        console.warn('⚠️ [SamparkChat] WebSocket disconnected:', reason);
                    });
                    this.socket.on('connect', () => {
                        console.log('✅ [SamparkChat] WebSocket connected successfully');
                        if (this.currentUser) {
                            console.log('👥 [SamparkChat] Socket connected, notifying user online');
                            PeerChat.notifyUserOnline();
                        }
                    });
                    try {
                        PeerChat.setSocket(this.socket);
                        GroupChat.setSocket(this.socket);
                        console.log('✅ [SamparkChat] Socket handlers registered successfully');
                    }
                    catch (socketHandlerError) {
                        console.error('❌ [SamparkChat] Failed to register socket handlers:', socketHandlerError);
                        throw new Error(`Failed to register socket handlers: ${socketHandlerError instanceof Error ? socketHandlerError.message : String(socketHandlerError)}`);
                    }
                    this.initialized = true;
                    return {
                        organizationId: this.organizationId,
                        applicationId: this.applicationId
                    };
                }
                catch (socketError) {
                    console.error('❌ [SamparkChat] WebSocket initialization failed:', socketError);
                    if (this.socket) {
                        try {
                            this.socket.disconnect();
                            this.socket = null;
                        }
                        catch (cleanupError) {
                            console.error('❌ [SamparkChat] Error during socket cleanup:', cleanupError);
                        }
                    }
                    throw new Error(`WebSocket initialization failed: ${socketError instanceof Error ? socketError.message : String(socketError)}`);
                }
            }
            catch (error) {
                console.error('❌ [SamparkChat] Init method error:', error);
                throw error;
            }
        })
            .catch(error => {
            console.error('❌ [SamparkChat] Failed to initialize SDK:', error);
            this.initialized = false;
            throw error;
        });
    }
    static async login(userId) {
        try {
            const res = await axios.post(`${apiUrl}/user/validateApplicationUser`, new ValidateApplicationUserRequest(this.organizationId, this.applicationId, userId), { withCredentials: true });
            const data = res.data.data;
            if (!data?.renew_token)
                throw new Error("renew_token missing");
            this.renewToken = data.renew_token;
            localStorage.setItem("sampark_renew_token", data.renew_token);
            const user = {
                id: data.user_id,
                name: data.participant_details?.participant_name ||
                    data.agent_details?.agent_name ||
                    "Unknown"
            };
            localStorage.setItem("sampark_loggedin_user", JSON.stringify(user));
            this.currentUser = user;
            PeerChat.setUserId(user.id);
            PeerChat.setUserName(user.name);
            GroupChat.setUserId(user.id);
            GroupChat.setUserName(user.name);
            PeerChat.notifyUserOnline();
            this.notifyLoginSuccess(user);
            console.log("🔑 [SamparkChat] Login successful, user:", user);
            return user;
        }
        catch (err) {
            this.notifyLoginFailure(err);
            throw err;
        }
    }
    static async getLoggedinUser() {
        if (this.currentUser)
            return this.currentUser;
        const storedUser = localStorage.getItem("sampark_loggedin_user");
        if (!storedUser)
            return null;
        const restored = await this.renewSession();
        if (!restored) {
            console.warn("⚠️ Session restore failed, clearing local user");
            localStorage.removeItem("sampark_loggedin_user");
            localStorage.removeItem("sampark_renew_token");
            return null;
        }
        const user = JSON.parse(storedUser);
        this.currentUser = user;
        PeerChat.setUserId(user.id);
        PeerChat.setUserName(user.name);
        GroupChat.setUserId(user.id);
        GroupChat.setUserName(user.name);
        if (this.socket && this.socket.connected) {
            PeerChat.notifyUserOnline();
        }
        else {
            const checkSocket = () => {
                if (this.socket && this.socket.connected) {
                    PeerChat.notifyUserOnline();
                }
                else {
                    setTimeout(checkSocket, 100);
                }
            };
            setTimeout(checkSocket, 100);
        }
        this.notifyLoginSuccess(user);
        return user;
    }
    static startTyping(typingNotification) {
        PeerChat.startTyping(typingNotification);
    }
    static endTyping(typingNotification) {
        PeerChat.endTyping(typingNotification);
    }
    static addPeerMessageListener(listenerID, listener) {
        PeerChat.addMessageListener(listenerID, listener);
    }
    static removePeerMessageListener(listenerID) {
        PeerChat.removeMessageListener(listenerID);
    }
    static addGroupMessageListener(listenerID, listener) {
        GroupChat.addMessageListener(listenerID, listener);
    }
    static removeGroupMessageListener(listenerID) {
        GroupChat.removeMessageListener(listenerID);
    }
    static addUserListener(listenerID, listener) {
        PeerChat.addUserListener(listenerID, listener);
    }
    static removeUserListener(listenerID) {
        PeerChat.removeUserListener(listenerID);
    }
    static getOnlineUsers(organizationId) {
        return PeerChat.getOnlineUsers(organizationId);
    }
    static async renewSession() {
        const token = localStorage.getItem("sampark_renew_token");
        if (!token)
            return false;
        try {
            await axios.post(`${apiUrl}/user/restoreSession`, new RenewTokenRequest(token), { withCredentials: true });
            return true;
        }
        catch {
            return false;
        }
    }
    static getSocket() {
        return this.socket;
    }
    // CometChat-style block/unblock API
    static async blockUsers(usersList) {
        return PeerChat.blockUsers(usersList);
    }
    static async unblockUsers(usersList) {
        return PeerChat.unblockUsers(usersList);
    }
    static async updateGroupMemberScope(guid, uid, newScope) {
        return GroupChat.updateGroupMemberScope(guid, uid, newScope);
    }
}
SamparkChat.socket = null;
SamparkChat.initialized = false;
SamparkChat.organizationId = "";
SamparkChat.applicationId = "";
SamparkChat.currentUser = null;
SamparkChat.renewToken = null;
SamparkChat.loginListeners = new Map();
SamparkChat.TextMessage = TextMessage;
SamparkChat.TextMessageGroup = TextMessageGroup;
SamparkChat.MediaMessage = MediaMessage;
SamparkChat.MediaMessageGroup = MediaMessageGroup;
SamparkChat.GROUP_MESSAGE_TYPE = GROUP_MESSAGE_TYPE;
SamparkChat.GroupChat = GroupChat;
SamparkChat.PeerChat = PeerChat;
SamparkChat.RECEIVER_TYPE = RECEIVER_TYPE;
SamparkChat.MESSAGE_TYPE = MESSAGE_TYPE;
SamparkChat.GROUP_TYPE = GROUP_TYPE;
SamparkChat.GROUP_MEMBER_SCOPE = GROUP_MEMBER_SCOPE;
SamparkChat.Group = Group;
SamparkChat.GroupMember = GroupMember;
SamparkChat.GroupMessagesRequestBuilder = GroupMessagesRequestBuilder;
SamparkChat.GroupMessagesRequest = GroupMessagesRequest;
SamparkChat.GroupReactionRequestBuilder = GroupReactionRequestBuilder;
SamparkChat.GroupReactionRequest = GroupReactionRequest;
SamparkChat.GroupMembersRequestBuilder = GroupMembersRequestBuilder;
SamparkChat.GroupMembersRequest = GroupMembersRequest;
SamparkChat.BlockedUsersRequestBuilder = BlockedUsersRequestBuilder;
SamparkChat.BlockedUsersRequest = BlockedUsersRequest;
SamparkChat.BannedMembersRequestBuilder = BannedMembersRequestBuilder;
SamparkChat.BannedMembersRequest = BannedMembersRequest;
SamparkChat.TypingIndicator = TypingIndicator;
Object.assign(SamparkChat, handlers);

exports.BannedMembersRequest = BannedMembersRequest;
exports.BannedMembersRequestBuilder = BannedMembersRequestBuilder;
exports.GROUP_MEMBER_SCOPE = GROUP_MEMBER_SCOPE;
exports.GROUP_TYPE = GROUP_TYPE;
exports.Group = Group;
exports.GroupMember = GroupMember;
exports.GroupMembersRequest = GroupMembersRequest;
exports.GroupMembersRequestBuilder = GroupMembersRequestBuilder;
exports.GroupMessagesRequest = GroupMessagesRequest;
exports.GroupMessagesRequestBuilder = GroupMessagesRequestBuilder;
exports.GroupReactionRequest = GroupReactionRequest;
exports.GroupReactionRequestBuilder = GroupReactionRequestBuilder;
exports.GroupUser = GroupUser;
exports.MessagesRequest = MessagesRequest;
exports.MessagesRequestBuilder = MessagesRequestBuilder;
exports.RECEIVER_TYPE = RECEIVER_TYPE;
exports.SamparkChat = SamparkChat;
exports.TextMessage = TextMessage;
exports.TextMessageGroup = TextMessageGroup;
exports.TypingIndicator = TypingIndicator;
exports.User = User;
