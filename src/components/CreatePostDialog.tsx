import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Upload, Link as LinkIcon, X, Image as ImageIcon, Video } from "lucide-react";

interface LinkPreview {
  title: string;
  description: string;
  image: string;
  site: string;
  url: string;
}

export const CreatePostDialog = () => {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Não autenticado");

    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("post-media")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("post-media")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const fetchLinkPreview = async (url: string) => {
    if (!url.trim() || !url.startsWith('http')) return;
    
    setLoadingPreview(true);
    try {
      const response = await fetch(
        `https://qufzfvwaavvkegfrgmzt.supabase.co/functions/v1/link-preview?url=${encodeURIComponent(url)}`
      );
      
      if (!response.ok) throw new Error("Falha ao buscar preview");
      
      const data = await response.json();
      setLinkPreview(data);
    } catch (error) {
      console.error("Error fetching link preview:", error);
      setLinkPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleMediaChange = (file: File | null) => {
    if (!file) {
      setMediaFile(null);
      setMediaType(null);
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      toast({
        title: "Erro",
        description: "Apenas imagens e vídeos são permitidos",
        variant: "destructive"
      });
      return;
    }

    // Check file size limits
    const maxSize = isImage ? 10 * 1024 * 1024 : 200 * 1024 * 1024; // 10MB for images, 200MB for videos
    if (file.size > maxSize) {
      toast({
        title: "Erro",
        description: `Arquivo muito grande. Máximo: ${isImage ? '10MB' : '200MB'}`,
        variant: "destructive"
      });
      return;
    }

    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");
  };

  const handleSubmit = async () => {
    // Validate: at least one field must be filled
    const hasCaption = caption.trim().length > 0;
    const hasMedia = mediaFile !== null;
    const hasLink = linkUrl.trim().length > 0 && linkPreview !== null;

    if (!hasCaption && !hasMedia && !hasLink) {
      toast({
        title: "Erro",
        description: "Adicione uma legenda, mídia ou link para publicar",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      let mediaUrl = null;
      let finalMediaType = null;

      if (mediaFile) {
        setUploadProgress(`Enviando ${mediaType === 'image' ? 'imagem' : 'vídeo'}...`);
        mediaUrl = await uploadFile(mediaFile);
        finalMediaType = mediaType;
      }

      // If posting a link, set media_type to 'link'
      if (linkUrl.trim() && linkPreview) {
        finalMediaType = 'link';
      }

      const { error } = await supabase.from("feed_posts").insert([{
        user_id: session.user.id,
        content: caption.trim() || " ",
        caption: caption.trim() || null,
        media_url: mediaUrl,
        media_type: finalMediaType,
        link_url: linkUrl.trim() || null,
        link_preview: linkPreview as any,
        post_type: "post"
      }]);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Post publicado com sucesso"
      });

      // Reset form
      setCaption("");
      setMediaFile(null);
      setMediaType(null);
      setLinkUrl("");
      setLinkPreview(null);
      setUploadProgress("");
      setOpen(false);
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível publicar o post",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  const isPublishEnabled = 
    caption.trim().length > 0 || 
    mediaFile !== null || 
    (linkUrl.trim().length > 0 && linkPreview !== null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Publicar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Criar Publicação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="caption">Legenda (opcional)</Label>
            <Textarea
              id="caption"
              placeholder="O que você quer compartilhar?"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Media Upload Section */}
          <div className="space-y-2">
            <Label>Mídia (opcional)</Label>
            {!mediaFile ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('media-upload')?.click()}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Imagem
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => document.getElementById('media-upload')?.click()}
                >
                  <Video className="mr-2 h-4 w-4" />
                  Vídeo
                </Button>
                <Input
                  id="media-upload"
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleMediaChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{mediaFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMediaChange(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Link Section */}
          <div className="space-y-2">
            <Label htmlFor="link">Link (opcional)</Label>
            <div className="flex gap-2">
              <Input
                id="link"
                type="url"
                placeholder="https://exemplo.com"
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  setLinkPreview(null);
                }}
                onBlur={(e) => fetchLinkPreview(e.target.value)}
              />
              {linkUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLinkUrl("");
                    setLinkPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {loadingPreview && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando preview...
              </div>
            )}

            {linkPreview && (
              <div className="border rounded-lg overflow-hidden">
                {linkPreview.image && (
                  <img 
                    src={linkPreview.image} 
                    alt={linkPreview.title}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-sm line-clamp-1">{linkPreview.title}</p>
                  {linkPreview.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {linkPreview.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    {linkPreview.site}
                  </p>
                </div>
              </div>
            )}
          </div>

          {uploadProgress && (
            <p className="text-sm text-muted-foreground text-center">{uploadProgress}</p>
          )}

          <Button 
            onClick={handleSubmit} 
            disabled={loading || !isPublishEnabled} 
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              "Publicar"
            )}
          </Button>
          
          {!isPublishEnabled && (
            <p className="text-xs text-center text-muted-foreground">
              Adicione uma legenda, mídia ou link para publicar
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
