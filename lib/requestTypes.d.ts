export declare namespace Types {
    interface ExecuteQuery {
        name?: string;
        query?: string;
    }
    interface ImportQuery {
        type: string;
        row: object[];
    }
    interface ImportHeaderQuery {
        type: string;
    }
    interface IssueSoQuery {
        soNumber: string;
    }
    interface QuickShipQuery {
        soNumber: string;
        fulfillServiceItems?: boolean;
        errorIfNotFulfilled?: boolean;
        shipDate?: string;
    }
    interface VoidSoQuery {
        soNumber: string;
    }
}
