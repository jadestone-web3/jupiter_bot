import { RPC_LIST } from "./config.js";
import { Connection, PublicKey } from "@solana/web3.js";

let currentRpcIndex = 0;
let connection = null;


export function getCurrentRpc() {
    return RPC_LIST[currentRpcIndex];
}

export function switchRpc() {
    currentRpcIndex = (currentRpcIndex + 1) % RPC_LIST.length;
    console.log("[RPC切换] 已切换到下一个RPC节点:", getCurrentRpc());
    connection = null;
    return getCurrentRpc();
}

export function getConnection() {
    if(connection != null){
        return connection;
    }
    connection  = new Connection(getCurrentRpc(), "confirmed");
    return connection;
}