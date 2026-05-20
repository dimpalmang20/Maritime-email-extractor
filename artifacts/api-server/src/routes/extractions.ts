import { Router } from "express";
import { db } from "@workspace/db";
import { extractionJobsTable } from "@workspace/db";
import { eq, desc, count, avg, sql } from "drizzle-orm";
import { extractMaritimeEmail } from "../lib/maritime-extractor";

const router = Router();

router.post("/emails/extract", async (req, res) => {
  const { emailText, subject } = req.body as { emailText?: string; subject?: string };

  if (!emailText || typeof emailText !== "string" || emailText.trim().length < 10) {
    res.status(400).json({ error: "emailText is required and must be at least 10 characters" });
    return;
  }

  const result = extractMaritimeEmail(emailText.trim());

  const [job] = await db
    .insert(extractionJobsTable)
    .values({
      emailText: emailText.trim(),
      subject: subject ?? null,
      emailType: result.emailType,
      pipeline: result.pipeline,
      confidence: result.confidence,
      extractedEntriesJson: JSON.stringify(result.extractedEntries),
      processingMs: result.processingMs,
      llmUsed: result.llmUsed,
      estimatedCostUsd: result.estimatedCostUsd,
    })
    .returning();

  res.json({
    id: job.id,
    emailText: job.emailText,
    subject: job.subject,
    emailType: job.emailType,
    pipeline: job.pipeline,
    confidence: job.confidence,
    extractedEntries: result.extractedEntries,
    processingMs: job.processingMs,
    llmUsed: job.llmUsed,
    estimatedCostUsd: job.estimatedCostUsd,
    createdAt: job.createdAt.toISOString(),
  });
});

router.get("/emails", async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "20")), 100);
  const offset = parseInt(String(req.query.offset ?? "0"));
  const emailType = req.query.emailType as string | undefined;

  const where = emailType
    ? eq(extractionJobsTable.emailType, emailType)
    : undefined;

  const [items, totalResult] = await Promise.all([
    db.select().from(extractionJobsTable)
      .where(where)
      .orderBy(desc(extractionJobsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(extractionJobsTable).where(where),
  ]);

  res.json({
    items: items.map(job => ({
      id: job.id,
      emailText: job.emailText,
      subject: job.subject,
      emailType: job.emailType,
      pipeline: job.pipeline,
      confidence: job.confidence,
      extractedEntries: JSON.parse(job.extractedEntriesJson),
      processingMs: job.processingMs,
      llmUsed: job.llmUsed,
      estimatedCostUsd: job.estimatedCostUsd,
      createdAt: job.createdAt.toISOString(),
    })),
    total: totalResult[0]?.count ?? 0,
  });
});

router.get("/emails/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [job] = await db.select().from(extractionJobsTable).where(eq(extractionJobsTable.id, id));
  if (!job) { res.status(404).json({ error: "Not found" }); return; }

  res.json({
    id: job.id,
    emailText: job.emailText,
    subject: job.subject,
    emailType: job.emailType,
    pipeline: job.pipeline,
    confidence: job.confidence,
    extractedEntries: JSON.parse(job.extractedEntriesJson),
    processingMs: job.processingMs,
    llmUsed: job.llmUsed,
    estimatedCostUsd: job.estimatedCostUsd,
    createdAt: job.createdAt.toISOString(),
  });
});

router.delete("/emails/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(extractionJobsTable).where(eq(extractionJobsTable.id, id));
  res.status(204).send();
});

router.get("/stats", async (req, res) => {
  const jobs = await db.select().from(extractionJobsTable).orderBy(desc(extractionJobsTable.createdAt));

  const totalEmails = jobs.length;
  const ruleBasedCount = jobs.filter(j => j.pipeline === "rule-based").length;
  const templateCount = jobs.filter(j => j.pipeline === "template").length;
  const llmFallbackCount = jobs.filter(j => j.pipeline === "llm-fallback").length;
  const llmUsedCount = jobs.filter(j => j.llmUsed).length;

  const avgProcessingMs = totalEmails > 0
    ? jobs.reduce((s, j) => s + j.processingMs, 0) / totalEmails
    : 0;
  const avgConfidence = totalEmails > 0
    ? jobs.reduce((s, j) => s + j.confidence, 0) / totalEmails
    : 0;

  // Estimated savings: if rule-based was LLM it would cost $0.015 each
  const llmCostPerEmail = 0.015;
  const estimatedLlmSavingsUsd = (ruleBasedCount + templateCount) * (llmCostPerEmail - 0.0001);
  const costReductionPct = totalEmails > 0
    ? ((ruleBasedCount + templateCount) / totalEmails) * 100
    : 0;

  // Recent activity: last 14 days
  const now = new Date();
  const recentActivity = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayJobs = jobs.filter(j => j.createdAt.toISOString().startsWith(dateStr));
    recentActivity.push({
      date: dateStr,
      count: dayJobs.length,
      llmUsed: dayJobs.filter(j => j.llmUsed).length,
    });
  }

  res.json({
    totalEmails,
    ruleBasedCount,
    templateCount,
    llmFallbackCount,
    estimatedLlmSavingsUsd,
    avgProcessingMs,
    avgConfidence,
    costReductionPct,
    recentActivity,
  });
});

export default router;
