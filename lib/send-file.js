const { createReadStream } = require('fs');
const { resolve: pathResolve } = require('path');

function sendFile(conn, localPath, remotePath) {
    return new Promise((resolve, reject) => {
        conn.sftp(function(err, sftp) {
            if (err) throw err;
            const path = pathResolve(process.cwd(), localPath);
            const readStream = createReadStream(path);
            const writeStream = sftp.createWriteStream(remotePath || localPath);

            let result = false;
            let cleared = false;

            const clear = () => {
                cleared = true;
                readStream.destroy();
                writeStream.destroy();
            };

            const error = (err) => {
                clear();
                reject(err);
            };

            readStream.pipe(writeStream);

            readStream
                .on('error', (err) => {
                    error(err);
                });

            writeStream
                .on('finish', () => {
                    result = true;
                })
                .on('close', () => {
                    clear();
                    resolve(result);
                })
                .on('error', (err) => {
                    error(err);
                });
        });
    });
}

module.exports = sendFile;
