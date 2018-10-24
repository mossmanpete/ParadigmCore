let Web3 = require("web3");
export class StakeRebalancer {
    private web3provider: string;
    private web3: any;

    static async create (options: any) {
        let instance = new StakeRebalancer(options);
        await instance.initialize();
        return instance;
    }

    public async initialize () {
        this.web3 = new Web3
    }

    private constructor (options: any) {
        this.web3provider = options.web3provider;
    }
}

