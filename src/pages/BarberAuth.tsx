import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function BarberAuth() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-card p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl">Área do Barbeiro</CardTitle>
          <CardDescription>
            Barbeiros fazem login com credenciais criadas pelo administrador. Em breve ativaremos o acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" onClick={() => navigate('/')}>Voltar</Button>
        </CardContent>
      </Card>
    </main>
  );
}
