/**
 * 智能字数统计工具
 * 中文按字符，英文按单词，混合文本自动适配
 */

/**
 * 统计文本字数
 * @param text 输入文本
 * @returns 字数统计结果
 */
export function countWords(text: string): number {
    if (!text || text.trim().length === 0) return 0;

    const trimmed = text.trim();

    // 统计中文字符（包括中文标点）
    const chineseChars = trimmed.match(/[\u4e00-\u9fa5]/g) || [];
    const chineseCount = chineseChars.length;

    // 移除中文字符后统计英文单词
    const withoutChinese = trimmed.replace(/[\u4e00-\u9fa5]/g, ' ');
    const englishWords = withoutChinese.trim().split(/\s+/).filter(word =>
        word.match(/[a-zA-Z0-9]/) // 只计算包含字母或数字的词
    );
    const englishCount = englishWords.length;

    // 中文字符 + 英文单词
    return chineseCount + englishCount;
}

/**
 * 统计字符数（不含空格）
 */
export function countChars(text: string): number {
    return text.replace(/\s/g, '').length;
}

/**
 * 获取详细统计信息
 */
export function getTextStats(text: string) {
    const trimmed = text.trim();
    const chineseChars = (trimmed.match(/[\u4e00-\u9fa5]/g) || []).length;
    const withoutChinese = trimmed.replace(/[\u4e00-\u9fa5]/g, ' ');
    const englishWords = withoutChinese.trim().split(/\s+/).filter(word =>
        word.match(/[a-zA-Z0-9]/)
    ).length;

    return {
        totalWords: chineseChars + englishWords,
        chineseChars,
        englishWords,
        totalChars: trimmed.length,
        charsNoSpace: countChars(trimmed),
    };
}
