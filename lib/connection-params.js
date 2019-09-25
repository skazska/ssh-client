/**
 * parses params from destination format
 * @param {string} str
 * @returns {{port: string, host: string, username: string, [password]: string, [privateKey]: string}}
 */
function parseDestination (str) {
    const parts = str.split('@').reverse().map(str => str.split(':'));
    const params = {
        host: parts[0][0] || '192.0.0.1',
        port: parts[0][1]
    };
    if (parts.length > 1) {
        params.username = parts[1][0];
        params.password = parts[1][1];
    }
    return params;
}

/**
 * returns connection params
 * @param {*} argv
 * @returns {{port: string, host: string, username: string, [password]: string, [privateKey]: string}}
 */
function get (argv) {
    const params = parseDestination(argv['_'][0]);
    if (argv.l) params.username = argv.l;
    if (argv.p) params.port = argv.p;
    if (argv.i) params.privateKey = require('fs').readFileSync(argv.i);
    return params;
}

module.exports = get;
