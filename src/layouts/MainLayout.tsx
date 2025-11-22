// src/layouts/MainLayout.tsx

import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "@/components/NotificationBell";
import { StoriesBar } from "@/components/StoriesBar";
import { LogOut } from "lucide-react";

interface Profile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export const MainLayout = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        navigate("/auth");
        return;
      }

      const userId = sessionData.session.user.id;
      setCurrentUserId(userId);

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("user_id", userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      navigate(`/browse?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      {/* HEADER FIXO */}
      <header className="sticky top-0 z-30 w-full border-b bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 w-full">
            {/* LOGO – leva sempre pro feed */}
            <button
              className="flex items-center gap-2"
              onClick={() => navigate("/feed")}
            >
              <span className="text-2xl font-extrabold tracking-tight text-blue-600">
                Ring
              </span>
              <span className="text-2xl font-extrabold tracking-tight text-red-500">
                Connect
              </span>
            </button>

            {/* BARRA DE BUSCA – centro (só desktop/tablet) */}
            <div className="flex-1 hidden md:flex justify-center">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Buscar atletas, lutas, academias..."
                className="w-full max-w-md h-9 rounded-full border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:bg-white focus:border-slate-300 focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* AÇÕES À DIREITA */}
            <div className="flex items-center gap-2">
              {/* Desktop / tablet */}
              <div className="hidden sm:flex items-center gap-4">
                <button
                  onClick={() => navigate("/browse")}
                  className="text-sm text-slate-700 hover:text-slate-900 hover:underline"
                >
                  Explorar atletas
                </button>

                <NotificationBell />

                {currentUserId && (
                  <button
                    onClick={() => navigate(`/profile/${currentUserId}`)}
                    className="text-sm text-slate-700 hover:text-slate-900 hover:underline transition"
                  >
                    Olá, {profile?.full_name}
                  </button>
                )}

                <Avatar
                  className="h-9 w-9 cursor-pointer"
                  onClick={() =>
                    currentUserId && navigate(`/profile/${currentUserId}`)
                  }
                >
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback>
                    {profile?.full_name?.[0] || "R"}
                  </AvatarFallback>
                </Avatar>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sair</span>
                </Button>
              </div>

              {/* Mobile: gongo + menu hambúrguer lado a lado */}
              <div className="sm:hidden flex items-center gap-2">
                <NotificationBell />
                <button
                  type="button"
                  className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center bg-white"
                  onClick={() => setMenuOpen(true)}
                >
                  <div className="space-y-1">
                    <span className="block h-[2px] w-4 bg-slate-800 rounded-full" />
                    <span className="block h-[2px] w-4 bg-slate-800 rounded-full" />
                    <span className="block h-[2px] w-4 bg-slate-800 rounded-full" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer mobile */}
{menuOpen && (
  <>
    {/* backdrop escuro */}
    <div
      className="fixed inset-0 bg-black/40 z-[998]"
      onClick={() => setMenuOpen(false)}
    />

    {/* painél lateral branco */}
    <div
      className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl p-5 flex flex-col gap-4 z-[999]"
    >
      <button
        onClick={() => setMenuOpen(false)}
        className="self-end text-slate-600 text-xl font-bold"
      >
        ×
      </button>

      <button
        className="text-left text-lg font-semibold text-slate-800"
        onClick={() => {
          navigate("/feed");
          setMenuOpen(false);
        }}
      >
        Feed
      </button>

      <button
        className="text-left text-lg font-semibold text-slate-800"
        onClick={() => {
          navigate("/browse");
          setMenuOpen(false);
        }}
      >
        Explorar atletas
      </button>

      {currentUserId && (
        <button
          className="text-left text-lg font-semibold text-slate-800"
          onClick={() => {
            navigate(`/profile/${currentUserId}`);
            setMenuOpen(false);
          }}
        >
          Meu perfil
        </button>
      )}

      <button
        className="text-left text-lg font-semibold text-red-600 mt-auto"
        onClick={handleLogout}
      >
        Sair
      </button>
    </div>
  </>
)}

      </header>

      {/* STORIES / BASTIDORES */}
      <section className="border-b bg-[#f5f7fb]">
        <div className="max-w-6xl mx-auto px-4 pt-2 pb-1">
          <StoriesBar currentUserId={currentUserId} />
        </div>
      </section>

      {/* CONTEÚDO */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
