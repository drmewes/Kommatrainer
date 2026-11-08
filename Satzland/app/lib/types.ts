export type Word = { id: string; text: string; syllables: string[]; article?: string; emoji?: string; sentence: string; help?: string; parts?: string[]; family?: string[]; stress?: number; length?: 'lang' | 'kurz' | 'zwie'; knack?: string; pair?: string; merk?: boolean; profi?: boolean; custom?: boolean };
export type Batch = { id: string; name: string; description: string; words: Word[]; deleted?: boolean; reset?: boolean; edited?: boolean; week?: number; from?: string; to?: string; focus?: string; skip?: Mode[] };
export type Lesson = { id: string; day: string; batchId: string; wordIds: string[]; limit: number; at: number };
export type Introduction = { id: string; wordId: string; batchId: string; at: number; contentKey?: string };
export type Milestone = { id: string; batchId: string; packageKey: string; at: number };
export type Mode = 'discover' | 'listen' | 'rule' | 'morph' | 'write' | 'warmup' | 'profi' | 'mix';
// Satzland, the comma kingdom: its own steps next to the word training.
export type SatzMode = 'satz-lernen' | 'satz-koenige' | 'satz-grenzweg' | 'satz-setzen' | 'satz-text' | 'satz-fest';
export type Verdict = { kind: 'exact' | 'tolerated' | 'incorrect'; accepted: boolean; distance: number; expected: string; caseOnly: boolean; knack: string | null };
export type Attempt = {
  id: string; wordId: string; batchId: string; sessionId: string; mode: Mode | SatzMode | 'test';
  input: string; expected: string; kind: Verdict['kind']; distance: number;
  first: boolean; hint: boolean; at: number; seconds: number; contentKey?: string; guided?: boolean; points?: number; knack?: string | null;
};
export type Session = { id: string; batchId: string; mode: Mode | SatzMode; stars?: number; at: number; score: number; exact: number; correct: number; total: number; points: number; wordIds: string[]; duration: number; packageKey?: string; completed?: boolean; allCorrect?: number; allTotal?: number; refreshId?: string; completionBonus?: number };
export type TestResult = { id: string; batchId: string; source: 'manual' | 'app'; at: number | null; correct: number | null; exact: number | null; total: number | null; stars?: number; note?: string; duration?: number; answers?: Attempt[]; transfer?: { correct: number; total: number } };
export type Settings = { voice: string; pitch: number; sound: boolean; effects: boolean; tutorialWelcomeSeen: boolean; childTutorialDone: boolean; parentTutorialDone: boolean; testSize: number; activeBatchId: string; childName: string; practicePool: 'current' | 'all'; dailyNewLimit: number; weeklyGoal: number; reviewLevel: 'low' | 'normal' | 'high'; keyboard: 'abc' | 'qwertz'; starThresholds: number[] };
export type RecordEntry = { id: string; kind: 'setting' | 'batch' | 'attempt' | 'session' | 'test' | 'introduction' | 'lesson' | 'milestone'; data: any; changeId?: string; updatedAt?: number };
export type LearningState = { settings: Settings; batches: Batch[]; attempts: Attempt[]; sessions: Session[]; tests: TestResult[]; introductions: Introduction[]; lessons: Lesson[]; milestones: Milestone[] };
export type Store = LearningState & { loaded: boolean; syncStatus: string; pending: number; lessonStatus: 'loading' | 'ready' | 'offline'; planLesson: (workAhead?: boolean, batchId?: string) => Promise<boolean>; commit: (entries: RecordEntry[]) => void; setting: (key: keyof Settings, value: any) => void; refresh: () => void; exportData: () => void };
