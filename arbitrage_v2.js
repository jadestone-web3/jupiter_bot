import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import fetch from "node-fetch";
import fs from "fs";
import bs58 from "bs58";
import bip39 from "bip39";
import { derivePath } from "ed25519-hd-key";
import 'dotenv/config';

// 是否实际交易，默认false，可通过.env配置ENABLE_REAL_TRADE=true启用
const ENABLE_REAL_TRADE = process.env.ENABLE_REAL_TRADE === 'true';

const customFetch = (url, options = {}) => {
    return fetch(url, {
        ...options,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
};

// 你的助记词
const MNEMONIC = process.env.MNEMONIC;
if (!MNEMONIC) {
    console.error('未检测到助记词，请设置环境变量 MNEMONIC');
    process.exit(1);
}

// 助记词转种子
const seed = await bip39.mnemonicToSeed(MNEMONIC);

// Solana 默认路径
const DERIVATION_PATH = "m/44'/501'/0'/0'";

// 从种子派生密钥
const { key } = derivePath(DERIVATION_PATH, seed.toString("hex"));

// 用派生密钥生成钱包
const wallet = Keypair.fromSeed(key);

// 从.env读取RPC列表
const RPC_LIST = process.env.RPC_LIST
    ? process.env.RPC_LIST.split(',').map(s => s.trim()).filter(Boolean)
    : [
        // 这里可以保留一组默认节点，防止.env没配时报错
        "https://rpc.helius.xyz/?api-key=xxx",
        "https://rpc.ankr.com/solana/xxx"
    ];
let currentRpcIndex = 0;
let connection = new Connection(RPC_LIST[currentRpcIndex], {
    commitment: "confirmed",
    fetch: customFetch,
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
    httpHeaders: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
});

function switchRpc() {
    currentRpcIndex = (currentRpcIndex + 1) % RPC_LIST.length;
    connection = new Connection(RPC_LIST[currentRpcIndex], {
        commitment: "confirmed",
        fetch: customFetch,
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
        httpHeaders: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    });
    console.log("[RPC切换] 已切换到下一个RPC节点:", RPC_LIST[currentRpcIndex]);
}

// 主网代币配置
const TOKENS = {
    SOL: "So11111111111111111111111111111111111111112",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    MCDC: "DHS1JnKrzmaxGScdcNigkgBRpY4pNeLeoTaoPZhipump",
    COMMUNIT: "EDMYqYbDQLwJBiM69KKm9rthAX5XFqXVo3PRZbSTbonk",
    NiHao: "6FZ2ZJkDJdSvmktH6kdce75uqL7yz6SBF9FS5BgDbonk",
    KOKOK: "5HkhVG2bSb5PGjhX5QHm9urUquD7tx5eAau5Fonq78zc",
    PENGU: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
    Fartcoin: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump"
};

// 主币配置
const MAIN_TOKEN = TOKENS.USDC;
const MAIN_TOKEN_DECIMALS = 6;

// 套利配置
const ARBITRAGE_CONFIG = {
    minProfitPercent: 0.2, // 最小利润百分比（提高阈值）
    maxSlippage: 0.3, // 最大滑点百分比（放宽限制）
    maxAmount: 5_000_000, // 最大交易金额 (5 USDC)
    minAmount: 1_000_000, // 最小交易金额 (1 USDC)
    autoExecute: true, // 是否自动执行交易
    monitorInterval: 10000, // 监控间隔 (毫秒)
    maxRetries: 3 // 最大重试次数
};

// 风险控制配置
const RISK_CONFIG = {
    minProfitAfterSlippage: 0.05,  // 考虑滑点后的最小利润
    maxConsecutiveLosses: 3,        // 最大连续亏损次数
    emergencyStopLoss: 0.1,         // 紧急止损阈值
    balanceProtectionRatio: 0.8,    // 余额保护比例
    maxDailyLoss: 50,               // 最大日亏损（USDC）
    successRateThreshold: 0.5       // 成功率阈值
};

// 全局状态跟踪
let consecutiveLosses = 0;
let dailyLoss = 0;
let successCount = 0;
let totalCount = 0;
let lastResetDate = new Date().toDateString();

// 动态滑点计算
function calculateDynamicSlippage(profitPercent) {
    if (profitPercent >= 1.0) return 0.5;  // 高利润时允许更大滑点
    if (profitPercent >= 0.5) return 0.3;
    if (profitPercent >= 0.2) return 0.2;
    return 0.1;  // 低利润时严格滑点
}

// 余额保护检查
async function checkMainTokenBalance(amount) {
    const balance = await getTokenBalance(wallet.publicKey, MAIN_TOKEN);
    const requiredAmount = amount * (1 + RISK_CONFIG.balanceProtectionRatio / 100);
    return balance >= requiredAmount;
}

// 成功率监控
function updateSuccessRate(success) {
    // 每日重置统计
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        successCount = 0;
        totalCount = 0;
        dailyLoss = 0;
        lastResetDate = today;
    }

    totalCount++;
    if (success) {
        successCount++;
        consecutiveLosses = 0;
    } else {
        consecutiveLosses++;
    }

    const successRate = successCount / totalCount;
    console.log(`📊 套利统计: 成功率 ${(successRate * 100).toFixed(1)}%, 连续亏损 ${consecutiveLosses}, 日亏损 ${dailyLoss.toFixed(2)} USDC`);

    // 检查是否需要暂停交易
    if (successRate < RISK_CONFIG.successRateThreshold && totalCount > 10) {
        console.log("⚠️ 套利成功率过低，暂停交易");
        return false;
    }

    if (consecutiveLosses >= RISK_CONFIG.maxConsecutiveLosses) {
        console.log("⚠️ 连续亏损过多，暂停交易");
        return false;
    }

    if (dailyLoss >= RISK_CONFIG.maxDailyLoss) {
        console.log("⚠️ 日亏损超限，暂停交易");
        return false;
    }

    return true;
}

// 套利币对配置，方便统一管理
const ARBITRAGE_PAIRS = [
    [TOKENS.USDC, TOKENS.BONK, TOKENS.JUP],
    [TOKENS.USDC, TOKENS.JUP, TOKENS.MCDC],
    [TOKENS.USDC, TOKENS.NiHao, TOKENS.KOKOK],
    [TOKENS.USDC, TOKENS.PENGU, TOKENS.Fartcoin]
];

// 执行交易函数
async function executeSwap(swapTransactionBase64) {
    if (!ENABLE_REAL_TRADE) {
        // 只模拟，不广播
        return "SIMULATED_SIGNATURE";
    }
    try {
        const transactionBuffer = Buffer.from(swapTransactionBase64, 'base64');
        let transaction;
        let isLegacy = false;
        try {
            transaction = VersionedTransaction.deserialize(transactionBuffer);
        } catch (error) {
            try {
                transaction = Transaction.from(transactionBuffer);
                isLegacy = true;
            } catch (error2) {
                throw error2;
            }
        }
        if (isLegacy) {
            const { blockhash } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.sign(wallet);
        } else {
            transaction.sign([wallet]);
        }
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            return null;
        } else {
            return signature;
        }
    } catch (error) {
        return null;
    }
}

