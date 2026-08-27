import { randomUUID } from "node:crypto";
import { getCollection } from "../../config/db.js";
import { destroyAsset } from "../../utils/cloudinary.js";
import { toObjectId } from "../../utils/objectId.js";

const TYPES = Object.freeze({
  course: { collection: "courses", label: "Khóa học" },
  unit: { collection: "units", label: "Chương học" },
  lesson: { collection: "lessons", label: "Bài học" },
  vocabulary: { collection: "vocabularies", label: "Từ vựng" },
  quiz: { collection: "quizzes", label: "Quiz" },
  character: { collection: "characters", label: "Hán tự" },
  post: { collection: "posts", label: "Blog" },
  job: { collection: "jobs", label: "Tuyển dụng" },
});

const TRASHED_COLLECTIONS = [
  "courses",
  "units",
  "lessons",
  "vocabularies",
  "quizzes",
  "quiz_questions",
  "characters",
  "posts",
  "jobs",
];

export class TrashServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requireType(type) {
  const value = TYPES[String(type || "").trim()];
  if (!value) throw new TrashServiceError(400, "Unsupported trash item type");
  return value;
}

function requireId(value) {
  const id = toObjectId(value);
  if (!id) throw new TrashServiceError(400, "Invalid id");
  return id;
}

function activeFilter() {
  return { deletedAt: { $exists: false } };
}

function titleOf(item, type) {
  return (
    item?.title ||
    item?.simplified ||
    item?.name ||
    item?.slug ||
    `${TYPES[type]?.label || type} ${String(item?._id || "")}`
  );
}

function blockPublicIds(blocks = []) {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block) => {
    if (block?.type === "image") return block.publicId ? [block.publicId] : [];
    if (block?.type === "gallery" && Array.isArray(block.images)) {
      return block.images.map((image) => image?.publicId).filter(Boolean);
    }
    return [];
  });
}

function contentPublicIds(item = {}) {
  return [
    item.imagePublicId,
    ...(Array.isArray(item.imagePublicIds) ? item.imagePublicIds : []),
    ...blockPublicIds(item.contentBlocks),
  ].filter(Boolean);
}

async function cleanupContentAssets(batchId) {
  const publicIds = [];
  for (const name of ["posts", "jobs"]) {
    const rows = await (await getCollection(name))
      .find(
        { trashBatchId: batchId },
        { projection: { imagePublicId: 1, imagePublicIds: 1, contentBlocks: 1 } },
      )
      .toArray();
    publicIds.push(...rows.flatMap(contentPublicIds));
  }
  await Promise.all(
    [...new Set(publicIds)].map(async (publicId) => {
      try {
        await destroyAsset(publicId);
      } catch (error) {
        console.error("Unable to remove trashed Cloudinary asset:", error.message);
      }
    }),
  );
}

async function ids(collectionName, filter) {
  return (await getCollection(collectionName))
    .find(filter, { projection: { _id: 1 } })
    .toArray()
    .then((rows) => rows.map((row) => row._id));
}

async function markMany(
  collectionName,
  filter,
  metadata,
  { draft = false, unpublished = false } = {},
) {
  const collection = await getCollection(collectionName);
  const rows = await collection.find(filter).toArray();
  if (!rows.length) return [];
  for (const row of rows) {
    const set = { ...metadata };
    if (draft && row.status !== undefined) {
      set.trashPreviousStatus = row.status;
      set.status = "draft";
    }
    if (unpublished && row.published !== undefined) {
      set.trashPreviousPublished = row.published;
      set.published = false;
    }
    await collection.updateOne({ _id: row._id }, { $set: set });
  }
  return rows;
}

