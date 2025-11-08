import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Interface para configurações da barbearia
 * - nome_estabelecimento: Nome que aparece após "Barbearia" (ex: BRAVO-II)
 * - logo_url: URL do logo armazenado no bucket 'barbearia' do Supabase Storage
 * - endereco: Endereço completo da barbearia
 */
interface ConfigBarbearia {
  nome_estabelecimento: string;
  logo_url: string | null;
  endereco: string;
}

/**
 * Hook para gerenciar as configurações da barbearia
 * Busca os dados da tabela 'configuracoes_barbearia' no Supabase
 * 
 * @returns {object} config - Configurações da barbearia
 * @returns {boolean} loading - Estado de carregamento
 * @returns {function} refetch - Função para recarregar as configurações
 */
export function useConfigBarbearia() {
  // Valores padrão caso não consiga buscar do banco
  const [config, setConfig] = useState<ConfigBarbearia>({
    nome_estabelecimento: 'BRAVO-II',
    logo_url: null,
    endereco: 'Rua Cardeal Motta - Itanhaém/Suarão'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  /**
   * Busca as configurações da barbearia no Supabase
   * A tabela deve ter apenas 1 registro (configuração única)
   */
  const fetchConfig = async () => {
    try {
      // Busca o primeiro registro da tabela de configurações
      const { data, error } = await supabase
        .from('configuracoes_barbearia')
        .select('nome_estabelecimento, logo_url, endereco')
        .limit(1)
        .maybeSingle(); // maybeSingle() não retorna erro se não encontrar registro

      if (error) {
        console.error('Erro ao buscar configurações:', error);
      }
      
      // Atualiza apenas se encontrou dados
      if (data) {
        setConfig({
          nome_estabelecimento: data.nome_estabelecimento || 'BRAVO-II',
          logo_url: data.logo_url,
          endereco: data.endereco || 'Rua Cardeal Motta - Itanhaém/Suarão'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      // Mantém valores padrão em caso de erro
    } finally {
      setLoading(false);
    }
  };

  return { config, loading, refetch: fetchConfig };
}
