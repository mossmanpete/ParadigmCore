/* 
  =========================
  ParadigmCore: Blind Star
  stakeHandlers.ts @ {dev}
  =========================

  @date_inital 23 October 2018
  @date_modified 23 October 2018
  @author Henry Harder

  Handler functions for verifying ABCI Event Transactions. 
*/

/**
 * @name checkStake() {export function} use to perform mempool verification of
 * Ethereum StakeEvent transactions.
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function checkStake(tx: object, state: object){
    return 0;
}

/**
 * @name deliverStake() {export function} perform state modification of Stake
 * Event transactions (modify staker's balance).
 * 
 * @param tx {object} decoded transaction body
 * @param state {object} current round state
 */
export function deliverStake(tx: object, state: object){
    return 0;
}