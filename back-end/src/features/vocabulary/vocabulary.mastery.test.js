import assert from "node:assert/strict";
import { test } from "node:test";
import {
  VOCABULARY_MASTERY_RULE,
  isVocabularyMastered,
  vocabularyStage,
} from "./vocabulary.mastery.js";

test("mastery requires every documented SRS threshold", () => {
  const mastered = {
    repetitions: VOCABULARY_MASTERY_RULE.repetitions,
    intervalDays: VOCABULARY_MASTERY_RULE.intervalDays,
    easeFactor: VOCABULARY_MASTERY_RULE.easeFactor,
    reviewCount: 5,
  };
  assert.equal(isVocabularyMastered(mastered), true);
  assert.equal(vocabularyStage(mastered), "mastered");
  for (const field of ["repetitions", "intervalDays", "easeFactor"]) {
    assert.equal(
      isVocabularyMastered({ ...mastered, [field]: mastered[field] - 1 }),
      false,
    );
  }
});

test("vocabulary stages normalize new, learning, and review records", () => {
  assert.equal(vocabularyStage({}), "new");
  assert.equal(
    vocabularyStage({ reviewCount: 2, intervalDays: 0, stage: "learning" }),
    "learning",
  );
  assert.equal(
    vocabularyStage({ reviewCount: 2, intervalDays: 5, easeFactor: 2.5 }),
    "review",
  );
});
