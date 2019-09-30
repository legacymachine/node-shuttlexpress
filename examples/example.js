const ShuttleXpress = require('../ShuttleXpress');

const shuttle = new ShuttleXpress();

shuttle.on('connect', (msg) => {
    console.log('\n');
    console.log(msg);
    console.log('\n');
    console.dir(shuttle.getDeviceInfo());
    console.log('\n');
});

shuttle.on('event', (event) => {
    console.dir(event);
});

shuttle.on('error', (err) => {
    console.log(`error: ${err}`);
});