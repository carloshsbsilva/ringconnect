import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SharePostDialogProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onShared?: () => void;
}

export const SharePostDialog = ({
  postId,
  isOpen,
  onClose,
  onShared,
}: SharePostDialogProps) => {
  const [caption, setCaption] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    try {
      setIsSharing(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive",
        });
        return;
      }

      const trimmed = caption.trim();

      const { error } = await supabase.from("feed_posts").insert({
        user_id: session.user.id,
        caption: trimmed || null,
        shared_from_post_id: postId,
        post_type: "shared",
        content: trimmed || "",
      });

      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }

      toast({
        title: "Round compartilhado!",
        description: "Sua publicação foi compartilhada com sucesso",
      });

      setCaption("");
      onClose();
      onShared?.();
    } catch (error) {
      console.error("Error sharing post:", error);
      toast({
        title: "Erro ao compartilhar",
        description:
          error && typeof error === "object"
            ? // @ts-ignore
              (error.message as string) ||
              "Não foi possível compartilhar a publicação"
            : "Não foi possível compartilhar a publicação",
        variant: "destructive",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="
          sm:max-w-[500px]
          rounded-2xl
          bg-white
          border border-slate-200
          shadow-xl
          p-6
        "
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            🔁 Compartilhar Round
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600">
            Adicione um comentário (opcional) antes de compartilhar esse round.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-3">
          <Textarea
            placeholder="Adicionar comentário ao seu round (opcional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px] rounded-xl bg-slate-50 text-sm"
          />

          <div className="flex gap-2 justify-end pt-1">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSharing}
              className="rounded-xl"
            >
              Cancelar
            </Button>

            <Button
              onClick={handleShare}
              disabled={isSharing}
              className="rounded-xl"
            >
              {isSharing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Compartilhando...
                </>
              ) : (
                "Compartilhar"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SharePostDialog;
