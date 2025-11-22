import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostReactions } from "./PostReactions";
import { PostComments } from "./PostComments";
import { supabase } from "@/integrations/supabase/client";
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
import { Button } from "@/components/ui/button";
import { Trash2, MoreVertical, Pencil, Repeat2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageLightbox } from "./ImageLightbox";
import { SharePostDialog } from "./SharePostDialog";
import { PostReactionsList } from "./PostReactionsList";

interface FeedPostProps {
  post: {
    id: string;
    user_id: string;
    content: string;
    caption?: string | null;
    media_url?: string | null;
    media_type?: string | null;
    image_url?: string | null;
    video_url?: string | null;
    link_url?: string | null;
    link_preview?: any;
    created_at: string;
    shared_from_post_id?: string | null;
    post_type?: string | null;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  currentUserId: string | null;
  onPostDeleted?: () => void;
  onPostEdit?: (postId: string) => void;
  sharedPost?: {
    id: string;
    author_name: string;
    author_avatar: string | null;
    content: string;
    media_url: string | null;
    media_type: string | null;
  } | null;
}

interface LinkPreview {
  title: string;
  description: string;
  image: string;
}

interface SharedPostData {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string | null;
  content: string;
  media_url: string | null;
  media_type: string | null;
}

// resumo de reações mostrado embaixo do post
interface ReactionSummary {
  count: number;
  topReactionKey: string | null;
}

// mesmos keys da coluna reaction_type
const REACTION_EMOJIS: Record<string, string> = {
  gowild: "🔥",
  cleanhit: "🥊",
  championmove: "🏆",
  ontarget: "🎯",
  tooheavy: "😤",
};

export const FeedPost = ({
  post,
  currentUserId,
  onPostDeleted,
  onPostEdit,
  sharedPost,
}: FeedPostProps) => {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionSummary, setReactionSummary] = useState<ReactionSummary>({
    count: 0,
    topReactionKey: null,
  });

  const { toast } = useToast();
  const isOwner = currentUserId === post.user_id;

  const [sharedPostData, setSharedPostData] = useState<SharedPostData | null>(null);
  const [shareCount, setShareCount] = useState(0);

  const mediaUrl = (post as any).media_url || post.image_url || post.video_url;
  const mediaType = (post as any).media_type;
  const linkPreview: LinkPreview | undefined = (post as any).link_preview;
  const caption = (post as any).caption || post.content;

  const effectiveSharedPost: SharedPostData | null = (sharedPost as any) || sharedPostData;

  // helper pra atualizar o resumo de reações
  const refreshReactionSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("reaction_type")
        .eq("post_id", post.id);

      if (error) {
        console.error("Erro ao buscar resumo de reações:", error);
        return;
      }

      if (!data || data.length === 0) {
        setReactionSummary({ count: 0, topReactionKey: null });
        return;
      }

      const counts: Record<string, number> = {};
      for (const row of data as any[]) {
        const key = row.reaction_type as string;
        counts[key] = (counts[key] || 0) + 1;
      }

      let topReactionKey: string | null = null;
      let topCount = 0;
      Object.entries(counts).forEach(([key, value]) => {
        if (value > topCount) {
          topCount = value;
          topReactionKey = key;
        }
      });

