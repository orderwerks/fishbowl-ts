import ConstructorOptions from './models/ConstructorOptions';
import FbError from './models/FbError';
import RequestOptions from './models/RequestOptions';
import SessionInfo from './models/SessionInfo';
export declare class Fishbowl {
    private errorCodes;
    private loggedIn;
    private key;
    private userId;
    private connection;
    private connected;
    private waiting;
    private reqQueue;
    private host;
    private port;
    private IAID;
    private IAName;
    private IADescription;
    private username;
    private password;
    private useLogger;
    private logger;
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
    constructor({ host, port, IAID, IAName, IADescription, username, password, useLogger }: ConstructorOptions, didError: (err: FbError | null, res: any) => void);
    private setupConnection;
    private setupLogger;
    /**
     * Re-establish a previous session, should there be a connection failure, etc.
     *
     * @param info {SessionInfo}
     */
    setSessionInfo: (info: SessionInfo) => void;
    /**
     * @returns {SessionInfo}
     */
    getSessionInfo: () => SessionInfo;
    /**
     * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
     * @returns {Promise}
     */
    sendRequestPromise: <T>({ req, options, json, rawFishbowlResponse }: RequestOptions) => Promise<T>;
    /**
     * @param {RequestOptions} - holds the request type, options for that request, whether you want the info in JSON or CSV, and whether you want the response formatted nicely or the raw response
     * @param cb - (err: Error | null, res: JSON)
     */
    sendRequest: ({ req, options, json, rawFishbowlResponse }: RequestOptions, cb?: ((err: FbError | null, res: any) => void) | undefined) => void;
    /**
     * Setup connection with Fishbowl
     */
    private connectToFishbowl;
    /**
     * Calls the next request in the queue
     */
    private deque;
    createLoginRequest: () => string;
    createLogoutRequest: () => string;
    /**
     * Helper function to login to Fishbowl
     */
    private loginToFishbowl;
    /**
     * Helper function to logout from Fishbowl
     */
    private logoutFromFishbowl;
    private parseExecuteQueryRqToJson;
    private parseImportHeaderRqToJson;
}
