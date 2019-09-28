function error (message) {
    throw new Error(message);
}

/**
 * parses params from destination format
 * @param {string} str
 * @returns {{port: number, host: string, username: string, [password]: string, [privateKey]: string}}
 */
function parseDestination (str) {
    const parts = str.split('@').reverse().map(str => str.split(':'));
    const params = {
        host: parts[0][0] || null,
        port: parseInt(parts[0][1] || 0, 10),
        username: null,
        password: null
    };
    if (parts.length > 1) {
        params.username = parts[1][0] || null;
        params.password = parts[1][1] || null;
    }
    return params;
}

/**
 * returns connection params
 * @param {*} argv
 * @returns {{port: number, host: string, username: string, [password]: string, [privateKey]: string}}
 */
function connectionParams (argv) {
    const params = parseDestination(argv['_'][0]);
    if (argv.l) params.username = argv.l;
    if (argv.p) params.port = parseInt(argv.p, 10) || 0;
    if (argv.i) params.privateKey = require('fs').readFileSync(argv.i);
    return params;
}


/**
 * parse port forwarding param
 * @param {string} str
 */
function parseForwarding (str) {
    const parts = str.split(':').reverse();
    const result = {};
    result.bindAddr = parts[3] || '127.0.0.1';
    result.bindPort = parts[2] || error('Binding port is not provided');
    result.addr = parts[1] || error('Forward addr is not provided');
    result.port = parts[0] || error('Forward port is not provided');
    return result;
}

/**
 * returns forwarding params
 * @param {object} argv
 */
function forwardingParams (argv) {
    const result = {};
    if (argv['L']) {
        result.forward = parseForwarding(argv['L']);
    }
    if (argv['R']) {
        result.reverse = parseForwarding(argv['R']);
    }
    return result;
}

module.exports = {
    connectionParams: connectionParams,
    forwardingParams: forwardingParams
};
