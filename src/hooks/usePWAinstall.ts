import { useEffect, useState } from "react";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: any) => {
      // Impede o navegador de exibir o prompt automaticamente
      event.preventDefault();
      console.log("[PWA] Evento beforeinstallprompt detectado.");
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Verifica se já está instalado
    window.addEventListener("appinstalled", () => {
      console.log("[PWA] Aplicativo instalado com sucesso!");
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      alert("O app ainda não está pronto para instalação. Tente atualizar a página.");
      console.warn("[PWA] Evento beforeinstallprompt ainda não disponível.");
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Instalação: ${outcome}`);

    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, installApp };
}