async function hierarchy(type, rootId) {
  const result = {
    courses: [],
    units: [],
    lessons: [],
    vocabularies: [],
    quizzes: [],
    quizQuestions: [],
  };

  if (type === "course") {
    result.courses = [rootId];
    result.units = await ids("units", { courseId: rootId, ...activeFilter() });
  } else if (type === "unit") {
    result.units = [rootId];
  }

  if (["course", "unit"].includes(type)) {
    result.lessons = result.units.length
      ? await ids("lessons", { unitId: { $in: result.units }, ...activeFilter() })
      : [];
  } else if (type === "lesson") {
    result.lessons = [rootId];
  }

  if (["course", "unit", "lesson"].includes(type)) {
    if (result.lessons.length) {
      [result.vocabularies, result.quizzes] = await Promise.all([
        ids("vocabularies", {
          lessonId: { $in: result.lessons },
          ...activeFilter(),
        }),
        ids("quizzes", {
          lessonId: { $in: result.lessons },
          ...activeFilter(),
        }),
      ]);
      result.quizQuestions = result.quizzes.length
        ? await ids("quiz_questions", {
            quizId: { $in: result.quizzes },
            ...activeFilter(),
          })
        : [];
    }
  } else if (type === "vocabulary") {
    result.vocabularies = [rootId];
  } else if (type === "quiz") {
    result.quizzes = [rootId];
    result.quizQuestions = await ids("quiz_questions", {
      quizId: rootId,
      ...activeFilter(),
    });
  }

  return result;
}

async function impactFor(graph, type, rootId) {
  const counts = {
    courses: graph.courses.length,
    units: graph.units.length,
    lessons: graph.lessons.length,
    vocabularies: graph.vocabularies.length,
    quizzes: graph.quizzes.length,
    quizQuestions: graph.quizQuestions.length,
    enrollments: 0,
    lessonProgress: 0,
    vocabularyProgress: 0,
    vocabularyReviewHistory: 0,
    quizAttempts: 0,
    characterAttempts: 0,
  };

  const jobs = [];
  if (graph.courses.length) {
    jobs.push(
      getCollection("enrollments")
        .then((collection) =>
          collection.countDocuments({ courseId: { $in: graph.courses } }),
        )
        .then((count) => {
          counts.enrollments = count;
        }),
    );
  }
  if (graph.lessons.length) {
    jobs.push(
      getCollection("lesson_progress")
        .then((collection) =>
          collection.countDocuments({ lessonId: { $in: graph.lessons } }),
        )
        .then((count) => {
          counts.lessonProgress = count;
        }),
    );
  }
  if (graph.vocabularies.length) {
    jobs.push(
      getCollection("vocabulary_progress")
        .then((collection) =>
          collection.countDocuments({
            vocabularyId: { $in: graph.vocabularies },
          }),
        )
        .then((count) => {
          counts.vocabularyProgress = count;
        }),
      getCollection("vocabulary_review_history")
        .then((collection) =>
          collection.countDocuments({
            vocabularyId: { $in: graph.vocabularies },
          }),
        )
        .then((count) => {
          counts.vocabularyReviewHistory = count;
        }),
    );
  }
  if (graph.quizzes.length) {
    jobs.push(
      getCollection("quiz_attempts")
        .then((collection) =>
          collection.countDocuments({ quizId: { $in: graph.quizzes } }),
        )
        .then((count) => {
          counts.quizAttempts = count;
        }),
    );
  }
  if (type === "character") {
    jobs.push(
      getCollection("character_practice_attempts")
        .then((collection) => collection.countDocuments({ characterId: rootId }))
        .then((count) => {
          counts.characterAttempts = count;
        }),
    );
  }
  await Promise.all(jobs);
  return counts;
}

