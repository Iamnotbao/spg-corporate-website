import { getPost, getPosts } from '../../../services/publicService.js';
import { BLOG_CATEGORIES, getBlogCategorySlug, isMandoraPost } from '../constants.js';

export async function listPublishedBlogPosts(options = {}) {
  const categories = options.category
    ? BLOG_CATEGORIES.filter((category) => category.slug === options.category)
    : BLOG_CATEGORIES;
  const responses = await Promise.all(
    categories.map((category) =>
      getPosts({
        category: category.slug,
        pageSize: options.pageSize || 50,
        search: options.search,
        signal: options.signal,
      }),
    ),
  );
  const posts = responses
    .flat()
    .filter(
      (post, index, allPosts) =>
        index === allPosts.findIndex((candidate) => candidate._id === post._id),
    )
    .sort(
      (left, right) =>
        new Date(right.publishedAt || right.createdAt || 0) -
        new Date(left.publishedAt || left.createdAt || 0),
    );

  return posts
    .filter(isMandoraPost)
    .filter((post) => !options.category || getBlogCategorySlug(post) === options.category)
    .slice(0, options.limit || posts.length);
}

export async function getPublishedBlogPost(id, options = {}) {
  const post = await getPost(id, options);
  return isMandoraPost(post) ? post : null;
}
