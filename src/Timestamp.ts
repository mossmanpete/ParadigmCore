export class Timestamp extends Date {
    constructor(){
        super();
    }

    public logFormat() {
        
        return `[${this.getMonth()+1}-${this.getDate()}]${this.getHours()}:${this.getMinutes()}:${this.getSeconds()}.${this.getMilliseconds().toString().slice(0,2)}`;
    }
}