/**
 * Pre-loaded exercise database (Korean)
 * Stored locally — no Firestore reads needed
 */

export interface ExerciseCategory {
  category: string;
  exercises: string[];
}

export const EXERCISE_DATABASE: ExerciseCategory[] = [
  {
    category: '가슴',
    exercises: [
      '벤치프레스', '인클라인 벤치프레스', '디클라인 벤치프레스',
      '덤벨 플라이', '케이블 크로스오버', '딥스', '푸쉬업',
    ],
  },
  {
    category: '등',
    exercises: [
      '데드리프트', '바벨 로우', '덤벨 로우', '랫풀다운',
      '시티드 로우', '풀업', '친업', '티바 로우',
    ],
  },
  {
    category: '어깨',
    exercises: [
      '오버헤드프레스', '사이드 레터럴 레이즈', '프론트 레이즈',
      '페이스풀', '아놀드 프레스', '업라이트 로우',
    ],
  },
  {
    category: '하체',
    exercises: [
      '스쿼트', '프론트 스쿼트', '레그프레스', '레그 익스텐션',
      '레그컬', '런지', '불가리안 스플릿 스쿼트', '힙 쓰러스트', '카프 레이즈',
    ],
  },
  {
    category: '팔',
    exercises: [
      '바벨컬', '덤벨컬', '해머컬', '트라이셉 푸쉬다운',
      '스컬크러셔', '오버헤드 트라이셉 익스텐션',
    ],
  },
  {
    category: '코어',
    exercises: [
      '플랭크', '크런치', '레그레이즈', '러시안 트위스트', '행잉 레그레이즈',
    ],
  },
  {
    category: '전신',
    exercises: [
      '클린', '클린 앤 저크', '스내치', '케틀벨 스윙', '버피',
    ],
  },
];

/** Flat list of all exercise names for search */
export const ALL_EXERCISES: string[] = EXERCISE_DATABASE.flatMap(
  (cat) => cat.exercises
);
