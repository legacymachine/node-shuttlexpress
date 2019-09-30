//process.env.DEBUG = 'event';

const debugRaw = require('debug')('raw');
const debugEvent = require('debug')('event');

const events = require('events');
const HID = require('node-hid');

// Default Device Details
const SHUTTLEXPRESS_VENDOR_ID = 0x0b33;
const SHUTTLEXPRESS_PRODUCT_ID = 0x0020;
const PRODUCT = 'ShuttleXpress';

class ShuttleXpress extends events.EventEmitter {

    constructor(vendorId = SHUTTLEXPRESS_VENDOR_ID, productId = SHUTTLEXPRESS_PRODUCT_ID) {

        super(vendorId, productId);

        this.vendorId = vendorId;
        this.productId = productId;

        this.buffers = [];
        this.buffers.push(Buffer.alloc(5).toJSON().data);

        try {
            this.device = new HID.HID(this.vendorId, this.productId);
            this.init();
        } catch (err) {
            //throw 'ShuttleXpress device not found!';
            this.emit('error', err);
        }     

    }

    // Class Methods
    init() {

        // emits ShuttleXpress 'event' 
        this.device.on('data', (data) => {
            this.buffers.push(data.toJSON().data);
            const shuttleEvent = this._getShuttleEvent(this.buffers);
            this.emit('event', shuttleEvent);
        });

        // emits ShuttleXpress 'error'
        this.device.on('error', (err) => {
            this.emit('error', err);
        });

        // emits ShuttleXpress 'connect' on init
        process.nextTick(() => {
            this.emit('connect', 'ShuttleXpress is connected!');
        });

    }

    getDeviceInfo() {

        const devices = HID.devices();

        const deviceInfo = devices.find((d) => {
            const device = (d.vendorId === this.vendorId) && (d.productId === this.productId) && (d.product === PRODUCT);
            return device;
        });

        return deviceInfo;

    }

    _getShuttleEvent(buffers) {

        const previous = buffers[0];
        const now = buffers[1];

        const BTN_1 = 16;
        const BTN_2 = 32;
        const BTN_3 = 64;
        const BTN_4 = 128;
        const BTN_5 = 1;

        const JOG_ZONE_NEUTRAL = 0
        const JOG_ZONE_POSITIVE_MIN = 1
        const JOG_ZONE_POSITIVE_MAX = 7
        const JOG_ZONE_NEGATIVE_MIN = 255
        const JOG_ZONE_NEGATIVE_MAX = 249

        const INCREMENT_MIN = 0;
        const INCREMENT_MAX = 255;

        let shuttleEvent = null;

        if (now[0] !== previous[0]) {

            debugRaw(`now[0]: ${now[0]}, previous[0]: ${previous[0]}`);

            if (now[0] === JOG_ZONE_NEUTRAL)  {
                shuttleEvent = {cmd: "JOG", value: now[0], raw: now[0]};
            } else if (now[0] >= JOG_ZONE_POSITIVE_MIN && now[0] <= JOG_ZONE_POSITIVE_MAX)  {
                shuttleEvent = {cmd: "JOG", value: now[0], raw: now[0]};
            } else if (now[0] <= JOG_ZONE_NEGATIVE_MIN && now[0] >= JOG_ZONE_NEGATIVE_MAX) {
                shuttleEvent = {cmd: "JOG", value: (JOG_ZONE_NEGATIVE_MIN - (now[0] - 1)) * -1, raw: now[0]};
            }

            previous[0] = now[0]; // Store Previous Jog State
            previous[1] = now[1]; // Store Previous Increment State

        } else if (now[3] !== previous[3]) {

            debugRaw(`now[3]: ${now[3]}, previous[3]: ${previous[3]}`);

            if (now[3] === BTN_1) shuttleEvent = {cmd: "BTN_1", value: true, raw: now[3]};
            if (previous[3] === BTN_1) shuttleEvent = {cmd: "BTN_1", value: false, raw: now[3]};

            if (now[3] === BTN_2) shuttleEvent = {cmd: "BTN_2", value: true, raw: now[3]};
            if (previous[3] === BTN_2) shuttleEvent = {cmd: "BTN_2", value: false, raw: now[3]};

            if (now[3] === BTN_3) shuttleEvent = {cmd: "BTN_3", value: true, raw: now[3]};
            if (previous[3] === BTN_3) shuttleEvent = {cmd: "BTN_3", value: false, raw: now[3]};

            if (now[3] === BTN_4) shuttleEvent = {cmd: "BTN_4", value: true, raw: now[3]};
            if (previous[3] === BTN_4) shuttleEvent = {cmd: "BTN_4", value: false, raw: now[3]};

            previous[3] = now[3]; // Store Previous State
            previous[1] = now[1]; // Store Previous Increment State

        } else if (now[4] !== previous[4]) {

            debugRaw(`now[4]: ${now[4]}, previous[4]: ${previous[4]}`);

            if (now[4] === BTN_5) shuttleEvent = {cmd: "BTN_5", value: true, raw: now[4]};
            if (previous[4] === BTN_5) shuttleEvent = {cmd: "BTN_5", value: false, raw: now[4]};

            previous[4] = now[4]; // Store Previous Btn State
            previous[1] = now[1]; // Store Previous Increment State

        } else {

            if (now[1] !== previous[1]) {

                debugRaw(`now[1]: ${now[1]}, previous[1]: ${previous[1]}`);

                if (previous[1] === INCREMENT_MAX && now[1] === INCREMENT_MIN) {
                    shuttleEvent = {cmd: "INCREMENT", value: +1, raw: now[1]};
                } else if (previous[1] === INCREMENT_MIN && now[1] === INCREMENT_MAX) {
                    shuttleEvent = {cmd: "INCREMENT", value: -1, raw: now[1]};
                } else if (now[1] > previous[1]) {
                    shuttleEvent = {cmd: "INCREMENT", value: +1, raw: now[1]};
                } else if (now[1] < previous[1]){
                    shuttleEvent = {cmd: "INCREMENT", value: -1, raw: now[1]};
                }

                previous[1] = now[1]; // Store Previous Increement State

            }

        }

        this.buffers.shift();

        debugEvent(`shuttleEvent: ${JSON.stringify(shuttleEvent)}`);
        return shuttleEvent;
        
    }

}

const shuttle = new ShuttleXpress();

shuttle.on('event', (event) => {
    console.dir(event);
});

shuttle.on('error', (err) => {
    console.log(`error: ${err}`);
});

shuttle.on('connect', (msg) => {
    console.log(msg);
    console.dir(shuttle.getDeviceInfo());
});