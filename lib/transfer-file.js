const { createReadStream, createWriteStream } = require('fs');
const { resolve: pathResolve } = require('path');

/**
 * @module
 * @name transferFile
 * @function
 * @param {string} dir - :put/:get
 * @param {ssh2.Client} conn
 * @param {string} pathFrom
 * @param {string} pathTo
 * @return Promise
 */

/**
 * pipes 2 streams for file transfering
 * @param {Stream} readStream
 * @param {Stream} writeStream
 * @param {function} resolve
 * @param {function} reject
 */
function transfer (readStream, writeStream, resolve, reject) {
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
}

/**
 * get file
 * @param {ssh2.Client} conn
 * @param {string} remotePath
 * @param {string} localPath
 * @return {Promise<any>}
 */
function receiveFile(conn, remotePath, localPath) {
    return new Promise((resolve, reject) => {
        conn.sftp(function(err, sftp) {
            if (err) throw err;
            const path = pathResolve(process.cwd(), localPath || remotePath);
            const writeStream = createWriteStream(path);
            const readStream = sftp.createReadStream(remotePath);

            transfer(readStream, writeStream, resolve, reject);
        });
    });
}

/**
 * put file
 * @param {ssh2.Client} conn
 * @param {string} localPath
 * @param {string} remotePath
 * @return {Promise<any>}
 */
function sendFile(conn, localPath, remotePath) {
    return new Promise((resolve, reject) => {
        conn.sftp(function(err, sftp) {
            if (err) throw err;
            const path = pathResolve(process.cwd(), localPath);
            const readStream = createReadStream(path);
            const writeStream = sftp.createWriteStream(remotePath || localPath);

            transfer(readStream, writeStream, resolve, reject);
        });
    });
}

/**
 * transfers file
 * @param {string} dir - :put/:get
 * @param {ssh2.Client} conn
 * @param {string} pathFrom
 * @param {string} pathTo
 * @return Promise
 */
function transferFile(dir, conn, pathFrom, pathTo) {
    switch (dir) {
        case 'get':
            return receiveFile(conn, pathFrom, pathTo);
        case 'put':
            return sendFile(conn, pathFrom, pathTo);
        default:
            throw new Error('unexpected file direction');
    }
}

module.exports = transferFile;
