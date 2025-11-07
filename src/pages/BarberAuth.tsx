import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Scissors, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  clientes: {
    nome_completo: string;
    telefone: string;
  }[];
  servicos: {
    nome: string;
    preco: number;
    duracao_minutos: number;
  }[];
}

export default function BarberAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [barbeiroLogado, setBarbeiroLogado] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);

  useEffect(() => {
    if (barbeiroLogado) {
      fetchAgendamentos();
    }
  }, [barbeiroLogado]);

  const fetchAgendamentos = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          observacoes,
          clientes (nome_completo, telefone),
          servicos (nome, preco, duracao_minutos)
        `)
        .eq('barbeiro_id', barbeiroLogado.id)
        .gte('data_hora', hoje.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      setAgendamentos(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar agendamentos:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !senha) {
      toast({
        title: 'Erro',
        description: 'Preencha email e senha',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('authenticate_barbeiro', {
        p_email: email,
        p_senha: senha
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Email ou senha incorretos');
      }

      setBarbeiroLogado(data[0]);
      toast({
        title: 'Bem-vindo!',
        description: 'Login realizado com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (agendamentoId: string, novoStatus: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: novoStatus })
        .eq('id', agendamentoId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: 'O agendamento foi atualizado com sucesso',
      });

      fetchAgendamentos();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      confirmado: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      em_andamento: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      finalizado: 'bg-green-500/10 text-green-500 border-green-500/20',
      cancelado: 'bg-red-500/10 text-red-500 border-red-500/20',
      nao_compareceu: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  };

  if (barbeiroLogado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4">
        <div className="container mx-auto max-w-4xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="border-primary/20 mb-6">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Scissors className="h-6 w-6 text-primary" />
                Painel do Barbeiro
              </CardTitle>
              <CardDescription>
                Olá, {barbeiroLogado.nome_completo}! Gerencie seus agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setBarbeiroLogado(null)} className="w-full">
                Sair
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximos Agendamentos
            </h3>

            {agendamentos.length === 0 ? (
              <Card className="border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    Nenhum agendamento encontrado
                  </p>
                </CardContent>
              </Card>
            ) : (
              agendamentos.map((agendamento) => (
                <Card key={agendamento.id} className="border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-semibold">
                            {format(new Date(agendamento.data_hora), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{agendamento.clientes[0]?.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">{agendamento.clientes[0]?.telefone}</p>
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">{agendamento.servicos[0]?.nome}</span> - R$ {agendamento.servicos[0]?.preco.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duração: {agendamento.servicos[0]?.duracao_minutos} minutos
                          </p>
                        </div>
                        {agendamento.observacoes && (
                          <p className="text-sm text-muted-foreground italic">
                            Obs: {agendamento.observacoes}
                          </p>
                        )}
                        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(agendamento.status)}`}>
                          {agendamento.status.replace('_', ' ').toUpperCase()}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-[150px]">
                        {agendamento.status === 'pendente' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(agendamento.id, 'confirmado')}
                          >
                            Confirmar
                          </Button>
                        )}
                        {agendamento.status === 'confirmado' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(agendamento.id, 'em_andamento')}
                          >
                            Iniciar
                          </Button>
                        )}
                        {agendamento.status === 'em_andamento' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(agendamento.id, 'finalizado')}
                          >
                            Finalizar
                          </Button>
                        )}
                        {(agendamento.status === 'pendente' || agendamento.status === 'confirmado') && (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleStatusChange(agendamento.id, 'cancelado')}
                          >
                            Cancelar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Área do Barbeiro</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar seus agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="seu@email.com" 
              />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input 
                type="password" 
                value={senha} 
                onChange={(e) => setSenha(e.target.value)} 
                placeholder="Sua senha" 
              />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
