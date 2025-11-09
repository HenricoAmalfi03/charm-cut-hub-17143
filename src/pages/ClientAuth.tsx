import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar as CalendarIcon, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';

interface Barbeiro {
  id: string;
  nome_completo: string;
  avatar_url: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

export default function ClientAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Auth state
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Cliente logado
  const [clienteLogado, setClienteLogado] = useState<any>(null);
  
  // Agendamento state
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState('');
  const [servicoSelecionado, setServicoSelecionado] = useState('');
  const [dataSelecionada, setDataSelecionada] = useState<Date>();
  const [horarioSelecionado, setHorarioSelecionado] = useState('');

  useEffect(() => {
    fetchBarbeirosEServicos();
  }, []);

  const fetchBarbeirosEServicos = async () => {
    try {
      const [barbeirosRes, servicosRes] = await Promise.all([
        supabase.from('barbeiros').select('id, nome_completo, avatar_url').eq('ativo', true),
        supabase.from('servicos').select('*').eq('ativo', true)
      ]);

      if (barbeirosRes.data) setBarbeiros(barbeirosRes.data);
      if (servicosRes.data) setServicos(servicosRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  const handleCadastro = async () => {
    if (!nomeCompleto || !email || !senha || !whatsapp) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('create_cliente', {
        p_nome: nomeCompleto,
        p_email: email,
        p_senha: senha,
        p_whatsapp: whatsapp
      });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Conta criada! Faça login para continuar.',
      });
      
      setIsLogin(true);
      setNomeCompleto('');
      setWhatsapp('');
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
      const { data, error } = await supabase.rpc('authenticate_cliente', {
        p_email: email,
        p_senha: senha
      });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('Email ou senha incorretos');
      }

      setClienteLogado(data[0]);
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

  const handleAgendamento = async () => {
    if (!clienteLogado || !barbeiroSelecionado || !servicoSelecionado || !dataSelecionada || !horarioSelecionado) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos do agendamento',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      const dataHora = new Date(dataSelecionada);
      const [hora, minuto] = horarioSelecionado.split(':');
      dataHora.setHours(parseInt(hora), parseInt(minuto), 0);

      const { error } = await supabase.from('agendamentos').insert({
        cliente_id: clienteLogado.id,
        barbeiro_id: barbeiroSelecionado,
        servico_id: servicoSelecionado,
        data_hora: dataHora.toISOString(),
        status: 'pendente'
      });

      if (error) throw error;

      toast({
        title: 'Agendamento confirmado!',
        description: 'Seu horário foi marcado com sucesso',
      });

      // Limpar form
      setBarbeiroSelecionado('');
      setServicoSelecionado('');
      setDataSelecionada(undefined);
      setHorarioSelecionado('');
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

  const horarios = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  if (clienteLogado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card p-4">
        <div className="container mx-auto max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                Agendar Horário
              </CardTitle>
              <CardDescription>
                Olá, {clienteLogado.nome_completo}! Escolha seu serviço e horário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Barbeiro</Label>
                <Select value={barbeiroSelecionado} onValueChange={setBarbeiroSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o barbeiro" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbeiros.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex items-center gap-2">
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt={b.nome_completo} className="w-6 h-6 rounded-full object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                          {b.nome_completo}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={servicoSelecionado} onValueChange={setServicoSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome} - R$ {s.preco.toFixed(2)} ({s.duracao_minutos}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataSelecionada ? format(dataSelecionada, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dataSelecionada}
                      onSelect={setDataSelecionada}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Select value={horarioSelecionado} onValueChange={setHorarioSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o horário" />
                  </SelectTrigger>
                  <SelectContent>
                    {horarios.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleAgendamento} disabled={loading} className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                {loading ? 'Agendando...' : 'Confirmar Agendamento'}
              </Button>

              <Button variant="outline" onClick={() => setClienteLogado(null)} className="w-full">
                Sair
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card p-4">
      <div className="w-full max-w-md">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Área do Cliente</CardTitle>
            <CardDescription>
              Entre ou crie sua conta para agendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'cadastro'} onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
                <TabsTrigger value="login">Login</TabsTrigger>
              </TabsList>

              <TabsContent value="cadastro" className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <Button onClick={handleCadastro} disabled={loading} className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  {loading ? 'Criando...' : 'Criar Conta'}
                </Button>
              </TabsContent>

              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
                </div>
                <Button onClick={handleLogin} disabled={loading} className="w-full">
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
