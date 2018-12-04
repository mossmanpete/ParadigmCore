interface Order {
    // Constructor
    new (options: any): Order;

    // Instance variables
    subContract:        string;
    maker?:             string;
    makerArguments?:    OrderArg[];
    takerArguments?:    OrderArg[];
    makerValues:        object;
    makerSignature?:    object;
    posterSignature:    PosterSignature;
    id?:                string;

    // Public instance methods
    make():                                 Promise<void>;
    take(taker: string, takerValues: any):  Promise<void>;
    prepareForPost(poster?: string):        Promise<void>;
    estimateGasCost(taker: string, takerValues: any): Promise<number>;
    recoverMaker():     string;
    recoverPoster():    string;
    toJSON():           OrderData;
    makerHex():         string;
    posterHex():        string;
    
    // Private instance methods
    _serialize(args: OrderArg[], values: object):   any[];
    _shouldInclude(argument: OrderArg):             boolean;
    _toHex(dataTypes: any, values: any):            string;
    _hexFor(signer: string):                        string;
    _checkArguments():                              Promise<void>;

}

interface OrderArg {
    dataType:   string;
    name:       string;
}

interface PosterSignature {
    v:  number;
    r:  string;
    s:  string;
}