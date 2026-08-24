const DATA_VERSION = "2.0.1";
const DATA_BASE_URL = `https://cdn.jsdelivr.net/npm/hanzi-writer-data@${DATA_VERSION}`;
const cache = new Map();

function validData(value) {
  return (
    value &&
    Array.isArray(value.strokes) &&
    value.strokes.length > 0 &&
    Array.isArray(value.medians) &&
    value.medians.length === value.strokes.length
  );
}

export class CharacterDataError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function loadCharacterData(character) {
  if (cache.has(character)) return cache.get(character);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(
      `${DATA_BASE_URL}/${encodeURIComponent(character)}.json`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    );
    if (response.status === 404) {
      throw new CharacterDataError(
        422,
        "Stroke-order data is unavailable for this character",
      );
    }
    if (!response.ok)
      throw new Error(`Hanzi data responded ${response.status}`);
    const data = await response.json();
    if (!validData(data)) {
      throw new CharacterDataError(502, "Stroke-order data is invalid");
    }
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    cache.set(character, data);
    return data;
  } catch (error) {
    if (error instanceof CharacterDataError) throw error;
    throw new CharacterDataError(
      503,
      "Stroke-order data is temporarily unavailable",
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const characterDataSource = Object.freeze({
  package: "hanzi-writer-data",
  version: DATA_VERSION,
  license: "Arphic Public License",
});
