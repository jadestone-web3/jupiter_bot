// 余额查询测试
import { Connection, PublicKey } from "@solana/web3.js";
import 'dotenv/config';

const RPC = process.env.RPC_LIST?.split(',')[0] || "https://api.mainnet-beta.solana.com";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const WALLET = process.env.TEST_WALLET || "你的钱包地址";

async function getTokenBalance(pubkey, mint) {
    const connection = new Connection(RPC, "confirmed");
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

async function testBalance() {
    const bal = await getTokenBalance(WALLET, USDC);
    console.log(`【余额查询测试】USDC余额: ${bal}`);
}

testBalance().catch(console.error);