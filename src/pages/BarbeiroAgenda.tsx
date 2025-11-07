import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Phone, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string;
  servico: {
    nome: string;
    duracao_minutos: number;
    preco: number;
  };
  cliente: {
    full_name: string;
    phone: string;
  };
}

export default function BarbeiroAgenda() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);
  const [barbeiroId, setBarbeiroId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchBarbeiroId();
    }
  }, [user]);

  useEffect(() => {
    if (barbeiroId) {
      fetchAgendamentos();
    }
    // eslint-disable-next-line
  }, [barbeiroId]);

  const fetchBarbeiroId = async () => {
    try {
      const { data, error } = await supabase
        .from('barbeiros')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      setBarbeiroId(data.id);
    } catch (error) {
      console.error('Erro ao buscar ID do barbeiro:', error);
    }
  };

  const fetchAgendamentos = async () => {
    try {
      setLoadingAgendamentos(true);
      const { data, error } = await supabase
        .from('agendamentos')
        .select(`
          id,
          data_hora,
          status,
          observacoes,
          servico:servico_id (
            nome,
            duracao_minutos,
            preco
          ),
          cliente:cliente_id (
            id
          )
        `)
        .eq('barbeiro_id', barbeiroId)
        .gte('data_hora', new Date().toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;

      // Buscar perfis dos clientes
      const agendamentosComClientes = await Promise.all(
        (data || []).map(async (agendamento: any) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', agendamento.cliente.id)
            .single();
          return {
            ...agendamento,
            cliente: profileData || { full_name: 'Cliente', phone: '' },
          };
        })
      );
      setAgendamentos(agendamentosComClientes);
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os agendamentos',
        variant: 'destructive',
      });
    } finally {
      setLoadingAgendamentos(false);
    }
  };

  // Atualiza status para "finalizado"
  const handleConcluir = async (agendamentoId: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'finalizado', updated_at: new Date().toISOString() })
        .eq('id', agendamentoId);
      if (error) throw error;
      toast({
        title: 'Sucesso',
        description: 'Atendimento finalizado',
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

  // Atualiza status para "cancelado"
  const handleCancelar = async (agendamentoId: string) => {
    try {
      const { error } = await supabase
        .from('agendamentos')
        .update({ status: 'cancelado', updated_at: new Date().toISOString() })
        .eq('id', agendamentoId);
      if (error) throw error;
      toast({
        title: 'Cancelado',
        description: 'Agendamento cancelado',
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

  // Badge de status
  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      pendente: 'default',
      confirmado: 'secondary',
      em_andamento: 'default',
      finalizado: 'secondary',
      cancelado: 'destructive',
      nao_compareceu: 'destructive',
    };
    // Nome amigável para exibir
    const nomesAmigaveis: { [key: string]: string } = {
      pendente: 'Pendente',
      confirmado: 'Confirmado',
      em_andamento: 'Em andamento',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
      nao_compareceu: 'Não compareceu',
    };
    return <Badge variant={variants[status] || 'default'}>{nomesAmigaveis[status] || status}</Badge>;
  };

  if (loading || loadingAgendamentos) {
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
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Minha Agenda</h1>
          <p className="text-muted-foreground">Agendamentos futuros</p>
        </div>
        {agendamentos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum agendamento futuro</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {agendamentos.map((agendamento) => (
              <Card key={agendamento.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{agendamento.cliente.full_name}</CardTitle>
                      <CardDescription>
                        {format(new Date(agendamento.data_hora), "dd 'de' MMMM 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </CardDescription>
                    </div>
                    {getStatusBadge(agendamento.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold">{agendamento.servico.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {agendamento.servico.duracao_minutos} min • R${' '}
                      {agendamento.servico.preco.toFixed(2)}
                    </p>
                  </div>
                  {agendamento.cliente.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4" />
                      <a
                        href={`https://wa.me/55${agendamento.cliente.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {agendamento.cliente.phone}
                      </a>
                    </div>
                  )}
                  {agendamento.observacoes && (
                    <div className="text-sm text-muted-foreground">
                      <p className="font-semibold">Observações:</p>
                      <p>{agendamento.observacoes}</p>
                    </div>
                  )}
                  {/* Botões de ação só se não estiver finalizado/cancelado */}
                  {(agendamento.status !== 'finalizado' && agendamento.status !== 'cancelado' && agendamento.status !== 'nao_compareceu') && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConcluir(agendamento.id)}
                        className="w-full"
                        variant="default"
                      >
                        <Check className="h-4 w-4 mr-2" /> Finalizar Atendimento
                      </Button>
                      <Button
                        onClick={() => handleCancelar(agendamento.id)}
                        className="w-full"
                        variant="destructive"
                      >
                        <X className="h-4 w-4 mr-2" /> Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
