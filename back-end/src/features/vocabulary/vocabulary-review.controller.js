import { vocabularyReviewService } from "./vocabulary-review.service.js";

export async function queue(req, res) {
  return res.json(await vocabularyReviewService.queue(req.user, req.query));
}

export async function review(req, res) {
  return res.json({
    data: await vocabularyReviewService.review(
      req.user,
      req.params.vocabularyId,
      req.body,
    ),
  });
}
