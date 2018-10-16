/*
  =========================
  ParadigmCore: Blind Star
  Timestamp.ts @ {dev}
  =========================
  
  @date_inital 10 October 2018
  @date_modified 15 October 2018
  @author Henry Harder

  Dumb class for creating a log timestamp.
*/

export class Timestamp extends Date {
    constructor(){
        super();
    }

    public logFormat() {
        
        return `[${this.getMonth()+1}-${this.getDate()}]${this.getHours()}:${this.getMinutes()}:${this.getSeconds()}.${this.getMilliseconds().toString().slice(0,2)}`;
    }
}