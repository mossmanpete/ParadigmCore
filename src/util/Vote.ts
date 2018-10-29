/*
  =========================
  ParadigmCore: Blind Star
  Vote.ts @ {master}
  =========================
  
  @date_inital 24 September 2018
  @date_modified 25 October 2018
  @author Henry Harder

  A class to represent a vote based on the logic in 
  checkTx() and deliverTx().
*/

export class Vote { 
    /*
        This class will be expanded with more errors for the
        different failure points in checkTx (and deliverTx).
    */
    public static valid(message?: string, id?: string) {
        return {
            code: 0,
            log: `OrderID: ${id}`,
            info: message
        }
    }

    public static invalid(message?: string) {
        return {
            code: 1,
            log: message
        }
    }
}