import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { BlogContent } from "@/components/blog/BlogContent";
import { Button } from "@/components/ui/button";
import {
  fetchPublishedBlogPostBySlug,
  formatBlogDate,
} from "@/lib/blog";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { siteId, loading: siteLoading } = useStorefrontSite();

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blog-post", siteId, slug],
    queryFn: () => fetchPublishedBlogPostBySlug(siteId, slug ?? ""),
    enabled: !siteLoading && !!siteId && !!slug,
  });

  if (isLoading || siteLoading) {
    return (
      <PageBackground>
        <Header />
        <main className="flex-1">
          <div className="container py-10 max-w-3xl animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </main>
        <Footer />
      </PageBackground>
    );
  }

  if (isError || !post) {
    return (
      <PageBackground>
        <Header />
        <main className="flex-1">
          <div className="container py-16 max-w-3xl text-center">
            <h1 className="text-2xl font-bold mb-3">Article introuvable</h1>
            <p className="text-muted-foreground mb-6">
              Cet article n&apos;existe pas ou n&apos;est plus publié.
            </p>
            <Button asChild>
              <Link to="/blog">Retour au blog</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </PageBackground>
    );
  }

  const description =
    post.excerpt?.trim() ||
    post.content.replace(/[#*_`\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
  const canonical = absoluteUrl(`/blog/${post.slug}`);

  return (
    <PageBackground>
      <PageSeo
        title={`${post.title} — ${SITE_NAME}`}
        description={description}
        canonical={canonical}
        ogImage={post.cover_image_url || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description,
          datePublished: post.published_at ?? undefined,
          dateModified: post.updated_at,
          author: {
            "@type": "Organization",
            name: post.author_name || SITE_NAME,
          },
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
          },
          image: post.cover_image_url || undefined,
          mainEntityOfPage: canonical,
        }}
      />
      <Header />
      <main className="flex-1">
        <article className="container py-10 md:py-14 max-w-3xl">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Blog
            </Link>
          </Button>

          <header className="mb-8">
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

          {post.cover_image_url && (
            <div className="mb-8 rounded-lg overflow-hidden border border-border aspect-[16/9] bg-muted">
              <img
                src={post.cover_image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {post.excerpt && (
            <p className="text-lg text-muted-foreground mb-8 border-l-2 border-primary/40 pl-4">
              {post.excerpt}
            </p>
          )}

          <BlogContent content={post.content} />
        </article>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default BlogPostPage;
