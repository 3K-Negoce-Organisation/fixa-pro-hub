import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BlogContent } from "@/components/blog/BlogContent";
import { BlogCta } from "@/components/blog/BlogCta";
import {
  BLOG_AUDIENCE_LABELS,
  formatBlogDate,
  getBlogCoverUrl,
  type BlogAudience,
  type BlogPostWithCategory,
} from "@/lib/blog";

interface BlogArticleTemplateProps {
  post: BlogPostWithCategory;
}

/** Gabarit unique réutilisable pour tous les formats (Astuce, Avant/Après, Conseil du pro…). */
export function BlogArticleTemplate({ post }: BlogArticleTemplateProps) {
  const cover = getBlogCoverUrl(post);
  const category = post.blog_categories;
  const audience = (post.audience || "particulier") as BlogAudience;

  return (
    <article className="container py-10 md:py-14 max-w-3xl">
      <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
        <Link to={category ? `/blog?category=${category.slug}` : "/blog"}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Blog
        </Link>
      </Button>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {category && (
            <Badge variant="secondary" className="font-medium">
              {category.name}
            </Badge>
          )}
          <Badge variant="outline" className="text-muted-foreground">
            {BLOG_AUDIENCE_LABELS[audience] ?? audience}
          </Badge>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
            </span>
          )}
          {post.author_name && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {post.author_name}
            </span>
          )}
        </div>
      </header>

      {cover && (
        <div className="mb-8 rounded-lg overflow-hidden border border-border aspect-[16/9] bg-muted">
          <img src={cover} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {post.excerpt && (
        <p className="text-lg text-muted-foreground mb-8 border-l-2 border-primary/40 pl-4">
          {post.excerpt}
        </p>
      )}

      <BlogContent content={post.content} />
      <BlogCta post={post} />
    </article>
  );
}
