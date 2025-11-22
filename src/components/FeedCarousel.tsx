import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Clock, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FeedPost {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  training_duration: number | null;
  did_sparring: boolean | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
    gym_name: string | null;
  };
}

const FeedCarousel = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeedPosts();
  }, []);

  const loadFeedPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!postsData) {
        setPosts([]);
        return;
      }

      // Fetch profiles for all posts
      const userIds = [...new Set(postsData.map(p => p.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, gym_name")
        .in("user_id", userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const postsWithProfiles = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || {
          full_name: null,
          avatar_url: null,
          gym_name: null
        }
      }));

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error loading feed:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4 px-2">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="min-w-[300px] h-[180px] animate-pulse bg-muted" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhuma atualização ainda. Seja o primeiro a postar!</p>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-2 scroll-smooth snap-x snap-mandatory">
      {posts.map((post) => (
        <Card
          key={post.id}
          className="min-w-[300px] snap-start hover:shadow-lg transition-shadow"
        >
          <CardContent className="p-4 space-y-3">
            <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.profiles.avatar_url || ""} />
                <AvatarFallback>{post.profiles.full_name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {post.profiles.full_name || "Usuário"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </Link>

            {post.post_type === "training" && (
              <div className="space-y-2">
                <Badge variant="secondary" className="gap-1">
                  <Dumbbell className="h-3 w-3" />
                  Treino
                </Badge>
                <div className="flex items-center gap-4 text-sm">
                  {post.training_duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{post.training_duration}h</span>
                    </div>
                  )}
                  {post.did_sparring && (
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Sparring</span>
                    </div>
                  )}
                </div>
                {post.profiles.gym_name && (
                  <p className="text-xs text-muted-foreground">
                    📍 {post.profiles.gym_name}
                  </p>
                )}
              </div>
            )}

            <p className="text-sm line-clamp-3">{post.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FeedCarousel;
