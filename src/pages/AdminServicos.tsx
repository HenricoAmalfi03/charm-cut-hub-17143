import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Servico {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  duracao_minutos: number;
  ativo: boolean;
}

export default function AdminServicos() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [duracao, setDuracao] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchServicos();
    }
  }, [user, isAdmin]);

  const fetchServicos = async () => {
    try {
      setLoadingServicos(true);
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .order('nome');

      if (error) throw error;
      setServicos(data || []);
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os serviços',
        variant: 'destructive',
      });
    } finally {
      setLoadingServicos(false);
    }
  };

  const resetForm = () => {
    setNome('');
    setDescricao('');
    setPreco('');
    setDuracao('');
    setEditingServico(null);
  };

  const openEditDialog = (servico: Servico) => {
    setEditingServico(servico);
    setNome(servico.nome);
    setDescricao(servico.descricao || '');
    setPreco(servico.preco.toString());
    setDuracao(servico.duracao_minutos.toString());
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validações
      if (!nome.trim()) {
        toast({
          title: 'Erro',
          description: 'Nome é obrigatório',
          variant: 'destructive',
        });
        return;
      }

      const precoNum = parseFloat(preco);
      if (isNaN(precoNum) || precoNum <= 0) {
        toast({
          title: 'Erro',
          description: 'Preço deve ser um valor válido',
          variant: 'destructive',
        });
        return;
      }

      const duracaoNum = parseInt(duracao);
      if (isNaN(duracaoNum) || duracaoNum <= 0) {
        toast({
          title: 'Erro',
          description: 'Duração deve ser um valor válido',
          variant: 'destructive',
        });
        return;
      }

      const servicoData = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        preco: precoNum,
        duracao_minutos: duracaoNum,
      };

      if (editingServico) {
        // Atualizar
        const { error } = await supabase
          .from('servicos')
          .update(servicoData)
          .eq('id', editingServico.id);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Serviço atualizado com sucesso',
        });
      } else {
        // Criar
        const { error } = await supabase
          .from('servicos')
          .insert([servicoData]);

        if (error) throw error;

        toast({
          title: 'Sucesso',
          description: 'Serviço criado com sucesso',
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchServicos();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (servico: Servico) => {
    try {
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: !servico.ativo })
        .eq('id', servico.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: `Serviço ${!servico.ativo ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchServicos();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading || loadingServicos) {
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
            <h1 className="text-3xl font-bold mb-2">Gerenciar Serviços</h1>
            <p className="text-muted-foreground">Criar e gerenciar serviços e preços</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingServico ? 'Editar Serviço' : 'Criar Novo Serviço'}
                </DialogTitle>
                <DialogDescription>
                  {editingServico ? 'Atualize as informações do serviço' : 'Adicione um novo serviço ao catálogo'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Serviço</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Corte Simples"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o serviço..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço (R$)</Label>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      min="0"
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="35.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duracao">Duração (min)</Label>
                    <Input
                      id="duracao"
                      type="number"
                      min="1"
                      value={duracao}
                      onChange={(e) => setDuracao(e.target.value)}
                      placeholder="30"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSave} 
                  disabled={saving || !nome.trim() || !preco || !duracao}
                  className="w-full"
                >
                  {saving ? 'Salvando...' : editingServico ? 'Atualizar' : 'Criar Serviço'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {servicos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              
              <p className="text-muted-foreground">Nenhum serviço cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servicos.map((servico) => (
              <Card key={servico.id} className={!servico.ativo ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{servico.nome}</CardTitle>
                      <CardDescription className="mt-1">
                        {servico.descricao || 'Sem descrição'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(servico)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-primary">
                        R$ {servico.preco.toFixed(2)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {servico.duracao_minutos} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${servico.ativo ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <span className="text-sm text-muted-foreground">
                          {servico.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <Button
                        variant={servico.ativo ? 'outline' : 'default'}
                        size="sm"
                        onClick={() => handleToggleAtivo(servico)}
                      >
                        {servico.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </div>
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
