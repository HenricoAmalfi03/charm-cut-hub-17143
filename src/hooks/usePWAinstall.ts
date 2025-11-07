import { useEffect, useState } from "react";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: any) => {
      // Evita que o navegador exiba o prompt automaticamente
      event.preventDefault();
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      console.warn("Evento beforeinstallprompt ainda não disponível.");
      return;
    }

    // Exibe o prompt nativo do navegador
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("Usuário aceitou instalar o PWA.");
    } else {
      console.log("Usuário recusou instalar o PWA.");
    }

    // Limpa o estado após uso
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, installApp };
}
