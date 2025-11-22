import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Building2, Trash2, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Gym {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  monthly_fee: number | null;
  private_class_fee: number | null;
}

const GymManager = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gym, setGym] = useState<Gym | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    description: "",
    address: "",
    monthly_fee: 0,
    private_class_fee: 0,
  });

  useEffect(() => {
    loadGym();
  }, []);

  const loadGym = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("gyms")
        .select("*")
        .eq("owner_id", session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setGym(data);
        setFormData({
          name: data.name || "",
          logo_url: data.logo_url || "",
          description: data.description || "",
          address: data.address || "",
          monthly_fee: data.monthly_fee || 0,
          private_class_fee: data.private_class_fee || 0,
        });
      }
    } catch (error) {
      console.error("Error loading gym:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a academia.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gym-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('gym-logos')
        .getPublicUrl(fileName);

      setFormData({ ...formData, logo_url: publicUrl });

      toast({
        title: "Sucesso",
        description: "Logo carregado com sucesso!",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload do logo.",
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const gymData = {
        name: formData.name,
        logo_url: formData.logo_url || null,
        description: formData.description || null,
        address: formData.address || null,
        monthly_fee: formData.monthly_fee || null,
        private_class_fee: formData.private_class_fee || null,
        owner_id: session.user.id,
      };

      if (gym) {
        const { error } = await supabase
          .from("gyms")
          .update(gymData)
          .eq("id", gym.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("gyms")
          .insert(gymData);

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: gym ? "Academia atualizada com sucesso!" : "Academia criada com sucesso!",
      });

      await loadGym();
    } catch (error) {
      console.error("Error saving gym:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a academia.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!gym) return;
    
    if (!confirm("Tem certeza que deseja excluir esta academia? Esta ação não pode ser desfeita.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("gyms")
        .delete()
        .eq("id", gym.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Academia excluída com sucesso!",
      });

      setGym(null);
      setFormData({
        name: "",
        logo_url: "",
        description: "",
        address: "",
        monthly_fee: 0,
        private_class_fee: 0,
      });
    } catch (error) {
      console.error("Error deleting gym:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a academia.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {gym ? "Gerenciar Academia" : "Criar Academia"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={formData.logo_url} />
                <AvatarFallback>
                  <Building2 className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="logo-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? "Carregando..." : "Enviar Logo"}
                </div>
                <Input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da Academia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Fight Club Academy"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, Número, Bairro, Cidade, Estado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva sua academia, modalidades oferecidas, horários, etc..."
                rows={6}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthly_fee">Mensalidade (R$)</Label>
                <Input
                  id="monthly_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthly_fee || ""}
                  onChange={(e) => setFormData({ ...formData, monthly_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 150.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="private_class_fee">Aula Particular (R$)</Label>
                <Input
                  id="private_class_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.private_class_fee || ""}
                  onChange={(e) => setFormData({ ...formData, private_class_fee: parseFloat(e.target.value) || 0 })}
                  placeholder="Ex: 80.00"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  gym ? "Atualizar Academia" : "Criar Academia"
                )}
              </Button>
              {gym && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {gym && (
        <Card>
          <CardHeader>
            <CardTitle>Informações da Academia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-semibold">ID da Academia:</span>
              <code className="ml-2 text-sm bg-muted px-2 py-1 rounded">{gym.id}</code>
            </div>
            <p className="text-sm text-muted-foreground">
              Use este ID para compartilhar sua academia com outros usuários.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/gym/${gym.id}`)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver Perfil Público
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GymManager;
