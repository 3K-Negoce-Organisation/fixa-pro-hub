import { Link } from "react-router-dom";
import { BookOpen, Calendar } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { fetchPublishedBlogPosts, formatBlogDate } from "@/lib/blog";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

const BlogPage = () => {
  const seo = STATIC_PAGE_SEO.blog;
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", siteId],
    queryFn: () => fetchPublishedBlogPosts(siteId),
    enabled: !siteLoading && !!siteId,
  });

  return (
    <PageBackground>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={staticPageCanonical(seo.path)}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: seo.title,
          description: seo.description,
          url: `${SITE_URL}/blog`,
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
        }}
      />
      <Header />
      <main className="flex-1">
        <div className="container py-10 md:py-14 max-w-4xl">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Blog</h1>
          </div>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            Conseils et guides pratiques pour choisir et poser vos vis à bois comme un pro.
          </p>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-lg border border-border p-5 space-y-3">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-5 bg-muted rounded w-2/3" />
                  <div className="h-4 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">Aucun article publié pour le moment.</p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <article className="rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/35">
                    <Link to={`/blog/${post.slug}`} className="flex flex-col sm:flex-row">
                      {post.cover_image_url && (
                        <div className="sm:w-48 shrink-0 aspect-[16/10] sm:aspect-auto sm:min-h-[140px] bg-muted">
                          <img
                            src={post.cover_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-5 flex-1 min-w-0">
                        {post.published_at && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <time dateTime={post.published_at}>
                              {formatBlogDate(post.published_at)}
                            </time>
                            {post.author_name && (
                              <>
                                <span className="opacity-40">·</span>
                                <span>{post.author_name}</span>
                              </>
                            )}
                          </div>
                        )}
                        <h2 className="text-lg font-semibold text-foreground mb-1.5">{post.title}</h2>
                        {post.excerpt && (
                          <p className="text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                        )}
                      </div>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default BlogPage;
