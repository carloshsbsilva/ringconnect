import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Image as ImageIcon, Video, Link, X } from "lucide-react";

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  onPostUpdated?: () => void;
}

export const EditPostDialog = ({ open, onOpenChange, postId, onPostUpdated }: EditPostDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | "link" | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && postId) {
      loadPost();
    }
  }, [open, postId]);

  const loadPost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feed_posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;

      setContent(data.content || "");
      setMediaUrl(data.media_url || "");
      setMediaType(data.media_type as any);
      setLinkUrl(data.link_url || "");
    } catch (error) {
      console.error("Error loading post:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = async (file: File, type: "image" | "video") => {
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("post-media")
        .getPublicUrl(filePath);

      setMediaUrl(publicUrl);
      setMediaType(type);
      setLinkUrl("");
    } catch (error) {
      console.error("Error uploading media:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da mídia",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file, "image");
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file, "video");
    }
  };

  const handleAddLink = () => {
    if (linkUrl) {
      setMediaType("link");
      setMediaUrl("");
    }
  };

  const handleRemoveMedia = () => {
    setMediaUrl("");
    setMediaType(null);
    setLinkUrl("");
  };

  const handleSave = async () => {
    if (!content.trim() && !mediaUrl && !linkUrl) {
      toast({
        title: "Erro",
        description: "Adicione algum conteúdo ao post",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        content,
        media_type: mediaType,
        media_url: mediaUrl || null,
        link_url: linkUrl || null,
      };

      const { error } = await supabase
        .from("feed_posts")
        .update(updateData)
        .eq("id", postId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Post atualizado com sucesso!",
      });

      onOpenChange(false);
      onPostUpdated?.();
    } catch (error) {
      console.error("Error updating post:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o post",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Publicação</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="O que você quer compartilhar?"
                rows={4}
              />
            </div>

            {mediaUrl && (
              <div className="relative">
                {mediaType === "image" && (
                  <img src={mediaUrl} alt="Preview" className="w-full rounded-lg max-h-64 object-cover" />
                )}
                {mediaType === "video" && (
                  <video src={mediaUrl} controls className="w-full rounded-lg max-h-64" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {linkUrl && !mediaUrl && (
              <div className="relative p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground break-all">{linkUrl}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {!mediaUrl && !linkUrl && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Adicionar mídia</Label>
                  <div className="flex gap-2">
                    <Label htmlFor="image-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent">
                        <ImageIcon className="h-4 w-4" />
                        Imagem
                      </div>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                    </Label>

                    <Label htmlFor="video-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent">
                        <Video className="h-4 w-4" />
                        Vídeo
                      </div>
                      <Input
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleVideoUpload}
                        disabled={uploading}
                      />
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link-url">Ou adicione um link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="link-url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <Button onClick={handleAddLink} variant="outline">
                      <Link className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || uploading}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
