export class Timestamp extends Date {
    constructor(){
        super();
    }

    public logFormat() {
        
        let ret = (`this.getMinutes()`)
        return `[${this.getMonth()+1}-${this.getDate()}]${this.getHours()}:${this.getMinutes()}:${this.getSeconds()}.${this.getMilliseconds()}`
    }
}