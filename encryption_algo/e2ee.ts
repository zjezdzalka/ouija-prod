/*
    Diffie-Hellman Key Exchange algo
    written by rytui, 14.01.2026r. :3
    .ts edition
*/
function main(){
    function decToBin(x:number):string{
        let bin = "";
        while(x>0){
            bin += (x%2).toString();
            x /= 2;
        }
        return bin;
    }
    function generateNumber(a:number, b:number):number{
        return Math.floor(Math.random() * a) + b;
    }

    function checkPrime(x:number):boolean{
        let i:number;
        for(i=2;i*i<=x;++i){
            if(x % i == 0) return false;
        }
        return true;
    }

    class User{
        constructor(){
            let x:number = generateNumber(1e6, 1e9);
            while(!checkPrime(x)){
                x = generateNumber(1e6, 1e9);
            }

            this.#privKey = x;
            this.#binPKey = decToBin(this.#privKey);

            console.log(this.#binPKey);
        }
            
        stageOne(base:number, modulo:number):number{
            let i: number;
            let cur: number = 1;
            let sum: number = 1;

            for(i = this.#binPKey.length-1;i>=0;--i){
                if(cur == this.#binPKey.length-1) cur *= base;
                else cur *= cur;

                if(this.#binPKey[i] == '1'){
                    cur %= modulo;
                    sum *= cur;
                    sum %= modulo;
                }
                else {
                    cur %= modulo;
                }
            }

            return sum;
        }

        stageTwo(other: number, base: number, modulo: number){
            let i:number;
            let cur:number = other;
            let sum:number = 1;
            for(i = this.#binPKey.length-1;i>=0;--i){
                if(cur == 1) cur *= base;
                else cur *= cur;

                if(this.#binPKey[i] == '1'){
                    cur %= modulo;
                    sum *= cur;
                    sum %= modulo;
                }
                else {
                    cur %= modulo;
                }
            }
            return sum;
        }

        #privKey:number;
        #binPKey:string;

    };

    const p1:User = new User();
    const p2:User = new User();

    let base:number = generateNumber(1e4, 1e6);
    while(!checkPrime(base)){
        base = generateNumber(1e4, 1e6);
    }

    let modulo:number = generateNumber(1e5, 1e7);
    while(!checkPrime(modulo)){
        modulo = generateNumber(1e5, 1e7);
    }

    console.log(base, modulo);

    const sumS1_1:number = p1.stageOne(base, modulo);
    const sumS1_2:number = p2.stageOne(base, modulo);

    console.log(sumS1_1, sumS1_2);

    const sumS2_1:number = p1.stageTwo(sumS1_2, base, modulo);
    const sumS2_2:number = p2.stageTwo(sumS1_1, base, modulo);

    console.log(sumS2_1, sumS2_2);
}

main();