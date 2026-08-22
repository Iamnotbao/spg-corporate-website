import { DEMO_COURSES, findDemoCourse } from '../data/demoCourses.js';

// This service is the replacement seam for the future Course API.
export async function listPublicCourses() {
  return DEMO_COURSES;
}

export async function getPublicCourse(slug) {
  return findDemoCourse(slug);
}
