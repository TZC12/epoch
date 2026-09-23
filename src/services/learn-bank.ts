/** LearnPage 内置词库（按语言名索引；用户自建词走 learnWords）。 */
export const LEARN_PRESETS = ['英语', '日语', '西语'] as const

export interface BankWord {
  word: string
  meaning: string
}

export const WORD_BANKS: Record<string, BankWord[]> = {
  英语: [
    { word: 'abandon', meaning: '放弃；抛弃' },
    { word: 'ability', meaning: '能力；才能' },
    { word: 'absorb', meaning: '吸收；使专注' },
    { word: 'abstract', meaning: '抽象的；摘要' },
    { word: 'academic', meaning: '学术的' },
    { word: 'accelerate', meaning: '加速' },
    { word: 'accomplish', meaning: '完成；实现' },
    { word: 'accurate', meaning: '准确的' },
    { word: 'achieve', meaning: '达到；取得' },
    { word: 'acknowledge', meaning: '承认；致谢' },
    { word: 'adapt', meaning: '适应；改编' },
    { word: 'adequate', meaning: '足够的；适当的' },
    { word: 'adjust', meaning: '调整；适应' },
    { word: 'admire', meaning: '钦佩；欣赏' },
    { word: 'adopt', meaning: '采用；收养' },
    { word: 'advance', meaning: '前进；进展' },
    { word: 'advocate', meaning: '提倡；拥护者' },
    { word: 'affect', meaning: '影响' },
    { word: 'aggressive', meaning: '好斗的；有闯劲的' },
    { word: 'alter', meaning: '改变' },
  ],
  日语: [
    { word: '挨拶', meaning: '问候；寒暄' },
    { word: '無理', meaning: '勉强；不可能' },
    { word: '大変', meaning: '厉害；辛苦' },
    { word: '元気', meaning: '精神；健康' },
    { word: 'ありがとう', meaning: '谢谢' },
    { word: 'すみません', meaning: '不好意思' },
    { word: 'お願い', meaning: '拜托' },
    { word: '大丈夫', meaning: '没关系' },
    { word: '頑張る', meaning: '努力；加油' },
    { word: '嬉しい', meaning: '高兴' },
    { word: '忙しい', meaning: '忙碌' },
    { word: '楽しい', meaning: '快乐' },
    { word: '生活', meaning: '生活' },
    { word: '仕事', meaning: '工作' },
    { word: '時間', meaning: '时间' },
  ],
  西语: [
    { word: 'hola', meaning: '你好' },
    { word: 'gracias', meaning: '谢谢' },
    { word: 'por favor', meaning: '请' },
    { word: 'sí', meaning: '是' },
    { word: 'no', meaning: '不' },
    { word: 'agua', meaning: '水' },
    { word: 'comida', meaning: '食物' },
    { word: 'amigo', meaning: '朋友' },
    { word: 'familia', meaning: '家庭' },
    { word: 'trabajo', meaning: '工作' },
    { word: 'tiempo', meaning: '时间；天气' },
    { word: 'dinero', meaning: '钱' },
    { word: 'casa', meaning: '房子' },
    { word: 'feliz', meaning: '幸福的' },
    { word: 'importante', meaning: '重要的' },
  ],
}
