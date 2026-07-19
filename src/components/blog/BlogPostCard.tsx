import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  BLOG_AUDIENCE_LABELS,
  formatBlogDate,
  getBlogCoverUrl,
  type BlogAudience,
  type BlogPostListItem,
} from "@/lib/blog";

interface BlogPostCardProps {
  post: BlogPostListItem;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const cover = getBlogCoverUrl(post);
  const audience = (post.audience || "particulier") as BlogAudience;

  return (
    <article className="rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/35">
      <Link to={`/blog/${post.slug}`} className="flex flex-col sm:flex-row">
        {cover && (
          <div className="sm:w-48 shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[140px] bg-muted">
            <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="p-5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {post.blog_categories && (
              <Badge variant="secondary" className="text-xs">
                {post.blog_categories.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {BLOG_AUDIENCE_LABELS[audience] ?? audience}
            </Badge>
          </div>
          {post.published_at && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
            </div>
          )}
          <h2 className="text-lg font-semibold text-foreground mb-1.5">{post.title}</h2>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
          )}
        </div>
      </Link>
    </article>
  );
}
