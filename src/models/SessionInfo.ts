export default interface SessionInfo {
    loggedIn: boolean;
    username: string;
    key: string;
    host: string;
    port: number;
    IAID: number;
    IAName: string;
    IADescription: string;
}