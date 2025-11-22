import { useState, useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Trash2, Flame, Reply } from "lucide-react";

interface CommentBase {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id?: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  likes_count: number;
  user_has_liked: boolean;
}

interface CommentWithReplies extends CommentBase {
  replies: CommentWithReplies[];
}

interface PostCommentsProps {
  postId: string;
  currentUserId: string | null;
}

export const PostComments = ({ postId, currentUserId }: PostCommentsProps) => {
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // reply
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [openThreads, setOpenThreads] = useState<Set<string>>(new Set());

  const { toast } = useToast();

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("post_comments")
      .select(`
        id,
        content,
        created_at,
        user_id,
        parent_comment_id,
        profiles!inner(full_name, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    if (!data || data.length === 0) {
      setComments([]);
      return;
    }

    const commentIds = data.map((c) => c.id);

    const { data: likesData } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .in("comment_id", commentIds);

    const { data: userLikesData } = currentUserId
      ? await supabase
          .from("comment_likes")
          .select("comment_id")
          .in("comment_id", commentIds)
          .eq("user_id", currentUserId)
      : { data: null };

    const likesCount =
      likesData?.reduce((acc, like) => {
        acc[like.comment_id] = (acc[like.comment_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

    const userLikes = new Set(userLikesData?.map((l) => l.comment_id) || []);

    // monta estrutura com likes
    const flatComments: CommentBase[] = data.map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      user_id: c.user_id,
      parent_comment_id: c.parent_comment_id,
      profiles: c.profiles,
      likes_count: likesCount[c.id] || 0,
      user_has_liked: userLikes.has(c.id),
    }));

    // organiza em árvore (comentário raiz + replies)
    const map: Record<string, CommentWithReplies> = {};
    flatComments.forEach((c) => {
      map[c.id] = { ...c, replies: [] };
    });

    const roots: CommentWithReplies[] = [];
    flatComments.forEach((c) => {
      if (c.parent_comment_id && map[c.parent_comment_id]) {
        map[c.parent_comment_id].replies.push(map[c.id]);
      } else if (!c.parent_comment_id) {
        roots.push(map[c.id]);
      }
    });

    setComments(roots);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para comentar",
        variant: "destructive",
      });
      return;
    }

    if (!newComment.trim()) return;

    setIsSubmitting(true);

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: newComment.trim(),
      parent_comment_id: null,
    });

    if (error) {
      console.error("Error creating comment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível publicar o comentário",
        variant: "destructive",
      });
    } else {
      setNewComment("");
      await fetchComments();
      toast({
        title: "Sucesso",
        description: "Comentário publicado",
      });
    }

    setIsSubmitting(false);
  };

  const handleSubmitReply = async (commentId: string) => {
    if (!currentUserId) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para responder",
        variant: "destructive",
      });
      return;
    }

    if (!replyText.trim()) return;

    const text = replyText.trim();
    setReplyText("");
    setReplyingTo(null);

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: text,
      parent_comment_id: commentId,
    });

    if (error) {
      console.error("Error creating reply:", error);
      toast({
        title: "Erro",
        description: "Não foi possível publicar a resposta",
        variant: "destructive",
      });
    } else {
      await fetchComments();
      // abre thread automaticamente
      setOpenThreads((prev) => new Set(prev).add(commentId));
      toast({
        title: "Sucesso",
        description: "Resposta publicada",
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from("post_comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o comentário",
        variant: "destructive",
      });
    } else {
      await fetchComments();
      toast({
        title: "Sucesso",
        description: "Comentário excluído",
      });
    }
  };

  const handleToggleLike = async (commentId: string, hasLiked: boolean) => {
    if (!currentUserId) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para curtir",
        variant: "destructive",
      });
      return;
    }

    if (hasLiked) {
      const { error } = await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error unliking comment:", error);
        toast({
          title: "Erro",
          description: "Não foi possível descurtir o comentário",
          variant: "destructive",
        });
      } else {
        await fetchComments();
      }
    } else {
      const { error } = await supabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: currentUserId,
      });

      if (error) {
        console.error("Error liking comment:", error);
        toast({
          title: "Erro",
          description: "Não foi possível curtir o comentário",
          variant: "destructive",
        });
      } else {
        await fetchComments();
      }
    }
  };

  const toggleThread = (commentId: string) => {
    setOpenThreads((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const renderComment = (comment: CommentWithReplies, depth = 0) => {
    const isRoot = depth === 0;
    const hasReplies = comment.replies.length > 0;
    const threadOpen = openThreads.has(comment.id);

    return (
      <div key={comment.id} className={`flex gap-3 ${!isRoot ? "mt-2" : ""}`}>
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.profiles.avatar_url || ""} />
          <AvatarFallback>{comment.profiles.full_name[0]}</AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 bg-muted rounded-lg p-3">
              <p className="font-semibold text-sm">
                {comment.profiles.full_name}
              </p>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
            {currentUserId === comment.user_id && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleDeleteComment(comment.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3 px-1">
            <p className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>

            <Button
              variant="ghost"
              size="sm"
              className={`h-6 gap-1.5 px-2 ${
                comment.user_has_liked ? "text-orange-500" : ""
              }`}
              onClick={() =>
                handleToggleLike(comment.id, comment.user_has_liked)
              }
              disabled={!currentUserId}
            >
              <Flame
                className={`h-3.5 w-3.5 ${
                  comment.user_has_liked ? "fill-orange-500" : ""
                }`}
              />
              {comment.likes_count > 0 && (
                <span className="text-xs">{comment.likes_count}</span>
              )}
            </Button>

            {/* botão Responder */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1.5 px-2"
              onClick={() => {
                if (replyingTo === comment.id) {
                  setReplyingTo(null);
                  setReplyText("");
                } else {
                  setReplyingTo(comment.id);
                  setReplyText("");
                  // garante que esse thread esteja aberto
                  setOpenThreads((prev) => new Set(prev).add(comment.id));
                }
              }}
              disabled={!currentUserId}
            >
              <Reply className="h-3.5 w-3.5" />
              <span className="text-xs">Responder</span>
            </Button>

            {/* abrir/fechar respostas */}
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1.5 px-2"
                onClick={() => toggleThread(comment.id)}
              >
                <span className="text-xs">
                  {threadOpen
                    ? "Ocultar respostas"
                    : `Ver respostas (${comment.replies.length})`}
                </span>
              </Button>
            )}
          </div>

          {/* textarea de resposta */}
          {replyingTo === comment.id && (
            <div className="mt-2 ml-2">
              <Textarea
                placeholder={`Responder ${comment.profiles.full_name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[50px] resize-none"
              />
              <div className="flex justify-end mt-1">
                <Button
                  size="sm"
                  disabled={!replyText.trim()}
                  className="gap-2"
                  onClick={() => handleSubmitReply(comment.id)}
                >
                  <Send className="h-4 w-4" />
                  Responder
                </Button>
              </div>
            </div>
          )}

          {/* replies */}
          {hasReplies && threadOpen && (
            <div className="mt-2 ml-6 space-y-2">
              {comment.replies.map((child) => renderComment(child, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-4">
      {/* Comentário raiz */}
      {currentUserId && (
        <form onSubmit={handleSubmitComment} className="space-y-2 w-full">
          <Textarea
            placeholder="Escreva um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="w-full min-h-[60px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !newComment.trim()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Comentar
            </Button>
          </div>
        </form>
      )}

      {/* Lista */}
      <div className="space-y-3 w-full">
        {comments.map((comment) => renderComment(comment))}

        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            Nenhum comentário ainda. Seja o primeiro!
          </p>
        )}
      </div>
    </div>
  );
};