async function markHierarchy(graph, metadata) {
  const jobs = [];
  if (graph.courses.length)
    jobs.push(
      markMany("courses", { _id: { $in: graph.courses } }, metadata, {
        draft: true,
      }),
    );
  if (graph.units.length)
    jobs.push(markMany("units", { _id: { $in: graph.units } }, metadata));
  if (graph.lessons.length)
    jobs.push(
      markMany("lessons", { _id: { $in: graph.lessons } }, metadata, {
        draft: true,
      }),
    );
  if (graph.vocabularies.length)
    jobs.push(
      markMany(
        "vocabularies",
        { _id: { $in: graph.vocabularies } },
        metadata,
        { draft: true },
      ),
    );
  if (graph.quizzes.length)
    jobs.push(
      markMany("quizzes", { _id: { $in: graph.quizzes } }, metadata, {
        draft: true,
      }),
    );
  if (graph.quizQuestions.length)
    jobs.push(
      markMany(
        "quiz_questions",
        { _id: { $in: graph.quizQuestions } },
        metadata,
      ),
    );
  await Promise.all(jobs);
}

async function restoreBatch(batchId) {
  let restored = 0;
  for (const name of TRASHED_COLLECTIONS) {
    const collection = await getCollection(name);
    const rows = await collection.find({ trashBatchId: batchId }).toArray();
    for (const row of rows) {
      const set = { updatedAt: new Date() };
      if (
        ["courses", "lessons", "vocabularies", "quizzes", "characters"].includes(
          name,
        )
      ) {
        set.status = "draft";
      }
      if (["posts", "jobs"].includes(name)) set.published = false;
      await collection.updateOne(
        { _id: row._id },
        {
          $set: set,
          $unset: {
            deletedAt: "",
            deletedBy: "",
            trashBatchId: "",
            trashRoot: "",
            trashType: "",
            trashLabel: "",
            trashImpact: "",
            trashPreviousStatus: "",
            trashPreviousPublished: "",
          },
        },
      );
      restored += 1;
    }
  }
  return restored;
}

async function batchGraph(batchId) {
  const result = {};
  for (const [key, collectionName] of Object.entries({
    courses: "courses",
    units: "units",
    lessons: "lessons",
    vocabularies: "vocabularies",
    quizzes: "quizzes",
    quizQuestions: "quiz_questions",
    characters: "characters",
  })) {
    result[key] = await ids(collectionName, { trashBatchId: batchId });
  }
  return result;
}

async function purgeBatch(batchId) {
  const graph = await batchGraph(batchId);

  await cleanupContentAssets(batchId);

  if (graph.courses.length) {
    await (await getCollection("enrollments")).deleteMany({
      courseId: { $in: graph.courses },
    });
  }
  if (graph.lessons.length) {
    await (await getCollection("lesson_progress")).deleteMany({
      lessonId: { $in: graph.lessons },
    });
    await (await getCollection("characters")).updateMany(
      { lessonId: { $in: graph.lessons }, deletedAt: { $exists: false } },
      { $set: { lessonId: null, updatedAt: new Date() } },
    );
  }
  if (graph.vocabularies.length) {
    await Promise.all([
      getCollection("vocabulary_progress").then((collection) =>
        collection.deleteMany({ vocabularyId: { $in: graph.vocabularies } }),
      ),
      getCollection("vocabulary_review_history").then((collection) =>
        collection.deleteMany({ vocabularyId: { $in: graph.vocabularies } }),
      ),
    ]);
  }
  if (graph.quizzes.length) {
    await (await getCollection("quiz_attempts")).deleteMany({
      quizId: { $in: graph.quizzes },
    });
  }
  if (graph.characters.length) {
    await (await getCollection("character_practice_attempts")).deleteMany({
      characterId: { $in: graph.characters },
    });
    await (await getCollection("vocabularies")).updateMany(
      { characterIds: { $in: graph.characters } },
      { $pull: { characterIds: { $in: graph.characters } } },
    );
  }

  let deleted = 0;
  for (const name of [
    "quiz_questions",
    "quizzes",
    "vocabularies",
    "lessons",
    "units",
    "courses",
    "characters",
    "posts",
    "jobs",
  ]) {
    const result = await (await getCollection(name)).deleteMany({
      trashBatchId: batchId,
    });
    deleted += result.deletedCount || 0;
  }
  return deleted;
}

