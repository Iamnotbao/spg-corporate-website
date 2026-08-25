import { loadCharacterData } from "./character-data.service.js";
import { characterRepository } from "./character.repository.js";
import {
  normalizeHanziMedians,
  scoreCharacterStrokes,
} from "./character.scoring.js";
import { validateCharacterAttempt } from "./character.validation.js";

const MAX_CANDIDATES = 30;
const MAX_RESULTS = 5;

export async function recognizePublishedCharacter(input = {}) {
  const { strokes } = validateCharacterAttempt(input);
  const strokeCount = strokes.length;
  if (!strokeCount) return { strokeCount: 0, candidates: [] };

  const nearbyCounts = [strokeCount, strokeCount - 1, strokeCount + 1].filter(
    (value) => value > 0,
  );
  const candidates = await characterRepository.listPage(
    { status: "published", strokeCount: { $in: nearbyCounts } },
    { skip: 0, limit: MAX_CANDIDATES },
  );

  const scored = await Promise.allSettled(
    candidates.map(async (item) => {
      const data = await loadCharacterData(item.strokeDataKey || item.simplified);
      const result = scoreCharacterStrokes(
        strokes,
        normalizeHanziMedians(data.medians),
      );
      return {
        id: String(item._id),
        simplified: item.simplified,
        traditional: item.traditional || "",
        pinyin: item.pinyin || "",
        meaningVietnamese: item.meaningVietnamese || "",
        strokeCount: item.strokeCount,
        score: result.score,
      };
    }),
  );

  return {
    strokeCount,
    candidates: scored
      .filter((item) => item.status === "fulfilled")
      .map((item) => item.value)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_RESULTS),
  };
}
