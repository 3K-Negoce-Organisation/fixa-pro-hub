import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { BlogArticleTemplate } from "@/components/blog/BlogArticleTemplate";
import { Button } from "@/components/ui/button";
import {
  blogPostShareUrl,
  fetchPublishedBlogPostBySlug,
  getBlogCoverUrl,
  getBlogSeoDescription,
  getBlogSeoTitle,
} from "@/lib/blog";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

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

  const title = getBlogSeoTitle(post, SITE_NAME);
  const description = getBlogSeoDescription(post);
  const canonical = blogPostShareUrl(post.slug);
  const cover = getBlogCoverUrl(post);

  return (
    <PageBackground>
      <PageSeo
        title={title}
        description={description}
        canonical={canonical}
        ogImage={cover || undefined}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
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
          image: cover || undefined,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": canonical,
          },
          articleSection: post.blog_categories?.name,
          url: canonical,
        }}
      />
      <Header />
      <main className="flex-1">
        <BlogArticleTemplate post={post} />
      </main>
      <Footer />
    </PageBackground>
  );
};

export default BlogPostPage;
