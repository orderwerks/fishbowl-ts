import crypto from 'crypto';
import net, { Socket, SocketConstructorOpts } from 'net';
import winston, { Logger } from 'winston';
import errorCodes from './errorCodes.json';
import GenerateQuery from './GenerateQuery';
import ConstructorOptions from './models/ConstructorOptions';
import FbError from './models/FbError';
import RequestEnum from './models/RequestEnum';
import RequestOptions from './models/RequestOptions';
import { RequestTypes } from './models/requestTypes';
import ResponseEnum from './models/ResponseEnum';
import SessionInfo from './models/SessionInfo';

const csv = require('jquery-csv');

export class Fishbowl {
    private errorCodes: any;
    private loggedIn = false;
    private key = '';
    private userId = '';

    private connection: Socket;
    private connected = false;
    private waiting = true;
    private reqQueue: any[] = [];

    private host: string;
    private port: number;
    private IAID: number;
    private IAName: string;
    private IADescription: string;

    private username: string;
    private password: string;

    private useLogger: boolean;
    private logger: any;

    /**
     * This will set default values then setup a connection with Fishbowl and send a login request
     * @param host - Fishbowl Server Host location
     * @param port - Fishbowl Server Port
     * @param IADescription - Description of the Integrated App
     * @param IAID  - An ID for the Integrated App
     * @param IAName - Display name of Integrated App in Fishbowl
     * @param username - Fishbowl username
     * @param password - Fishbowl password
     */
    constructor(
        {
            host = '127.0.0.1',
            port = 28192,
            IAID = 54321,
            IAName = 'Fishbowlts',
            IADescription = 'Fishbowlts helper',
            username = 'admin',
            password = 'admin',
            useLogger = true
        }: ConstructorOptions,
        didError: (err: FbError | null, res: any) => void
    ) {
        this.host = host;
        this.port = port;
        this.IAID = IAID;
        this.IAName = IAName;
        this.IADescription = IADescription;
        this.username = username;
        this.password = password;
        this.connection = this.setupConnection()
        this.errorCodes = errorCodes;
        this.useLogger = useLogger;

        if (useLogger) {
            this.logger = this.setupLogger();
        }

        this.connectToFishbowl(false, didError);
    }

    private setupConnection = (): Socket => {
        const options: SocketConstructorOpts = {}

        return new net.Socket(options);
    }

