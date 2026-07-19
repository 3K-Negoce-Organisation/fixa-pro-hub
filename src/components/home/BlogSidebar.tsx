import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchPublishedBlogPosts, formatBlogDate } from "@/lib/blog";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";

export function BlogSidebar() {
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-sidebar", siteId],
    queryFn: () => fetchPublishedBlogPosts(siteId, 5),
    enabled: !siteLoading && !!siteId,
  });

  return (
    <aside className="lg:sticky lg:top-[5.5rem]">
      <section className="rounded-lg border border-border bg-card/90 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-semibold text-lg truncate">Blog</h2>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0 px-2" asChild>
            <Link to="/blog">
              Voir tout
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2 rounded-md border border-border/60 p-3">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Les articles du blog arriveront bientôt.
          </p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/blog/${post.slug}`}
                  className="block rounded-md border border-border/60 bg-background/60 p-3 transition-colors hover:border-primary/35 hover:bg-muted/40"
                >
                  {post.published_at && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                      <Calendar className="h-3 w-3" />
                      <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
                    </div>
                  )}
                  <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
