import RequestEnum from './RequestEnum';

export default interface RequestOptions {
    req: RequestEnum;
    options?: any;
    json?: boolean;
    rawFishbowlResponse?: boolean;
}