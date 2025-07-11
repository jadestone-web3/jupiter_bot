import 'dotenv/config';

export const ENABLE_REAL_TRADE = process.env.ENABLE_REAL_TRADE === 'true';
export const MIN_PROFIT_PERCENT = parseFloat(process.env.MIN_PROFIT_PERCENT || '0.1');
export const MNEMONIC = process.env.MNEMONIC;
export const RPC_LIST = process.env.RPC_LIST?.split(',').map(s => s.trim()).filter(Boolean) || ["https://api.mainnet-beta.solana.com"];
export const MONITOR_INTERVAL = parseInt(process.env.MONITOR_INTERVAL || '10000', 10);
export const SLIPPAGE_BPS = parseInt(process.env.SLIPPAGE_BPS || '30', 10);
export const MAIN_TOKEN_DECIMALS = 6;
// 其他参数可按需添加
