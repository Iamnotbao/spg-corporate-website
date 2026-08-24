import { getCollection } from "../../config/db.js";
import { LEARNING_COLLECTIONS } from "../learning/learning.constants.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeQuery(input = {}) {
  const q = String(input.q || input.search || "").trim().slice(0, 80);
  const limit = Math.min(8, Math.max(1, Number(input.limit) || 5));
  return { q, limit };
}

function textFilter(fields, q) {
  const regex = new RegExp(escapeRegex(q), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
}

function idString(value) {
  return value ? String(value) : "";
}

export async function searchPublicContent(input = {}) {
  const { q, limit } = normalizeQuery(input);
  if (!q) {
    return {
      query: "",
      groups: { courses: [], lessons: [], vocabulary: [], characters: [], posts: [] },
    };
  }

  const [coursesCollection, unitsCollection, lessonsCollection, vocabularyCollection, charactersCollection, postsCollection] =
    await Promise.all([
      getCollection(LEARNING_COLLECTIONS.courses),
      getCollection(LEARNING_COLLECTIONS.units),
      getCollection(LEARNING_COLLECTIONS.lessons),
      getCollection("vocabularies"),
      getCollection("characters"),
      getCollection("posts"),
    ]);

  const [courses, lessons, vocabulary, characters, posts] = await Promise.all([
    coursesCollection
      .find({ status: "published", ...textFilter(["title", "slug", "description", "level"], q) })
      .sort({ order: 1, title: 1 })
      .limit(limit)
      .toArray(),
    lessonsCollection
      .find({
        status: "published",
        ...textFilter(["title", "slug", "description", "content", "type"], q),
      })
      .sort({ order: 1, title: 1 })
      .limit(limit * 2)
      .toArray(),
    vocabularyCollection
      .find({
        status: "published",
        ...textFilter(
          [
            "simplified",
            "traditional",
            "pinyin",
            "meaningVietnamese",
            "meaningEnglish",
            "exampleChinese",
          ],
          q,
        ),
      })
      .sort({ hskLevel: 1, simplified: 1 })
      .limit(limit)
      .toArray(),
    charactersCollection
      .find({
        status: "published",
        ...textFilter(
          ["simplified", "traditional", "pinyin", "meaningVietnamese", "meaningEnglish", "radical"],
          q,
        ),
      })
      .sort({ hskLevel: 1, simplified: 1 })
      .limit(limit)
      .toArray(),
    postsCollection
      .find({
        published: { $ne: false },
        ...textFilter(["title", "summary", "description", "content"], q),
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray(),
  ]);

  const unitIds = [...new Set(lessons.map((item) => idString(item.unitId)).filter(Boolean))];
  const units = unitIds.length
    ? await unitsCollection
        .find({ _id: { $in: unitIds.map((id) => lessonsCollection.s?.db?.bsonOptions ? id : id) } })
        .toArray()
        .catch(() => [])
    : [];

  // Mongo ObjectIds cannot be reconstructed safely from string without the shared utility,
  // so use the original ids collected from lessons for the actual lookup.
  const rawUnitIds = [...new Map(lessons.filter((item) => item.unitId).map((item) => [String(item.unitId), item.unitId])).values()];
  const resolvedUnits = rawUnitIds.length
    ? await unitsCollection.find({ _id: { $in: rawUnitIds } }).toArray()
    : units;
  const unitById = new Map(resolvedUnits.map((item) => [String(item._id), item]));
  const rawCourseIds = [
    ...new Map(
      resolvedUnits
        .filter((item) => item.courseId)
        .map((item) => [String(item.courseId), item.courseId]),
    ).values(),
  ];
  const lessonCourses = rawCourseIds.length
    ? await coursesCollection
        .find({ _id: { $in: rawCourseIds }, status: "published" })
        .toArray()
    : [];
  const courseById = new Map(lessonCourses.map((item) => [String(item._id), item]));

  const lessonResults = lessons
    .map((item) => {
      const unit = unitById.get(String(item.unitId));
      const course = unit ? courseById.get(String(unit.courseId)) : null;
      if (!unit || !course) return null;
      return {
        id: idString(item._id),
        type: "lesson",
        title: item.title,
        subtitle: `${course.title} · ${unit.title}${item.type ? ` · ${item.type}` : ""}`,
        url: `/courses/${encodeURIComponent(course.slug)}/lessons/${encodeURIComponent(item.slug)}`,
      };
    })
    .filter(Boolean)
    .slice(0, limit);

  return {
    query: q,
    groups: {
      courses: courses.map((item) => ({
        id: idString(item._id),
        type: "course",
        title: item.title,
        subtitle: [item.level, item.description].filter(Boolean).join(" · "),
        url: `/courses/${encodeURIComponent(item.slug)}`,
      })),
      lessons: lessonResults,
      vocabulary: vocabulary.map((item) => ({
        id: idString(item._id),
        type: "vocabulary",
        title: item.simplified,
        subtitle: [item.pinyin, item.meaningVietnamese, item.hskLevel].filter(Boolean).join(" · "),
        url: `/vocabulary?search=${encodeURIComponent(item.simplified)}`,
      })),
      characters: characters.map((item) => ({
        id: idString(item._id),
        type: "character",
        title: item.simplified,
        subtitle: [item.pinyin, item.meaningVietnamese, item.radical].filter(Boolean).join(" · "),
        url: `/characters/${encodeURIComponent(item.simplified)}/practice`,
      })),
      posts: posts.map((item) => ({
        id: idString(item._id),
        type: "post",
        title: item.title || "Bài viết",
        subtitle: item.summary || item.description || "Blog Mandora",
        url: `/blog/${encodeURIComponent(idString(item._id))}`,
      })),
    },
  };
}
