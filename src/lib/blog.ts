import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { absoluteUrl } from "@/lib/seo";

export type BlogPost = Tables<"blog_posts">;
export type BlogCategory = Tables<"blog_categories">;
export type BlogAudience = "professionnel" | "particulier";
export type BlogCtaType = "catalogue" | "devis" | "avis" | "custom";

export type BlogCategoryRef = Pick<BlogCategory, "id" | "slug" | "name">;

export type BlogPostWithCategory = BlogPost & {
  blog_categories: BlogCategoryRef | null;
};

export type BlogPostListItem = Pick<
  BlogPost,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "cover_image_url"
  | "cover_image_pinterest_url"
  | "author_name"
  | "audience"
  | "published_at"
  | "is_published"
  | "category_id"
> & {
  blog_categories: BlogCategoryRef | null;
};

export type NewsletterArticleExport = {
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  pinterestImageUrl: string | null;
  url: string;
  category: string | null;
  audience: string;
  publishedAt: string | null;
};

const LIST_SELECT =
  "id, slug, title, excerpt, cover_image_url, cover_image_pinterest_url, author_name, audience, published_at, is_published, category_id, blog_categories ( id, slug, name )" as const;

const DETAIL_SELECT =
  "*, blog_categories ( id, slug, name )" as const;

export const BLOG_AUDIENCE_LABELS: Record<BlogAudience, string> = {
  professionnel: "Professionnels",
  particulier: "Particuliers",
};

export const BLOG_CTA_PRESETS: Record<
  Exclude<BlogCtaType, "custom">,
  { label: string; url: string }
> = {
  catalogue: { label: "Voir le catalogue", url: "/produits" },
  devis: { label: "Demander un devis", url: "/contact" },
  avis: { label: "Laisser un avis", url: "/avis-clients" },
};

export function slugifyBlogTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatBlogDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function blogPostShareUrl(slug: string): string {
  return absoluteUrl(`/blog/${slug}`);
}

export function resolveBlogCta(post: Pick<BlogPost, "cta_type" | "cta_label" | "cta_url">): {
  label: string;
  url: string;
} {
  const type = (post.cta_type || "catalogue") as BlogCtaType;
  if (type === "custom") {
    return {
      label: post.cta_label?.trim() || "En savoir plus",
      url: post.cta_url?.trim() || "/produits",
    };
  }
  const preset = BLOG_CTA_PRESETS[type] ?? BLOG_CTA_PRESETS.catalogue;
  return {
    label: post.cta_label?.trim() || preset.label,
    url: post.cta_url?.trim() || preset.url,
  };
}

export function getBlogSeoTitle(post: Pick<BlogPost, "title" | "meta_title">, siteName: string): string {
  return post.meta_title?.trim() || `${post.title} — ${siteName}`;
}

