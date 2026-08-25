export const VOCABULARY_MASTERY_RULE = Object.freeze({
  repetitions: 5,
  intervalDays: 21,
  easeFactor: 2,
});

export function isVocabularyMastered(progress = {}) {
  return (
    (Number(progress.repetitions) || 0) >=
      VOCABULARY_MASTERY_RULE.repetitions &&
    (Number(progress.intervalDays) || 0) >=
      VOCABULARY_MASTERY_RULE.intervalDays &&
    (Number(progress.easeFactor) || 0) >= VOCABULARY_MASTERY_RULE.easeFactor
  );
}

export function vocabularyStage(progress = {}) {
  if (isVocabularyMastered(progress)) return "mastered";
  if ((Number(progress.reviewCount) || 0) === 0) return "new";
  if (
    progress.stage === "learning" ||
    (Number(progress.intervalDays) || 0) === 0
  ) {
    return "learning";
  }
  return "review";
}

export function vocabularyStageExpression() {
  const mastered = {
    $and: [
      {
        $gte: [
          { $ifNull: ["$repetitions", 0] },
          VOCABULARY_MASTERY_RULE.repetitions,
        ],
      },
      {
        $gte: [
          { $ifNull: ["$intervalDays", 0] },
          VOCABULARY_MASTERY_RULE.intervalDays,
        ],
      },
      {
        $gte: [
          { $ifNull: ["$easeFactor", 0] },
          VOCABULARY_MASTERY_RULE.easeFactor,
        ],
      },
    ],
  };
  return {
    $switch: {
      branches: [
        { case: mastered, then: "mastered" },
        {
          case: { $eq: [{ $ifNull: ["$reviewCount", 0] }, 0] },
          then: "new",
        },
        {
          case: {
            $or: [
              { $eq: ["$stage", "learning"] },
              { $eq: [{ $ifNull: ["$intervalDays", 0] }, 0] },
            ],
          },
          then: "learning",
        },
      ],
      default: "review",
    },
  };
}
