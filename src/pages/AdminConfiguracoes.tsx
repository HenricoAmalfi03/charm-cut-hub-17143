import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Upload, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Configuracoes {
  id: string;
  nome_estabelecimento: string;
  logo_url: string | null;
  endereco: string;
}

export default function AdminConfiguracoes() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [configuracoes, setConfiguracoes] = useState<Configuracoes | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/dashboard');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchConfiguracoes();
    }
  }, [user, isAdmin]);

  const fetchConfiguracoes = async () => {
    try {
      setLoadingConfig(true);
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;

      setConfiguracoes(data);
      setNome(data.nome_estabelecimento);
      setEndereco(data.endereco);
      setLogoUrl(data.logo_url || '');
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return;
      
      setUploading(true);
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('barbearia')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('barbearia')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      toast({
        title: 'Sucesso',
        description: 'Logo enviada com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Buscar o primeiro registro para pegar o ID
      const { data: currentConfig } = await supabase
        .from('configuracoes_barbearia')
        .select('id')
        .limit(1)
        .single();

      if (!currentConfig) {
        throw new Error('Configuração não encontrada');
      }

      const { error } = await supabase
        .from('configuracoes_barbearia')
        .update({
          nome_estabelecimento: nome,
          logo_url: logoUrl || null,
          endereco: endereco
        })
        .eq('id', currentConfig.id);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso',
      });

      await fetchConfiguracoes();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingConfig) {
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Configurações da Barbearia</h1>
          <p className="text-muted-foreground">Personalize as informações do estabelecimento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações Gerais
            </CardTitle>
            <CardDescription>
              Altere o nome, logo e endereço da barbearia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Estabelecimento</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Barbearia</span>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="BRAVO-II"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                O termo "Barbearia" é fixo. Digite apenas o complemento do nome.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo">Logo da Barbearia</Label>
              {logoUrl && (
                <div className="mb-4">
                  <img 
                    src={logoUrl} 
                    alt="Logo" 
                    className="h-24 w-24 object-cover rounded-lg border border-border"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleUploadLogo}
                  disabled={uploading}
                  className="flex-1"
                />
                {uploading && (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: JPG, PNG, WEBP (máx. 5MB)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Input
                id="endereco"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Rua Cardeal Motta,  - Itanhaém/Suarão"
              />
              <p className="text-xs text-muted-foreground">
                Este endereço será exibido no rodapé do site
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving || !nome || !endereco}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
