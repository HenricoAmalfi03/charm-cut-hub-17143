import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, DollarSign, Scissors, TrendingUp, Users } from 'lucide-react';

interface RelatorioData {
  totalAgendamentos: number;
  agendamentosConcluidos: number;
  receitaTotal: number;
  clientesAtivos: number;
  barbeirosAtivos: number;
}

export default function AdminRelatorios() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [relatorio, setRelatorio] = useState<RelatorioData>({
    totalAgendamentos: 0,
    agendamentosConcluidos: 0,
    receitaTotal: 0,
    clientesAtivos: 0,
    barbeirosAtivos: 0,
  });
  const [loadingRelatorio, setLoadingRelatorio] = useState(true);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchRelatorio();
    }
  }, [user, isAdmin]);

  const fetchRelatorio = async () => {
    try {
      setLoadingRelatorio(true);

      // Total de agendamentos
      const { count: totalAgendamentos } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true });

      // Agendamentos concluídos
      const { count: agendamentosConcluidos } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'concluido');

      // Receita total (agendamentos concluídos)
      const { data: agendamentosConcluidos2 } = await supabase
        .from('agendamentos')
        .select(`
          servico:servico_id (
            preco
          )
        `)
        .eq('status', 'concluido');

      const receitaTotal = (agendamentosConcluidos2 || []).reduce(
        (sum, agendamento: any) => sum + (agendamento.servico?.preco || 0),
        0
      );

      // Clientes ativos (com pelo menos 1 agendamento)
      const { data: clientesData } = await supabase
        .from('agendamentos')
        .select('cliente_id');

      const clientesUnicos = new Set(
        (clientesData || []).map((a: any) => a.cliente_id)
      );

      // Barbeiros ativos
      const { count: barbeirosAtivos } = await supabase
        .from('barbeiros')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true);

      setRelatorio({
        totalAgendamentos: totalAgendamentos || 0,
        agendamentosConcluidos: agendamentosConcluidos || 0,
        receitaTotal,
        clientesAtivos: clientesUnicos.size,
        barbeirosAtivos: barbeirosAtivos || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar relatório:', error);
    } finally {
      setLoadingRelatorio(false);
    }
  };

  if (loading || loadingRelatorio) {
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
          <p className="text-muted-foreground">Visão geral do fluxo da barbearia</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {relatorio.receitaTotal.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                De agendamentos concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorio.totalAgendamentos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {relatorio.agendamentosConcluidos} concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorio.clientesAtivos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Com agendamentos realizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Barbeiros Ativos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorio.barbeirosAtivos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Barbeiros cadastrados e ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <Scissors className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatorio.totalAgendamentos > 0
                  ? Math.round(
                      (relatorio.agendamentosConcluidos / relatorio.totalAgendamentos) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Agendamentos concluídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R${' '}
                {relatorio.agendamentosConcluidos > 0
                  ? (relatorio.receitaTotal / relatorio.agendamentosConcluidos).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por agendamento concluído
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
