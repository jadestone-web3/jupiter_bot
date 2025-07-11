let consecutiveLosses = 0;
let dailyLoss = 0;
let successCount = 0;
let totalCount = 0;
let lastResetDate = new Date().toDateString();
// 支持连续亏损、日亏损、成功率等风控逻辑，主流程只需调用 updateSuccessRate 和 shouldStop。

export function updateSuccessRate(success, profit) {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
        successCount = 0; totalCount = 0; dailyLoss = 0; lastResetDate = today;
    }
    totalCount++;
    if (success) {
        successCount++; consecutiveLosses = 0;
    } else {
        consecutiveLosses++;
        dailyLoss += Math.abs(profit);
    }
    return {
        successRate: successCount / totalCount,
        consecutiveLosses,
        dailyLoss
    };
}

export function shouldStop({ successRate, consecutiveLosses, dailyLoss }, config) {
    if (successRate < config.successRateThreshold && totalCount > 10) return true;
    if (consecutiveLosses >= config.maxConsecutiveLosses) return true;
    if (dailyLoss >= config.maxDailyLoss) return true;
    return false;
}
