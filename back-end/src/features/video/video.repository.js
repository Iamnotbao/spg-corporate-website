import { getCollection } from "../../config/db.js";
import { toObjectId } from "../../utils/objectId.js";

const COLLECTION = "learning_videos";
let indexPromise;
export async function ensureVideoIndexes() {
  if (!indexPromise) indexPromise = getCollection(COLLECTION).then((collection) => Promise.all([
    collection.createIndex({ status: 1, hskLevel: 1, order: 1, _id: 1 }),
    collection.createIndex({ featured: 1, status: 1, updatedAt: -1 }),
  ])).catch((error) => { indexPromise = undefined; throw error; });
  return indexPromise;
}
async function videos() { await ensureVideoIndexes(); return getCollection(COLLECTION); }
export const videoRepository = {
  async list(filter, { skip, limit }) { return (await videos()).find(filter).sort({ order: 1, createdAt: -1, _id: 1 }).skip(skip).limit(limit).toArray(); },
  async count(filter) { return (await videos()).countDocuments(filter); },
  async find(id, filter = {}) { return (await videos()).findOne({ _id: toObjectId(id) || null, ...filter }); },
  async create(document) { const result = await (await videos()).insertOne(document); return { ...document, _id: result.insertedId }; },
  async update(id, update) { return (await videos()).findOneAndUpdate({ _id: toObjectId(id) || null }, { $set: update }, { returnDocument: "after" }); },
  async clearFeatured(exceptId) { return (await videos()).updateMany({ _id: { $ne: toObjectId(exceptId) }, featured: true }, { $set: { featured: false, updatedAt: new Date() } }); },
  async delete(id) { return (await videos()).deleteOne({ _id: toObjectId(id) || null }); },
  toObjectId,
};
