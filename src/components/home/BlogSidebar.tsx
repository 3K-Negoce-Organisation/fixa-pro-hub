import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchPublishedBlogPosts, formatBlogDate } from "@/lib/blog";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { cn } from "@/lib/utils";

type BlogSidebarProps = {
  tone?: "default" | "marketplace" | "marketplaceBlue";
  fillHeight?: boolean;
};

export function BlogSidebar({ tone = "default", fillHeight = false }: BlogSidebarProps) {
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const isMarketplace = tone === "marketplace" || tone === "marketplaceBlue";
  const isBlue = tone === "marketplaceBlue";
  const limit = isMarketplace ? 3 : 5;

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-sidebar", siteId, limit],
    queryFn: () => fetchPublishedBlogPosts(siteId, { limit }),
    enabled: !siteLoading && !!siteId,
  });

  return (
    <aside className={cn(fillHeight && "flex h-full min-h-0 flex-col")}>
      <section
        className={cn(
          "theme-frame",
          fillHeight && "flex min-h-0 flex-1 flex-col",
          isBlue
            ? "bg-[#000d4f] p-4 text-white md:p-5"
            : isMarketplace
              ? "bg-white p-4 text-[#000d4f] md:p-5"
              : "rounded-lg border border-border bg-card/90 p-4 shadow-sm backdrop-blur-sm",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-2",
            isMarketplace ? "mb-3" : "mb-4",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen
              className={cn(
                "h-5 w-5 shrink-0",
                isBlue || isMarketplace ? "text-[var(--brand-orange)]" : "text-primary",
              )}
            />
            <h2
              className={cn(
                "truncate font-semibold",
                isBlue ? "text-lg text-white" : isMarketplace ? "text-lg text-[#000d4f]" : "text-lg",
              )}
            >
              Blog
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "shrink-0 px-2",
              isBlue && "text-white hover:bg-white/10 hover:text-[var(--brand-orange)]",
              isMarketplace &&
                !isBlue &&
                "text-[#000d4f] hover:bg-[#000d4f]/5 hover:text-[var(--brand-orange)]",
            )}
            asChild
          >
            <Link to="/blog">
              Voir tout
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className={cn("space-y-2.5", fillHeight && "flex-1")}>
            {Array.from({ length: limit }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "animate-pulse space-y-2 rounded-xl p-3",
                  isBlue ? "bg-white/10" : isMarketplace ? "bg-[#000d4f]/5" : "border border-border/60",
                )}
              >
                <div className="h-3 w-1/3 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-3 w-4/5 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p
            className={cn(
              "text-sm",
              isBlue ? "text-white/70" : isMarketplace ? "text-[#000d4f]/65" : "text-muted-foreground",
            )}
          >
            Les articles du blog arriveront bientôt.
          </p>
        ) : (
          <ul
            className={cn(
              isMarketplace ? "space-y-2.5" : "space-y-3",
              fillHeight && "flex min-h-0 flex-1 flex-col",
            )}
          >
            {posts.map((post) => (
              <li key={post.id} className={cn(fillHeight && "min-h-0 flex-1")}>
                <Link
                  to={`/blog/${post.slug}`}
                  className={cn(
                    "block h-full rounded-xl transition-all duration-200",
                    isBlue
                      ? "bg-white/10 p-3 ring-1 ring-white/15 hover:bg-white/15 hover:ring-[var(--brand-orange)]/50"
                      : isMarketplace
                        ? "bg-[#f4f6fa] p-3 ring-1 ring-[#000d4f]/8 hover:bg-[#eef1f7] hover:ring-[var(--brand-orange)]/40"
                        : "rounded-md border border-border/60 bg-background/60 p-3 hover:border-primary/35 hover:bg-muted/40",
                  )}
                >
                  {post.blog_categories && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "mb-1.5 text-[10px] font-normal",
                        isBlue && "border-white/20 bg-white/15 text-white",
                      )}
                    >
                      {post.blog_categories.name}
                    </Badge>
                  )}
                  {post.published_at && (
                    <div
                      className={cn(
                        "mb-1.5 flex items-center gap-1.5 text-xs",
                        isBlue ? "text-white/65" : "text-muted-foreground",
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <time dateTime={post.published_at}>{formatBlogDate(post.published_at)}</time>
                    </div>
                  )}
                  <h3
                    className={cn(
                      "line-clamp-2 text-sm font-medium leading-snug",
                      isBlue ? "text-white" : "text-foreground",
                    )}
                  >
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p
                      className={cn(
                        "mt-1 line-clamp-2 text-xs",
                        isBlue ? "text-white/65" : "text-muted-foreground",
                      )}
                    >
                      {post.excerpt}
                    </p>
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
