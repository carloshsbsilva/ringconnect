import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      // Se o usuário já estiver logado, manda direto pro feed
      if (data.session) {
        navigate("/feed");
      } else {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate]);

  if (checkingSession) {
    // Evita "piscar" a landing antes de redirecionar
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,85,85,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(85,140,255,0.08),white_60%)]">
      {/* Hero simples para quem ainda não tem conta */}
      <main className="max-w-5xl mx-auto px-4 py-16">
        <section className="grid gap-10 md:grid-cols-[1.3fr,1fr] items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
              <span className="text-secondary">Ring</span>
              <span className="text-primary">Connect</span>
            </h1>

            <p className="text-lg text-slate-600 max-w-xl">
              A plataforma para boxeadores encontrarem sparrings, treinadores,
              eventos e registrarem sua evolução — começando pelo boxe, e
              preparada para crescer para outras artes marciais.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Criar conta grátis
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth?mode=login")}
              >
                Entrar
              </Button>
            </div>

            <p className="text-xs text-slate-500">
              Primeiro round com o boxe. Em breve, outras artes marciais no
              mesmo corner.
            </p>
          </div>

          {/* Mock visual do app, sem feed real */}
          <div className="hidden md:block">
            <div className="rounded-2xl border bg-white shadow-sm p-4 space-y-4">
              <div className="h-3 w-24 rounded-full bg-slate-200" />
              <div className="h-48 rounded-xl bg-slate-100" />
              <div className="h-3 w-32 rounded-full bg-slate-200" />
              <div className="h-3 w-40 rounded-full bg-slate-200" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