      setReactionSummary({ count: data.length, topReactionKey });
    } catch (err) {
      console.error("Erro inesperado no resumo de reações:", err);
    }
  };

  // 🔹 Carrega reação atual do usuário
  useEffect(() => {
    if (!currentUserId) return;

    const loadReaction = async () => {
      const { data, error } = await supabase
        .from("post_reactions")
        .select("reaction_type")
        .eq("post_id", post.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar reação do usuário:", error);
        return;
      }

      if (data?.reaction_type) {
        setUserReaction(data.reaction_type as string);
      } else {
        setUserReaction(null);
      }
    };

    loadReaction();
  }, [post.id, currentUserId]);

  // 🔹 Carrega resumo total de reações
  useEffect(() => {
    refreshReactionSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  // 🔹 Lógica de reação (salva / remove / notifica)
  const handleReaction = async (reactionKey: string | null) => {
    if (!currentUserId) {
      toast({
        title: "Entre para reagir",
        description: "Você precisa estar logado para reagir ao round.",
        variant: "destructive",
      });
      return;
    }

    try {
      // clicar na mesma reação de novo (ou null) → remove
      if (reactionKey === null || reactionKey === userReaction) {
        const { error } = await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        setUserReaction(null);
        await refreshReactionSummary();
        return;
      }

      // upsert com reaction_type (conforme CHECK valid_reaction)
      const { error: upsertError } = await supabase.from("post_reactions").upsert(
        {
          post_id: post.id,
          user_id: currentUserId,
          reaction_type: reactionKey, // gowild / cleanhit / championmove / ontarget / tooheavy
        } as any,
      );

      if (upsertError) throw upsertError;

      setUserReaction(reactionKey);
      await refreshReactionSummary();

      // notificação pro dono do post (se não for o próprio)
      if (post.user_id !== currentUserId) {
        const reactionLabelMap: Record<string, string> = {
          gowild: "🔥 Go Wild",
          cleanhit: "🥊 Clean Hit",
          championmove: "🏆 Champion’s Move",
          ontarget: "🎯 On Target",
          tooheavy: "😤 Too Heavy",
        };

        const content = `reagiu ao seu round com ${
          reactionLabelMap[reactionKey] || "uma reação"
        }`;

        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: post.user_id, // dono do post
          actor_id: currentUserId, // quem reagiu
          type: "post_reaction", // tem que existir no CHECK da notifications
          related_post_id: post.id,
          related_user_id: currentUserId,
          related_sparring_id: null,
          training_log_id: null,
          content,
          read: false,
        });

        if (notifError) {
          console.error("Erro ao criar notificação de reação:", notifError);
        }
      }
    } catch (error) {
      console.error("Erro ao reagir:", error);
      toast({
        title: "Erro ao reagir",
        description: "Não foi possível registrar sua reação.",
        variant: "destructive",
      });
    }
  };

  // carrega post original quando for compartilhado
  useEffect(() => {
    const fetchSharedPost = async () => {
      if (!post.shared_from_post_id) return;

      const { data, error } = await supabase
        .from("feed_posts")
        .select(
          `
          id,
          user_id,
          content,
          caption,
          media_url,
          media_type,
          profiles:profiles (
            full_name,
            avatar_url
          )
        `,
        )
        .eq("id", post.shared_from_post_id)
        .single();

      if (error) {
        console.error("Erro ao carregar post original:", error);
        return;
      }

      if (data) {
        setSharedPostData({
          id: data.id,
          author_id: data.user_id,
          author_name: (data as any).profiles.full_name,
          author_avatar: (data as any).profiles.avatar_url,
          content: data.caption || data.content,
          media_url: (data as any).media_url ?? null,
          media_type: (data as any).media_type ?? null,
        });
      }
    };

    fetchSharedPost();
  }, [post.shared_from_post_id]);

  // conta quantos rounds esse post teve
  useEffect(() => {
    const fetchShareCount = async () => {
      const { count, error } = await supabase
        .from("feed_posts")
        .select("*", { count: "exact", head: true })
        .eq("shared_from_post_id", post.id);

      if (error) {
        console.error("Erro ao buscar share count:", error);
        return;
      }

      setShareCount(count ?? 0);
    };

    fetchShareCount();
  }, [post.id]);

  // 🔹 deletar post
  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("feed_posts").delete().eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Post excluído com sucesso",
      });

      setShowDeleteDialog(false);
      onPostDeleted?.();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o post",
        variant: "destructive",
      });
    }
  };

  // imagem 4:5 padrão
  const renderImage45 = (url: string, onClick?: any) => (
    <div
      className="w-full aspect-[4/5] overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
      onClick={onClick}
    >
      <img src={url} alt="Post" className="w-full h-full object-cover" />
    </div>
  );

  const renderMedia = () => {
    if (mediaType === "image" && mediaUrl) {
      return renderImage45(mediaUrl, () => setLightboxImage(mediaUrl));
    }

    if (mediaType === "video" && mediaUrl) {
      return (
        <video src={mediaUrl} controls playsInline className="w-full rounded-lg max-h-96">
          Seu navegador não suporta vídeos.
        </video>
      );
    }

    if (mediaType === "link" && linkPreview) {
      return (
        <a
          href={post.link_url || "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="block border rounded-lg overflow-hidden hover:bg-accent transition-colors"
        >
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
            <p className="text-xs text-muted-foreground">
              {(linkPreview as any).site ||
                (post.link_url ? new URL(post.link_url).hostname : "")}
            </p>
          </div>
        </a>
      );
    }

    if (post.image_url) {
      return renderImage45(post.image_url);
    }

    if (post.video_url) {
      if (
        post.video_url.includes("youtube.com") ||
        post.video_url.includes("youtu.be")
      ) {
        const videoId = post.video_url.includes("youtu.be")
          ? post.video_url.split("/").pop()
          : new URLSearchParams(new URL(post.video_url).search).get("v");

        return (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      return (
        <video src={post.video_url} controls playsInline className="w-full rounded-lg max-h-96">
          Seu navegador não suporta vídeos.
        </video>
      );
    }

    if (post.link_url && !post.image_url && !post.video_url) {
      return (
        <a
          href={post.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block p-4 border rounded-lg hover:bg-accent transition-colors"
        >
          <p className="text-sm text-primary break-all">{post.link_url}</p>
        </a>
      );
    }

    return null;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                className="cursor-pointer"
                onClick={() => navigate(`/profile/${post.user_id}`)}
              >
                <AvatarImage src={post.profiles.avatar_url || ""} />
                <AvatarFallback>{post.profiles.full_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <button
                  type="button"
                  className="font-semibold text-left hover:underline"
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                >
                  {post.profiles.full_name}
                </button>

                {post.shared_from_post_id && effectiveSharedPost && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Repeat2 className="h-3 w-3" />
                    <span>Round</span>
                    <button
                      type="button"
                      className="max-w-[120px] truncate text-[11px] text-slate-600 hover:underline text-left"
                      onClick={() =>
                        navigate(`/profile/${effectiveSharedPost.author_id}`)
                      }
                      title={effectiveSharedPost.author_name}
                    >
                      {effectiveSharedPost.author_name}
                    </button>
                  </p>
                )}

                <p className="text-sm text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>

                {(post as any).gyms && post.post_type === "training" && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    📍 {(post as any).gyms.name}
                  </p>
                )}
              </div>
            </div>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onPostEdit?.(post.id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar publicação
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir publicação
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {caption && <p className="whitespace-pre-wrap">{caption}</p>}

          {post.shared_from_post_id && effectiveSharedPost && (
            <div className="mb-2">
              <Card
                className="border-l-4 border-primary cursor-pointer"
                onClick={() => navigate(`/post/${effectiveSharedPost.id}`)}
              >
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar
                      className="h-6 w-6 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${effectiveSharedPost.author_id}`);
                      }}
                    >
                      <AvatarImage
                        src={effectiveSharedPost.author_avatar || undefined}
                      />
                      <AvatarFallback>
                        {effectiveSharedPost.author_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      type="button"
                      className="text-sm font-medium hover:underline text-left"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${effectiveSharedPost.author_id}`);
                      }}
                    >
                      {effectiveSharedPost.author_name}
                    </button>
                  </div>

                  <p className="text-sm">{effectiveSharedPost.content}</p>

                  {effectiveSharedPost.media_url &&
                    effectiveSharedPost.media_type === "image" &&
                    renderImage45(effectiveSharedPost.media_url, (e) => {
                      if (typeof e === "object") {
                        (e as any).stopPropagation?.();
                      }
                      setLightboxImage(effectiveSharedPost.media_url!);
                    })}

                  {effectiveSharedPost.media_url &&
                    effectiveSharedPost.media_type === "video" && (
                      <video
                        controls
                        className="w-full rounded-lg max-h-96"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <source src={effectiveSharedPost.media_url} />
                      </video>
                    )}
                </CardContent>
              </Card>
            </div>
          )}

          {!post.shared_from_post_id && renderMedia()}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {/* linha mostrando resumo de reações (clicável abre modal) */}
          {reactionSummary.count > 0 && (
            <button
              type="button"
              className="w-full flex items-center gap-1 text-xs text-slate-600 px-1 hover:underline text-left"
              onClick={() => setShowReactionsModal(true)}
            >
              <span className="text-sm">
                {reactionSummary.topReactionKey
                  ? REACTION_EMOJIS[reactionSummary.topReactionKey] || "👍"
                  : "👍"}
              </span>
              <span>
                {reactionSummary.count}{" "}
                {reactionSummary.count === 1 ? "reação" : "reações"}
              </span>
            </button>
          )}

          {/* linha de ações */}
          <div className="flex items-center w-full border-t pt-3 gap-2">
            <div className="flex-shrink-0">
              <PostReactions
                postId={post.id}
                currentReaction={userReaction}
                onReact={handleReaction}
              />
            </div>

            <div className="flex-1 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 px-3 text-xs sm:text-sm"
                onClick={() => setShowComments((prev) => !prev)}
              >
                <MessageCircle className="h-4 w-4" />
                {showComments ? "Fechar" : "Comentar"}
              </Button>
            </div>

            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 px-2 text-xs sm:text-sm"
                onClick={() => setShowShareDialog(true)}
              >
                <Repeat2 className="h-4 w-4" />
                {shareCount > 0 ? `Round (${shareCount})` : "Round"}
              </Button>
            </div>
          </div>

          {showComments && (
            <div className="w-full mt-2">
              <PostComments postId={post.id} currentUserId={currentUserId} />
            </div>
          )}
        </CardFooter>
      </Card>

      <ImageLightbox
        imageUrl={lightboxImage || ""}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      <SharePostDialog
        postId={post.id}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        onShared={onPostDeleted}
      />

      <PostReactionsList
        postId={post.id}
        open={showReactionsModal}
        onOpenChange={setShowReactionsModal}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A publicação será permanentemente
              removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FeedPost;
