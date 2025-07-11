# Jupiter 三角套利机器人

## 项目目标
- 实现Solana链上三角套利自动化，支持多币种、批量交易、Jito高优先级通道。
- 集成自动归集、风险控制、滑点保护、日志监控等功能。
- 适合主流币和新币套利，支持自定义套利路径。

## 原理说明
- **三角套利**：依次执行A→B→C→A三步swap，捕捉DEX间价格差。
- **批量交易**：三步swap合并为一笔Solana原子交易，全部成功或全部失败。
- **Jito集成**：支持Jito RPC和tip机制，提升交易优先级，减少MEV抢跑。
- **自动归集**：主币余额不足时自动将其他币种兑换为主币，防止资金碎片化。
- **风险控制**：动态滑点、利润阈值、连续亏损/日亏损限制、成功率监控等。
- **日志监控**：详细记录每次套利模拟与实盘结果，便于复盘和可视化。

## 使用方法

### 1. 安装依赖
```bash
npm install
```

### 2. 配置 .env 文件
在项目根目录新建 `.env` 文件，内容示例：
```
MNEMONIC=你的助记词（12或24个英文单词，空格分隔）
RPC_LIST=https://rpc.jito.wtf/,https://rpc.helius.xyz/...,其他节点
ENABLE_REAL_TRADE=false   # true为实盘，false为只模拟
```

### 3. 配置套利币种和路径
在 `arbitrage_v2.js` 中编辑 `ARBITRAGE_PAIRS`，每行为一个三角套利路径：
```js
const ARBITRAGE_PAIRS = [
    [TOKENS.USDC, TOKENS.BONK, TOKENS.JUP],
    [TOKENS.USDC, TOKENS.JUP, TOKENS.MCDC],
    // ...
];
```

### 4. 启动机器人
```bash
node arbitrage_v2.js
```

### 5. 日志与监控
- 日志文件：`arbitrage_log.json`
- 可选web监控：`node web.cjs`，浏览器访问 `http://localhost:3000`

### 6. 常见问题
- 助记词/私钥**绝不能**明文上传或泄露。
- Jito RPC有速率限制，建议多节点轮询。
- 主币余额不足时会自动归集，无需手动干预。
- 推荐先用模拟模式（ENABLE_REAL_TRADE=false）测试。

## 重要安全提示
- 仅在安全环境下运行，建议用专用钱包，勿存大量资金。
- 助记词/私钥请用环境变量或加密存储，切勿硬编码。
- 本项目仅供学习和研究，实盘风险自负。

## 参考资料
- [Jupiter Aggregator](https://jup.ag/)
- [Jito Network](https://docs.jito.network/)
- [Solana Docs](https://docs.solana.com/)
- [MEV on Solana](https://solanamev.com/)
