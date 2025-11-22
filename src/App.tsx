import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import Auth from "./pages/Auth";

import MainLayout from "./layouts/MainLayout"; // ← IMPORTANTE

// Páginas internas
import FeedPage from "./pages/FeedPage";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Browse from "./pages/Browse";
import Videos from "./pages/Videos";
import Mentorship from "./pages/Mentorship";
import GymProfile from "./pages/GymProfile";
import Chat from "./pages/Chat";
import News from "./pages/News";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

<BrowserRouter>
  <Routes>
    {/* público */}
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />

    {/* tudo que tiver header fixo vai aqui dentro */}
    <Route element={<MainLayout />}>
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/videos" element={<Videos />} />
      <Route path="/mentorship" element={<Mentorship />} />
      <Route path="/profile/:userId" element={<PublicProfile />} />
      <Route path="/gym/:gymId" element={<GymProfile />} />
      <Route path="/chat/:receiverId" element={<Chat />} />
      <Route path="/news" element={<News />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
</BrowserRouter>

    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
