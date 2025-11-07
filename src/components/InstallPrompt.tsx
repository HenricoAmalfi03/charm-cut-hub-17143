import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const { isInstallable, installApp } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-seen');
    if (isInstallable && !hasSeenPrompt) {
      setShowPrompt(true);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    await installApp();
    localStorage.setItem('pwa-install-prompt-seen', 'true');
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-install-prompt-seen', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <Card className="relative max-w-md w-full p-6 bg-card border-primary/20">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Download className="h-8 w-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Instale o App
            </h2>
            <p className="text-muted-foreground">
              Tenha acesso rápido à barbearia direto do seu celular. Instale o app para uma experiência melhor!
            </p>
          </div>

          <div className="flex flex-col w-full gap-2 pt-2">
            <Button
              onClick={handleInstall}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Instalar Agora
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Continuar pelo Navegador
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
