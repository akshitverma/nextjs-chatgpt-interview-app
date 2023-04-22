export type SystemPurposeId = 'Catalyst' | 'Custom' | 'Designer' | 'Developer' | 'Executive' | 'Generic' | 'Scientist';

export const defaultSystemPurposeId: SystemPurposeId = 'Generic';

type SystemPurposeData = {
  title: string;
  description: string | JSX.Element;
  systemMessage: string;
  symbol: string;
  examples?: string[];
}

export const SystemPurposes: { [key in SystemPurposeId]: SystemPurposeData } = {
  Developer: {
    title: 'Python',
    description: 'Helps you code',
    systemMessage: 'Python', // skilled, detail-oriented
    symbol: '👩‍💻',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
    //examples: ['hello world in 10 languages', 'translate python to typescript', 'find and fix a bug in my code', 'add a mic feature to my NextJS app', 'automate tasks in React'],
  },
  Scientist: {
    title: 'Java',
    description: 'Helps you write scientific papers',
    systemMessage: 'Java',
    symbol: '🔬',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
  },
  Catalyst: {
    title: 'Node.js',
    description: 'Growth hacker with marketing superpowers 🚀',
    systemMessage: 'Node.js',
    symbol: '🚀',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
  },
  Executive: {
    title: 'Swift',
    description: 'Helps you write business emails',
    systemMessage: 'Swift',
    symbol: '👔',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
  },
  Designer: {
    title: 'Android',
    description: 'Helps you design',
    systemMessage: 'Android',
    symbol: '🖌️',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
  },
  Generic: {
    title: 'PHP',
    description: 'Helps you think',
    systemMessage: 'PHP',
    symbol: '🧠',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
  },
  Custom: {
    title: 'Custom',
    description: 'User-defined language',
    systemMessage: 'C++',
    symbol: '✨',
    examples: ['Exam instructions: \
    The duration of this exam is [Exam duration] minutes. \
    There are X questions in this exam and will be presented one at a time/all at once. \
    Each question is worth the same/different marks.  \
    The examination is worth X% of the marks available in this subject. The contribution each question makes to the total examination mark is indicated in points or as a percentage. \
    During this exam you will/won’t be permitted to review previous questions.  \
     '],
  },
};


export type ChatModelId = 'fresher' | 'junior-engineer' | 'engineer' | 'senior-engineer' | 'tech-lead';

export const defaultChatModelId: ChatModelId = 'fresher';
export const fastChatModelId: ChatModelId = 'junior-engineer';

type ChatModelData = {
  description: string | JSX.Element;
  title: string;
  fullName: string; // seems unused
  contextWindowSize: number,
  yearsExperience: number,
}

export const ChatModels: { [key in ChatModelId]: ChatModelData } = {
  'fresher': {
    description: 'Most insightful, larger problems, but slow, expensive, and may be unavailable',
    title: 'Fresher',
    fullName: 'GPT-4',
    contextWindowSize: 8192,
    yearsExperience: 1
  },
  'junior-engineer': {
    description: 'A good balance between speed and insight',
    title: 'Junior Software Engineer',
    fullName: 'GPT-3.5 Turbo',
    contextWindowSize: 4097,
    yearsExperience: 2
  },
  'engineer': {
    description: 'A good balance between speed and insight',
    title: 'Software Engineer',
    fullName: 'GPT-3.5 Turbo',
    contextWindowSize: 4097,
    yearsExperience: 3
  },
  'senior-engineer': {
    description: 'A good balance between speed and insight',
    title: 'Senior Software Engineer',
    fullName: 'GPT-3.5 Turbo',
    contextWindowSize: 4097,
    yearsExperience: 4
  },
  'tech-lead': {
    description: 'A good balance between speed and insight',
    title: 'Tech Lead',
    fullName: 'GPT-3.5 Turbo',
    contextWindowSize: 4097,
    yearsExperience: 8
  },
};