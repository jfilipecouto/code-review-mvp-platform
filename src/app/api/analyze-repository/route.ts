import { NextResponse } from 'next/server';
import { GitHubService } from '@/lib/github';
import { CodeAnalysisService } from '@/lib/codeAnalysis';

export async function POST(request: Request) {
  try {
    const { repoFullName, accessToken } = await request.json();

    if (!repoFullName || !accessToken) {
      return NextResponse.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    const github = new GitHubService(accessToken);
    const metrics = await github.getRepositoryMetrics(repoFullName);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Erro na análise do repositório:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao analisar repositório' },
      { status: 500 }
    );
  }
} 