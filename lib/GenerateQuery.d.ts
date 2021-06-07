import { RequestTypes } from './models/RequestTypes';
export default class GenerateQuery {
    static loginRequest: (key: string, IAID: number, IAName: string, IADescription: string, username: string, password: string) => string;
    static logoutRequest: (key: string) => string;
    static issueSoRq: (key: string, options: RequestTypes.IssueSoQuery) => string;
    static importHeaderRq: (key: string, options: RequestTypes.ImportHeaderQuery) => string;
    static voidSoRq: (key: string, options: RequestTypes.VoidSoQuery) => string;
    static quickShipRq: (key: string, options: RequestTypes.QuickShipQuery) => string;
    static generateImportRq: (key: string, options: RequestTypes.ImportQuery) => string;
    static generateExecuteQueryRq: (key: string, options: RequestTypes.ExecuteQuery) => string;
    static customRq: (key: string, req: string, options: object) => string;
    private static parseJsonToCsv;
}
