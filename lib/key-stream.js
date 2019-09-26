/* Implementation */
const { Readable } = require('stream');

const { emitKeypressEvents } = require('readline');

class KeyStream extends Readable {
    constructor (inStream, options) {
        super(options);
        this.inStream = inStream;
        this.pushAllowed = false;

        emitKeypressEvents(this.inStream);
        if (this.inStream.isTTY)
            this.inStream.setRawMode(true);
        this.inStream.on('keypress', (str, key) => {
            if (this.pushAllowed) this.pushAllowed = this.push.apply(this, this.char(str, key));
        });

    }

    _read (size) {
        this.pushAllowed = true;
    }

    post (char) {
        if (char && this.pushAllowed) {
            this.pushAllowed = this.push.apply(this, char);
        }
    }

    char (str, key) {
        return this.post([key.sequence, 'utf-8']);
    }

}

module.exports = {
    KeyStream: KeyStream
};
