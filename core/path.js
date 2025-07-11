/**
 * 路径筛选
 * @param {Array<Array<string>>} pairs
 * @param {string} token
 * @returns {Array<Array<string>>}
 */
export function filterPairs(pairs, token) {
    return pairs.filter(path => path.includes(token));
} 