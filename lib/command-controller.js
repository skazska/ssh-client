const { createInterface, emitKeypressEvents } = require('readline');
const EventEmitter = require('events');

class CommandController extends EventEmitter {
    constructor (inStream, outStream) {
        super();
        this.textLine = '';
        this.outStream = outStream;
        this.listenTo(inStream);
    }

    listenTo (inStream) {
        emitKeypressEvents(inStream);
        if (inStream.isTTY)
            inStream.setRawMode(true);
        inStream.on('keypress', this.dispatchKeypress.bind(this));
    }

    emitTextCommand () {
        this.emit('textCommand', this.textLine);
        this.textLine = '';
    }

    dispatchKeypress (str, key) {
        console.dir(key);
        if (key.code) console.log(key.code);
        switch (key.sequence) {
            case '\r':
            case '\n':
                this.emitTextCommand();
                return;
            case '\t':
                this.emit('keyCommand', 'Tab');
                return;
            default:
                switch (key.name) {
                    case 'c':
                        if (key.ctrl) return this.emit('keyCommand', 'CtrlC');
                }
                this.textLine += str;
                this.outStream.write(str)
        }
    }
}

module.exports = {
    CommandController: CommandController
};
