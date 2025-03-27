'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { GitHubService } from '@/lib/github';

interface Repository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
}

export default function Settings() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRepositories() {
      if (session?.accessToken) {
        const github = new GitHubService(session.accessToken);
        try {
          const repos = await github.listRepositories();
          setRepositories(repos);
          setError(null);
        } catch (error) {
          console.error('Erro ao carregar repositórios:', error);
          setError('Não foi possível carregar os repositórios. Verifique suas permissões.');
        } finally {
          setLoading(false);
        }
      }
    }

    loadRepositories();
  }, [session]);

  const toggleRepository = (repo: Repository) => {
    const newSelected = new Set(selectedRepos);
    if (newSelected.has(repo.fullName)) {
      newSelected.delete(repo.fullName);
    } else {
      newSelected.add(repo.fullName);
    }
    setSelectedRepos(newSelected);
    localStorage.setItem('selectedRepos', JSON.stringify([...newSelected]));
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Por favor, faça login para continuar</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Configurar Análise</h1>
      
      <div className="mb-6">
        <p className="text-gray-600">
          Selecione os repositórios principais que demonstram a maturidade técnica do seu projeto.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {repositories.map(repo => (
            <div 
              key={repo.id}
              className="flex items-center p-4 border rounded hover:bg-gray-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedRepos.has(repo.fullName)}
                onChange={() => toggleRepository(repo)}
                className="mr-4 h-5 w-5 text-blue-600"
              />
              <div className="flex-1">
                <h3 className="font-medium">{repo.name}</h3>
                <p className="text-sm text-gray-500">{repo.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span>⭐ {repo.stars}</span>
                  <span>🔀 {repo.forks}</span>
                  <span>🔵 {repo.language}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 