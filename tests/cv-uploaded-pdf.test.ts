import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  cvContentDisposition,
  cvDownloadFileName,
  cvPdfFinalizeSchema,
  cvPdfUploadRequestSchema,
  formatCvFileSize,
  maxCvPdfBytes,
  sanitizeCvFileName,
} from "../src/features/cv/uploaded-pdf";
import { buildCommandIndex } from "../src/features/command-palette/commands";
import { primaryNavigation } from "../src/lib/site-config";

describe("1.9.0 uploaded professional CV — request validation", () => {
  test("accepts a PDF up to 5 MB and keeps a sanitised display name", () => {
    const result = cvPdfUploadRequestSchema.parse({ fileName: "C:\\Users\\me\\Mustafa Berk CV.pdf", mimeType: "application/pdf", size: maxCvPdfBytes });
    assert.equal(result.fileName, "Mustafa Berk CV.pdf");
  });

  test("rejects empty, oversized, non-PDF MIME and non-.pdf names", () => {
    const base = { fileName: "cv.pdf", mimeType: "application/pdf", size: 1000 };
    assert.equal(cvPdfUploadRequestSchema.safeParse({ ...base, size: 0 }).success, false);
    assert.equal(cvPdfUploadRequestSchema.safeParse({ ...base, size: maxCvPdfBytes + 1 }).success, false);
    for (const mimeType of ["text/html", "image/svg+xml", "image/png", "application/octet-stream", "application/pdf; charset=utf-8"]) {
      assert.equal(cvPdfUploadRequestSchema.safeParse({ ...base, mimeType }).success, false, mimeType);
    }
    for (const fileName of ["cv.html", "cv.pdf.html", "cv.svg", ".pdf", ""]) {
      assert.equal(cvPdfUploadRequestSchema.safeParse({ ...base, fileName }).success, false, fileName);
    }
  });

  test("sanitizes path, quote and control characters out of the original name", () => {
    assert.equal(sanitizeCvFileName("../../etc/\"evil\"\u0007<cv>.pdf"), "evilcv.pdf");
    assert.equal(sanitizeCvFileName("a".repeat(300) + ".pdf").length, 120);
  });

  test("finalize accepts only a bounded upload ticket", () => {
    assert.equal(cvPdfFinalizeSchema.safeParse({ uploadToken: "short" }).success, false);
    assert.equal(cvPdfFinalizeSchema.safeParse({ uploadToken: "x".repeat(5000) }).success, false);
    assert.equal(cvPdfFinalizeSchema.safeParse({ uploadToken: "x".repeat(40) }).success, true);
  });
});

describe("1.9.0 uploaded professional CV — delivery helpers", () => {
  test("download name is stable and derived from the profile, never the storage key", () => {
    assert.equal(cvDownloadFileName("Mustafa Berk Kılıçaslan"), "mustafa-berk-kilicaslan-cv.pdf");
    assert.equal(cvDownloadFileName(null), "cv.pdf");
  });

  test("Content-Disposition supports inline and attachment", () => {
    assert.equal(cvContentDisposition("inline", "mustafa-berk-kilicaslan-cv.pdf"), 'inline; filename="mustafa-berk-kilicaslan-cv.pdf"');
    assert.equal(cvContentDisposition("attachment", "cv.pdf"), 'attachment; filename="cv.pdf"');
  });

  test("file size is formatted for the admin panel", () => {
    assert.equal(formatCvFileSize(512), "512 B");
    assert.equal(formatCvFileSize(1536), "1,5 KB");
    assert.equal(formatCvFileSize(2 * 1024 * 1024), "2,00 MB");
  });
});

describe("1.9.0 public CV entry points", () => {
  test("the main navigation CV item opens the primary PDF in a new tab", () => {
    const cv = primaryNavigation.find((item) => item.label === "CV");
    assert.deepEqual(cv, { href: "/api/cv/pdf", label: "CV", newTab: true });
  });

  test("command palette offers the primary PDF and keeps the structured Web CV", () => {
    const items = buildCommandIndex({ name: null, headline: null, summary: null, email: null, cvAvailable: true, projects: [], posts: [], skills: [], links: [], githubUrl: null });
    assert.equal(items.find((item) => item.id === "link-cv-pdf")?.href, "/api/cv/pdf");
    assert.equal(items.find((item) => item.id === "page-cv")?.href, "/cv");
  });
});
