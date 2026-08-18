import { getCollection } from "../config/db.js";
import { toObjectId } from "../utils/objectId.js";

export async function listJobs(_, res) {
  const collection = await getCollection("jobs");
  const jobs = await collection
    .find({ published: { $ne: false } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ data: jobs, source: "mongodb" });
}

export async function listPosts(_, res) {
  const collection = await getCollection("posts");
  const posts = await collection
    .find({ published: { $ne: false } })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ data: posts, source: "mongodb" });
}

export async function getPublicItem(collectionName, req, res) {
  const id = toObjectId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const collection = await getCollection(collectionName);
  const item = await collection.findOne({
    _id: id,
    published: { $ne: false },
  });

  if (!item) {
    return res.status(404).json({ error: "Not found" });
  }

  return res.json({ data: item });
}

export async function createApplication(req, res) {
  const {
    name,
    email,
    phone = "",
    position,
    jobId = "",
    jobTitle = "",
    message = "",
    coverLetter = "",
    cvUrl = "",
    cvName = "",
    cvType = "",
    cvSize = 0,
    cvPublicId = "",
    cvFormat = "",
    cvResourceType = "",
    cvDeliveryType = "",
  } = req.body;
  const resolvedPosition = position || jobTitle;

  if (!name?.trim() || !email?.trim() || !resolvedPosition?.trim()) {
    return res.status(400).json({
      error: "name, email and position are required",
    });
  }

  const collection = await getCollection("applications");
  const result = await collection.insertOne({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    position: resolvedPosition.trim(),
    jobId,
    message: message || coverLetter,
    cvUrl,
    cvName,
    cvType,
    cvSize: Number(cvSize) || 0,
    cvPublicId,
    cvFormat,
    cvResourceType,
    cvDeliveryType,
    createdAt: new Date(),
  });

  return res.status(201).json({ ok: true, id: result.insertedId });
}
