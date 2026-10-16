import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const createdAt = integer("created_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

const updatedAt = integer("updated_at", { mode: "timestamp" })
  .notNull()
  .default(sql`(unixepoch())`);

export const projectStatusValues = [
  "planned",
  "in_progress",
  "completed",
  "archived",
] as const;
export const repositoryVisibilityValues = ["none", "private", "public"] as const;
export const projectImageTypeValues = ["cover", "gallery"] as const;
export const postStatusValues = ["draft", "published"] as const;

export const media = sqliteTable(
  "media",
  {
    id: text("id").primaryKey(),
    storageKey: text("storage_key").notNull(),
    url: text("url"),
    mimeType: text("mime_type").notNull(),
    width: integer("width"),
    height: integer("height"),
    size: integer("size").notNull(),
    altText: text("alt_text").notNull(),
    createdAt,
  },
  (table) => [
    uniqueIndex("media_storage_key_unique").on(table.storageKey),
    check("media_size_non_negative", sql`${table.size} >= 0`),
    check(
      "media_dimensions_positive",
      sql`(${table.width} IS NULL OR ${table.width} > 0) AND (${table.height} IS NULL OR ${table.height} > 0)`,
    ),
  ],
);

export const profiles = sqliteTable(
  "profiles",
  {
    id: text("id").primaryKey().default("primary"),
    fullName: text("full_name").notNull(),
    headline: text("headline").notNull(),
    shortBio: text("short_bio").notNull(),
    longBio: text("long_bio"),
    location: text("location"),
    email: text("email"),
    phone: text("phone"),
    isPhoneVisible: integer("is_phone_visible", { mode: "boolean" }).notNull().default(false),
    isEmailVisible: integer("is_email_visible", { mode: "boolean" })
      .notNull()
      .default(false),
    isLocationVisible: integer("is_location_visible", { mode: "boolean" })
      .notNull()
      .default(false),
    avatarMediaId: text("avatar_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    availableForWork: integer("available_for_work", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt,
    updatedAt,
  },
  (table) => [check("profiles_singleton", sql`${table.id} = 'primary'`)],
);

export const socialLinks = sqliteTable(
  "social_links",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    platform: text("platform").notNull(),
    showInCv: integer("show_in_cv", { mode: "boolean" }).notNull().default(false),
    label: text("label").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [index("social_links_profile_order_idx").on(table.profileId, table.displayOrder)],
);

export const skills = sqliteTable(
  "skills",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category").notNull(),
    description: text("description"),
    iconIdentifier: text("icon_identifier"),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("skills_slug_unique").on(table.slug),
    index("skills_category_order_idx").on(table.category, table.displayOrder),
  ],
);

export const education = sqliteTable(
  "education",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    institution: text("institution").notNull(),
    program: text("program").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("education_profile_order_idx").on(table.profileId, table.displayOrder),
    check("education_current_has_no_end", sql`${table.isCurrent} = 0 OR ${table.endDate} IS NULL`),
  ],
);

/**
 * Phase 18 certificates. Only `title` is required; every other field is optional and renders as
 * nothing when empty. Dates are ISO `YYYY-MM-DD` text like education/experience. Visibility is
 * enforced server-side: `is_visible` gates the public site, `show_in_cv` additionally gates CV/PDF.
 */
export const certificates = sqliteTable(
  "certificates",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    issuer: text("issuer"),
    instructor: text("instructor"),
    issuedAt: text("issued_at"),
    expiresAt: text("expires_at"),
    credentialId: text("credential_id"),
    credentialUrl: text("credential_url"),
    description: text("description"),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    showInCv: integer("show_in_cv", { mode: "boolean" }).notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("certificates_order_idx").on(table.displayOrder),
    check("certificates_expiry_after_issue", sql`${table.issuedAt} IS NULL OR ${table.expiresAt} IS NULL OR ${table.expiresAt} >= ${table.issuedAt}`),
  ],
);