// 获取报价函数
async function getQuote(inputMint, outputMint, amount) {
    try {
        const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${ARBITRAGE_CONFIG.maxSlippage * 100}`;
        const quoteResponse = await customFetch(quoteUrl);
        if (quoteResponse.status === 429) {
            console.log('[Jupiter限流] Jupiter API 429 Too Many Requests，sleep 60秒后重试...');
            await new Promise(r => setTimeout(r, 60000));
            return null;
        }
        if (!quoteResponse.ok) {
            return null;
        }
        const quote = await quoteResponse.json();
        // 细化日志：打印滑点、手续费、outAmount
        console.log(`【报价】${inputMint}→${outputMint} amount: ${amount / 1e6}, outAmount: ${quote.outAmount / 1e6}, priceImpact: ${quote.priceImpactPct}, fee: ${quote.totalFeeAndDeposits || quote.feeAmount}`);
        return quote;
    } catch (error) {
        console.error("获取报价时发生错误:", error);
        return null;
    }
}

// 获取交易数据函数
async function getSwapData(quote) {
    try {
        const swapUrl = "https://quote-api.jup.ag/v6/swap";
        const swapResponse = await customFetch(swapUrl, {
            method: 'POST',
            body: JSON.stringify({
                quoteResponse: quote,
                userPublicKey: wallet.publicKey.toBase58(),
                wrapUnwrapSOL: true,
                asLegacyTransaction: true
            })
        });

        if (!swapResponse.ok) {
            return null;
        }

        const swapData = await swapResponse.json();
        return swapData;
    } catch (error) {
        console.error("获取交易数据时发生错误:", error);
        return null;
    }
}

// 获取批量swap交易数据
async function getBatchSwapData(quotes) {
    const swapDataList = [];
    for (const quote of quotes) {
        const swapData = await getSwapData(quote);
        if (swapData && swapData.swapTransaction) {
            swapDataList.push(swapData);
        }
    }
    return swapDataList;
}

// 执行批量swap
async function executeBatchSwap(swapDataList) {
    if (!ENABLE_REAL_TRADE) {
        return "SIMULATED_BATCH_SIGNATURE";
    }

    try {
        // 获取最新blockhash
        const { blockhash } = await connection.getLatestBlockhash();

        // 创建合并交易
        const transaction = new Transaction();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // 添加所有swap指令
        for (const swapData of swapDataList) {
            const swapTransaction = Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
            transaction.add(...swapTransaction.instructions);
        }

        // 签名并发送
        transaction.sign(wallet);
        const signature = await connection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
        });

        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
            return null;
        } else {
            return signature;
        }
    } catch (error) {
        console.error("批量swap执行失败:", error);
        return null;
    }
}

// 获取指定币种余额
async function getTokenBalance(pubkey, mint) {
    try {
        if (mint === TOKENS.SOL) {
            return await connection.getBalance(pubkey) / 1e9;
        } else {
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, { mint: new PublicKey(mint) });
            let amount = 0;
            for (const acc of tokenAccounts.value) {
                amount += parseInt(acc.account.data.parsed.info.tokenAmount.amount);
            }
            // USDC/USDT等6位小数
            return amount / 1e6;
        }
    } catch (error) {
        // 检查是否为RPC相关错误
        if (error.message && (error.message.includes('429') || error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
            console.log('[RPC错误] 检测到RPC节点异常:', error.message);
            switchRpc();
            // 终止本次套利流程，等待下次循环自动重试
            throw new Error('RPC切换');
        } else {
            throw error;
        }
    }
}

// 计算三角套利
async function calculateTriangularArbitrage(tokenA, tokenB, tokenC, amount) {
    try {
        console.log(`\n【模拟三角套利开始】${tokenA} → ${tokenB} → ${tokenC} → ${tokenA}`);
        console.log(`初始金额: ${amount / 1e6} 单位`);

        // 余额保护检查
        if (!(await checkMainTokenBalance(amount / 1e6))) {
            console.log("❌ 主币余额不足，跳过本次套利");
            return null;
        }

        // 记录初始余额
        const balA0 = await getTokenBalance(wallet.publicKey, tokenA);
        const balB0 = await getTokenBalance(wallet.publicKey, tokenB);
        const balC0 = await getTokenBalance(wallet.publicKey, tokenC);

        // 第一步: A → B
        const quote1 = await getQuote(tokenA, tokenB, amount);
        if (!quote1 || !quote1.routePlan || quote1.routePlan.length === 0) {
            console.log("❌ 第一步报价失败");
            return null;
        }
        const amountB = parseInt(quote1.outAmount);

        // 第二步: B → C
        const quote2 = await getQuote(tokenB, tokenC, amountB);
        if (!quote2 || !quote2.routePlan || quote2.routePlan.length === 0) {
            console.log("❌ 第二步报价失败");
            return null;
        }
        const amountC = parseInt(quote2.outAmount);

        // 第三步: C → A
        const quote3 = await getQuote(tokenC, tokenA, amountC);
        if (!quote3 || !quote3.routePlan || quote3.routePlan.length === 0) {
            console.log("❌ 第三步报价失败");
            return null;
        }
        const finalAmount = parseInt(quote3.outAmount);

        // 计算利润
        const profit = finalAmount - amount;
        const profitPercent = (profit / amount) * 100;

        // 考虑滑点后的实际利润
        const actualProfitPercent = profitPercent - (ARBITRAGE_CONFIG.maxSlippage * 3); // 三步滑点

        // 记录结束余额
        const balA1 = await getTokenBalance(wallet.publicKey, tokenA);
        const balB1 = await getTokenBalance(wallet.publicKey, tokenB);
        const balC1 = await getTokenBalance(wallet.publicKey, tokenC);
        console.log(`结束余额: ${tokenA}: ${balA1}, ${tokenB}: ${balB1}, ${tokenC}: ${balC1}`);

        if (actualProfitPercent >= RISK_CONFIG.minProfitAfterSlippage) {
            console.log(`\n📊 满足阈值，套利结果:`);
            console.log(`预期利润: ${profitPercent.toFixed(4)}%`);
            console.log(`考虑滑点后利润: ${actualProfitPercent.toFixed(4)}%`);
            console.log(`初始: ${amount / 1e6}`);
            console.log(`最终: ${finalAmount / 1e6}`);
            console.log(`利润: ${profit / 1e6} (${profitPercent.toFixed(4)}%)`);
        } else {
            console.log(`未达阈值，仅模拟。预期利润: ${profitPercent.toFixed(4)}%, 考虑滑点后: ${actualProfitPercent.toFixed(4)}%`);
        }

        // 记录日志
        logArbitrage({
            timestamp: new Date().toISOString(),
            type: 'simulate',
            profit,
            profitPercent,
            actualProfitPercent,
            tokenA,
            tokenB,
            tokenC,
            amountIn: amount,
            amountOut: finalAmount,
            balA0,
            balB0,
            balC0,
            balA1,
            balB1,
            balC1
        });

        return {
            profitable: actualProfitPercent >= RISK_CONFIG.minProfitAfterSlippage,
            profit,
            profitPercent,
            actualProfitPercent,
            quotes: [quote1, quote2, quote3],
            path: [tokenA, tokenB, tokenC]
        };
    } catch (error) {
        console.error("计算三角套利时发生错误:", error);
        return null;
    }
}

// 执行三角套利
async function executeTriangularArbitrage(arbitrageResult) {
    const { quotes, path, profit, profitPercent, actualProfitPercent } = arbitrageResult;

    // 风险检查
    if (!updateSuccessRate(true)) {
        console.log("⚠️ 风险控制触发，跳过本次交易");
        return;
    }

    // 获取所有swap的交易数据
    const swapDataList = await getBatchSwapData(quotes);
    if (swapDataList.length !== 3) {
        console.log("❌ 获取swap数据失败，无法执行批量交易");
        updateSuccessRate(false);
        return;
    }

    // 记录交易前余额
    const balBefore = {};
    for (const token of path) {
        balBefore[token] = await getTokenBalance(wallet.publicKey, token);
    }
    console.log(`【批量交易前】${path[0]}: ${balBefore[path[0]]}, ${path[1]}: ${balBefore[path[1]]}, ${path[2]}: ${balBefore[path[2]]}`);

    // 执行批量swap
    const signature = await executeBatchSwap(swapDataList);

    if (signature) {
        console.log(`【批量交易成功】交易哈希: ${signature}`);

        // 记录交易后余额
        const balAfter = {};
        for (const token of path) {
            balAfter[token] = await getTokenBalance(wallet.publicKey, token);
        }
        console.log(`【批量交易后】${path[0]}: ${balAfter[path[0]]}, ${path[1]}: ${balAfter[path[1]]}, ${path[2]}: ${balAfter[path[2]]}`);

        // 计算实际利润
        const actualProfit = (balAfter[path[0]] - balBefore[path[0]]) * 1e6;
        const actualProfitPercent = (actualProfit / (ARBITRAGE_CONFIG.maxAmount)) * 100;

        console.log(`【实际利润】预期: ${profitPercent.toFixed(4)}%, 实际: ${actualProfitPercent.toFixed(4)}%`);

        // 更新统计
        if (actualProfitPercent > 0) {
            updateSuccessRate(true);
        } else {
            updateSuccessRate(false);
            dailyLoss += Math.abs(actualProfit / 1e6);
        }

        // 记录变化
        for (const token of path) {
            const change = balAfter[token] - balBefore[token];
            console.log(`【余额变化】${token}: ${change > 0 ? '+' : ''}${change.toFixed(6)}`);
        }
    } else {
        console.log("【批量交易失败】");
        updateSuccessRate(false);
    }

    // 记录日志
    logArbitrage({
        timestamp: new Date().toISOString(),
        type: 'real',
        profit,
        profitPercent,
        actualProfitPercent,
        tokenA: path[0],
        tokenB: path[1],
        tokenC: path[2],
        signature,
        balBefore,
        balAfter: signature ? balAfter : null,
        consecutiveLosses,
        dailyLoss
    });
}

// 监控套利机会
async function monitorArbitrageOpportunities() {
    const monitor = async () => {
        for (const [tokenA, tokenB, tokenC] of ARBITRAGE_PAIRS) {
            const arbitrageResult = await calculateTriangularArbitrage(
                tokenA, tokenB, tokenC, ARBITRAGE_CONFIG.maxAmount
            );
            if (arbitrageResult && arbitrageResult.profitable) {
                console.log(`套利利润: ${arbitrageResult.profitPercent.toFixed(4)}%`);
                if (ARBITRAGE_CONFIG.autoExecute) {
                    await executeTriangularArbitrage(arbitrageResult);
                }
            }
        }
    };
    await monitor();
}

// 自动集结功能：将非主币且非SOL的套利币种全部兑换为USDC
async function autoGatherToMainToken() {
    console.log('【自动集结】主币余额过低，开始自动将其他币种兑换为USDC...');
    // 收集所有套利币对涉及的目标币种，去重
    const gatherTokens = Array.from(new Set(ARBITRAGE_PAIRS.map(pair => pair[1])));
    const MIN_GATHER_AMOUNT = 0.1; // 归集最小金额阈值（单位：USDC）
    for (const token of gatherTokens) {
        if (token === MAIN_TOKEN || token === TOKENS.SOL) continue; // 跳过USDC和SOL
        const bal = await getTokenBalance(wallet.publicKey, token);
        if (bal >= MIN_GATHER_AMOUNT) { // 只处理余额大于最小归集阈值的币
            const amount = Math.floor(bal * 1e6); // 以6位小数为例
            console.log(`集结 ${bal} ${token} -> USDC`);
            const quote = await getQuote(token, MAIN_TOKEN, amount);
            if (quote && quote.outAmount > 0) {
                const swapData = await getSwapData(quote);
                if (swapData && swapData.swapTransaction) {
                    const sig = await executeSwap(swapData.swapTransaction);
                    if (sig) {
                        console.log(`集结成功，交易哈希: ${sig}`);
                    } else {
                        console.log('集结swap失败');
                    }
                }
            }
        }
    }
    console.log('【自动集结】完成。');
}

async function monitorLoop() {
    try {
        const mainBalance = await getTokenBalance(wallet.publicKey, MAIN_TOKEN);
        if (mainBalance < ARBITRAGE_CONFIG.minAmount / Math.pow(10, MAIN_TOKEN_DECIMALS)) {
            await autoGatherToMainToken();
        }
        await monitorArbitrageOpportunities();
    } catch (e) {
        console.error("monitorLoop异常:", e);
    }
    setTimeout(monitorLoop, ARBITRAGE_CONFIG.monitorInterval);
}

// 主函数
async function main() {
    try {
        console.log("🚀 启动三角套利系统 V2...");
        console.log("钱包地址:", wallet.publicKey.toBase58());
        console.log("目标网络: 主网 (mainnet-beta)");
        console.log("当前RPC节点:", RPC_LIST[currentRpcIndex]);
        // 检查钱包余额
        const balance = await connection.getBalance(wallet.publicKey);
        console.log(`钱包余额: ${balance / 1000000000} SOL`);

        // 获取主币余额
        const mainBalance = await getTokenBalance(wallet.publicKey, MAIN_TOKEN);
        if (mainBalance < ARBITRAGE_CONFIG.maxAmount / Math.pow(10, MAIN_TOKEN_DECIMALS)) {
            console.log('❌ 主币余额不足，无法进行套利');
            return;
        }

        // 开始监控
        const stopMonitoring = await monitorLoop();

        // 保持程序运行
        console.log("\n按 Ctrl+C 停止监控...");
        process.on('SIGINT', () => {
            process.exit(0);
        });

    } catch (error) {
        if (error.message === 'RPC切换') {
            // 忽略本次，等待下次循环
            return;
        }
        console.error("主函数发生错误:", error);
    }
}

// 运行主函数
main();

const LOG_FILE = 'arbitrage_log.json';

// 追加日志
function logArbitrage(entry) {
    try {
        let logs = [];
        if (fs.existsSync(LOG_FILE)) {
            try {
                const content = fs.readFileSync(LOG_FILE);
                logs = JSON.parse(content.length ? content : '[]');
            } catch (e) {
                // 文件损坏或为空，自动重置
                console.error("日志文件损坏，已重置为空数组");
                logs = [];
            }
        }
        logs.push(entry);
        fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error("写入日志失败:", e);
    }
}

// 全局异常兜底
process.on('uncaughtException', (err) => {
    console.error('未捕获异常:', err);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('未处理的Promise拒绝:', reason);
}); 