    private setupLogger = (): Logger => {
        return winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.File({
                    filename: 'fishbowl-ts.log',
                    format: winston.format.combine(
                        winston.format.timestamp({
                            format: 'YYYY-MM-DD hh:mm:ss A ZZ'
                        }),
                        winston.format.json()
                    )
                })
            ]
        });
    }

    /**
     * Re-establish a previous session, should there be a connection failure, etc.
     *
     * @param info {SessionInfo}
     */
    public setSessionInfo = (info: SessionInfo): void => {
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
    public getSessionInfo = (): SessionInfo => {
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

    /**
     * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
     * @returns {Promise}
     */
    public sendRequestPromise = <T>({
                                        req,
                                        options,
                                        json = true,
                                        rawFishbowlResponse = false
                                    }: RequestOptions): Promise<T> => {
        return new Promise((resolve, reject) => {
            this.sendRequest({ req, options, json, rawFishbowlResponse }, (err, res) => {
                try {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res);
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });
    };

    /**
     * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
     * @param cb - (err: Error | null, res: JSON)
     */
    public sendRequest = ({ req, options, json = true, rawFishbowlResponse = false }: RequestOptions,
                          cb?: (err: FbError | null, res: any) => void): void => {
        if (req === RequestEnum.LoginRq && this.loggedIn) {
            return;
        }

        if (req === RequestEnum.LogoutRq) {
            this.loggedIn = false;
        }

        if (this.waiting) {
            this.reqQueue.push({ req, options, json, rawFishbowlResponse, cb });
            return;
        }

        let fishbowlReqStr = '';

        switch (req) {
            case RequestEnum.LoginRq: {
                fishbowlReqStr = GenerateQuery.loginRequest(this.key, this.IAID, this.IAName, this.IADescription, this.username, this.password)
                break;
            }
            case RequestEnum.LogoutRq: {
                fishbowlReqStr = GenerateQuery.logoutRequest(this.key);
                break;
            }
            case RequestEnum.ExecuteQueryRq: {
                fishbowlReqStr = GenerateQuery.generateExecuteQueryRq(this.key, options);
                break;
            }
            case RequestEnum.ImportRq: {
                fishbowlReqStr = GenerateQuery.generateImportRq(this.key, options);
                break;
            }
            case RequestEnum.ImportHeaderRq: {
                fishbowlReqStr = GenerateQuery.importHeaderRq(this.key, options);
                break;
            }
            case RequestEnum.IssueSORq: {
                fishbowlReqStr = GenerateQuery.issueSoRq(this.key, options);
                break;
            }
            case RequestEnum.QuickShipRq: {
                fishbowlReqStr = GenerateQuery.quickShipRq(this.key, options);
                break;
            }
            case RequestEnum.VoidSORq: {
                fishbowlReqStr = GenerateQuery.voidSoRq(this.key, options);
                break;
            }
            default: {
                fishbowlReqStr = GenerateQuery.customRq(this.key, req, options);
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
                if (data.FbiJson.FbiMsgsRs[ResponseEnum.LoginRs] !== undefined) {
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
            const fbData = Object.keys(data.FbiJson.FbiMsgsRs).find(key => key !== 'statusCode')!;
            if (data.FbiJson.FbiMsgsRs.statusCode !== 1000) {
                const fbError: FbError = {
                    code: data.FbiJson.FbiMsgsRs.statusCode,
                    message: data.FbiJson.FbiMsgsRs.statusMessage || this.errorCodes[data.FbiJson.FbiMsgsRs.statusCode]
                };

                if (this.useLogger) {
                    this.logger.error(fbError);
                }

                if (cb !== undefined) {
                    cb(fbError, null);
                }
            } else if (data.FbiJson.FbiMsgsRs[fbData].statusCode !== 1000) {
                const fbError: FbError = {
                    code: data.FbiJson.FbiMsgsRs[fbData].statusCode,
                    message: data.FbiJson.FbiMsgsRs[fbData].statusMessage || this.errorCodes[data.FbiJson.FbiMsgsRs[fbData].statusCode]
                };

                if (this.useLogger) {
                    this.logger.error(fbError);
                }

                if (cb !== undefined) {
                    cb(fbError, null);
                }
            } else {
                if (fbData === ResponseEnum.LoginRs) {
                    this.loggedIn = true;
                    this.key = data.FbiJson.Ticket.Key;
                    this.userId = data.FbiJson.Ticket.UserID;
                } else if (fbData === ResponseEnum.ExecuteQueryRs && json) {
                    data = this.parseExecuteQueryRqToJson(data);
                } else if (fbData === ResponseEnum.ImportHeaderRs && json) {
                    data = this.parseImportHeaderRqToJson(data);
                }

                if (cb !== undefined) {
                    cb(null, data.FbiJson.FbiMsgsRs[fbData]);
                }
            }

            this.deque();
        });

        const reqLength = Buffer.alloc(4);
        reqLength.writeIntBE(Buffer.byteLength(fishbowlReqStr, 'utf8'), 0, 4);
        this.connection.write(reqLength);
        this.connection.write(fishbowlReqStr);
    };

    /**
     * Setup connection with Fishbowl
     */
    private connectToFishbowl = (login: boolean, didError?: (err: FbError | null, res: any) => void): void => {
        let resLength: number | undefined;
        let resData: any;

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

        this.connection.on('error', (err: any) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'EALREADY' || err.code === 'ENOTFOUND') {
                if (this.useLogger) {
                    this.logger.error(`${this.host}:${this.port} is not available to connect to.`);
                }

                this.connected = false;
                this.loggedIn = false;
                this.connection.destroy();
                if (didError) {
                    const notAvailable: FbError = {
                        code: 400,
                        message: `${this.host}:${this.port} is not available to connect to.`
                    };
                    didError(notAvailable, null);
                }

                return;
            }

            if (this.useLogger) {
                this.logger.error(`Unexpected error... Disconnected from server, attempting to reconnect. ${err}`);
            }

            if (didError) {
                didError(err, null);
            }

            if (this.loggedIn) {
                this.logoutFromFishbowl(() => {
                    this.connectToFishbowl(true, didError)
                });
            } else {
                this.connected = false;
                this.loggedIn = false;

                this.connectToFishbowl(true, didError);
            }
        });

        this.connection.on('data', data => {
            if (resLength === undefined) {
                resLength = data.readInt32BE(0);
                resData = data.slice(4);
            } else {
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
            } else if (this.useLogger) {
                this.logger.info('Waiting for more data from Fishbowl...');
            }
        });
    };

    /**
     * Calls the next request in the queue
     */
    private deque = (): void => {
        this.waiting = false;
        if (this.reqQueue.length > 0) {
            const queuedReq = this.reqQueue.shift();
            this.sendRequest({
                req: queuedReq.req,
                options: queuedReq.options,
                json: queuedReq.json,
                rawFishbowlResponse: queuedReq.rawFishbowlResponse
            }, queuedReq.cb);
        }
    };

    /**
     * Helper function to login to Fishbowl
     */
    private loginToFishbowl = (): void => {
        this.sendRequest({ req: RequestEnum.LoginRq }, (err, res) => {
            this.deque();
        });
    };

    /**
     * Helper function to logout from Fishbowl
     */
    private logoutFromFishbowl = (cb?: any): void => {
        this.sendRequest({ req: RequestEnum.LogoutRq }, (err, res) => {
            this.loggedIn = false;
            this.connection.destroy();
        });
    }

    private parseExecuteQueryRqToJson = (fbData: any): any => {
        if (!Array.isArray(fbData.FbiJson.FbiMsgsRs.ExecuteQueryRs.Rows.Row)) {
            return fbData;
        }

        const row = fbData.FbiJson.FbiMsgsRs.ExecuteQueryRs.Rows.Row;

        const rows = [];
        const header = csv.toArray(row[0]);
        row.splice(0, 1);
        let data: any = {};
        for (const line of row) {
            const arr = csv.toArray(line);
            header.forEach((key: string, j: number) => (data[key] = arr[j]));
            rows.push(data);
            data = {};
        }

        fbData.FbiJson.FbiMsgsRs.ExecuteQueryRs.Rows = rows;
        return fbData;
    };

    private parseImportHeaderRqToJson = (fbData: any): any => {
        // TODO: Double header imports return an array of Rows and not just a String
        let row = fbData.FbiJson.FbiMsgsRs.ImportHeaderRs.Header.Row;
        row = row.replace(/"/g, '');

        const newRow: { [k: string]: any } = {};
        const keys = row.split(',');
        keys.forEach((el: string) => (newRow[el] = ''));

        fbData.FbiJson.FbiMsgsRs.ImportHeaderRs.Header.Row = newRow;
        return fbData;
    };
};
