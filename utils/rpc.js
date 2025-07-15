import { RPC_LIST } from "./config.js";
import { Connection, PublicKey } from "@solana/web3.js";

let currentRpcIndex = 0;

export function getCurrentRpc() {
    return RPC_LIST[currentRpcIndex];
}

export function switchRpc() {
    currentRpcIndex = (currentRpcIndex + 1) % RPC_LIST.length;
    console.log("[RPC切换] 已切换到下一个RPC节点:", getCurrentRpc());
    return getCurrentRpc();
}

export function getConnection() {
    return new Connection(getCurrentRpc(), "confirmed");
}