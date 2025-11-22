import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";

export interface TorcidaButtonProps {
  targetUserId: string;
  /** Chamado após seguir/deixar de seguir para recarregar contadores no perfil */
  onChange?: (isNowFollowing: boolean) => void; // <- AJUSTE AQUI
}

export const TorcidaButton = ({ targetUserId, onChange }: TorcidaButtonProps) => {
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Usar supabase sem tipos para a tabela user_follows
  const supabaseAny = supabase as any;

  useEffect(() => {
    checkAuthAndFollowing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  const checkAuthAndFollowing = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setCurrentUserId(null);
        setIsFollowing(false);
        setLoading(false);
        return;
      }

      setCurrentUserId(session.user.id);

      if (!targetUserId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabaseAny
        .from("user_follows")
        .select("id")
        .eq("follower_user_id", session.user.id)
        .eq("followed_user_id", targetUserId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao verificar torcida:", error);
      }

      setIsFollowing(!!data);
    } catch (error) {
      console.error("Erro ao verificar torcida:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!currentUserId) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para torcer por alguém.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isFollowing) {
        // DEIXAR DE TORCER
        const { error } = await supabaseAny
          .from("user_follows")
          .delete()
          .eq("follower_user_id", currentUserId)
          .eq("followed_user_id", targetUserId);

        if (error) throw error;

        setIsFollowing(false);
        onChange?.(false); // <- AGORA MANDA false PRO PAI

        toast({
          title: "Você deixou de torcer",
          description: "Você não está mais na torcida dessa pessoa.",
        });
      } else {
        // PASSAR A TORCER
        const { error } = await supabaseAny.from("user_follows").insert({
          follower_user_id: currentUserId,
          followed_user_id: targetUserId,
        });

        if (error) throw error;

        setIsFollowing(true);
        onChange?.(true); // <- AGORA MANDA true PRO PAI

        toast({
          title: "Agora você está na torcida!",
          description: "Você começou a torcer por esse usuário.",
        });
      }
    } catch (error) {
      console.error("Erro ao alternar torcida:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua torcida.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={loading || !targetUserId || !currentUserId}
      className="w-full"
    >
      {loading
        ? "Carregando..."
        : isFollowing
        ? "Deixar de torcer"
        : "Torcer"}
    </Button>
  );
};
