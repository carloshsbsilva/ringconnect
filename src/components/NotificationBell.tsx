import { useState, useEffect } from "react";
import { Bell, Swords, Trophy, UserPlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { ReactNode } from "react";

interface Notification {
  id: string;
  type: string;
  content: string;
  read: boolean;
  created_at: string;
  actor_id?: string | null;
  related_user_id: string | null;
  related_post_id: string | null;
  related_sparring_id: string | null;
  training_log_id?: string | null;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadNotifications();

    // Inscrever-se para novas notificações em tempo real
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          
          // Aceitar todos os tipos de notificação relevantes
          const acceptedTypes = [
  "sparring_request",
  "training_reward",
  "user_follow",
  "FOLLOW",
  "follow",
  "fan_follow",
  "post_reaction",
];

          // Se quiser aceitar todas, pode remover este if
          if (acceptedTypes.includes(newNotif.type)) {
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
            playGongSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUserId(session?.user?.id || null);
  };

  const loadNotifications = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading notifications:", error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter((n) => !n.read).length || 0);
  };

  const playGongSound = () => {
    const audio = new Audio();
    audio.volume = 0.3;
    // Som de sino em base64
    audio.src =
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLaizsIGWi77eefTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgebrqVUUCkaf4PK+bCEFK4Hm68mVcQAMTqfe8sJ5LAQKR57f8bp3KAQhc8rw2oU6CBlou+3nn00QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBACg==";
    audio.play().catch(() => {
      // Ignora erro de autoplay bloqueado pelo navegador
    });
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);

    // Roteamento baseado no tipo de notificação
    switch (notification.type) {
      // Pedido de sparring -> ir pro chat com o usuário
      case "sparring_request":
        if (notification.related_user_id) {
          navigate(`/chat/${notification.related_user_id}`);
        }
        break;

      // Alguém entrou para a torcida -> ir pro perfil de quem entrou
      case "FOLLOW":
      case "follow":
      case "user_follow":
      case "fan_follow":
        if (notification.related_user_id) {
          navigate(`/profile/${notification.related_user_id}`);
        }
        break;

      // Premiou seu treino -> ir para o feed
      case "training_reward":
        if (notification.related_post_id) {
          navigate("/");
        } else if (notification.training_log_id) {
          navigate("/");
        }
        break;

      // Notificações relacionadas a posts
      default:
        if (notification.related_post_id) {
          navigate("/");
        }
        break;
    }

    setOpen(false);
  };

  const formatNotificationDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Mapa de ícones por tipo de notificação
  const getNotificationIcon = (type: string): ReactNode => {
    const iconMap: Record<string, ReactNode> = {
      sparring_request: <Swords className="h-4 w-4 text-orange-500" />,
      training_reward: <Trophy className="h-4 w-4 text-yellow-500" />,
      user_follow: <UserPlus className="h-4 w-4 text-blue-500" />,
      FOLLOW: <UserPlus className="h-4 w-4 text-blue-500" />,
      follow: <UserPlus className="h-4 w-4 text-blue-500" />,
      fan_follow: <UserPlus className="h-4 w-4 text-blue-500" />,
      message: <MessageCircle className="h-4 w-4 text-green-500" />,
      post_reaction: <Trophy className="h-4 w-4 text-yellow-500" />, // ou outro ícone que você quiser
    };

    return iconMap[type] || <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  // Obter a mensagem da notificação (usa o content que já vem do banco)
  const getNotificationMessage = (notification: Notification): string => {
    // Para user_follow, o content já vem com o nome: "Carlos entrou para sua torcida!"
    if (
      ["user_follow", "FOLLOW", "follow", "fan_follow"].includes(notification.type)
    ) {
      return notification.content || "Alguém entrou para sua torcida!";
    }

    // Para outros tipos, também usa o content se existir
    return notification.content || "Nova notificação";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="O gongo tocou!"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="p-2 border-b">
          <h3 className="font-semibold">O gongo tocou!</h3>
        </div>

        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-3 cursor-pointer ${
                  !notification.read ? "bg-accent/50" : ""
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="text-sm">
                      {getNotificationMessage(notification)}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatNotificationDate(notification.created_at)}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};