import { aiTutorRepository } from "./ai-tutor.repository.js";

export class AiTutorContextError extends Error {
  constructor(status, message, code = "AI_CONTEXT_UNAVAILABLE") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function collectText(value, output = []) {
  if (typeof value === "string") {
    const text = value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) output.push(text);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, output));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectText(item, output));
  }
  return output;
}

function compactContent(value, max = 4000) {
  const source = String(value || "").trim();
  if (!source) return "";
  try {
    return collectText(JSON.parse(source)).join("\n").slice(0, max);
  } catch {
    return collectText(source).join("\n").slice(0, max);
  }
}

async function requirePublishedHierarchy(repository, lesson) {
  const unit = lesson && (await repository.findUnit(lesson.unitId));
  const course = unit && (await repository.findPublishedCourse(unit.courseId));
  if (!lesson || !unit || !course) {
    throw new AiTutorContextError(404, "Learning context is not available");
  }
  return { unit, course };
}

function vocabularyLine(item) {
  return [
    item.simplified,
    item.traditional && item.traditional !== item.simplified
      ? `(${item.traditional})`
      : "",
    item.pinyin,
    `- ${item.meaningVietnamese}`,
    item.exampleChinese ? `Ví dụ: ${item.exampleChinese}` : "",
    item.exampleVietnamese ? `(${item.exampleVietnamese})` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function answerText(value) {
  if (value == null) return "Không có câu trả lời";
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "object") {
    if (value.content) return String(value.content);
    if (Array.isArray(value.acceptedAnswers)) {
      return value.acceptedAnswers.join(" / ");
    }
    if (Array.isArray(value.tokens)) {
      return value.tokens
        .map((token) => token.content)
        .filter(Boolean)
        .join(" ");
    }
    return "Không có nội dung câu trả lời";
  }
  return String(value);
}

export function createAiContextResolver(repository = aiTutorRepository) {
  return async function resolveAiContext(userId, context) {
    if (context.type === "general") {
      return {
        public: { type: "general", label: "Trao đổi chung" },
        prompt: "Không có dữ liệu LMS đính kèm cho lượt hỏi này.",
      };
    }

    if (context.type === "lesson") {
      const lesson = await repository.findPublishedLesson(context.id);
      const { unit, course } = await requirePublishedHierarchy(
        repository,
        lesson,
      );
      const vocabulary = await repository.listPublishedLessonVocabulary(
        lesson._id,
      );
      const prompt = [
        `Khóa học: ${course.title}${course.level ? ` (${course.level})` : ""}`,
        `Chương: ${unit.title}`,
        `Bài học: ${lesson.title}`,
        `Loại bài: ${lesson.type}`,
        lesson.description ? `Mô tả: ${lesson.description}` : "",
        compactContent(lesson.content)
          ? `Nội dung rút gọn:\n${compactContent(lesson.content)}`
          : "",
        vocabulary.length
          ? `Từ vựng đã xuất bản:\n${vocabulary.map(vocabularyLine).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      return {
        public: {
          type: "lesson",
          id: String(lesson._id),
          label: lesson.title,
        },
        prompt: prompt.slice(0, 7000),
      };
    }

    if (context.type === "vocabulary") {
      const vocabulary = await repository.findPublishedVocabulary(context.id);
      const lesson =
        vocabulary &&
        (await repository.findPublishedLesson(vocabulary.lessonId));
      const { course } = await requirePublishedHierarchy(repository, lesson);
      return {
        public: {
          type: "vocabulary",
          id: String(vocabulary._id),
          label: vocabulary.simplified,
        },
        prompt: [
          `Khóa học: ${course.title}`,
          `Bài học: ${lesson.title}`,
          `Từ vựng: ${vocabularyLine(vocabulary)}`,
          vocabulary.examplePinyin
            ? `Pinyin ví dụ: ${vocabulary.examplePinyin}`
            : "",
          vocabulary.hskLevel ? `Cấp HSK: ${vocabulary.hskLevel}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      };
    }

    const attempt = await repository.findOwnedQuizAttempt(userId, context.id);
    if (!attempt) {
      throw new AiTutorContextError(
        404,
        "Quiz attempt is not available",
        "AI_CONTEXT_FORBIDDEN",
      );
    }
    const [quiz, lesson] = await Promise.all([
      repository.findQuiz(attempt.quizId),
      repository.findLessonSummary(attempt.lessonId),
    ]);
    const incorrect = (attempt.results || []).filter((item) => !item.correct);
    const resultLines = incorrect.map((item, index) =>
      [
        `${index + 1}. ${item.question}`,
        `Câu trả lời của học viên: ${answerText(item.submittedAnswer)}`,
        `Đáp án đúng: ${answerText(item.correctAnswer)}`,
        item.explanation ? `Giải thích đã lưu: ${item.explanation}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return {
      public: {
        type: "quizAttempt",
        id: String(attempt._id),
        label: quiz?.title || lesson?.title || "Kết quả Quiz",
      },
      prompt: [
        `Quiz: ${quiz?.title || "Quiz"}`,
        lesson?.title ? `Bài học: ${lesson.title}` : "",
        `Điểm: ${attempt.score}%`,
        `Kết quả: ${attempt.passed ? "đạt" : "chưa đạt"}`,
        incorrect.length
          ? `Các câu sai cần giải thích:\n${resultLines.join("\n\n")}`
          : "Không có câu trả lời sai trong lượt làm này.",
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 7000),
    };
  };
}

export const resolveAiContext = createAiContextResolver();
