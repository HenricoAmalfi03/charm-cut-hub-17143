import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useConfigBarbearia } from '@/hooks/useConfigBarbearia';
import { Scissors, Calendar, Users, Star } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const { config } = useConfigBarbearia();
  const navigate = useNavigate();

  // Hook para PWA
  const { isInstallable, installApp } = usePWAInstall();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10 backdrop-blur-sm">
                <Scissors className="h-16 w-16 text-primary" />
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold leading-tight">
              Barbearia <span className="text-primary">{config.nome_estabelecimento}</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Estilo, elegância e tradição em um só lugar. Agende seu horário com os melhores barbeiros da cidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate('/cliente/auth')} className="text-lg">
                <Calendar className="mr-2 h-5 w-5" /> Agendar Horário
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/admin/auth')} className="text-lg">
                Administrador
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/barbeiro/auth')} className="text-lg">
                Sou Barbeiro
              </Button>
              {isInstallable && (
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={installApp}
                  className="text-lg flex items-center"
                >
                  <img
                    src="/favicon.ico"
                    alt="App Icon"
                    className="mr-2 h-5 w-5"
                    style={{ borderRadius: 4 }}
                  />
                  Instale o APP
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Por que escolher a gente?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Profissionais Qualificados</h3>
              <p className="text-muted-foreground">
                Barbeiros experientes e apaixonados pela arte de cuidar do seu visual
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Agendamento Fácil</h3>
              <p className="text-muted-foreground">
                Sistema online prático para agendar seu horário quando e onde quiser
              </p>
            </div>
            <div className="text-center space-y-4 p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Star className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold">Atendimento Premium</h3>
              <p className="text-muted-foreground">
                Ambiente confortável e serviços de alta qualidade para você relaxar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-card/50 backdrop-blur-sm border-t border-border/50">
        <div className="container mx-auto text-center space-y-6">
          <h2 className="text-4xl font-bold">Pronto para transformar seu visual?</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crie sua conta agora e tenha acesso aos melhores barbeiros e horários disponíveis
          </p>
          <Button size="lg" onClick={() => navigate('/cliente/auth')} className="text-lg">
            Começar Agora
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p className="text-sm">
            Barbearia {config.nome_estabelecimento} • {config.endereco}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
