import { getCollection } from "../config/db.js";
import { destroyAsset, listImageAssets } from "../utils/cloudinary.js";

function stringId(value) {
  return String(value || "").trim();
}

function blockPublicIds(blocks = []) {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap((block) => {
    if (block?.type === "image" && block.publicId) return [block.publicId];
    if (block?.type === "gallery" && Array.isArray(block.images)) {
      return block.images.map((item) => item?.publicId).filter(Boolean);
    }
    return [];
  });
}

function itemPublicIds(item = {}) {
  return [
    item.imagePublicId,
    ...(Array.isArray(item.imagePublicIds) ? item.imagePublicIds : []),
    ...blockPublicIds(item.contentBlocks),
  ].filter(Boolean).map(stringId);
}

async function collectUsage() {
  const usage = new Map();
  const add = (publicId, label) => {
    const id = stringId(publicId);
    if (!id) return;
    const list = usage.get(id) || [];
    if (!list.includes(label)) list.push(label);
    usage.set(id, list);
  };

  for (const type of ["posts", "jobs"]) {
    const collection = await getCollection(type);
    const items = await collection.find({}, { projection: { title: 1, imagePublicId: 1, imagePublicIds: 1, contentBlocks: 1 } }).toArray();
    for (const item of items) {
      const label = `${type === "posts" ? "Bài viết" : "Tuyển dụng"}: ${String(item.title || "Không tiêu đề").slice(0, 80)}`;
      itemPublicIds(item).forEach((publicId) => add(publicId, label));
    }
  }

  const settings = await getCollection("settings");
  const [banner, profile] = await Promise.all([
    settings.findOne({ _id: "public-banner" }),
    settings.findOne({ _id: "public-site-profile" }),
  ]);
  add(banner?.backgroundImagePublicId, "Banner sự kiện");
  for (const partner of profile?.partners || []) add(partner?.logoPublicId, `Logo đối tác: ${partner?.name || "Không tên"}`);

  return usage;
}

export async function listMedia(req, res) {
  const search = String(req.query.search || "").trim().toLowerCase();
  const folder = String(req.query.folder || "").trim();
  const usage = await collectUsage();
  const assets = await listImageAssets({ prefix: "spg/", maxItems: 500 });

  let items = assets.map((asset) => ({
    publicId: asset.public_id,
    url: asset.secure_url || asset.url,
    width: asset.width || null,
    height: asset.height || null,
    bytes: asset.bytes || 0,
    format: asset.format || "",
    folder: asset.folder || String(asset.public_id || "").split("/").slice(0, -1).join("/"),
    createdAt: asset.created_at || null,
    usage: usage.get(asset.public_id) || [],
  }));

  if (folder) items = items.filter((item) => item.folder === folder || item.publicId.startsWith(`${folder}/`));
  if (search) items = items.filter((item) => `${item.publicId} ${item.folder} ${item.usage.join(" ")}`.toLowerCase().includes(search));

  return res.json({ data: items, total: items.length });
}

export async function deleteMedia(req, res) {
  const publicId = stringId(req.body?.publicId);
  if (!publicId || !publicId.startsWith("spg/")) return res.status(400).json({ error: "Invalid media id" });

  const usage = await collectUsage();
  const referencedBy = usage.get(publicId) || [];
  if (referencedBy.length) {
    return res.status(409).json({
      error: "Ảnh đang được sử dụng. Hãy gỡ ảnh khỏi nội dung trước khi xóa.",
      usage: referencedBy,
    });
  }

  const result = await destroyAsset(publicId, "image");
  if (result && !["ok", "not found"].includes(result.result)) {
    return res.status(502).json({ error: "Cloudinary không thể xóa ảnh này." });
  }
  return res.json({ ok: true, publicId });
}
