import { getCollection } from "../../config/db.js";

let indexPromise;

async function users() {
  const collection = await getCollection("users");
  if (!indexPromise) {
    indexPromise = Promise.all([
      collection.createIndex({ username: 1 }, { unique: true }),
      collection.createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: { email: { $type: "string" } },
        },
      ),
    ]).catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  }
  await indexPromise;
  return collection;
}

export const studentAuthRepository = {
  async findByIdentifier(identifier) {
    return (await users()).findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });
  },
  async create(document) {
    const result = await (await users()).insertOne(document);
    return { ...document, _id: result.insertedId };
  },
};
