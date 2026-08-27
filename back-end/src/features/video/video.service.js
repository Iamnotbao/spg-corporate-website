import { destroyAsset } from "../../utils/cloudinary.js";
import { paginationResult, parseAdminPagination, parseDateRange, parsePagination, parseSearch, searchFilter } from "../../utils/pagination.js";
import { videoRepository } from "./video.repository.js";
import { validateVideo, VideoValidationError } from "./video.validation.js";

export class VideoServiceError extends Error { constructor(status, message) { super(message); this.status = status; } }
const dto = (item) => ({ id: String(item._id), title: item.title, description: item.description, videoUrl: item.videoUrl, videoPublicId: item.videoPublicId, posterUrl: item.posterUrl, duration: item.duration, hskLevel: item.hskLevel, order: item.order, status: item.status, sourceType: item.sourceType, embedUrl: item.embedUrl, featured: Boolean(item.featured), createdAt: item.createdAt, updatedAt: item.updatedAt });

export function createVideoService(repository = videoRepository, assetDestroyer = destroyAsset) {
  const requireVideo = async (id, filter = {}) => {
    if (!repository.toObjectId(id)) throw new VideoValidationError("id must be valid");
    const item = await repository.find(id, filter);
    if (!item) throw new VideoServiceError(404, "Learning video not found");
    return item;
  };
  async function list(filters, admin) {
    const paging = admin ? parseAdminPagination(filters) : parsePagination(filters, { defaultPageSize: 9, maxPageSize: 30 });
    const query = admin ? { ...parseDateRange(filters) } : { status: "published" };
    const search = parseSearch(filters.search);
    if (search) Object.assign(query, searchFilter(search, ["title", "description", "hskLevel"]));
    if (filters.status && admin) query.status = filters.status;
    if (filters.hskLevel) query.hskLevel = parseSearch(filters.hskLevel, 20);
    if (filters.featured === "true") query.featured = true;
    const [items, total] = await Promise.all([repository.list(query, { skip: paging.skip, limit: paging.pageSize }), repository.count(query)]);
    return { data: items.map(dto), pagination: paginationResult(paging, total) };
  }
  return {
    listAdmin: (filters = {}) => list(filters, true),
    listPublished: (filters = {}) => list(filters, false),
    async getAdmin(id) { return dto(await requireVideo(id)); },
    async create(input) { const data = validateVideo(input); const now = new Date(); const item = await repository.create({ ...data, createdAt: now, updatedAt: now }); if (data.featured) await repository.clearFeatured(item._id); return dto(item); },
    async update(id, input) { const current = await requireVideo(id); const merged = { ...dto(current), ...input }; delete merged.id; delete merged.createdAt; delete merged.updatedAt; const data = validateVideo(merged); const item = await repository.update(id, { ...data, updatedAt: new Date() }); if (data.featured) await repository.clearFeatured(item._id); if (current.videoPublicId && current.videoPublicId !== item.videoPublicId) await assetDestroyer(current.videoPublicId, "video"); return dto(item); },
    async delete(id) { const item = await requireVideo(id); if (item.status === "published") throw new VideoServiceError(409, "Unpublish the video before deleting it"); await repository.delete(id); if (item.videoPublicId) await assetDestroyer(item.videoPublicId, "video"); },
  };
}
export const videoService = createVideoService();
