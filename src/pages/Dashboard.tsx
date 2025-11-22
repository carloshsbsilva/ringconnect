import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Session } from "@supabase/supabase-js";
import { Users, Search, Video, Plus, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { NotificationBell } from "@/components/NotificationBell";
import { CreatePostDialog } from "@/components/CreatePostDialog";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <h1 className="text-2xl font-bold text-primary cursor-pointer hover:opacity-80 transition-opacity">RingConnect</h1>
            </Link>
            {profile && (
              <Badge variant={profile.user_type === "athlete" ? "default" : "secondary"}>
                {profile.user_type === "athlete" ? "Atleta" : "Treinador"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="text-muted-foreground">Olá, {profile?.full_name || user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Bem-vindo ao RingConnect, {profile?.full_name}!
            </h2>
            <p className="text-muted-foreground">
              {profile?.user_type === "athlete" 
                ? "Encontre sparrings, treinadores e evolua suas habilidades."
                : "Conecte-se com atletas e compartilhe seu conhecimento."
              }
            </p>
          </div>
          <CreatePostDialog />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link to="/profile">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Meu Perfil</CardTitle>
                <CardDescription>Complete seu perfil e estatísticas</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/browse">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Search className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Buscar</CardTitle>
                <CardDescription>
                  {profile?.user_type === "athlete" 
                    ? "Encontre sparrings e treinadores" 
                    : "Encontre atletas para treinar"
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/videos">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Video className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">Vídeos</CardTitle>
                <CardDescription>Upload e análise de vídeos</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/mentorship">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="text-center">
                <Plus className="h-8 w-8 text-primary mx-auto mb-2" />
                <CardTitle className="text-lg">
                  {profile?.user_type === "athlete" ? "Mentoria" : "Mentorias"}
                </CardTitle>
                <CardDescription>
                  {profile?.user_type === "athlete" 
                    ? "Encontre sessões de mentoria" 
                    : "Oferecer sessões de mentoria"
                  }
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>

        {/* Stats Section */}
        {profile && (
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estatísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Sparrings realizados:</span>
                  <span className="font-semibold">{profile.total_sparrings || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vitórias:</span>
                  <span className="font-semibold">{profile.total_wins || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Minutos de treino:</span>
                  <span className="font-semibold">{profile.total_training_minutes || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Avaliação:</span>
                  <span className="font-semibold">
                    {profile.rating ? `${profile.rating.toFixed(1)}/5.0` : "Sem avaliações"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Categoria:</span>
                  <span className="font-semibold">{profile.weight_category || "Não definida"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nível:</span>
                  <span className="font-semibold">{profile.skill_level || "Iniciante"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Localização:</span>
                  <span className="font-semibold">
                    {profile.city && profile.state ? `${profile.city}, ${profile.state}` : "Não definida"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Disponível:</span>
                  <Badge variant={profile.is_available ? "default" : "secondary"}>
                    {profile.is_available ? "Sim" : "Não"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Próximos passos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Complete seu perfil</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>Faça upload de vídeos</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span>
                      {profile?.user_type === "athlete" 
                        ? "Encontre seu primeiro sparring" 
                        : "Conecte-se com atletas"
                      }
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;