import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Copy,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import {
  BLOG_AUDIENCE_LABELS,
  BLOG_CTA_PRESETS,
  blogPostShareUrl,
  fetchAdminBlogPosts,
  fetchBlogCategories,
  fetchNewsletterMonthExport,
  formatBlogDate,
  newsletterExportToMarkdown,
  slugifyBlogTitle,
  type BlogAudience,
  type BlogCtaType,
  type BlogPostWithCategory,
} from "@/lib/blog";

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  cover_image_pinterest_url: string;
  author_name: string;
  category_id: string;
  audience: BlogAudience;
  meta_title: string;
  meta_description: string;
  cta_type: BlogCtaType;
  cta_label: string;
  cta_url: string;
  is_published: boolean;
  published_at: string;
}

const emptyForm: BlogFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  cover_image_pinterest_url: "",
  author_name: "Vis-à-Bois",
  category_id: "",
  audience: "particulier",
  meta_title: "",
  meta_description: "",
  cta_type: "catalogue",
  cta_label: "",
  cta_url: "",
  is_published: false,
  published_at: "",
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function uploadBlogImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("blog-images").upload(fileName, file);
  if (error) throw error;
  return supabase.storage.from("blog-images").getPublicUrl(fileName).data.publicUrl;
}

const AdminBlogPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { siteId, siteSlug, loading: siteLoading } = useStorefrontSite();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BlogPostWithCategory | null>(null);
  const [form, setForm] = useState<BlogFormData>(emptyForm);
  const [slugManual, setSlugManual] = useState(false);
  const [uploadingField, setUploadingField] = useState<"cover" | "pinterest" | null>(null);

  const now = new Date();
  const [nlYear, setNlYear] = useState(now.getFullYear());
  const [nlMonth, setNlMonth] = useState(now.getMonth() + 1);

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-blog-categories", siteId],
    queryFn: () => fetchBlogCategories(siteId, { includeInactive: true }),
    enabled: !siteLoading && !!siteId,
  });

  const activeCategories = useMemo(
    () => categories.filter((c) => c.is_active),
    [categories],
  );

  const { data: posts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-blog-posts", siteId],
    queryFn: () => fetchAdminBlogPosts(siteId),
    enabled: !siteLoading && !!siteId,
  });

  const {
    data: newsletterItems = [],
    isFetching: nlFetching,
    refetch: refetchNewsletter,
  } = useQuery({
    queryKey: ["admin-blog-newsletter", siteId, nlYear, nlMonth],
    queryFn: () => fetchNewsletterMonthExport(siteId, nlYear, nlMonth),
    enabled: !siteLoading && !!siteId,
  });

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: slugifyBlogTitle(prev.title) }));
    }
  }, [form.title, slugManual]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category_id: activeCategories[0]?.id ?? "",
    });
    setSlugManual(false);
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPostWithCategory) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      cover_image_url: post.cover_image_url ?? "",
      cover_image_pinterest_url: post.cover_image_pinterest_url ?? "",
      author_name: post.author_name || "Vis-à-Bois",
      category_id: post.category_id ?? "",
      audience: (post.audience as BlogAudience) || "particulier",
      meta_title: post.meta_title ?? "",
      meta_description: post.meta_description ?? "",
      cta_type: (post.cta_type as BlogCtaType) || "catalogue",
      cta_label: post.cta_label ?? "",
      cta_url: post.cta_url ?? "",
      is_published: post.is_published,
      published_at: toDatetimeLocalValue(post.published_at),
    });
    setSlugManual(true);
    setDialogOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    queryClient.invalidateQueries({ queryKey: ["admin-blog-newsletter"] });
    queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    queryClient.invalidateQueries({ queryKey: ["blog-posts-sidebar"] });
    queryClient.invalidateQueries({ queryKey: ["blog-post"] });
    queryClient.invalidateQueries({ queryKey: ["blog-categories"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!siteId) throw new Error("Site non chargé");
      if (!form.title.trim() || !form.slug.trim()) {
        throw new Error("Titre et slug obligatoires");
      }
      if (!form.category_id) {
        throw new Error("Choisissez une catégorie (format de publication)");
      }

      const publishedAt =
        fromDatetimeLocalValue(form.published_at) ||
        (form.is_published ? new Date().toISOString() : null);

      const payload = {
        site_id: siteId,
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        cover_image_url: form.cover_image_url.trim() || null,
        cover_image_pinterest_url: form.cover_image_pinterest_url.trim() || null,
        author_name: form.author_name.trim() || "Vis-à-Bois",
        category_id: form.category_id,
        audience: form.audience,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || form.excerpt.trim() || null,
        cta_type: form.cta_type,
        cta_label: form.cta_label.trim() || null,
        cta_url: form.cta_url.trim() || null,
        is_published: form.is_published,
        published_at: publishedAt,
      };

      if (editing) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editing ? "Article mis à jour" : "Article créé" });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Article supprimé" });
      setDeleteId(null);
      invalidate();
    },
    onError: (err: Error) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "cover_image_url" | "cover_image_pinterest_url",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Fichier invalide", description: "Choisissez une image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "Maximum 5 Mo.", variant: "destructive" });
      return;
    }

    setUploadingField(field === "cover_image_url" ? "cover" : "pinterest");
    try {
      const url = await uploadBlogImage(file);
      setForm((prev) => ({ ...prev, [field]: url }));
      toast({ title: "Image téléversée" });
    } catch (err) {
      toast({
        title: "Erreur d'upload",
        description: err instanceof Error ? err.message : "Échec",
        variant: "destructive",
      });
    } finally {
      setUploadingField(null);
      e.target.value = "";
    }
  };

  const monthLabel = useMemo(
    () =>
      new Date(nlYear, nlMonth - 1, 1).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
      }),
    [nlYear, nlMonth],
  );

  const copyNewsletter = async (format: "json" | "markdown") => {
    const payload =
      format === "json"
        ? JSON.stringify(newsletterItems, null, 2)
        : newsletterExportToMarkdown(newsletterItems, monthLabel);
    await navigator.clipboard.writeText(payload);
    toast({
      title: "Copié",
      description:
        format === "json"
          ? "Export JSON (titre, visuel, résumé, lien) dans le presse-papiers."
          : "Export Markdown newsletter dans le presse-papiers.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Blog — {siteSlug || "site"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Formats : Astuce du jour, Avant/Après, Conseil du pro. Rythme cible : 1 article / semaine.
                Chaque article alimente Facebook, GBP, Pinterest et la newsletter.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button size="sm" onClick={openCreate} disabled={!siteId || activeCategories.length === 0}>
                <Plus className="h-4 w-4 mr-1" />
                Nouvel article
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || siteLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titre</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Cible</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Publication</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Aucun article. Créez le premier (1 / semaine).
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium max-w-[220px]">
                          <div className="truncate">{post.title}</div>
                          <a
                            href={blogPostShareUrl(post.slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-mono text-muted-foreground hover:underline"
                          >
                            /blog/{post.slug}
                          </a>
                        </TableCell>
                        <TableCell className="text-sm">
                          {post.blog_categories?.name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {BLOG_AUDIENCE_LABELS[(post.audience as BlogAudience)] ?? post.audience}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {post.is_published ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/15">Publié</Badge>
                          ) : (
                            <Badge variant="secondary">Brouillon</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatBlogDate(post.published_at) || "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(post.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export newsletter du mois</CardTitle>
            <p className="text-sm text-muted-foreground">
              Récupère titre + visuel + résumé + lien stable pour compiler les ~4 articles du mois
              (Facebook / GBP / Pinterest / newsletter — une seule source).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Mois</Label>
                <Select
                  value={String(nlMonth)}
                  onValueChange={(v) => setNlMonth(Number(v))}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2026, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Année</Label>
                <Input
                  type="number"
                  className="w-[100px]"
                  value={nlYear}
                  onChange={(e) => setNlYear(Number(e.target.value) || now.getFullYear())}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchNewsletter()} disabled={nlFetching}>
                {nlFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyNewsletter("json")}
                disabled={newsletterItems.length === 0}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copier JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyNewsletter("markdown")}
                disabled={newsletterItems.length === 0}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copier Markdown
              </Button>
            </div>

            {newsletterItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun article publié en {monthLabel}.
              </p>
            ) : (
              <ul className="space-y-3">
                {newsletterItems.map((item) => (
                  <li
                    key={item.url}
                    className="flex gap-3 rounded-md border border-border p-3 text-sm"
                  >
                    {item.coverImageUrl && (
                      <img
                        src={item.coverImageUrl}
                        alt=""
                        className="h-16 w-24 object-cover rounded border border-border shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-muted-foreground line-clamp-2">{item.excerpt || "—"}</p>
                      <a href={item.url} className="text-xs text-primary hover:underline break-all">
                        {item.url}
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Format (catégorie)</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, category_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un format" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cible (ton)</Label>
                <Select
                  value={form.audience}
                  onValueChange={(v) => setForm((p) => ({ ...p, audience: v as BlogAudience }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particuliers</SelectItem>
                    <SelectItem value="professionnel">Professionnels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-title">Titre</Label>
              <Input
                id="blog-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-slug">URL stable (slug)</Label>
              <Input
                id="blog-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm((p) => ({ ...p, slug: e.target.value }));
                }}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Lien partageable : {blogPostShareUrl(form.slug || "…")}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Chapô / résumé (newsletter, réseaux)</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Contenu (Markdown léger)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                rows={10}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Visuel principal (gabarit article / FB / GBP)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))}
                  placeholder="URL"
                  className="flex-1 min-w-[180px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!!uploadingField}
                  onClick={() => document.getElementById("blog-cover-upload")?.click()}
                >
                  {uploadingField === "cover" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload
                </Button>
                <input
                  id="blog-cover-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "cover_image_url")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Visuel Pinterest (format vertical 2:3)</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={form.cover_image_pinterest_url}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cover_image_pinterest_url: e.target.value }))
                  }
                  placeholder="URL 2:3"
                  className="flex-1 min-w-[180px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!!uploadingField}
                  onClick={() => document.getElementById("blog-pinterest-upload")?.click()}
                >
                  {uploadingField === "pinterest" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload
                </Button>
                <input
                  id="blog-pinterest-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, "cover_image_pinterest_url")}
                />
                {form.cover_image_pinterest_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setForm((p) => ({ ...p, cover_image_pinterest_url: "" }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {form.cover_image_pinterest_url && (
                <img
                  src={form.cover_image_pinterest_url}
                  alt=""
                  className="mt-2 h-40 w-[106px] object-cover rounded-md border border-border"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SEO title (optionnel)</Label>
                <Input
                  value={form.meta_title}
                  onChange={(e) => setForm((p) => ({ ...p, meta_title: e.target.value }))}
                  placeholder="Par défaut : Titre — Vis-à-Bois"
                />
              </div>
              <div className="space-y-2">
                <Label>SEO description (optionnel)</Label>
                <Input
                  value={form.meta_description}
                  onChange={(e) => setForm((p) => ({ ...p, meta_description: e.target.value }))}
                  placeholder="Par défaut : chapô"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>CTA fin d&apos;article</Label>
                <Select
                  value={form.cta_type}
                  onValueChange={(v) => setForm((p) => ({ ...p, cta_type: v as BlogCtaType }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="catalogue">
                      Catalogue ({BLOG_CTA_PRESETS.catalogue.label})
                    </SelectItem>
                    <SelectItem value="devis">Devis ({BLOG_CTA_PRESETS.devis.label})</SelectItem>
                    <SelectItem value="avis">Avis ({BLOG_CTA_PRESETS.avis.label})</SelectItem>
                    <SelectItem value="custom">Personnalisé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Libellé CTA (optionnel)</Label>
                <Input
                  value={form.cta_label}
                  onChange={(e) => setForm((p) => ({ ...p, cta_label: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>URL CTA (optionnel)</Label>
                <Input
                  value={form.cta_url}
                  onChange={(e) => setForm((p) => ({ ...p, cta_url: e.target.value }))}
                  placeholder="/produits"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label>Date de publication</Label>
                <Input
                  type="datetime-local"
                  value={form.published_at}
                  onChange={(e) => setForm((p) => ({ ...p, published_at: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <Label htmlFor="blog-published" className="cursor-pointer">
                  Publié
                </Label>
                <Switch
                  id="blog-published"
                  checked={form.is_published}
                  onCheckedChange={(checked) =>
                    setForm((p) => ({
                      ...p,
                      is_published: checked,
                      published_at:
                        checked && !p.published_at
                          ? toDatetimeLocalValue(new Date().toISOString())
                          : p.published_at,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;URL de partage ne fonctionnera plus. Action définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBlogPage;
