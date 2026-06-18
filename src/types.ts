export type SceneType =
  | 'work'
  | 'event'
  | 'group_photo'
  | 'celebration'
  | 'daily'
  | 'award'
  | 'dining'
  | 'travel'
  | 'other';

export type SuggestedUse = 'main' | 'montage' | 'skip';

export interface PhotoMetadata {
  id: string;
  fileName: string;
  path: string;
  summary: string;
  scene: SceneType;
  peopleCount: number;
  mood: string[];
  tags: string[];
  possiblePeriod: string;
  importanceScore: number;
  caption: string;
  suggestedUse: SuggestedUse;
  confidence: number;
}

export interface TimelinePhoto {
  fileName: string;
  caption: string;
  duration: number;
}

export interface TimelineSection {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  photos: TimelinePhoto[];
}

export interface Timeline {
  totalDuration: number;
  sections: TimelineSection[];
}

export interface FilenameMap {
  [originalFileName: string]: string;
}

export interface CopywritingSection {
  id: string;
  title: string;
  subtitle: string;
  lyric?: string;
}

export interface Copywriting {
  intro: {
    title: string;
    subtitle: string;
    date: string;
  };
  openingLyric?: string;
  sections: CopywritingSection[];
  outro: {
    line1: string;
    line2: string;
    line3: string;
    line4?: string;
    line5?: string;
  };
}
