import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type BlogPost = Tables<"blog_posts">;

export type BlogPostListItem = Pick<
  BlogPost,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "cover_image_url"
  | "author_name"
  | "published_at"
  | "is_published"
  | "sort_order"
>;

const LIST_COLUMNS =
  "id, slug, title, excerpt, cover_image_url, author_name, published_at, is_published, sort_order" as const;

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

export async function fetchPublishedBlogPosts(
  siteId: string | null | undefined,
  limit?: number,
): Promise<BlogPostListItem[]> {
  if (!siteId) return [];

  let query = supabase
    .from("blog_posts")
    .select(LIST_COLUMNS)
    .eq("site_id", siteId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false });

  if (limit != null) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as BlogPostListItem[];
}

export async function fetchPublishedBlogPostBySlug(
  siteId: string | null | undefined,
  slug: string,
): Promise<BlogPost | null> {
  if (!siteId || !slug) return null;

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("site_id", siteId)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchAdminBlogPosts(
  siteId: string | null | undefined,
): Promise<BlogPost[]> {
  if (!siteId) return [];

  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("site_id", siteId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
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
