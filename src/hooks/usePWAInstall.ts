import { useEffect, useState } from "react";

/**
 * Hook para gerenciar a instalação do PWA (Progressive Web App)
 * 
 * Funcionalidades:
 * - Detecta quando o app pode ser instalado
 * - Armazena o evento de instalação
 * - Fornece função para instalar o app
 * 
 * O PWA permite que o usuário instale o app na tela inicial do celular/desktop
 * funcionando como um aplicativo nativo, sem precisar da app store.
 * 
 * @returns {boolean} isInstallable - Se o app pode ser instalado
 * @returns {function} installApp - Função para iniciar a instalação
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    /**
     * Handler para o evento 'beforeinstallprompt'
     * Este evento é disparado pelo navegador quando o app pode ser instalado
     */
    const handleBeforeInstallPrompt = (event: any) => {
      // Previne o navegador de mostrar o prompt automático
      event.preventDefault();
      console.log("[PWA] App disponível para instalação");
      
      // Armazena o evento para usar depois
      setDeferredPrompt(event);
      setIsInstallable(true);
    };

    /**
     * Handler para o evento 'appinstalled'
     * Disparado quando o app é instalado com sucesso
     */
    const handleAppInstalled = () => {
      console.log("[PWA] App instalado com sucesso!");
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Registra os event listeners
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Verifica se já está instalado (modo standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log("[PWA] App já está instalado");
      setIsInstallable(false);
    }

    // Cleanup: remove os listeners quando o componente desmonta
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  /**
   * Função para iniciar o processo de instalação do PWA
   * Mostra o prompt nativo do navegador para instalar o app
   */
  const installApp = async () => {
    if (!deferredPrompt) {
      console.warn("[PWA] Prompt de instalação não disponível");
      alert("Não foi possível instalar o app. Certifique-se de que está usando um navegador compatível (Chrome, Edge, Safari).");
      return;
    }

    try {
      // Mostra o prompt de instalação
      deferredPrompt.prompt();

      // Aguarda a escolha do usuário
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] Resultado da instalação: ${outcome}`);

      if (outcome === 'accepted') {
        console.log("[PWA] Usuário aceitou instalar o app");
      } else {
        console.log("[PWA] Usuário recusou instalar o app");
      }

      // Limpa o prompt usado
      setDeferredPrompt(null);
      setIsInstallable(false);
    } catch (error) {
      console.error("[PWA] Erro ao instalar app:", error);
    }
  };

  return { isInstallable, installApp };
}
