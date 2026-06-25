import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Mantém log estruturado para facilitar diagnóstico no console do navegador.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Algo deu errado</h2>
              <p className="text-sm text-muted-foreground">Encontramos um erro inesperado nesta tela.</p>
            </div>
          </div>
          {this.state.error?.message && (
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40 text-muted-foreground">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={this.handleReset} className="flex-1">
              Tentar novamente
            </Button>
            <Button onClick={this.handleReload} className="flex-1">
              Recarregar página
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Seus dados estão seguros. Se o problema persistir, reporte para a equipe técnica.
          </p>
        </div>
      </div>
    );
  }
}