export const trashService = {
  async move(type, id, user) {
    const config = requireType(type);
    const rootId = requireId(id);
    const collection = await getCollection(config.collection);
    const root = await collection.findOne({ _id: rootId, ...activeFilter() });
    if (!root) throw new TrashServiceError(404, `${config.label} not found`);

    const batchId = randomUUID();
    const deletedAt = new Date();
    const metadata = {
      deletedAt,
      deletedBy: user?._id || user?.id || null,
      trashBatchId: batchId,
    };
    const graph = await hierarchy(type, rootId);
    const impact = await impactFor(graph, type, rootId);

    if (["course", "unit", "lesson", "vocabulary", "quiz"].includes(type)) {
      await markHierarchy(graph, metadata);
    } else if (type === "character") {
      await markMany("characters", { _id: rootId }, metadata, { draft: true });
    } else {
      await markMany(config.collection, { _id: rootId }, metadata, {
        unpublished: true,
      });
    }

    await collection.updateOne(
      { _id: rootId },
      {
        $set: {
          trashRoot: true,
          trashType: type,
          trashLabel: titleOf(root, type),
          trashImpact: impact,
        },
      },
    );

    return { id: String(rootId), type, batchId, deletedAt, impact };
  },

  async list(filters = {}) {
    const type = String(filters.type || "").trim();
    if (type) requireType(type);
    const search = String(filters.search || "")
      .trim()
      .toLocaleLowerCase("vi");
    const pageSize = Math.min(50, Math.max(1, Number(filters.pageSize) || 10));
    const requestedPage = Math.max(1, Number(filters.page) || 1);
    const rows = [];

    for (const [itemType, config] of Object.entries(TYPES)) {
      if (type && type !== itemType) continue;
      const items = await (await getCollection(config.collection))
        .find({ trashRoot: true, deletedAt: { $exists: true } })
        .sort({ deletedAt: -1, _id: -1 })
        .toArray();
      for (const item of items) {
        const label = item.trashLabel || titleOf(item, itemType);
        if (search && !label.toLocaleLowerCase("vi").includes(search)) continue;
        rows.push({
          id: String(item._id),
          type: itemType,
          typeLabel: config.label,
          label,
          deletedAt: item.deletedAt,
          deletedBy: item.deletedBy ? String(item.deletedBy) : null,
          batchId: item.trashBatchId,
          impact: item.trashImpact || {},
        });
      }
    }

    rows.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    return {
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      pagination: { page, pageSize, total, totalPages },
    };
  },

  async restore(type, id) {
    const config = requireType(type);
    const rootId = requireId(id);
    const root = await (await getCollection(config.collection)).findOne({
      _id: rootId,
      trashRoot: true,
      deletedAt: { $exists: true },
    });
    if (!root) throw new TrashServiceError(404, "Trash item not found");
    const restored = await restoreBatch(root.trashBatchId);
    return { restored };
  },

  async purge(type, id) {
    const config = requireType(type);
    const rootId = requireId(id);
    const root = await (await getCollection(config.collection)).findOne({
      _id: rootId,
      trashRoot: true,
      deletedAt: { $exists: true },
    });
    if (!root) throw new TrashServiceError(404, "Trash item not found");
    const deleted = await purgeBatch(root.trashBatchId);
    return { deleted };
  },

  async empty() {
    const roots = [];
    for (const config of Object.values(TYPES)) {
      const items = await (await getCollection(config.collection))
        .find(
          { trashRoot: true, deletedAt: { $exists: true } },
          { projection: { trashBatchId: 1 } },
        )
        .toArray();
      roots.push(...items);
    }
    let deleted = 0;
    for (const batchId of [
      ...new Set(roots.map((item) => item.trashBatchId).filter(Boolean)),
    ]) {
      deleted += await purgeBatch(batchId);
    }
    return { deleted };
  },
};
