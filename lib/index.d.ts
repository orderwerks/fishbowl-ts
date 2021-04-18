/// <reference types="node" />
import * as net from 'net';
import { Types } from './requestTypes';
interface ConstructorOptions {
    host?: string;
    port?: number;
    IAID?: number;
    IAName?: string;
    IADescription?: string;
    username?: string;
    password?: string;
    useLogger?: boolean;
}
interface RequestOptions {
    req: string;
    options?: any;
    json?: boolean;
    rawFishbowlResponse?: boolean;
}
interface Error {
    code: number;
    message: string;
}
interface SessionInfo {
    loggedIn: boolean;
    username: string;
    key: string;
    host: string;
    port: number;
    IAID: number;
    IAName: string;
    IADescription: string;
}
declare const _default: {
    new ({ host, port, IAID, IAName, IADescription, username, password, useLogger }: ConstructorOptions, didError: (err: Error | null, res: any) => void): {
        errorCodes: any;
        loggedIn: boolean;
        key: string;
        userId: string;
        connection: net.Socket;
        connected: boolean;
        waiting: boolean;
        reqQueue: any[];
        host: string;
        port: number;
        IAID: number;
        IAName: string;
        IADescription: string;
        username: string;
        password: string;
        useLogger: boolean;
        logger: any;
        /**
         * Re-establish a previous session, should there be a connection failure, etc.
         *
         * @param info {SessionInfo}
         */
        setSessionInfo(info: SessionInfo): void;
        /**
         * @returns {SessionInfo}
         */
        getSessionInfo(): SessionInfo;
        /**
         * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
         * @returns {Promise}
         */
        sendRequestPromise: <T>({ req, options, json, rawFishbowlResponse }: RequestOptions) => Promise<T>;
        /**
         * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
         * @param cb - (err: Error | null, res: JSON)
         */
        sendRequest: ({ req, options, json, rawFishbowlResponse }: RequestOptions, cb?: ((err: Error | null, res: any) => void) | undefined) => void;
        /**
         * Setup connection with Fishbowl
         */
        connectToFishbowl: (login: boolean, didError?: ((err: Error | null, res: any) => void) | undefined) => void;
        /**
         * Calls the next request in the queue
         */
        deque: () => void;
        loginToFishbowl: () => void;
        parseExecuteQueryRqToJson: (fbData: any) => any;
        parseImportHeaderRqToJson: (fbData: any) => any;
        parseJsonToCsv: (rows: object[]) => string[];
        loginRequest: () => string;
        logoutRequest: () => string;
        executeQueryRq: (options: Types.ExecuteQuery) => string;
        importRq: (options: Types.ImportQuery) => string;
        importHeaderRq: (options: Types.ImportHeaderQuery) => string;
        issueSoRq: (options: Types.IssueSoQuery) => string;
        quickShipRq: (options: Types.QuickShipQuery) => string;
        voidSoRq: (options: Types.VoidSoQuery) => string;
        customRq: (req: string, options: object) => string;
    };
};
export = _default;
