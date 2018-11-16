# ParadigmCore Architecture and Design (WIP)
High-level architectural and design overview of the OrderStream network primary implementation (ParadigmCore). These design requirements are non-exhaustive.

## Design
#### Non-specific requirements
Characteristics of all Tendermint blockchains, and most distributed systems/blockchain networks.

1. Replicate the state consistently and concurrently across all nodes
2. Be resistant to explicit and implicit malicious behavior
3. Tolerate the failure or explicit misbehavior of up to 1/3 of the network's nodes

#### Specific requirements
Application-level requirements of the state machine implemented using Tendermint Consensus (i.e. ParadigmCore).

1. Replicate the state (balances) of the Ethereum staking contract, after implementing a finality threshold (block maturity) and confirmation threshold (witness confirmations).
2. Allocate network throughput to stakers proportional to stake size.
3. Validate and approve incoming orders according to the state-transition rules for that transaction type.
4. Publicly broadcast all valid orders within a block, at the end of that block's consensus round (when `commit` is called).