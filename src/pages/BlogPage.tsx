import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { Button } from "@/components/ui/button";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { fetchBlogCategories, fetchPublishedBlogPosts } from "@/lib/blog";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

const BlogPage = () => {
  const seo = STATIC_PAGE_SEO.blog;
  const [searchParams, setSearchParams] = useSearchParams();
  const categorySlug = searchParams.get("category") || undefined;
  const { siteId, loading: siteLoading } = useStorefrontSite();

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories", siteId],
    queryFn: () => fetchBlogCategories(siteId),
    enabled: !siteLoading && !!siteId,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts", siteId, categorySlug ?? "all"],
    queryFn: () => fetchPublishedBlogPosts(siteId, { categorySlug }),
    enabled: !siteLoading && !!siteId,
  });

  const activeCategoryName = useMemo(
    () => categories.find((c) => c.slug === categorySlug)?.name,
    [categories, categorySlug],
  );

  const setCategory = (slug?: string) => {
    if (!slug) {
      setSearchParams({});
      return;
    }
    setSearchParams({ category: slug });
  };

  return (
    <PageBackground>
      <PageSeo
        title={
          activeCategoryName
            ? `${activeCategoryName} — Blog ${SITE_NAME}`
            : seo.title
        }
        description={seo.description}
        canonical={staticPageCanonical(
          categorySlug ? `/blog?category=${categorySlug}` : seo.path,
        )}
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
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Astuces, avant/après et conseils de pro — un article par semaine pour choisir et poser
            vos vis à bois. Contenu décliné ensuite sur Facebook, Google Business, Pinterest et la
            newsletter.
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            <Button
              size="sm"
              variant={!categorySlug ? "default" : "outline"}
              className={cn(!categorySlug && "bg-primary")}
              onClick={() => setCategory(undefined)}
            >
              Tous
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                variant={categorySlug === cat.slug ? "default" : "outline"}
                className={cn(categorySlug === cat.slug && "bg-primary")}
                onClick={() => setCategory(cat.slug)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

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
            <p className="text-muted-foreground">
              Aucun article dans cette catégorie pour le moment.{" "}
              <Link to="/blog" className="text-primary underline underline-offset-2">
                Voir tout le blog
              </Link>
            </p>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => (
                <li key={post.id}>
                  <BlogPostCard post={post} />
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