export function getBlogSeoDescription(
  post: Pick<BlogPost, "excerpt" | "content" | "meta_description">,
): string {
  if (post.meta_description?.trim()) return post.meta_description.trim().slice(0, 160);
  if (post.excerpt?.trim()) return post.excerpt.trim().slice(0, 160);
  return post.content.replace(/[#*_`\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** Visuel principal ; fallback Pinterest 2:3 si pas de couverture paysage. */
export function getBlogCoverUrl(post: Pick<BlogPost, "cover_image_url" | "cover_image_pinterest_url">): string | null {
  return post.cover_image_url || post.cover_image_pinterest_url || null;
}

export function getBlogPinterestUrl(post: Pick<BlogPost, "cover_image_url" | "cover_image_pinterest_url">): string | null {
  return post.cover_image_pinterest_url || post.cover_image_url || null;
}

export async function fetchBlogCategories(
  siteId: string | null | undefined,
  options?: { includeInactive?: boolean },
): Promise<BlogCategory[]> {
  if (!siteId) return [];

  let query = supabase
    .from("blog_categories")
    .select("*")
    .eq("site_id", siteId)
    .order("sort_order", { ascending: true });

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchPublishedBlogPosts(
  siteId: string | null | undefined,
  options?: { limit?: number; categorySlug?: string },
): Promise<BlogPostListItem[]> {
  if (!siteId) return [];

  let query = supabase
    .from("blog_posts")
    .select(LIST_SELECT)
    .eq("site_id", siteId)
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (options?.categorySlug) {
    const { data: cat, error: catError } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("site_id", siteId)
      .eq("slug", options.categorySlug)
      .maybeSingle();
    if (catError) throw catError;
    if (!cat) return [];
    query = query.eq("category_id", cat.id);
  }

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BlogPostListItem[];
}

export async function fetchPublishedBlogPostBySlug(
  siteId: string | null | undefined,
  slug: string,
): Promise<BlogPostWithCategory | null> {
  if (!siteId || !slug) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select(DETAIL_SELECT)
    .eq("site_id", siteId)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data as BlogPostWithCategory | null;
}

export async function fetchAdminBlogPosts(
  siteId: string | null | undefined,
): Promise<BlogPostWithCategory[]> {
  if (!siteId) return [];

  const { data, error } = await supabase
    .from("blog_posts")
    .select(DETAIL_SELECT)
    .eq("site_id", siteId)
    .order("published_at", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as BlogPostWithCategory[];
}

/** Articles d'un mois civil pour la newsletter mensuelle (titre, visuel, résumé, lien). */
export async function fetchNewsletterMonthExport(
  siteId: string | null | undefined,
  year: number,
  month: number,
): Promise<NewsletterArticleExport[]> {
  if (!siteId) return [];

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  const { data, error } = await supabase
    .from("blog_posts")
    .select(LIST_SELECT)
    .eq("site_id", siteId)
    .eq("is_published", true)
    .gte("published_at", start.toISOString())
    .lt("published_at", end.toISOString())
    .order("published_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as BlogPostListItem[]).map((post) => ({
    title: post.title,
    excerpt: post.excerpt?.trim() || "",
    coverImageUrl: getBlogCoverUrl(post),
    pinterestImageUrl: getBlogPinterestUrl(post),
    url: blogPostShareUrl(post.slug),
    category: post.blog_categories?.name ?? null,
    audience: post.audience,
    publishedAt: post.published_at,
  }));
}

export function newsletterExportToMarkdown(items: NewsletterArticleExport[], monthLabel: string): string {
  const lines = [`# Newsletter Vis-à-Bois — ${monthLabel}`, ""];
  for (const item of items) {
    lines.push(`## ${item.title}`);
    if (item.category) lines.push(`*${item.category}*`);
    if (item.excerpt) lines.push(item.excerpt);
    lines.push(`[Lire l'article](${item.url})`);
    if (item.coverImageUrl) lines.push(`Visuel : ${item.coverImageUrl}`);
    if (item.pinterestImageUrl && item.pinterestImageUrl !== item.coverImageUrl) {
      lines.push(`Visuel Pinterest 2:3 : ${item.pinterestImageUrl}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Escape HTML then apply a small Markdown subset for safe article rendering. */
export function renderBlogMarkdown(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const blocks = escaped.split(/\n{2,}/);

  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";

      if (/^\|(.+\|)+\s*$/m.test(trimmed) && trimmed.includes("|---")) {
        return renderMarkdownTable(trimmed);
      }

      if (trimmed.startsWith("### ")) {
        return `<h3>${inlineFormat(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith("## ")) {
        return `<h2>${inlineFormat(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith("# ")) {
        return `<h1>${inlineFormat(trimmed.slice(2))}</h1>`;
      }

      if (trimmed.split("\n").every((line) => /^[-*]\s+/.test(line.trim()) || line.trim() === "")) {
        const items = trimmed
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => /^[-*]\s+/.test(line))
          .map((line) => `<li>${inlineFormat(line.replace(/^[-*]\s+/, ""))}</li>`)
          .join("");
        return `<ul>${items}</ul>`;
      }

      return `<p>${inlineFormat(trimmed.replace(/\n/g, "<br />"))}</p>`;
    })
    .filter(Boolean)
    .join("\n");
}

function inlineFormat(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdownTable(block: string): string {
  const rows = block
    .split("\n")
    .map((r) => r.trim())
    .filter((r) => r.startsWith("|") && r.endsWith("|"));

  if (rows.length < 2) {
    return `<p>${inlineFormat(block.replace(/\n/g, "<br />"))}</p>`;
  }

  const parseRow = (row: string) =>
    row
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());

  const header = parseRow(rows[0]);
  const bodyRows = rows.slice(2).map(parseRow);

  const thead = `<thead><tr>${header.map((c) => `<th>${inlineFormat(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${bodyRows
    .map((cells) => `<tr>${cells.map((c) => `<td>${inlineFormat(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  return `<div class="overflow-x-auto"><table>${thead}${tbody}</table></div>`;
}
