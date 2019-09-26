function timedMessage(...args) {
    const two = (str) => ('0' + str).substr(-2);
    let ts = new Date();
    ts = '' + two(ts.getHours()) + ':' + two(ts.getMinutes()) + ':' + two(ts.getSeconds());
    return ['[' + ts + ']', ...args].join(' ');
}

module.exports = {
    timedMessage: timedMessage
};
