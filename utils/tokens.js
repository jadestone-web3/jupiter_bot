// 币种常量与名称映射
export const TOKENS = {
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
    Fartcoin: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
    DAI: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // 示例，实际请替换
    FRAX: "FR3SPJmgfRSKKQ2ysUZBu7vJLpzTixXnjzb84bY3JifJ",
    RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    SRM: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",
    ORCA: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    MNGO: "MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac",
    SAMO: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    COPE: "8HGyAAB1yoM2ttS7pXjfMa88pQN3R2fHvTt3QLp5q1j1",
    RATIO: "ratioMVg27rSZbSvBpU1gHP5purTX1sxP0rBmxYBqX",
    PYTH: "HZ1JovNiVvGrGNiiYvEozEVg58WUyZzK9S4QmvL9qXny",
    WIF: "EKpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65Qjmz",
    DOGE: "ArUkYE2XDKzqy77PRRGjo5wREgkwTQF7pyVmMTyUfQYq",
    SHIB: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    PEPE: "CKaKtYvz6dKPyMvYq9Rh3UBrnNqYqRqC7D1QJqJqJqJq", // 示例
    BOME: "9aeipBqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq" // 示例
};

export const TOKEN_NAMES = {
    [TOKENS.SOL]: "SOL",
    [TOKENS.USDC]: "USDC",
    [TOKENS.USDT]: "USDT",
    [TOKENS.BONK]: "BONK",
    [TOKENS.JUP]: "JUP",
    [TOKENS.MCDC]: "MCDC",
    [TOKENS.COMMUNIT]: "COMMUNIT",
    [TOKENS.NiHao]: "NiHao",
    [TOKENS.KOKOK]: "KOKOK",
    [TOKENS.PENGU]: "PENGU",
    [TOKENS.Fartcoin]: "Fartcoin",
    [TOKENS.DAI]: "DAI",
    [TOKENS.FRAX]: "FRAX",
    [TOKENS.RAY]: "RAY",
    [TOKENS.SRM]: "SRM",
    [TOKENS.ORCA]: "ORCA",
    [TOKENS.MNGO]: "MNGO",
    [TOKENS.SAMO]: "SAMO",
    [TOKENS.COPE]: "COPE",
    [TOKENS.RATIO]: "RATIO",
    [TOKENS.PYTH]: "PYTH",
    [TOKENS.WIF]: "WIF",
    [TOKENS.DOGE]: "DOGE",
    [TOKENS.SHIB]: "SHIB",
    [TOKENS.PEPE]: "PEPE",
    [TOKENS.BOME]: "BOME"
};

export function getTokenName(mint) {
    return TOKEN_NAMES[mint] || mint.slice(0, 8) + "...";
} 