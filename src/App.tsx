import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import ModulePage from "./pages/ModulePage.tsx";
import LessonPage from "./pages/LessonPage.tsx";
import Login from "./pages/Login.tsx";
import PrivateRoute from "./routes/PrivateRoute.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route element={<PrivateRoute />}>
            <Route path="/home" element={<Index />} />
            <Route path="/module/:module" element={<ModulePage />} />
            <Route path="/module/:module/lesson/:lessonId" element={<LessonPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
