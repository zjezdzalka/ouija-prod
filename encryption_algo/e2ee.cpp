/*
    Diffie-Hellman Key Exchange algo
    written by rytui, 14.01.2026r. :3
    To rewrite in JS/TS
*/

#include<bits/stdc++.h>
#define ll long long
using namespace std;

string decToBin(ll x){
    string bin = "";
    while(x>0){
        bin += ('0' + x%2);
        x /= 2;
    }
    reverse(bin.begin(), bin.end());
    return bin;
}

ll generateNumber(ll a, ll b){
    return rand()%a+b;
}

bool checkPrime(ll x){
    ll i;
    for(i = 2; i*i<=x; ++i){
        if(x % i == 0) return false;
    }
    return true;
}

class User{
    public:
        User(){
            int x = generateNumber(1e6, 1e9);
            while(!checkPrime(x)){
                x = generateNumber(1e6, 1e9);
            }
            privKey = x;

            binPKey = decToBin(privKey);

            cout<<binPKey<<endl;
        }

        User(int x){
            privKey = x;
            binPKey = decToBin(privKey);
            cout<<binPKey<<endl;
        }

        ll stageOne(ll base, ll modulo){
            ll i;
            ll cur = 1;
            ll sum = 1;
            for(i = binPKey.size()-1;i>=0;--i){
                if(i == binPKey.size()-1) cur *= base;
                else cur *= cur;

                if(binPKey[i] == '1'){
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

        ll stageTwo(ll other, ll base, ll modulo){
            ll i;
            ll cur = other;
            ll sum = 1;
            for(i = binPKey.size()-1;i>=0;--i){
                if(i == binPKey.size()-1) cur *= base;
                else cur *= cur;

                if(binPKey[i] == '1'){
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
    private:
        ll privKey;
        string binPKey;

};

int main(){
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    cout.tie(NULL);

    srand(time(NULL));

    User p1 = User();
    User p2 = User();

    ll base = generateNumber(1e4, 1e6);
    while(!checkPrime(base)){
        base = generateNumber(1e4, 1e6);
    }

    ll modulo = generateNumber(1e5, 1e7);
    while(!checkPrime(modulo)){
        modulo = generateNumber(1e5, 1e7);
    }

    cout<<base<<" "<<modulo<<endl;

    ll sumS1_1 = p1.stageOne(base, modulo);
    ll sumS1_2 = p2.stageOne(base, modulo);

    cout<<sumS1_1<<endl<<sumS1_2<<endl;

    ll sumS2_1 = p1.stageTwo(sumS1_2, base, modulo);
    ll sumS2_2 = p2.stageTwo(sumS1_1, base, modulo);

    cout<<sumS2_1<<endl<<sumS2_2<<endl;

    /*
    User test = User(11);
    cout << test.stageOne(3, 19) << endl;
    */

    return 0;
}