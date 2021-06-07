import crypto from 'crypto';
import { RequestTypes } from './models/RequestTypes';

export default class GenerateQuery {

    public static loginRequest = (key: string, IAID: number, IAName: string, IADescription: string, username: string, password: string): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: ''
                },
                FbiMsgsRq: {
                    LoginRq: {
                        IAID: IAID,
                        IAName: IAName,
                        IADescription: IADescription,
                        UserName: username,
                        UserPassword: crypto
                            .createHash('md5')
                            .update(password)
                            .digest('base64')
                    }
                }
            }
        });
    };

    public static logoutRequest = (key: string): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
                },
                FbiMsgsRq: {
                    LogoutRq: ''
                }
            }
        });
    };

    public static issueSoRq = (key: string, options: RequestTypes.IssueSoQuery): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
                },
                FbiMsgsRq: {
                    IssueSORq: {
                        SONumber: options.soNumber
                    }
                }
            }
        });
    };

    public static importHeaderRq = (key: string, options: RequestTypes.ImportHeaderQuery): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
                },
                FbiMsgsRq: {
                    ImportHeaderRq: {
                        Type: options.type
                    }
                }
            }
        });
    };

    public static voidSoRq = (key: string, options: RequestTypes.VoidSoQuery): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
                },
                FbiMsgsRq: {
                    VoidSORq: {
                        SONumber: options.soNumber
                    }
                }
            }
        });
    };

    public static quickShipRq = (key: string, options: RequestTypes.QuickShipQuery): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
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

    public static generateImportRq = (key: string, options: RequestTypes.ImportQuery): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
                },
                FbiMsgsRq: {
                    ImportRq: {
                        Type: options.type,
                        Rows: {
                            Row: GenerateQuery.parseJsonToCsv(options.row)
                        }
                    }
                }
            }
        });
    };

    public static generateExecuteQueryRq = (key: string, options: RequestTypes.ExecuteQuery): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
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

    public static customRq = (key: string, req: string, options: object): string => {
        return JSON.stringify({
            FbiJson: {
                Ticket: {
                    Key: key
                },
                FbiMsgsRq: {
                    [req]: options
                }
            }
        });
    };

    private static parseJsonToCsv = (rows: object[]): string[] => {
        const newRow: string[] = [];
        newRow.push(`${Object.keys(rows[0])}`);

        for (let row of rows) {
            row = Object.values(row).map(el => `"${el}"`);
            newRow.push(`${Object.values(row)}`);
        }

        return newRow;
    };
}