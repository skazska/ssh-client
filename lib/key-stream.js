/* Implementation */
const { Readable } = require('stream');

const { emitKeypressEvents } = require('readline');

class KeyStream extends Readable {
    constructor (inStream, options) {
        super(options);
        this.inStream = inStream;
        this.pushAllowed = false;
        this.text = '';


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
        if (this.pushAllowed) {
            // if (this.text) {
            //     this.push(this.text, 'utf-8');
            //     this.text = '';
            // }
            this.pushAllowed = this.push.apply(this, char);
        }
    }

    char (str, key) {
        // if (key.ctrl || key.code || key.meta) return [ascii(key), 'ascii'];
        switch (key.sequence) {
            case '\r':
            case '\n':
                return this.post(['\x0D', 'ascii']);
            case '\t':
                return this.post(['\x09', 'ascii']);
            default:
                switch (key.name) {
                    case 'c':
                        if (key.ctrl) return this.post(['\x03', 'ascii']);
                }
                this.post([str, 'utf-8']);
                // this.text += str;
        }
    }

}

module.exports = {
    KeyStream: KeyStream
};
