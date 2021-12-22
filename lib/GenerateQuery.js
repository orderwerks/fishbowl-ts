"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class GenerateQuery {
}
exports.default = GenerateQuery;
GenerateQuery.loginRequest = (key, IAID, IAName, IADescription, username, password) => {
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
                    UserPassword: password
                }
            }
        }
    });
};
GenerateQuery.logoutRequest = (key) => {
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
GenerateQuery.issueSoRq = (key, options) => {
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
GenerateQuery.importHeaderRq = (key, options) => {
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
GenerateQuery.voidSoRq = (key, options) => {
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
GenerateQuery.quickShipRq = (key, options) => {
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
GenerateQuery.generateImportRq = (key, options) => {
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
GenerateQuery.generateExecuteQueryRq = (key, options) => {
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
GenerateQuery.customRq = (key, req, options) => {
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
GenerateQuery.parseJsonToCsv = (rows) => {
    const newRow = [];
    newRow.push(`${Object.keys(rows[0])}`);
    for (let row of rows) {
        row = Object.values(row).map(el => `"${el}"`);
        newRow.push(`${Object.values(row)}`);
    }
    return newRow;
};
