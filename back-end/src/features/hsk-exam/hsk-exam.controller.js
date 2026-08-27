import { hskExamService } from "./hsk-exam.service.js";

export const listAdmin = async (req, res) => res.json(await hskExamService.listAdmin(req.query));
export const listPublished = async (req, res) => res.json(await hskExamService.listPublished(req.query));
export const getAdmin = async (req, res) => res.json({ data: await hskExamService.getAdmin(req.params.id) });
export const getPublished = async (req, res) => res.json({ data: await hskExamService.getPublished(req.params.id) });
export const createExam = async (req, res) => res.status(201).json({ data: await hskExamService.createExam(req.body) });
export const updateExam = async (req, res) => res.json({ data: await hskExamService.updateExam(req.params.id, req.body) });
export async function deleteExam(req, res) { await hskExamService.deleteExam(req.params.id); return res.json({ ok: true }); }
export const createSection = async (req, res) => res.status(201).json({ data: await hskExamService.createSection(req.params.examId, req.body) });
export const updateSection = async (req, res) => res.json({ data: await hskExamService.updateSection(req.params.id, req.body) });
export async function deleteSection(req, res) { await hskExamService.deleteSection(req.params.id); return res.json({ ok: true }); }
export const createQuestion = async (req, res) => res.status(201).json({ data: await hskExamService.createQuestion(req.params.sectionId, req.body) });
export const updateQuestion = async (req, res) => res.json({ data: await hskExamService.updateQuestion(req.params.id, req.body) });
export async function deleteQuestion(req, res) { await hskExamService.deleteQuestion(req.params.id); return res.json({ ok: true }); }
export const startAttempt = async (req, res) => res.status(201).json({ data: await hskExamService.startAttempt(req.user, req.params.examId) });
export const submitAttempt = async (req, res) => res.json({ data: await hskExamService.submitAttempt(req.user, req.params.attemptId, req.body) });
export const listOwnAttempts = async (req, res) => res.json(await hskExamService.listOwnAttempts(req.user, req.params.examId, req.query));
export const getOwnAttempt = async (req, res) => res.json({ data: await hskExamService.getOwnAttempt(req.user, req.params.attemptId) });
