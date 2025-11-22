import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Trophy } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  user_type: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  category: string | null;
  experience_level: string | null;
  athlete_status: string | null;
  amateur_fights: number;
  professional_fights: number;
}

const Browse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("profiles")
        .select("*")
        .not("full_name", "is", null);

      if (filterType !== "all") {
        query = query.eq("user_type", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os perfis.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, [filterType]);

  const filteredProfiles = profiles.filter((profile) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      profile.full_name?.toLowerCase().includes(search) ||
      profile.location?.toLowerCase().includes(search) ||
      profile.category?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
       
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Buscar Atletas e Treinadores</h1>
          <p className="text-muted-foreground">
            Encontre sparrings, treinadores e conecte-se com outros boxeadores
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Buscar por nome, localização ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              onClick={() => setFilterType("all")}
            >
              Todos
            </Button>
            <Button
              variant={filterType === "athlete" ? "default" : "outline"}
              onClick={() => setFilterType("athlete")}
            >
              Atletas
            </Button>
            <Button
              variant={filterType === "coach" ? "default" : "outline"}
              onClick={() => setFilterType("coach")}
            >
              Treinadores
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Card
              key={profile.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/profile/${profile.user_id}`)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback>{profile.full_name?.[0] || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{profile.full_name}</CardTitle>
                    <Badge variant={profile.user_type === "athlete" ? "default" : "secondary"}>
                      {profile.user_type === "athlete" ? "Atleta" : "Treinador"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
                {profile.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <Trophy className="h-4 w-4 text-primary" />
                    {profile.category}
                  </div>
                )}
                {profile.user_type === "athlete" && profile.athlete_status && (
                  <Badge variant="outline">
                    {profile.athlete_status === "amateur" ? "Amador" : "Profissional"}
                  </Badge>
                )}
                {profile.user_type === "athlete" && (
                  <div className="text-sm text-muted-foreground">
                    {profile.amateur_fights} lutas amadoras • {profile.professional_fights} profissionais
                  </div>
                )}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {profile.bio}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProfiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhum perfil encontrado com os filtros selecionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Browse;
