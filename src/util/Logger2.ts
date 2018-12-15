require("colors");

export class Logger {
    // Configuration options
    private level: number;
    private version: string;
    private methods: MethodConfigObject[];

    // Where to "write" output strings
    private write: (i: string, ...args: any[]) => void;

    constructor(config: LoggerConfig) {
        // Destructure options
        let { methods, level, version, output } = config;

        // Require specific options
        if (!methods) { throw Error("No module definitions provided."); }

        // Set config
        this.methods = methods;
        this.level = level !== undefined ? 0 : level;
        this.write = output ? output : console.log;
        this.version = version ? version : process.env.npm_package_version;

        // Generate logging methods
        this.generateMethods(methods);
    }

    private print(l: number, mod: string, msg: string) {
        // Return if message level > log level
        if (l > this.level) { return; }

        // Generate and write log message
        this.write(`${l} [${this.version} @ ${this.ts()}] ${mod}: ${msg}`);
    }

    private ts(): string {
        let s: number = Date.now();
        return `${Math.floor(s / 1000).toString()}.${s.toString().slice(-3)}`;
    }

    private generateMethods(configs: MethodConfigObject[]): any {
        configs.forEach((config) => {
            let { methodPrefix, logPrefix, preColor, modifiers } = config;
            let logPref = logPrefix[preColor] ? logPrefix[preColor] : logPrefix;
            modifiers.forEach((mod) => {
                // Parse and load options and add color
                let { method, suffix, color, level } = mod;
                let logSuff = suffix[color] ? suffix[color] : suffix;

                // Parse method name, log modifier, and level
                let n = methodPrefix + method;
                let m = `${logPref} ${logSuff}`;
                let l = typeof level !== "number" ? level : 0;
                this[n] = (msg: string) => this.print(l, m, msg);
            });
        });
    }
}
