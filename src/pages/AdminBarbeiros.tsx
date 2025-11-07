import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Barbeiro {
  id: string;
  nome_completo: string;
  email: string;
  telefone: string;
  especialidades: string[];
  ativo: boolean;
  profile: {
    full_name: string;
    email: string;
  };
}

export default function AdminBarbeiros() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [loadingBarbeiros, setLoadingBarbeiros] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchBarbeiros();
    }
  }, [user, isAdmin]);

  const fetchBarbeiros = async () => {
    try {
      setLoadingBarbeiros(true);
      const { data, error } = await supabase
        .from('barbeiros')
        .select('*');

      if (error) throw error;

      // Barbeiros agora são entidades separadas, não auth.users
      const barbeirosData = (data || []).map((barbeiro: any) => ({
        ...barbeiro,
        profile: {
          full_name: barbeiro.nome_completo,
          email: barbeiro.email,
        },
      }));

      setBarbeiros(barbeirosData);
    } catch (error) {
      console.error('Erro ao buscar barbeiros:', error);
    } finally {
      setLoadingBarbeiros(false);
    }
  };

  const handleCreateBarbeiro = async () => {
    try {
      setCreating(true);

      // Criar barbeiro diretamente na tabela barbeiros (não em auth.users)
      const { error } = await supabase.rpc('create_barbeiro', {
        p_nome: fullName,
        p_email: email,
        p_senha: password,
        p_whatsapp: whatsapp
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Barbeiro criado com sucesso',
      });

      setIsDialogOpen(false);
      setEmail('');
      setPassword('');
      setFullName('');
      setWhatsapp('');
      fetchBarbeiros();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleAtivo = async (barbeiroId: string, ativo: boolean) => {
    try {
      const { error } = await supabase.rpc('admin_toggle_barbeiro_ativo', {
        p_barbeiro_id: barbeiroId,
        p_ativo: !ativo,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Barbeiro ${!ativo ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchBarbeiros();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || loadingBarbeiros) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Gerenciar Barbeiros</h1>
            <p className="text-muted-foreground">Criar e gerenciar contas de barbeiros</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Barbeiro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Barbeiro</DialogTitle>
                <DialogDescription>
                  Crie uma conta de barbeiro com email e senha
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nome do barbeiro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="barbeiro@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <Button 
                  onClick={handleCreateBarbeiro} 
                  disabled={creating || !email || !password || !fullName || !whatsapp}
                  className="w-full"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  {creating ? 'Criando...' : 'Criar Barbeiro'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {barbeiros.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum barbeiro cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {barbeiros.map((barbeiro) => (
              <Card key={barbeiro.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{barbeiro.profile.full_name}</CardTitle>
                      <CardDescription>{barbeiro.profile.email}</CardDescription>
                    </div>
                    <Button
                      variant={barbeiro.ativo ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => handleToggleAtivo(barbeiro.id, barbeiro.ativo)}
                    >
                      {barbeiro.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${barbeiro.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-muted-foreground">
                      {barbeiro.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
