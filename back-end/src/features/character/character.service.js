import { loadCharacterData } from "./character-data.service.js";
import { parseDateRange } from "../../utils/pagination.js";
import { characterRepository } from "./character.repository.js";
import {
  normalizeHanziMedians,
  scoreCharacterStrokes,
} from "./character.scoring.js";
import {
  CharacterValidationError,
  validateCharacter,
  validateCharacterAttempt,
  validateCharacterListQuery,
} from "./character.validation.js";

export class CharacterServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function serializeCharacter(item) {
  return {
    id: String(item._id),
    simplified: item.simplified,
    traditional: item.traditional || "",
    pinyin: item.pinyin,
    meaningVietnamese: item.meaningVietnamese,
    meaningEnglish: item.meaningEnglish || "",
    radical: item.radical,
    strokeCount: item.strokeCount,
    hskLevel: item.hskLevel,
    examples: item.examples || [],
    strokeDataKey: item.strokeDataKey,
    lessonId: item.lessonId ? String(item.lessonId) : null,
    status: item.status,
    generatedFromVocabulary: Boolean(item.generatedFromVocabulary),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function serializeAttempt(item) {
  return {
    id: String(item._id),
    characterId: String(item.characterId),
    score: item.score,
    strokeCount: item.strokeCount,
    summary: item.summary,
    createdAt: item.createdAt,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function requireId(repository, value, field = "id") {
  const id = repository.toObjectId(value);
  if (!id) throw new CharacterValidationError(`${field} must be a valid id`);
  return id;
}

function pagination(page, pageSize, total) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function requireStudent(user) {
  if (user?.role !== "student" || !user?._id) {
    throw new CharacterServiceError(403, "Student access required");
  }
}

function validateBulkInput(input, { allowStatus = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CharacterValidationError("Bulk payload must be an object");
  }
  const allowed = allowStatus ? ["ids", "status"] : ["ids"];
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length)
    throw new CharacterValidationError(`Unknown fields: ${unknown.join(", ")}`);
  if (
    !Array.isArray(input.ids) ||
    !input.ids.length ||
    input.ids.length > 100
  ) {
    throw new CharacterValidationError("ids must contain from 1 to 100 items");
  }
  return [...new Set(input.ids.map((id) => String(id)))];
}

export function createCharacterService(
  repository = characterRepository,
  dataLoader = loadCharacterData,
) {
  async function requireLesson(lessonId) {
    if (!lessonId) return null;
    requireId(repository, lessonId, "lessonId");
    const lesson = await repository.findLesson(lessonId);
    if (!lesson) throw new CharacterServiceError(404, "Lesson not found");
    if (lesson.type !== "character") {
      throw new CharacterServiceError(
        409,
        "Characters can only link to a character Lesson",
      );
    }
    return lesson;
  }

  async function requirePublicCharacter(identifier) {
    const item = await repository.findByIdentifier(identifier, {
      status: "published",
    });
    if (!item) throw new CharacterServiceError(404, "Character not found");
    return item;
  }

  async function validatePublishable(item) {
    const requiredText = ["pinyin", "meaningVietnamese", "radical"];
    const missing = requiredText.filter((field) => !String(item[field] || "").trim());
    if (missing.length) {
      throw new CharacterServiceError(
        409,
        `Complete generated character fields before publishing: ${missing.join(", ")}`,
      );
    }
    const data = await dataLoader(item.strokeDataKey);
    if (data.strokes.length !== item.strokeCount) {
      throw new CharacterServiceError(
        409,
        `strokeCount must match the ${data.strokes.length} strokes in the selected stroke data`,
      );
    }
    return data;
  }

  async function score(item, input) {
    const { strokes } = validateCharacterAttempt(input);
    const data = await dataLoader(item.strokeDataKey);
    return scoreCharacterStrokes(strokes, normalizeHanziMedians(data.medians));
  }

  async function updateOne(id, input) {
    requireId(repository, id);
    const current = await repository.find(id);
    if (!current) throw new CharacterServiceError(404, "Character not found");
    const validated = validateCharacter(input, { partial: true });
    if (validated.lessonId !== undefined) {
      await requireLesson(validated.lessonId);
      validated.lessonId = validated.lessonId
        ? repository.toObjectId(validated.lessonId)
        : null;
    }
    const attempts = await repository.countAttempts(id);
    if (
      attempts &&
      ["simplified", "strokeDataKey", "strokeCount"].some(
        (field) =>
          validated[field] !== undefined &&
          String(validated[field]) !== String(current[field]),
      )
    ) {
      throw new CharacterServiceError(
        409,
        "A practiced character cannot change its glyph or stroke reference",
      );
    }
    const candidate = { ...current, ...validated };
    if (candidate.status === "published") await validatePublishable(candidate);
    try {
      const item = await repository.update(id, {
        ...validated,
        updatedAt: new Date(),
      });
      if (!item) throw new CharacterServiceError(404, "Character not found");
      return serializeCharacter(item);
    } catch (error) {
      if (error?.code === 11000) {
        throw new CharacterServiceError(
          409,
          "This simplified character already exists",
        );
      }
      throw error;
    }
  }

  async function deleteOne(id) {
    requireId(repository, id);
    const item = await repository.find(id);
    if (!item) throw new CharacterServiceError(404, "Character not found");
    if (item.status === "published") {
      throw new CharacterServiceError(
        409,
        "Unpublish character before deleting it",
      );
    }
    if (await repository.countAttempts(id)) {
      throw new CharacterServiceError(
        409,
        "Practiced characters cannot be deleted",
      );
    }
    const result = await repository.delete(id);
    if (!result.deletedCount)
      throw new CharacterServiceError(404, "Character not found");
  }

  return {
    async listPublic(input = {}) {
      const query = validateCharacterListQuery(input);
      const filter = { status: "published" };
      if (query.hskLevel) filter.hskLevel = query.hskLevel;
      if (query.lessonId)
        filter.lessonId = repository.toObjectId(query.lessonId);
      if (query.search) {
        const regex = new RegExp(escapeRegex(query.search), "i");
        filter.$or = [
          { simplified: regex },
          { traditional: regex },
          { pinyin: regex },
          { meaningVietnamese: regex },
          { radical: regex },
        ];
      }
      const total = await repository.count(filter);
      const items = await repository.listPage(filter, {
        skip: (query.page - 1) * query.pageSize,
        limit: query.pageSize,
      });
      return {
        data: items.map(serializeCharacter),
        pagination: pagination(query.page, query.pageSize, total),
      };
    },
    async listAdmin(input = {}) {
      const query = validateCharacterListQuery(input, {
        defaultPageSize: 5,
        allowDates: true,
      });
      const filter = { ...parseDateRange(query) };
      if (query.status) filter.status = query.status;
      if (query.hskLevel) filter.hskLevel = query.hskLevel;
      if (query.search) {
        const regex = new RegExp(escapeRegex(query.search), "i");
        filter.$or = [
          { simplified: regex },
          { traditional: regex },
          { pinyin: regex },
          { meaningVietnamese: regex },
          { radical: regex },
        ];
      }
      const total = await repository.count(filter);
      const items = await repository.listPage(filter, {
        skip: (query.page - 1) * query.pageSize,
        limit: query.pageSize,
      });
      return {
        data: items.map(serializeCharacter),
        pagination: pagination(query.page, query.pageSize, total),
      };
    },
    async getPublic(identifier) {
      return serializeCharacter(await requirePublicCharacter(identifier));
    },
    async getAdmin(id) {
      requireId(repository, id);
      const item = await repository.find(id);
      if (!item) throw new CharacterServiceError(404, "Character not found");
      return serializeCharacter(item);
    },
    async getStrokeData(identifier) {
      const item = await requirePublicCharacter(identifier);
      return {
        character: item.strokeDataKey,
        data: await dataLoader(item.strokeDataKey),
      };
    },
    async create(input) {
      const validated = validateCharacter(input);
      await requireLesson(validated.lessonId);
      const now = new Date();
      const document = {
        ...validated,
        lessonId: validated.lessonId
          ? repository.toObjectId(validated.lessonId)
          : null,
        createdAt: now,
        updatedAt: now,
      };
      if (document.status === "published") await validatePublishable(document);
      try {
        return serializeCharacter(await repository.create(document));
      } catch (error) {
        if (error?.code === 11000) {
          throw new CharacterServiceError(
            409,
            "This simplified character already exists",
          );
        }
        throw error;
      }
    },
    update: updateOne,
    delete: deleteOne,
    async bulkStatus(input) {
      const ids = validateBulkInput(input, { allowStatus: true });
      if (!["draft", "published"].includes(input.status)) {
        throw new CharacterValidationError("status must be draft or published");
      }
      const result = { succeeded: [], failed: [] };
      for (const id of ids) {
        try {
          await updateOne(id, { status: input.status });
          result.succeeded.push(id);
        } catch (error) {
          result.failed.push({ id, message: error.message });
        }
      }
      return result;
    },
    async bulkDelete(input) {
      const ids = validateBulkInput(input);
      const result = { succeeded: [], failed: [] };
      for (const id of ids) {
        try {
          await deleteOne(id);
          result.succeeded.push(id);
        } catch (error) {
          result.failed.push({ id, message: error.message });
        }
      }
      return result;
    },
    async compare(identifier, input) {
      return score(await requirePublicCharacter(identifier), input);
    },
    async submitAttempt(user, characterId, input) {
      requireStudent(user);
      requireId(repository, characterId, "characterId");
      const item = await repository.find(characterId, { status: "published" });
      if (!item) throw new CharacterServiceError(404, "Character not found");
      const result = await score(item, input);
      const now = new Date();
      const attempt = await repository.createAttempt({
        userId: repository.toObjectId(user._id),
        characterId: repository.toObjectId(item._id),
        score: result.score,
        strokeCount: result.strokeCount,
        summary: {
          expectedStrokeCount: result.expectedStrokeCount,
          level: result.level,
          feedback: result.feedback,
        },
        createdAt: now,
      });
      return serializeAttempt(attempt);
    },
    async getAttemptSummary(user, characterId) {
      requireStudent(user);
      requireId(repository, characterId, "characterId");
      const summary = await repository.getOwnAttemptSummary(user._id, characterId);
      return {
        count: summary.count,
        latest: summary.latest ? serializeAttempt(summary.latest) : null,
        best: summary.best ? serializeAttempt(summary.best) : null,
      };
    },
    async getOwnAttempt(user, attemptId) {
      requireStudent(user);
      requireId(repository, attemptId, "attemptId");
      const attempt = await repository.findOwnAttempt(user._id, attemptId);
      if (!attempt)
        throw new CharacterServiceError(404, "Practice attempt not found");
      return serializeAttempt(attempt);
    },
  };
}

export const characterService = createCharacterService();
