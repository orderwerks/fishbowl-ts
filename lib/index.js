"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
const crypto_1 = __importDefault(require("crypto"));
const net = __importStar(require("net"));
const winston_1 = __importDefault(require("winston"));
const errorCodes_json_1 = __importDefault(require("./errorCodes.json"));
const csv = require('jquery-csv');
module.exports = class Fishbowl {
    /**
     * This will set default values then setup a connection with Fishbowl and send a login request
     * @param host - Fishbowl Server Host location
     * @param port - Fishbowl Server Port
     * @param IADescription
     * @param IAID
     * @param IAName - Display name of Integrated App in Fishbowl
     * @param username - Fishbowl username
     * @param password - Fishbowl password
     */
    constructor({ host = '127.0.0.1', port = 28192, IAID = 54321, IAName = 'Fishbowljs', IADescription = 'Fishbowljs helper', username = 'admin', password = 'admin', useLogger = true }, didError) {
        this.loggedIn = false;
        this.key = '';
        this.userId = '';
        this.connected = false;
        this.waiting = true;
        this.reqQueue = [];
        /**
         * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
         * @returns {Promise}
         */
        this.sendRequestPromise = ({ req, options, json = true, rawFishbowlResponse = false }) => {
            return new Promise((resolve, reject) => {
                this.sendRequest({ req, options, json, rawFishbowlResponse }, (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(res);
                    }
                });
            });
        };
        /**
         * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
         * @param cb - (err: Error | null, res: JSON)
         */
        this.sendRequest = ({ req, options, json = true, rawFishbowlResponse = false }, cb) => {
            if (req === 'LoginRq' && this.loggedIn) {
                return;
            }
            if (req === 'LogoutRq') {
                this.loggedIn = false;
            }
            if (this.waiting) {
                this.reqQueue.push({ req, options, json, rawFishbowlResponse, cb });
                return;
            }
            let reqToFishbowl = '';
            switch (req) {
                case 'LoginRq': {
                    reqToFishbowl = this.loginRequest();
                    break;
                }
                case 'LogoutRq': {
                    reqToFishbowl = this.logoutRequest();
                    break;
                }
                case 'ExecuteQueryRq': {
                    reqToFishbowl = this.executeQueryRq(options);
                    break;
                }
                case 'ImportRq': {
                    reqToFishbowl = this.importRq(options);
                    break;
                }
                case 'ImportHeaderRq': {
                    reqToFishbowl = this.importHeaderRq(options);
                    break;
                }
                case 'IssueSORq': {
                    reqToFishbowl = this.issueSoRq(options);
                    break;
                }
                case 'QuickShipRq': {
                    reqToFishbowl = this.quickShipRq(options);
                    break;
                }
                case 'VoidSORq': {
                    reqToFishbowl = this.voidSoRq(options);
                    break;
                }
                default: {
                    reqToFishbowl = this.customRq(req, options);
                }
            }
            this.waiting = true;
            if (!this.connected) {
                if (this.useLogger) {
                    this.logger.info('Not connected to server, connecting now...');
                }
                this.reqQueue.push({ req, options, json, rawFishbowlResponse, cb });
                this.connectToFishbowl(true, cb);
                return;
            }
            this.connection.once('done', (err, data) => {
                if (err && cb !== undefined) {
                    cb(err, null);
                    this.deque();
                    return;
                }
                if (err) {
                    if (this.useLogger) {
                        this.logger.error(err);
                    }
                    this.deque();
                    return;
                }
                if (rawFishbowlResponse) {
                    // LoginRs will never be undefined if it is present
                    if (data.FbiJson.FbiMsgsRs['LoginRs'] !== undefined) {
                        this.loggedIn = true;
                        this.key = data.FbiJson.Ticket.Key;
                        this.userId = data.FbiJson.Ticket.UserID;
                    }
                    if (cb !== undefined) {
                        cb(null, data);
                    }
                    this.deque();
                    return;
                }
                // There is always a statusCode and some sort of response object from Fishbowl.
                // Don't worry about undefined
                const fbData = Object.keys(data.FbiJson.FbiMsgsRs).find(key => key !== 'statusCode');
                if (data.FbiJson.FbiMsgsRs.statusCode !== 1000) {
                    const fbError = {
                        code: data.FbiJson.FbiMsgsRs.statusCode,
                        message: data.FbiJson.FbiMsgsRs.statusMessage || this.errorCodes[data.FbiJson.FbiMsgsRs.statusCode]
                    };
                    if (this.useLogger) {
                        this.logger.error(fbError);
                    }
                    if (cb !== undefined) {
                        cb(fbError, null);
                    }
                }
                else if (data.FbiJson.FbiMsgsRs[fbData].statusCode !== 1000) {
                    const fbError = {
                        code: data.FbiJson.FbiMsgsRs[fbData].statusCode,
                        message: data.FbiJson.FbiMsgsRs[fbData].statusMessage || this.errorCodes[data.FbiJson.FbiMsgsRs[fbData].statusCode]
                    };
                    if (this.useLogger) {
                        this.logger.error(fbError);
                    }
                    if (cb !== undefined) {
                        cb(fbError, null);
                    }
                }
                else {
                    if (fbData === 'LoginRs') {
                        this.loggedIn = true;
                        this.key = data.FbiJson.Ticket.Key;
                        this.userId = data.FbiJson.Ticket.UserID;
                    }
                    else if (fbData === 'ExecuteQueryRs' && json) {
                        data = this.parseExecuteQueryRqToJson(data);
                    }
                    else if (fbData === 'ImportHeaderRs' && json) {
                        data = this.parseImportHeaderRqToJson(data);
                    }
                    if (cb !== undefined) {
                        cb(null, data.FbiJson.FbiMsgsRs[fbData]);
                    }
                }
                this.deque();
            });
            const reqLength = Buffer.alloc(4);
            reqLength.writeIntBE(Buffer.byteLength(reqToFishbowl, 'utf8'), 0, 4);
            this.connection.write(reqLength);
            this.connection.write(reqToFishbowl);
        };
        /**
         * Setup connection with Fishbowl
         */
        this.connectToFishbowl = (login, didError) => {
            let resLength;
            let resData;
            this.connection.connect(this.port, this.host, () => {
                this.connected = true;
                if (this.useLogger) {
                    this.logger.info('Connected to Fishbowl...');
                }
                if (login) {
                    this.waiting = false;
                    this.loginToFishbowl();
                }
                this.deque();
            });
            this.connection.on('close', () => {
                if (this.useLogger) {
                    this.logger.info('Disconnected from Fishbowl');
                }
                this.connected = false;
            });
            this.connection.on('error', (err) => {
                if (err.code === 'ECONNREFUSED' || err.code === 'EALREADY' || err.code === 'ENOTFOUND') {
                    if (this.useLogger) {
                        this.logger.error(`${this.host}:${this.port} is not available to connect to.`);
                    }
                    this.connected = false;
                    this.loggedIn = false;
                    this.connection.destroy();
                    if (didError) {
                        const notAvailable = { code: 400, message: `${this.host}:${this.port} is not available to connect to.` };
                        didError(notAvailable, null);
                    }
                    return;
                }
                if (this.useLogger) {
                    this.logger.error(`Unexpected error... Disconnected from server, attempting to reconnect. ${err}`);
                }
                this.connected = false;
                this.loggedIn = false;
                if (didError) {
                    didError(err, null);
                }
                this.connectToFishbowl(true, didError);
            });
            this.connection.on('data', data => {
                if (resLength === undefined) {
                    resLength = data.readInt32BE(0);
                    resData = data.slice(4);
                }
                else {
                    resData = Buffer.concat([resData, data]);
                }
                if (resData.length === resLength) {
                    const resJson = JSON.parse(resData.toString('utf8'));
                    resLength = undefined;
                    // Inactivity check from server
                    if (resJson.FbiJson.FbiMsgsRs.statusCode === 1010) {
                        this.connected = false;
                        this.loggedIn = false;
                        return;
                    }
                    this.connection.emit('done', null, resJson);
                }
                else if (this.useLogger) {
                    this.logger.info('Waiting for more data from Fishbowl...');
                }
            });
        };
        /**
         * Calls the next request in the queue
         */
        this.deque = () => {
            this.waiting = false;
            if (this.reqQueue.length > 0) {
                const queuedReq = this.reqQueue.shift();
                this.sendRequest({ req: queuedReq.req, options: queuedReq.options, json: queuedReq.json, rawFishbowlResponse: queuedReq.rawFishbowlResponse }, queuedReq.cb);
            }
        };
        this.loginToFishbowl = () => {
            this.sendRequest({ req: 'LoginRq' }, (err, res) => {
                this.deque();
            });
        };
        this.parseExecuteQueryRqToJson = (fbData) => {
            if (!Array.isArray(fbData.FbiJson.FbiMsgsRs.ExecuteQueryRs.Rows.Row)) {
                return fbData;
            }
            const row = fbData.FbiJson.FbiMsgsRs.ExecuteQueryRs.Rows.Row;
            const rows = [];
            const header = csv.toArray(row[0]);
            row.splice(0, 1);
            let data = {};
            for (const line of row) {
                const arr = csv.toArray(line);
                header.forEach((key, j) => (data[key] = arr[j]));
                rows.push(data);
                data = {};
            }
            fbData.FbiJson.FbiMsgsRs.ExecuteQueryRs.Rows = rows;
            return fbData;
        };
        this.parseImportHeaderRqToJson = (fbData) => {
            // TODO: Double header imports return an array of Rows and not just a String
            let row = fbData.FbiJson.FbiMsgsRs.ImportHeaderRs.Header.Row;
            row = row.replace(/"/g, '');
            const newRow = {};
            const keys = row.split(',');
            keys.forEach((el) => (newRow[el] = ''));
            fbData.FbiJson.FbiMsgsRs.ImportHeaderRs.Header.Row = newRow;
            return fbData;
        };
        this.parseJsonToCsv = (rows) => {
            const newRow = [];
            newRow.push(`${Object.keys(rows[0])}`);
            for (let row of rows) {
                row = Object.values(row).map(el => `"${el}"`);
                newRow.push(`${Object.values(row)}`);
            }
            return newRow;
        };
        /*================================
                FISHBOWL REQUESTS
        ==================================*/
        this.loginRequest = () => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: ''
                    },
                    FbiMsgsRq: {
                        LoginRq: {
                            IAID: this.IAID,
                            IAName: this.IAName,
                            IADescription: this.IADescription,
                            UserName: this.username,
                            UserPassword: crypto_1.default
                                .createHash('md5')
                                .update(this.password)
                                .digest('base64')
                        }
                    }
                }
            });
        };
        this.logoutRequest = () => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        LogoutRq: ''
                    }
                }
            });
        };
        this.executeQueryRq = (options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        ExecuteQueryRq: {
                            Name: options.name,
                            Query: options.query
                        }
                    }
                }
            });
        };
        this.importRq = (options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        ImportRq: {
                            Type: options.type,
                            Rows: {
                                Row: this.parseJsonToCsv(options.row)
                            }
                        }
                    }
                }
            });
        };
        this.importHeaderRq = (options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        ImportHeaderRq: {
                            Type: options.type
                        }
                    }
                }
            });
        };
        this.issueSoRq = (options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        IssueSORq: {
                            SONumber: options.soNumber
                        }
                    }
                }
            });
        };
        this.quickShipRq = (options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        QuickShipRq: {
                            SONumber: options.soNumber,
                            FulfillServiceItems: options.fulfillServiceItems,
                            ErrorIfNotFulfilled: options.errorIfNotFulfilled,
                            ShipDate: options.shipDate
                        }
                    }
                }
            });
        };
        this.voidSoRq = (options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        VoidSORq: {
                            SONumber: options.soNumber
                        }
                    }
                }
            });
        };
        this.customRq = (req, options) => {
            return JSON.stringify({
                FbiJson: {
                    Ticket: {
                        Key: this.key
                    },
                    FbiMsgsRq: {
                        [req]: options
                    }
                }
            });
        };
        this.host = host;
        this.port = port;
        this.IAID = IAID;
        this.IAName = IAName;
        this.IADescription = IADescription;
        this.username = username;
        this.password = password;
        this.connection = new net.Socket();
        this.errorCodes = errorCodes_json_1.default;
        this.useLogger = useLogger;
        if (useLogger) {
            this.logger = winston_1.default.createLogger({
                level: 'info',
                format: winston_1.default.format.json(),
                transports: [
                    new winston_1.default.transports.File({
                        filename: 'fishbowl-js.log',
                        format: winston_1.default.format.combine(winston_1.default.format.timestamp({
                            format: 'YYYY-MM-DD hh:mm:ss A ZZ'
                        }), winston_1.default.format.json())
                    })
                ]
            });
        }
        this.connectToFishbowl(false, didError);
    }
    /**
     * Re-establish a previous session, should there be a connection failure, etc.
     *
     * @param info {SessionInfo}
     */
    setSessionInfo(info) {
        this.loggedIn = info.loggedIn;
        this.username = info.username;
        this.key = info.key;
        this.host = info.host;
        this.port = info.port;
        this.IAID = info.IAID;
        this.IAName = info.IAName;
        this.IADescription = info.IADescription;
    }
    /**
     * @returns {SessionInfo}
     */
    getSessionInfo() {
        return {
            loggedIn: this.loggedIn,
            username: this.username,
            key: this.key,
            host: this.host,
            port: this.port,
            IAID: this.IAID,
            IAName: this.IAName,
            IADescription: this.IADescription
        };
    }
};
