import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Dumbbell, Clock, Users, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format, isToday, isThisWeek, isThisMonth, isThisYear } from "date-fns";
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

const News = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "month" | "year">("all");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadPosts();
    } catch (error) {
      console.error("Error checking auth:", error);
      navigate("/auth");
    }
  };

  const loadPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from("feed_posts")
        .select("*")
        .order("created_at", { ascending: false });

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
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterPosts = (posts: FeedPost[]) => {
    const now = new Date();
    switch (filter) {
      case "today":
        return posts.filter((p) => isToday(new Date(p.created_at)));
      case "week":
        return posts.filter((p) => isThisWeek(new Date(p.created_at), { locale: ptBR }));
      case "month":
        return posts.filter((p) => isThisMonth(new Date(p.created_at)));
      case "year":
        return posts.filter((p) => isThisYear(new Date(p.created_at)));
      default:
        return posts;
    }
  };

  const filteredPosts = filterPosts(posts);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Atualizações</h1>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="year">Ano</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhuma atualização para o período selecionado.
              </p>
            </Card>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <Link to={`/profile/${post.user_id}`}>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={post.profiles.avatar_url || ""} />
                        <AvatarFallback>
                          {post.profiles.full_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 space-y-2">
                      <div>
                        <Link
                          to={`/profile/${post.user_id}`}
                          className="font-semibold hover:underline"
                        >
                          {post.profiles.full_name || "Usuário"}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(post.created_at), "PPp", { locale: ptBR })}
                        </p>
                      </div>

                      {post.post_type === "training" && (
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="secondary" className="gap-1">
                            <Dumbbell className="h-3 w-3" />
                            Treino
                          </Badge>
                          {post.training_duration && (
                            <div className="flex items-center gap-1 text-sm">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>{post.training_duration}h</span>
                            </div>
                          )}
                          {post.did_sparring && (
                            <div className="flex items-center gap-1 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>Sparring</span>
                            </div>
                          )}
                        </div>
                      )}

                      {post.profiles.gym_name && (
                        <p className="text-sm text-muted-foreground">
                          📍 {post.profiles.gym_name}
                        </p>
                      )}

                      <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default News;
