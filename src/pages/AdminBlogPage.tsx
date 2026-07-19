import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Edit, Loader2, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
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
  fetchAdminBlogPosts,
  formatBlogDate,
  slugifyBlogTitle,
  type BlogPost,
} from "@/lib/blog";

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  author_name: string;
  is_published: boolean;
  published_at: string;
  sort_order: number;
}

const emptyForm: BlogFormData = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  author_name: "Vis-à-Bois",
  is_published: false,
  published_at: "",
  sort_order: 0,
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

const AdminBlogPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { siteId, siteSlug, loading: siteLoading } = useStorefrontSite();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogFormData>(emptyForm);
  const [slugManual, setSlugManual] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: posts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-blog-posts", siteId],
    queryFn: () => fetchAdminBlogPosts(siteId),
    enabled: !siteLoading && !!siteId,
  });

  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((prev) => ({ ...prev, slug: slugifyBlogTitle(prev.title) }));
    }
  }, [form.title, slugManual]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSlugManual(false);
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      cover_image_url: post.cover_image_url ?? "",
      author_name: post.author_name || "Vis-à-Bois",
      is_published: post.is_published,
      published_at: toDatetimeLocalValue(post.published_at),
      sort_order: post.sort_order ?? 0,
    });
    setSlugManual(true);
    setDialogOpen(true);
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
    queryClient.invalidateQueries({ queryKey: ["blog-posts-sidebar"] });
    queryClient.invalidateQueries({ queryKey: ["blog-post"] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!siteId) throw new Error("Site non chargé");
      if (!form.title.trim() || !form.slug.trim()) {
        throw new Error("Titre et slug obligatoires");
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
        author_name: form.author_name.trim() || "Vis-à-Bois",
        is_published: form.is_published,
        published_at: publishedAt,
        sort_order: Number.isFinite(form.sort_order) ? form.sort_order : 0,
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
      toast({
        title: editing ? "Article mis à jour" : "Article créé",
      });
      setDialogOpen(false);
      invalidate();
    },
    onError: (err: Error) => {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
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
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("blog-images").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, cover_image_url: data.publicUrl }));
      toast({ title: "Image téléversée" });
    } catch (err) {
      toast({
        title: "Erreur d'upload",
        description: err instanceof Error ? err.message : "Échec du téléversement",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Blog — {siteSlug || "site"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Créez et publiez les articles affichés sur l&apos;accueil et la page /blog.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button size="sm" onClick={openCreate} disabled={!siteId}>
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
                    <TableHead>Slug</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Publication</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        Aucun article. Créez le premier pour alimenter le blog.
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => (
                      <TableRow key={post.id}>
                        <TableCell className="font-medium max-w-[240px] truncate">
                          {post.title}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {post.slug}
                        </TableCell>
                        <TableCell>
                          {post.is_published ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/15">
                              Publié
                            </Badge>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(post.id)}
                          >
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
      </main>
      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Modifier l'article" : "Nouvel article"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="blog-title">Titre</Label>
              <Input
                id="blog-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Titre de l'article"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-slug">Slug URL</Label>
              <Input
                id="blog-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugManual(true);
                  setForm((p) => ({ ...p, slug: e.target.value }));
                }}
                placeholder="mon-article"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">URL : /blog/{form.slug || "…"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-excerpt">Chapô</Label>
              <Textarea
                id="blog-excerpt"
                value={form.excerpt}
                onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                rows={2}
                placeholder="Résumé court affiché dans la liste et la sidebar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="blog-content">Contenu (Markdown léger)</Label>
              <Textarea
                id="blog-content"
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                rows={12}
                placeholder={"## Titre\n\nParagraphe avec **gras** et [lien](/produits).\n\n- liste"}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Image de couverture</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={form.cover_image_url}
                  onChange={(e) => setForm((p) => ({ ...p, cover_image_url: e.target.value }))}
                  placeholder="URL de l'image"
                  className="flex-1 min-w-[200px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById("blog-cover-upload")?.click()}
                >
                  {uploading ? (
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
                  onChange={handleCoverUpload}
                  disabled={uploading}
                />
                {form.cover_image_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setForm((p) => ({ ...p, cover_image_url: "" }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {form.cover_image_url && (
                <img
                  src={form.cover_image_url}
                  alt=""
                  className="mt-2 h-28 w-full max-w-sm object-cover rounded-md border border-border"
                />
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blog-author">Auteur</Label>
                <Input
                  id="blog-author"
                  value={form.author_name}
                  onChange={(e) => setForm((p) => ({ ...p, author_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="blog-sort">Ordre d&apos;affichage</Label>
                <Input
                  id="blog-sort"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, sort_order: Number(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="blog-published-at">Date de publication</Label>
                <Input
                  id="blog-published-at"
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
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
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
              Cette action est définitive. L&apos;article disparaîtra du blog et de l&apos;accueil.
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
