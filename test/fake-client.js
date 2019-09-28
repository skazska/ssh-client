const sinon = require('sinon');

module.exports = (err, readStream, writeStream) => {
    const createWriteStreamFake = sinon.fake.returns(writeStream);
    const createReadStreamFake = sinon.fake.returns(readStream);

    const sftp = (cb) => {
        cb(err, {
            createWriteStream: createWriteStreamFake,
            createReadStream: createReadStreamFake
        });
    };

    sftp.createWriteStreamFake = createWriteStreamFake;
    sftp.createReadStreamFake = createReadStreamFake;

    return {
        sftp: sftp
    }
};
