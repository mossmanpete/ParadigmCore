/*
let modules = { abci: "ABCI", mempool: "ABCI (Mempool)", consensus: "ABCI (Consensus)", rebalance: "Rebalancer", post: "Post API", stream: "Stream API", tx: "Tx Pipeline" };


{
    version: "ParadigmCore v0.4.2",
    level: 2,
    methods: [
        {
            methodPrefix: "abci",
            logPrefix: "ABCI",
            preColor: "blue",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        },
        {
            methodPrefix: "mempool",
            logPrefix: "ABCI",
            preColor: "blue",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        },
        {
            methodPrefix: "consensus",
            logPrefix: "Consensus",
            preColor: "cyan",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        },
        {
            methodPrefix: "rebalancer",
            logPrefix: "Rebalancer",
            preColor: "green",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        },
        {
            methodPrefix: "post",
            logPrefix: "Post API",
            preColor: "yellow",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        },
        {
            methodPrefix: "stream",
            logPrefix: "Stream API",
            preColor: "yellow",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        },
        {
            methodPrefix: "tx",
            logPrefix: "Tx Pipeline",
            preColor: "red",
            methods: [
                { method: "Evt", level: 2 },
                { method: "Warn", level: 1, suffix: "Warning", color: "yellow" }
                { method: "Err", level: 0, suffix: "Error", color: "red" }
            ]
        }
    ]
}
*/

interface LoggerConfig {
    methods:    MethodConfigObject[];
    version?:   string;
    level?:     number;
    output?:    (msg: string, ...args: any[]) => void;
}

/**
 * The objects provided to Logger that define the custom log
 * messages and templates for various custom log functions.
 */
interface MethodConfigObject {
    // The method name used in Logger instance API
    methodPrefix: string;

    // The prefix appended before messages logged through this method
    logPrefix: string;

    // The color of the base output prefix
    preColor?: string;

    // Modifiers that add additional methods and message prefixes
    modifiers?: MethodModifierObject[];
}

interface MethodModifierObject {
    // Suffix appended to parent method template
    method: string;

    // Suffix appended to the prefix of the parent log output
    suffix: string;

    // Color (overrides parent color)
    color?: string;

    // Log level this modifier corresponds to
    level?: number;
}