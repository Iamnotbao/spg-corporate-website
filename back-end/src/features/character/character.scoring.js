const SAMPLE_POINTS = 24;

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function length(points) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += distance(points[index - 1], points[index]);
  }
  return total;
}

function resample(points, count = SAMPLE_POINTS) {
  if (!points.length) return [];
  if (points.length === 1)
    return Array.from({ length: count }, () => points[0]);
  const total = length(points);
  if (!total) return Array.from({ length: count }, () => points[0]);
  const cumulative = [0];
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(
      cumulative[index - 1] + distance(points[index - 1], points[index]),
    );
  }
  return Array.from({ length: count }, (_, sampleIndex) => {
    const target = (sampleIndex / (count - 1)) * total;
    let segment = 1;
    while (segment < cumulative.length - 1 && cumulative[segment] < target)
      segment += 1;
    const start = points[segment - 1];
    const end = points[segment];
    const span = cumulative[segment] - cumulative[segment - 1] || 1;
    const ratio = (target - cumulative[segment - 1]) / span;
    return {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    };
  });
}

function center(points) {
  if (!points.length) return { x: 0.5, y: 0.5 };
  return points.reduce(
    (result, point) => ({
      x: result.x + point.x / points.length,
      y: result.y + point.y / points.length,
    }),
    { x: 0, y: 0 },
  );
}

function clampScore(value) {
  return Math.max(0, Math.min(1, value));
}

function compareStroke(actual, target) {
  const sampledActual = resample(actual);
  const sampledTarget = resample(target);
  if (!sampledActual.length || !sampledTarget.length) {
    return { total: 0, trajectory: 0, endpoints: 0, shape: 0, placement: 0 };
  }
  const meanDistance =
    sampledActual.reduce(
      (sum, point, index) => sum + distance(point, sampledTarget[index]),
      0,
    ) / sampledActual.length;
  const startDistance = distance(sampledActual[0], sampledTarget[0]);
  const endDistance = distance(sampledActual.at(-1), sampledTarget.at(-1));
  const actualLength = length(sampledActual);
  const targetLength = Math.max(length(sampledTarget), 0.001);
  const lengthRatio = actualLength / targetLength;
  const actualCenter = center(sampledActual);
  const targetCenter = center(sampledTarget);
  const centerDistance = distance(actualCenter, targetCenter);
  const trajectory = clampScore(1 - meanDistance / 0.24);
  const endpoints = clampScore(1 - (startDistance + endDistance) / 0.52);
  const shape = clampScore(
    1 - Math.abs(Math.log(Math.max(lengthRatio, 0.01))) / 1.1,
  );
  const placement = clampScore(1 - centerDistance / 0.24);
  return {
    total:
      trajectory * 0.45 + endpoints * 0.25 + shape * 0.15 + placement * 0.15,
    trajectory,
    endpoints,
    shape,
    placement,
    lengthRatio,
    centerDelta: {
      x: actualCenter.x - targetCenter.x,
      y: actualCenter.y - targetCenter.y,
    },
  };
}

function feedbackItem(code, message, severity = "warning", strokeNumber) {
  return { code, message, severity, ...(strokeNumber ? { strokeNumber } : {}) };
}

export function normalizeHanziMedians(medians = []) {
  return medians.map((stroke) =>
    stroke.map(([x, y]) => ({ x: Number(x) / 1024, y: 1 - Number(y) / 1024 })),
  );
}

export function scoreCharacterStrokes(actualStrokes, targetStrokes) {
  const actual = Array.isArray(actualStrokes) ? actualStrokes : [];
  const target = Array.isArray(targetStrokes) ? targetStrokes : [];
  if (!target.length) throw new Error("Target character has no stroke medians");
  const feedback = [];
  const difference = actual.length - target.length;
  if (difference < 0) {
    feedback.push(
      feedbackItem(
        "missing_strokes",
        `Bạn còn thiếu ${Math.abs(difference)} nét.`,
      ),
    );
  } else if (difference > 0) {
    feedback.push(
      feedbackItem("extra_strokes", `Bạn đã viết thừa ${difference} nét.`),
    );
  } else {
    feedback.push(
      feedbackItem("correct_stroke_count", "Số nét đã đúng.", "success"),
    );
  }

  const comparableCount = Math.min(actual.length, target.length);
  const comparisons = [];
  for (let index = 0; index < comparableCount; index += 1) {
    const result = compareStroke(actual[index], target[index]);
    comparisons.push(result);
    const candidates = target.map(
      (candidate) => compareStroke(actual[index], candidate).total,
    );
    const bestIndex = candidates.indexOf(Math.max(...candidates));
    if (bestIndex !== index && candidates[bestIndex] > result.total + 0.12) {
      feedback.push(
        feedbackItem(
          "stroke_order_mismatch",
          `Nét ${index + 1} giống nét ${bestIndex + 1} hơn; hãy kiểm tra lại thứ tự.`,
          "warning",
          index + 1,
        ),
      );
      continue;
    }
    if (result.endpoints < 0.55) {
      feedback.push(
        feedbackItem(
          "endpoints_off",
          `Điểm đầu hoặc cuối của nét ${index + 1} chưa khớp.`,
          "warning",
          index + 1,
        ),
      );
    } else if (result.trajectory < 0.55) {
      feedback.push(
        feedbackItem(
          "trajectory_off",
          `Đường đi của nét ${index + 1} còn lệch.`,
          "warning",
          index + 1,
        ),
      );
    } else if (result.shape < 0.55) {
      feedback.push(
        feedbackItem(
          "shape_off",
          `Độ dài hoặc hình dáng nét ${index + 1} chưa cân đối.`,
          "warning",
          index + 1,
        ),
      );
    }
    if (
      Math.abs(result.centerDelta?.x || 0) > 0.14 ||
      Math.abs(result.centerDelta?.y || 0) > 0.14
    ) {
      const horizontal =
        result.centerDelta.x < -0.14
          ? "sang phải"
          : result.centerDelta.x > 0.14
            ? "sang trái"
            : "";
      const vertical =
        result.centerDelta.y < -0.14
          ? "xuống dưới"
          : result.centerDelta.y > 0.14
            ? "lên trên"
            : "";
      feedback.push(
        feedbackItem(
          "placement_off",
          `Dịch nét ${index + 1} ${[horizontal, vertical].filter(Boolean).join(" và ")}.`,
          "warning",
          index + 1,
        ),
      );
    }
  }

  const countScore = clampScore(1 - Math.abs(difference) / target.length);
  const strokeScore = comparisons.length
    ? comparisons.reduce((sum, item) => sum + item.total, 0) / target.length
    : 0;
  const score = Math.round((countScore * 0.25 + strokeScore * 0.75) * 100);
  if (score >= 90 && feedback.every((item) => item.severity === "success")) {
    feedback.push(
      feedbackItem(
        "excellent",
        "Nét viết, thứ tự và vị trí đều rất sát mẫu.",
        "success",
      ),
    );
  }
  return {
    score,
    strokeCount: actual.length,
    expectedStrokeCount: target.length,
    level:
      score >= 90
        ? "excellent"
        : score >= 70
          ? "good"
          : score >= 45
            ? "keep_practicing"
            : "try_again",
    feedback: feedback.slice(0, 6),
  };
}
