import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoConstance from "@/assets/logo-constance.svg";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "signup" | "invite" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    const params = new URLSearchParams(hash);
    const type = params.get("type");

    if (type === "recovery") {
      setMode("recovery");
      return;
    }

    if (type === "invite") {
      setMode("invite");
    }
  }, []);

  const isLogin = mode === "login";
  const isInviteFlow = mode === "invite" || mode === "recovery";
  const title = useMemo(() => {
    if (mode === "invite") return "Definir senha";
    if (mode === "recovery") return "Redefinir senha";
    return isLogin ? "Entrar" : "Criar Conta";
  }, [mode, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isInviteFlow && password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isInviteFlow) {
        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
          return;
        }

        toast({
          title: mode === "invite" ? "Senha criada!" : "Senha atualizada!",
          description: mode === "invite" ? "Seu acesso foi liberado. Faça login para entrar." : "Agora você já pode entrar com a nova senha.",
        });

        window.location.hash = "";
        setPassword("");
        setConfirmPassword("");
        setMode("login");
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const { error } = isLogin
        ? await signIn(normalizedEmail, password)
        : await signUp(normalizedEmail, password);

      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else if (!isLogin) {
        toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar." });
        setMode("login");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={logoConstance} alt="Constance" className="h-12 mx-auto mb-3" />
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isInviteFlow} />
            </div>
            <div className="space-y-2">
              <Label>{isInviteFlow ? "Nova senha" : "Senha"}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            {isInviteFlow && (
              <div className="space-y-2">
                <Label>Confirmar senha</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : isInviteFlow ? "Salvar senha" : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>
          {!isInviteFlow && (
            <div className="mt-4 text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => setMode(isLogin ? "signup" : "login")}
              >
                {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Entre"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
