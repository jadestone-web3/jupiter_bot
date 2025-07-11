import { Connection, PublicKey } from "@solana/web3.js";
import { getCurrentRpc } from "../utils/rpc.js";

/**
 * 查询指定钱包的Token余额
 * @param {string} rpcUrl
 * @param {string} pubkey
 * @param {string} mint
 * @returns {Promise<number>} 余额（小数）
 */
export async function getTokenBalance(rpcUrl, pubkey, mint) {
    const connection = new Connection(rpcUrl, "confirmed");
    if (mint === "So11111111111111111111111111111111111111112") {
        const sol = await connection.getBalance(new PublicKey(pubkey));
        return sol / 1e9;
    } else {
        const accounts = await connection.getParsedTokenAccountsByOwner(
            new PublicKey(pubkey),
            { mint: new PublicKey(mint) }
        );
        let amount = 0;
        for (const acc of accounts.value) {
            amount += parseInt(acc.account.data.parsed.info.tokenAmount.amount);
        }
        return amount / 1e6;
    }
} 