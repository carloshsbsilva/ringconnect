-- Criar enum para tipos de usuário
CREATE TYPE public.user_type AS ENUM ('athlete', 'trainer');

-- Criar enum para estilos de boxe
CREATE TYPE public.boxing_style AS ENUM ('soviet', 'cuban', 'american', 'english', 'mexican');

-- Criar enum para categorias de peso
CREATE TYPE public.weight_category AS ENUM (
  'light_flyweight', 'flyweight', 'super_flyweight', 'bantamweight',
  'super_bantamweight', 'featherweight', 'super_featherweight', 'lightweight',
  'super_lightweight', 'welterweight', 'super_welterweight', 'middleweight',
  'super_middleweight', 'light_heavyweight', 'cruiserweight', 'heavyweight'
);

-- Criar enum para níveis
CREATE TYPE public.skill_level AS ENUM ('beginner', 'intermediate', 'advanced', 'professional');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_type public.user_type NOT NULL,
  name TEXT NOT NULL,
  age INTEGER,
  city TEXT,
  state TEXT,
  weight_kg DECIMAL(5,2),
  weight_category public.weight_category,
  boxing_style public.boxing_style,
  skill_level public.skill_level DEFAULT 'beginner',
  bio TEXT,
  avatar_url TEXT,
  experience_years INTEGER DEFAULT 0,
  total_sparrings INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_training_minutes INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.0,
  rating_count INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de vídeos
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  video_type TEXT CHECK (video_type IN ('training', 'sparring', 'technique', 'shadow')),
  is_public BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de solicitações de sparring
CREATE TABLE public.sparring_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  city TEXT NOT NULL,
  state TEXT,
  weight_category public.weight_category,
  skill_level public.skill_level,
  preferred_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'matched', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de respostas às solicitações
CREATE TABLE public.sparring_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.sparring_requests(id) ON DELETE CASCADE NOT NULL,
  responder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de mensagens (chat)
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sparring_request_id UUID REFERENCES public.sparring_requests(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparring_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sparring_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies para profiles
CREATE POLICY "Profiles são visíveis por todos" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar seu próprio perfil" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies para videos
CREATE POLICY "Vídeos públicos são visíveis por todos" ON public.videos
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios vídeos" ON public.videos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios vídeos" ON public.videos
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies para sparring_requests
CREATE POLICY "Solicitações são visíveis por todos usuários autenticados" ON public.sparring_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários podem criar suas próprias solicitações" ON public.sparring_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Usuários podem atualizar suas próprias solicitações" ON public.sparring_requests
  FOR UPDATE USING (auth.uid() = requester_id);

-- RLS Policies para sparring_responses
CREATE POLICY "Respostas são visíveis pelo criador da solicitação e respondente" ON public.sparring_responses
  FOR SELECT USING (
    auth.uid() = responder_id OR 
    auth.uid() IN (SELECT requester_id FROM public.sparring_requests WHERE id = request_id)
  );

CREATE POLICY "Usuários podem criar respostas" ON public.sparring_responses
  FOR INSERT WITH CHECK (auth.uid() = responder_id);

-- RLS Policies para messages
CREATE POLICY "Mensagens são visíveis pelo remetente e destinatário" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Usuários podem enviar mensagens" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sparring_requests_updated_at
  BEFORE UPDATE ON public.sparring_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'),
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'athlete')
  );
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();