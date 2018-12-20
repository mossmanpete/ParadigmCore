import { EventEmitter } from "events";
import { TxGenerator } from "src/core/util/TxGenerator";
import { TxBroadcaster } from "src/core/util/TxBroadcaster";
import { OrderTracker } from "src/async/OrderTracker";

/**
 * Configuration options for ParadigmCore state machine.
 */
interface ParadigmCoreOptions {
    version:            string;
    tracker:            OrderTracker;
    deliverState:       State;
    commitState:        State;
    abciServPort:       number;
    txGenerator:        TxGenerator;    
    broadcaster:        TxBroadcaster;
    finalityThreshold:  number;
    maxOrderBytes:      number;
    periodLength:       number;
    periodLimit:        number;          
    provider:           string;          
    stakeABI:           any[];     
    stakeAddress:       string;         
    paradigm:           any;
}