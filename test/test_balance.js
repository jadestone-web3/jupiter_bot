import { getTokenBalance } from "../core/balance.js";
import { TOKENS } from "../utils/tokens.js";

const RPC = process.env.RPC_LIST?.split(',')[0] || "https://api.mainnet-beta.solana.com";
const WALLET = process.env.TEST_WALLET || "你的钱包地址";

async function main() {
    const bal = await getTokenBalance(RPC, WALLET, TOKENS.USDC);
    console.log(`USDC余额: ${bal}`);
}

main().catch(console.error); 