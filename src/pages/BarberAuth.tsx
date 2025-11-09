import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, MessageCircle, User, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agendamento {
  id: string;
  data_hora: string;
  status: string;
  observacoes: string | null;
  cliente: {
    nome_completo: string;
    telefone: string;
    whatsapp: string;
  };
  servico: {
    nome: string;
    preco: number;
    duracao_minutos: number;
  };
}

export default function BarberAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [barbeiroLogado, setBarbeiroLogado] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [whatsappEdit, setWhatsappEdit] = useState('');
  const [avatarUrlEdit, setAvatarUrlEdit] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (barbeiroLogado) {
      fetchAgendamentos();
      setWhatsappEdit(barbeiroLogado.whatsapp || '');
      setAvatarUrlEdit(barbeiroLogado.avatar_url || '');
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
          cliente_id,
          servico_id
        `)
        .eq('barbeiro_id', barbeiroLogado.id)
        .gte('data_hora', hoje.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;

      // Buscar dados relacionados manualmente
      const agendamentosCompletos = await Promise.all(
        (data || []).map(async (agendamento: any) => {
          const [clienteRes, servicoRes] = await Promise.all([
            supabase.from('clientes').select('nome_completo, telefone, whatsapp').eq('id', agendamento.cliente_id).single(),
            supabase.from('servicos').select('nome, preco, duracao_minutos').eq('id', agendamento.servico_id).single()
          ]);

          return {
            ...agendamento,
            cliente: clienteRes.data,
            servico: servicoRes.data
          };
        })
      );

      setAgendamentos(agendamentosCompletos);
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
      const { error } = await supabase.rpc('update_agendamento_status', {
        p_agendamento_id: agendamentoId,
        p_status: novoStatus,
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso',
      });

      await fetchAgendamentos();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o status',
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

  const handleUpdatePerfil = async () => {
    try {
      let finalAvatarUrl = avatarUrlEdit || '';

      if (avatarFile) {
        if (avatarFile.size > 2 * 1024 * 1024) {
          throw new Error('A imagem deve ter no máximo 2MB');
        }
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `barbeiros/${barbeiroLogado.id}/avatar-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('barbearia')
          .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data: pub } = supabase.storage.from('barbearia').getPublicUrl(filePath);
        finalAvatarUrl = pub.publicUrl;
      }

      const { error } = await supabase.rpc('update_barbeiro_perfil', {
        p_barbeiro_id: barbeiroLogado.id,
        p_whatsapp: whatsappEdit,
        p_avatar_url: finalAvatarUrl,
      });

      if (error) throw error;

      setBarbeiroLogado({ ...barbeiroLogado, whatsapp: whatsappEdit, avatar_url: finalAvatarUrl });
      setEditandoPerfil(false);
      setAvatarFile(null);
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram atualizadas com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const abrirWhatsApp = (telefone: string) => {
    const numero = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}`, '_blank');
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
                Painel do Barbeiro
              </CardTitle>
              <CardDescription>
                Olá, {barbeiroLogado.nome_completo}! Gerencie seus agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="relative">
                  {barbeiroLogado.avatar_url ? (
                    <img src={barbeiroLogado.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-8 w-8 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{barbeiroLogado.nome_completo}</p>
                  <p className="text-sm text-muted-foreground">{barbeiroLogado.email}</p>
                  {barbeiroLogado.whatsapp && (
                    <p className="text-sm text-muted-foreground">WhatsApp: {barbeiroLogado.whatsapp}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setEditandoPerfil(!editandoPerfil)}>
                  {editandoPerfil ? 'Cancelar' : 'Editar'}
                </Button>
              </div>

              {editandoPerfil && (
                <div className="space-y-3 p-4 border border-border rounded-lg">
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input 
                      value={whatsappEdit} 
                      onChange={(e) => setWhatsappEdit(e.target.value)} 
                      placeholder="(00) 00000-0000" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Foto (até 2MB)</Label>
                    <Input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setAvatarFile(f);
                      }}
                    />
                  </div>
                  <Button onClick={handleUpdatePerfil} className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              )}

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
                          <p className="font-medium">{agendamento.cliente?.nome_completo}</p>
                          <p className="text-sm text-muted-foreground">{agendamento.cliente?.whatsapp}</p>
                        </div>
                        <div>
                          <p className="text-sm">
                            <span className="font-medium">{agendamento.servico?.nome}</span> - R$ {agendamento.servico?.preco?.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Duração: {agendamento.servico?.duracao_minutos} minutos
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
                        {agendamento.cliente?.whatsapp && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => abrirWhatsApp(agendamento.cliente.whatsapp)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Mensagem
                          </Button>
                        )}
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
                            onClick={() => handleStatusChange(agendamento.id, 'finalizado')}
                          >
                            Realizado
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
