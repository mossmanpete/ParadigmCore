import { EventEmitter } from "events";
import { TxGenerator } from "src/core/util/TxGenerator";
import { TxBroadcaster } from "src/core/util/TxBroadcaster";
import { OrderTracker } from "src/async/OrderTracker";
import { Witness } from "src/async/Witness";

/**
 * Configuration options for main ParadigmCore state machine.
 */
interface ParadigmCoreOptions {
    version:            string;
    tracker:            OrderTracker;
    witness:            Witness;
    deliverState:       State;
    commitState:        State;
    abciServPort:       number;
    txGenerator:        TxGenerator;    
    finalityThreshold:  number;
    maxOrderBytes:      number;
    periodLength:       number;
    periodLimit:        number;
    paradigm:           any;
}

interface ResponseEndBlock {
    validatorUpdates?:   ValidatorUpdate[];
}

interface ValidatorUpdate {
    pubKey: PubKey;
    power: number;
}

interface PubKey {
    type: string;
    data: Buffer;
}

interface ParsedWitnessData {
    subject:    string;
    type:       string;
    amount:     bigint;
    block:      number;
    address:    string;
    publicKey:  string | null;
    id?:        string;
}

