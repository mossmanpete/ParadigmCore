// Import OrderTracker class
const { OrderTracker } = require("../dist/async/OrderTracker");

// Import EventEmitter
const { EventEmitter } = require("events");

describe("Constructor tests:", () => {
    test("constructor throws with no arguments", () => {
        expect(() => {
            new OrderTracker();
        }).toThrow();
    });

    test("constructor throws with string argument", () => {
        expect(() => {
            new OrderTracker("hello, world!");
        }).toThrow();
    });

    test("constructor throws with number argument", () => {
        expect(() => {
            new OrderTracker(42);
        }).toThrow();
    });

    test("constructor does not throw with EventEmitter argument", () => {
        expect(() => {
           new OrderTracker(new EventEmitter()); 
        }).not.toThrow();
    });

    test("constructor returns an instance of OrderTracker", () => {
        let emitter = new EventEmitter();
        let tracker = new OrderTracker(emitter);
        expect(tracker).toBeInstanceOf(OrderTracker);
    });
});

describe("Functionality tests:", () => {
    // Scope tracker, emitter, and handler instances
    let tracker;
    let emitter;
    let handler;

    beforeEach(() => {
        // Create instances
        emitter = new EventEmitter();
        tracker = new OrderTracker(emitter);
        
        // Create mock handler
        handler = jest.fn();

        // Attach dummy handler to emitter
        emitter.on("tx", handler);
    });

    test("tracker should be deactivated by default", () => {
        expect(tracker.activated).toBe(false);
    });

    test("deactivated tracker should NOT emit events triggered", () => {
        // Add 100 random items to the tracker queue
        expect(() => {
            for (let i = 0; i < 100; i++) {
                tracker.add({ i });
            }
        }).not.toThrow();

        // Trigger a broadcast event
        expect(() => {
            tracker.triggerBroadcast();
        }).not.toThrow();

        // Handler should not have been called
        expect(handler).not.toBeCalled();
    });

    test("activated tracker should emit events when triggered", () => {
        // Activate tracker
        expect(() => {
            tracker.activate();
        }).not.toThrow();

        // Add 100 random items to the tracker's queue
        expect(() => {
            for (let i = 0; i < 100; i++) {
                tracker.add({ i });
            }
        }).not.toThrow();

        // Trigger a broadcast event
        expect(() => {
            tracker.triggerBroadcast();
        }).not.toThrow();

        // Handler should have been called as many times as items
        expect(handler.mock.calls.length).toBe(100);
    });

    test("tracker queue length should equal the number of items added", () => {
        // Add 100 random items to the tracker's queue, check length
        for (let i = 0; i < 100; i++) {
            expect(() => { tracker.add({ i }); }).not.toThrow();
            expect(tracker.txs.length).toBe(i + 1);
        }

        // Should be 100 once done
        expect(tracker.txs.length).toBe(100);
    });

    test("tracker queue length should be 0 after \"flush\" is called", () => {
        // Add 100 random items to the tracker's queue, check length
        for (let i = 0; i < 100; i++) {
            expect(() => { tracker.add({ i }); }).not.toThrow();
            expect(tracker.txs.length).toBe(i + 1);
        }

        // Should be 100 once done adding
        expect(tracker.txs.length).toBe(100);

        // Flush queue
        expect(() => { tracker.flush(); }).not.toThrow();

        // Should now be empty
        expect(tracker.txs.length).toBe(0);
    });
});