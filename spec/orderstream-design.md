# OrderStream Design
## Introduction
At its most fundamental level, the OrderStream is a transaction-based state-machine. In begins with an initial state (the "genesis state"), which is mutated as transactions from internal (from validators) and external (from network participants) sources are accepted by the network.