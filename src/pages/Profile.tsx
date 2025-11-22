import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import TrainingLog from "@/components/TrainingLog";
import ChampionshipsManager from "@/components/ChampionshipsManager";
import GymManager from "@/components/GymManager";
import GymSelector from "@/components/GymSelector";
import { FeedPost } from "@/components/FeedPost";
import { EditPostDialog } from "@/components/EditPostDialog";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  user_type: string | null;
  bio: string | null;
  avatar_url: string | null;
  amateur_fights: number;
  professional_fights: number;
  athlete_status: string | null;
  location: string | null;
  category: string | null;
  experience_level: string | null;
  weight: number | null;
  gym_name: string | null;
  gym_address: string | null;
  gym_latitude: number | null;
  gym_longitude: number | null;
  gender: string | null;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    user_type: "",
    bio: "",
    avatar_url: "",
    amateur_fights: 0,
    professional_fights: 0,
    athlete_status: "",
    location: "",
    category: "",
    experience_level: "",
    weight: 0,
    gym_name: "",
    gym_address: "",
    gym_latitude: null as number | null,
    gym_longitude: null as number | null,
    gender: "",
  });

  const [weightCategory, setWeightCategory] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (profile?.user_id) {
      loadUserPosts();
    }
  }, [profile?.user_id]);

  const loadUserPosts = async () => {
    if (!profile?.user_id) return;

    setLoadingPosts(true);
    try {
      const { data, error } = await supabase
        .from("feed_posts")
        .select(
          `
          *,
          profiles!feed_posts_user_id_fkey (
            user_id,
            full_name,
            avatar_url
          ),
          gyms(id, name, address)
        `
        )
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserPosts(data || []);
    } catch (error) {
      console.error("Error loading user posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handlePostDeleted = () => {
    loadUserPosts();
  };

  const handlePostEdit = (postId: string) => {
    setEditingPostId(postId);
  };

  const handlePostUpdated = () => {
    loadUserPosts();
  };

  const fetchWeightCategory = async (weight: number, gender: string) => {
    try {
      const { data, error } = await supabase.rpc("get_weight_category", {
        weight_kg: weight,
        gender: gender,
      });

      if (error) throw error;

      setWeightCategory(data);
      setFormData((prev) => ({ ...prev, category: data || "" }));
    } catch (error) {
      console.error("Error fetching weight category:", error);
    }
  };

  const checkAuth = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o perfil.",
          variant: "destructive",
        });
      } else if (data) {
        setProfile(data as Profile);

        setFormData({
          full_name: data.full_name || "",
          user_type: data.user_type || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          amateur_fights: data.amateur_fights || 0,
          professional_fights: data.professional_fights || 0,
          athlete_status: data.athlete_status || "",
          location: data.location || "",
          category: data.category || "",
          experience_level: data.experience_level || "",
          weight: data.weight || 0,
          gym_name: data.gym_name || "",
          gym_address: data.gym_address || "",
          gym_latitude: data.gym_latitude || null,
          gym_longitude: data.gym_longitude || null,
          gender: data.gender || "",
        });

        if (data.weight && data.gender) {
          fetchWeightCategory(data.weight, data.gender);
        }
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, avatar_url: publicUrl }));

      toast({
        title: "Sucesso",
        description: "Avatar carregado com sucesso!",
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do avatar.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      // monta apenas os campos que existem na tabela
      const updateData = {
        full_name: formData.full_name || null,
        user_type: formData.user_type || null,
        bio: formData.bio || null,
        avatar_url: formData.avatar_url || null,
        amateur_fights: formData.amateur_fights ?? 0,
        professional_fights: formData.professional_fights ?? 0,
        athlete_status: formData.athlete_status || null,
        location: formData.location || null,
        category: formData.category || null,
        experience_level: formData.experience_level || null,
        weight: formData.weight || null,
        gym_name: formData.gym_name || null,
        gym_address: formData.gym_address || null,
        gym_latitude: formData.gym_latitude,
        gym_longitude: formData.gym_longitude,
        gender: formData.gender || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("user_id", session.user.id);

      if (error) {
        console.error("Error saving profile (raw):", error);
        throw error;
      }

      toast({
        title: "Sucesso!",
        description:
          "Perfil atualizado com sucesso! Seu perfil já está visível na busca.",
      });

      await checkAuth();
    } catch (error: any) {
      console.error(
        "Error saving profile (detailed):",
        JSON.stringify(error, null, 2)
      );
      toast({
        title: "Erro",
        description:
          error?.message ||
          "Não foi possível salvar o perfil (ver console para detalhes).",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto py-8 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList
                className={`grid w-full ${
                  formData.user_type === "athlete" ||
                  formData.user_type === "coach"
                    ? "grid-cols-4"
                    : "grid-cols-3"
                }`}
              >
                <TabsTrigger value="profile">Dados do Perfil</TabsTrigger>
                <TabsTrigger value="training">Treino de Hoje</TabsTrigger>
                <TabsTrigger value="posts">Meus Posts</TabsTrigger>

                {formData.user_type === "athlete" && (
                  <TabsTrigger value="championships">
                    Campeonatos
                  </TabsTrigger>
                )}

                {formData.user_type === "coach" && (
                  <TabsTrigger value="gym">Minha Academia</TabsTrigger>
                )}
              </TabsList>

              {/* Aba de dados do perfil */}
              <TabsContent value="profile" className="mt-6">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback>
                        {formData.full_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                        {uploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        {uploading ? "Carregando..." : "Enviar Avatar"}
                      </div>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </Label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Nome Completo</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            full_name: e.target.value,
                          }))
                        }
                        placeholder="Digite seu nome completo"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user_type">Tipo de Usuário</Label>
                      <select
                        id="user_type"
                        value={formData.user_type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            user_type: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="">Selecione...</option>
                        <option value="athlete">Atleta</option>
                        <option value="coach">Treinador</option>
                        <option value="referee">Árbitro / Juiz</option>
                        <option value="spectator">Torcedor / Espectador</option>
                      </select>
                    </div>
                  </div>

                  {/* Campos específicos de atleta */}
                  {formData.user_type === "athlete" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gênero *</Label>
                          <select
                            id="gender"
                            value={formData.gender}
                            onChange={(e) => {
                              const newGender = e.target.value;
                              setFormData((prev) => ({
                                ...prev,
                                gender: newGender,
                              }));
                              if (formData.weight && newGender) {
                                fetchWeightCategory(
                                  formData.weight,
                                  newGender
                                );
                              }
                            }}
                            className="w-full px-3 py-2 border border-input bg-background rounded-md"
                            required
                          >
                            <option value="">Selecione...</option>
                            <option value="male">Masculino</option>
                            <option value="female">Feminino</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="weight">Peso (kg) *</Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            min="30"
                            max="200"
                            value={formData.weight || ""}
                            onChange={(e) => {
                              const newWeight =
                                parseFloat(e.target.value) || 0;
                              setFormData((prev) => ({
                                ...prev,
                                weight: newWeight,
                              }));
                              if (newWeight && formData.gender) {
                                fetchWeightCategory(
                                  newWeight,
                                  formData.gender
                                );
                              }
                            }}
                            placeholder="Ex: 75.5"
                            required
                          />
                          {weightCategory && (
                            <p className="text-sm font-medium text-primary">
                              {weightCategory}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="athlete_status">
                            Status do Atleta
                          </Label>
                          <select
                            id="athlete_status"
                            value={formData.athlete_status}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                athlete_status: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-input bg-background rounded-md"
                          >
                            <option value="">Selecione...</option>
                            <option value="amateur">Amador</option>
                            <option value="professional">Profissional</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Categoria</Label>
                          <Input
                            id="category"
                            value={formData.category}
                            disabled
                            placeholder="Preencha seu peso e gênero"
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">
                            Calculado automaticamente baseado no seu peso e
                            gênero
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amateur_fights">
                            Lutas Amadoras
                          </Label>
                          <Input
                            id="amateur_fights"
                            type="number"
                            min="0"
                            value={formData.amateur_fights}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                amateur_fights:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="professional_fights">
                            Lutas Profissionais
                          </Label>
                          <Input
                            id="professional_fights"
                            type="number"
                            min="0"
                            value={formData.professional_fights}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                professional_fights:
                                  parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Campos comuns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Localização</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            location: e.target.value,
                          }))
                        }
                        placeholder="Cidade, Estado, País"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience_level">
                        Nível de Experiência
                      </Label>
                      <select
                        id="experience_level"
                        value={formData.experience_level}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            experience_level: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-input bg-background rounded-md"
                      >
                        <option value="">Selecione...</option>
                        <option value="beginner">Iniciante</option>
                        <option value="intermediate">Intermediário</option>
                        <option value="advanced">Avançado</option>
                        <option value="professional">Profissional</option>
                      </select>
                    </div>
                  </div>

                  {/* Seleção de academia só para atleta por enquanto */}
                  {formData.user_type === "athlete" && profile?.user_id && (
                    <GymSelector
                      userId={profile.user_id}
                      onGymSelect={(gymId, gymName) => {
                        setFormData((prev) => ({
                          ...prev,
                          gym_name: gymName,
                        }));
                      }}
                    />
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografia</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      placeholder="Conte um pouco sobre você..."
                      rows={5}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={saving} className="flex-1">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Alterações"
                      )}
                    </Button>
                    {profile && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate(`/profile/${profile.user_id}`)}
                        className="flex-1"
                      >
                        Ver Perfil Público
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>

              {/* Aba Treino de Hoje */}
              <TabsContent value="training" className="mt-6">
                <TrainingLog />
              </TabsContent>

              {/* Aba Meus Posts */}
              <TabsContent value="posts" className="mt-6">
                {loadingPosts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : userPosts.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      Você ainda não tem posts
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {userPosts.map((post) => (
                      <FeedPost
                        key={post.id}
                        post={post}
                        currentUserId={profile?.user_id || ""}
                        onPostDeleted={handlePostDeleted}
                        onPostEdit={handlePostEdit}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Campeonatos - só atleta */}
              {formData.user_type === "athlete" && (
                <TabsContent value="championships" className="mt-6">
                  <ChampionshipsManager />
                </TabsContent>
              )}

              {/* Minha academia - só coach */}
              {formData.user_type === "coach" && (
                <TabsContent value="gym" className="mt-6">
                  <GymManager />
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <EditPostDialog
          open={!!editingPostId}
          onOpenChange={(open) => !open && setEditingPostId(null)}
          postId={editingPostId || ""}
          onPostUpdated={handlePostUpdated}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
