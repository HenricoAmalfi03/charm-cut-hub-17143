import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  FileDown,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useConfigBarbearia } from '@/hooks/useConfigBarbearia';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioData {
  totalAgendamentos: number;
  agendamentosFinalizados: number;
  receitaTotal: number;
  clientesAtivos: number;
  barbeirosAtivos: number;
}

export default function AdminRelatorios() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { config } = useConfigBarbearia();

  const [relatorio, setRelatorio] = useState<RelatorioData>({
    totalAgendamentos: 0,
    agendamentosFinalizados: 0,
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
    // eslint-disable-next-line
  }, [user, isAdmin]);

  const fetchRelatorio = async () => {
    try {
      setLoadingRelatorio(true);

      // Total de agendamentos
      const { count: totalAgendamentos } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true });

      // Agendamentos finalizados
      const { count: agendamentosFinalizados } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'finalizado');

      // Receita total (agendamentos finalizados)
      const { data: agendamentosFinalizados2 } = await supabase
        .from('agendamentos')
        .select(`servico:servico_id ( preco )`)
        .eq('status', 'finalizado');
      const receitaTotal = (agendamentosFinalizados2 || []).reduce(
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
        agendamentosFinalizados: agendamentosFinalizados || 0,
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

  const gerarRelatorioPDF = async () => {
    try {
      toast({
        title: 'Gerando PDF...',
        description: 'Por favor, aguarde',
      });

      // Buscar dados detalhados
      const { data: agendamentosCompletos } = await supabase
        .from('agendamentos')
        .select(`id, data_hora, status, cliente_id, barbeiro_id, servico_id`)
        .eq('status', 'finalizado')
        .order('data_hora', { ascending: false });

      // Buscar detalhes de cada agendamento
      const detalhes = await Promise.all(
        (agendamentosCompletos || []).map(async (ag: any) => {
          const [cliente, barbeiro, servico] = await Promise.all([
            supabase
              .from('clientes')
              .select('nome_completo')
              .eq('id', ag.cliente_id)
              .single(),
            supabase
              .from('barbeiros')
              .select('nome_completo')
              .eq('id', ag.barbeiro_id)
              .single(),
            supabase
              .from('servicos')
              .select('nome, preco')
              .eq('id', ag.servico_id)
              .single(),
          ]);
          return {
            data: new Date(ag.data_hora).toLocaleDateString('pt-BR'),
            cliente: cliente.data?.nome_completo || 'N/A',
            barbeiro: barbeiro.data?.nome_completo || 'N/A',
            servico: servico.data?.nome || 'N/A',
            valor: servico.data?.preco || 0,
          };
        })
      );

      // Agrupar por barbeiro
      const porBarbeiro: Record<string, any[]> = {};
      detalhes.forEach((d) => {
        if (!porBarbeiro[d.barbeiro]) {
          porBarbeiro[d.barbeiro] = [];
        }
        porBarbeiro[d.barbeiro].push(d);
      });

      // Gerar PDF
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Relatório Completo - Barbearia ${config.nome_estabelecimento}`, 14, 20);
      doc.setFontSize(11);
      doc.text(
        `Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`,
        14,
        30
      );
      let yPos = 40;

      // Resumo geral
      doc.setFontSize(14);
      doc.text('Resumo Geral', 14, yPos);
      yPos += 10;
      doc.setFontSize(10);
      doc.text(
        `Total de Agendamentos: ${relatorio.totalAgendamentos}`,
        14,
        yPos
      );
      yPos += 6;
      doc.text(
        `Agendamentos Finalizados: ${relatorio.agendamentosFinalizados}`,
        14,
        yPos
      );
      yPos += 6;
      doc.text(
        `Receita Total: R$ ${relatorio.receitaTotal.toFixed(2)}`,
        14,
        yPos
      );
      yPos += 6;
      doc.text(`Clientes Ativos: ${relatorio.clientesAtivos}`, 14, yPos);
      yPos += 6;
      doc.text(`Barbeiros Ativos: ${relatorio.barbeirosAtivos}`, 14, yPos);
      yPos += 15;

      // Detalhes por barbeiro
      doc.setFontSize(14);
      doc.text('Detalhes por Barbeiro', 14, yPos);
      yPos += 10;

      Object.keys(porBarbeiro).forEach((nomeBarbeiro) => {
        const atendimentos = porBarbeiro[nomeBarbeiro];
        const totalClientes = new Set(atendimentos.map((a) => a.cliente)).size;
        const totalReceita = atendimentos.reduce((sum, a) => sum + a.valor, 0);

        doc.setFontSize(12);
        doc.text(`Barbeiro: ${nomeBarbeiro}`, 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.text(
          `Atendimentos: ${atendimentos.length} | Clientes: ${totalClientes} | Receita: R$ ${totalReceita.toFixed(
            2
          )}`,
          14,
          yPos
        );
        yPos += 8;

        // Tabela de atendimentos
        autoTable(doc, {
          startY: yPos,
          head: [['Data', 'Cliente', 'Serviço', 'Valor']],
          body: atendimentos.map((a) => [
            a.data,
            a.cliente,
            a.servico,
            `R$ ${a.valor.toFixed(2)}`,
          ]),
          theme: 'grid',
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;

        // Nova página se necessário
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });

      doc.save(
        `relatorio-barbearia-${new Date().toISOString().split('T')[0]}.pdf`
      );
      toast({
        title: 'PDF gerado!',
        description: 'O relatório foi baixado com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
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
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
            <p className="text-muted-foreground">
              Visão geral do fluxo da barbearia
            </p>
          </div>
          <Button onClick={gerarRelatorioPDF}>
            <FileDown className="h-4 w-4 mr-2" /> Extrair PDF
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {relatorio.receitaTotal.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                De agendamentos finalizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Agendamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatorio.totalAgendamentos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {relatorio.agendamentosFinalizados} finalizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Clientes Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatorio.clientesAtivos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Com agendamentos realizados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Barbeiros Ativos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatorio.barbeirosAtivos}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Barbeiros cadastrados e ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Taxa de Finalização
              </CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {relatorio.totalAgendamentos > 0
                  ? Math.round(
                      (relatorio.agendamentosFinalizados /
                        relatorio.totalAgendamentos) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Agendamentos finalizados
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
                {relatorio.agendamentosFinalizados > 0
                  ? (relatorio.receitaTotal / relatorio.agendamentosFinalizados).toFixed(2)
                  : '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por agendamento finalizado
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