export const experiences = sqliteTable(
  "experiences",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    organization: text("organization").notNull(),
    position: text("position").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    isCurrent: integer("is_current", { mode: "boolean" }).notNull().default(false),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("experiences_profile_order_idx").on(table.profileId, table.displayOrder),
    check("experiences_current_has_no_end", sql`${table.isCurrent} = 0 OR ${table.endDate} IS NULL`),
  ],
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    shortDescription: text("short_description").notNull(),
    detailedDescription: text("detailed_description"),
    problem: text("problem"),
    solution: text("solution"),
    role: text("role"),
    architectureDescription: text("architecture_description"),
    status: text("status", { enum: projectStatusValues }).notNull().default("planned"),
    projectDate: text("project_date"),
    liveUrl: text("live_url"),
    repositoryVisibility: text("repository_visibility", {
      enum: repositoryVisibilityValues,
    })
      .notNull()
      .default("none"),
    repositoryUrl: text("repository_url"),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    includeInCv: integer("include_in_cv", { mode: "boolean" }).notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("projects_slug_unique").on(table.slug),
    index("projects_public_featured_idx").on(table.published, table.featured, table.projectDate),
    index("projects_cv_idx").on(table.published, table.includeInCv, table.projectDate),
    check("projects_status_valid", sql`${table.status} IN ('planned', 'in_progress', 'completed', 'archived')`),
    check("projects_repository_visibility_valid", sql`${table.repositoryVisibility} IN ('none', 'private', 'public')`),
    check("projects_none_has_no_repository_url", sql`${table.repositoryVisibility} <> 'none' OR ${table.repositoryUrl} IS NULL`),
  ],
);

export const projectImages = sqliteTable(
  "project_images",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: text("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    altText: text("alt_text").notNull(),
    caption: text("caption"),
    type: text("type", { enum: projectImageTypeValues }).notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt,
  },
  (table) => [
    uniqueIndex("project_images_project_media_unique").on(table.projectId, table.mediaId),
    uniqueIndex("project_images_single_cover_unique")
      .on(table.projectId)
      .where(sql`${table.type} = 'cover'`),
    index("project_images_project_order_idx").on(table.projectId, table.displayOrder),
    check("project_images_type_valid", sql`${table.type} IN ('cover', 'gallery')`),
  ],
);

export const projectSkills = sqliteTable(
  "project_skills",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    skillId: text("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.skillId] }),
    index("project_skills_project_order_idx").on(table.projectId, table.displayOrder),
  ],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    displayOrder: integer("display_order").notNull().default(0),
    isVisible: integer("is_visible", { mode: "boolean" }).notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [uniqueIndex("categories_slug_unique").on(table.slug)],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    coverMediaId: text("cover_media_id").references(() => media.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    excerpt: text("excerpt").notNull(),
    content: text("content").notNull(),
    status: text("status", { enum: postStatusValues }).notNull().default("draft"),
    publishedAt: integer("published_at", { mode: "timestamp" }),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex("posts_slug_unique").on(table.slug),
    index("posts_publication_idx").on(table.status, table.publishedAt),
    index("posts_category_idx").on(table.categoryId),
    check("posts_status_valid", sql`${table.status} IN ('draft', 'published')`),
    check(
      "posts_publication_date_consistent",
      sql`(${table.status} = 'draft' AND ${table.publishedAt} IS NULL) OR (${table.status} = 'published' AND ${table.publishedAt} IS NOT NULL)`,
    ),
  ],
);

export const tags = sqliteTable(
  "tags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdAt,
  },
  (table) => [uniqueIndex("tags_slug_unique").on(table.slug)],
);

export const postTags = sqliteTable(
  "post_tags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("post_tags_tag_idx").on(table.tagId),
  ],
);

export const cvSettings = sqliteTable(
  "cv_settings",
  {
    id: text("id").primaryKey().default("primary"),
    title: text("title").notNull().default("Özgeçmiş"),
    summaryOverride: text("summary_override"),
    language: text("language").notNull().default("tr"),
    template: text("template").notNull().default("classic"),
    sectionVisibility: text("section_visibility", { mode: "json" })
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    sectionOrder: text("section_order", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    maxProjects: integer("max_projects").notNull().default(6),
    // 1.9.0: admin-uploaded professional CV PDF. When set, /api/cv/pdf serves this
    // R2 object instead of the generated react-pdf CV (which stays as the fallback).
    uploadedPdfKey: text("uploaded_pdf_key"),
    uploadedPdfOriginalName: text("uploaded_pdf_original_name"),
    uploadedPdfSize: integer("uploaded_pdf_size"),
    uploadedPdfUploadedAt: integer("uploaded_pdf_uploaded_at", { mode: "timestamp" }),
    updatedAt,
  },
  (table) => [
    check("cv_settings_singleton", sql`${table.id} = 'primary'`),
    check("cv_settings_max_projects_positive", sql`${table.maxProjects} > 0`),
  ],
);

export const siteSettings = sqliteTable(
  "site_settings",
  {
    id: text("id").primaryKey().default("primary"),
    siteTitle: text("site_title").notNull(),
    siteDescription: text("site_description").notNull(),
    heroEyebrow: text("hero_eyebrow").notNull(),
    heroTitle: text("hero_title").notNull(),
    heroDescription: text("hero_description").notNull(),
    contactVisible: integer("contact_visible", { mode: "boolean" })
      .notNull()
      .default(true),
    updatedAt,
  },
  (table) => [check("site_settings_singleton", sql`${table.id} = 'primary'`)],
);
