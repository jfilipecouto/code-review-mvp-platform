import { getServerSession } from 'next-auth/next';
import Link from 'next/link';
import Image from 'next/image';
import { authOptions } from './api/auth/[...nextauth]/route';
import GitHubSignInButton from '@/components/GitHubSignInButton';

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <main className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-6">
            Análise Técnica para Pitch Deck
          </h1>
          
          <p className="text-xl mb-8 text-gray-600 dark:text-gray-300">
            Transforme seu código em métricas convincentes para investidores
          </p>

          <div className="space-y-8">
            {!session ? (
              <GitHubSignInButton />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <Image
                    src={session.user?.image || '/user-placeholder.png'}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <span className="text-lg">
                    Bem-vindo, {session.user?.name}
                  </span>
                </div>
                
                <div className="flex justify-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    Ir para Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Métricas de Desenvolvimento</h3>
              <p className="text-gray-600 dark:text-gray-300">
                • Velocidade de desenvolvimento
                • Qualidade do código
                • Eficiência da equipe
                • Maturidade do projeto
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Análise Comparativa</h3>
              <p className="text-gray-600 dark:text-gray-300">
                • Comparação com mercado
                • Benchmarks do setor
                • Tendências de crescimento
                • Insights automáticos
              </p>
            </div>
            <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Relatórios para Investidores</h3>
              <p className="text-gray-600 dark:text-gray-300">
                • PDFs profissionais
                • Gráficos interativos
                • Métricas personalizadas
                • Exportação de dados
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
