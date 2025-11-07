import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ConfigBarbearia {
  nome_estabelecimento: string;
  logo_url: string | null;
  endereco: string;
}

export function useConfigBarbearia() {
  const [config, setConfig] = useState<ConfigBarbearia>({
    nome_estabelecimento: 'BRAVO-II',
    logo_url: null,
    endereco: 'Rua Cardeal Motta - Itanhaém/Suarão'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      if (data) setConfig(data);
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  return { config, loading, refetch: fetchConfig };
}
