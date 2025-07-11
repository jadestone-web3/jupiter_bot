import fs from "fs";
const LOG_FILE = "arbitrage_log.json";
// 记录每次套利尝试、成功、失败、利润等信息到本地 arbitrage_log.json 文件。

export function logArbitrage(entry) {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
        try {
            const content = fs.readFileSync(LOG_FILE);
            logs = JSON.parse(content.length ? content : "[]");
        } catch {
            logs = [];
        }
    }
    logs.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
}