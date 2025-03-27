import { Octokit } from '@octokit/rest';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { CodeAnalysisService } from './codeAnalysis';

type PullRequest = RestEndpointMethodTypes['pulls']['list']['response']['data'][0];

export class GitHubService {
  private octokit: Octokit;
  private codeAnalysis: CodeAnalysisService;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken
    });
    this.codeAnalysis = new CodeAnalysisService();
  }

  async listRepositories() {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
        per_page: 100
      });

      return data.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language
      }));
    } catch (error) {
      console.error('Erro ao listar repositórios:', error);
      throw new Error('Não foi possível carregar os repositórios');
    }
  }

  async getRepositoryMetrics(repoFullName: string): Promise<RepositoryMetrics> {
    try {
      // Extrair owner e repo do fullName (formato: "owner/repo")
      const [owner, repo] = repoFullName.split('/');
      
      if (!owner || !repo) {
        throw new Error('Nome do repositório inválido. Use o formato "owner/repo"');
      }

      // Verificar se o repositório existe e temos acesso
      const repoData = await this.octokit.repos.get({
        owner,
        repo
      }).catch(() => {
        throw new Error(`Repositório ${repoFullName} não encontrado ou sem acesso`);
      });

      // Buscar commits dos últimos 90 dias
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);

      const [commits, prs, contributors] = await Promise.all([
        this.octokit.repos.listCommits({
          owner,
          repo,
          since: threeMonthsAgo.toISOString(),
        }),
        this.octokit.pulls.list({
          owner,
          repo,
          state: 'all',
          per_page: 100,
        }),
        this.octokit.repos.listContributors({
          owner,
          repo,
        })
      ]);

      // Análise do código
      const codeAnalysis = await this.analyzeRepositoryCode(owner, repo);

      return {
        summary: {
          totalCommits: commits.data.length,
          activeContributors: contributors.data.length,
          repositoryAge: this.calculateRepoAge(repoData.data.created_at),
          stars: repoData.data.stargazers_count,
          forks: repoData.data.forks_count
        },
        pullRequestMetrics: {
          total: prs.data.length,
          merged: prs.data.filter(pr => pr.merged_at).length,
          averageTimeToMerge: this.calculateAverageMergeTime(prs.data)
        },
        codeQualityMetrics: {
          score: codeAnalysis.qualityScore,
          insights: codeAnalysis.insights,
          lastAnalysis: codeAnalysis.timestamp
        }
      };
    } catch (error) {
      console.error('Erro ao obter métricas:', error);
      throw error;
    }
  }

  private calculateRepoAge(createdAt: string): string {
    const ageInDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return `${Math.floor(ageInDays / 30)} meses`;
  }

  private calculateAverageMergeTime(prs: any[]): string {
    const mergedPRs = prs.filter(pr => pr.merged_at);
    if (mergedPRs.length === 0) return 'N/A';

    const totalTime = mergedPRs.reduce((acc, pr) => {
      const created = new Date(pr.created_at).getTime();
      const merged = new Date(pr.merged_at).getTime();
      return acc + (merged - created);
    }, 0);

    const avgTimeInHours = totalTime / (mergedPRs.length * 1000 * 60 * 60);
    return `${Math.round(avgTimeInHours)} horas`;
  }

  private analyzePRs(prs: PullRequest[]) {
    const mergedPRs = prs.filter(pr => pr.merged_at);
    
    const totalMergeTime = mergedPRs.reduce((total, pr) => {
      const createDate = new Date(pr.created_at).getTime();
      const mergeDate = new Date(pr.merged_at!).getTime();
      return total + (mergeDate - createDate);
    }, 0);

    const averageTimeInMinutes = mergedPRs.length > 0 
      ? Math.round(totalMergeTime / mergedPRs.length / (1000 * 60))
      : 0;

    return {
      total: prs.length,
      merged: mergedPRs.length,
      open: prs.filter(pr => pr.state === 'open').length,
      averageTimeToMerge: averageTimeInMinutes < 60 
        ? `${averageTimeInMinutes}m` 
        : `${Math.round(averageTimeInMinutes / 60)}h`
    };
  }

  private analyzeIssues(issues: any[]) {
    const closedIssues = issues.filter(issue => issue.closed_at);
    
    const totalCloseTime = closedIssues.reduce((total, issue) => {
      const createDate = new Date(issue.created_at).getTime();
      const closeDate = new Date(issue.closed_at).getTime();
      return total + (closeDate - createDate);
    }, 0);

    return {
      total: issues.length,
      open: issues.filter(issue => issue.state === 'open').length,
      closed: closedIssues.length,
      averageTimeToClose: closedIssues.length > 0
        ? Math.round(totalCloseTime / closedIssues.length / (1000 * 60 * 60))
        : 0
    };
  }

  private async getMainFiles(owner: string, repo: string) {
    try {
      // Buscar a estrutura do repositório
      const tree = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: 'main', // ou 'master'
        recursive: 'true'
      });

      // Filtrar arquivos relevantes
      const relevantFiles = tree.data.tree
        .filter(file => {
          // Verificar se é um arquivo (não diretório)
          if (file.type !== 'blob') return false;

          // Extensões relevantes para análise
          const relevantExtensions = [
            '.ts', '.tsx', '.js', '.jsx', 
            '.py', '.java', '.go', '.rb',
            '.php', '.cs', '.cpp', '.c'
          ];

          // Caminhos a ignorar
          const ignorePaths = [
            'node_modules/', 'dist/', 'build/',
            'vendor/', '.git/', 'test/', 'tests/',
            '.next/', 'public/', 'assets/'
          ];

          // Verificar extensão e caminho
          const shouldAnalyze = relevantExtensions.some(ext => 
            file.path.endsWith(ext)
          ) && !ignorePaths.some(path => 
            file.path.startsWith(path)
          );

          return shouldAnalyze;
        })
        .slice(0, 10); // Limitar a 10 arquivos mais relevantes

      // Ordenar por importância (arquivos principais primeiro)
      const priorityFiles = ['index', 'main', 'app', 'server', 'client', 'core'];
      relevantFiles.sort((a, b) => {
        const aName = a.path.toLowerCase();
        const bName = b.path.toLowerCase();
        
        const aIsPriority = priorityFiles.some(p => aName.includes(p));
        const bIsPriority = priorityFiles.some(p => bName.includes(p));
        
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        return 0;
      });

      // Retornar informações dos arquivos
      return relevantFiles.map(file => ({
        name: file.path,
        sha: file.sha,
        size: file.size
      }));

    } catch (error) {
      console.error('Erro ao buscar arquivos:', error);
      return [];
    }
  }

  private async getFileContent({ owner, repo, path }: { 
    owner: string; 
    repo: string; 
    path: string; 
  }) {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
      });

      // Verificar se é um arquivo único
      if ('content' in response.data) {
        // Decodificar o conteúdo de base64
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      
      throw new Error('Path não é um arquivo');
    } catch (error) {
      console.error(`Erro ao buscar conteúdo do arquivo ${path}:`, error);
      throw error;
    }
  }

  private async analyzeRepositoryCode(owner: string, repo: string) {
    try {
      // Obter arquivos principais
      const files = await this.getMainFiles(owner, repo);
      
      // Analisar cada arquivo
      const analysisResults = await Promise.all(
        files.map(async file => {
          const content = await this.getFileContent({
            owner,
            repo,
            path: file.name
          });
          return {
            file: file.name,
            analysis: await this.codeAnalysis.analyzeCode(
              content,
              file.name.split('.').pop() || 'unknown'
            )
          };
        })
      );

      // Se não houver arquivos para análise
      if (analysisResults.length === 0) {
        return {
          qualityScore: 0,
          insights: "Não foram encontrados arquivos para análise.",
          timestamp: new Date().toISOString()
        };
      }

      // Combinar os insights de forma estruturada
      const combinedAnalysis = this.combineAnalyses(analysisResults);

      return {
        qualityScore: combinedAnalysis.averageScore,
        insights: this.formatAnalysis(combinedAnalysis),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Erro na análise do código:', error);
      return {
        qualityScore: 0,
        insights: "Erro ao analisar o código do repositório.",
        timestamp: new Date().toISOString()
      };
    }
  }

  private combineAnalyses(results: Array<{ file: string; analysis: CodeAnalysisResult }>) {
    const fileAnalyses: { [key: string]: any } = {};
    let totalScore = 0;

    results.forEach(({ file, analysis }) => {
      const sections = analysis.insights.split('\n\n');
      const fileAnalysis = {
        architecture: this.extractSection(analysis.insights, "QUALIDADE E ARQUITETURA"),
        maintainability: this.extractSection(analysis.insights, "MANUTENIBILIDADE E ESCALABILIDADE"),
        technicalDebt: this.extractSection(analysis.insights, "DÍVIDA TÉCNICA"),
        risks: this.extractSection(analysis.insights, "RISCOS E OPORTUNIDADES"),
        recommendations: this.extractSection(analysis.insights, "RECOMENDAÇÕES PARA INVESTIDORES")
      };

      fileAnalyses[file] = fileAnalysis;
      totalScore += analysis.qualityScore || 0;
    });

    const averageScore = Math.round(totalScore / results.length);

    return {
      averageScore,
      totalFiles: results.length,
      fileAnalyses,
      categories: {
        risks: new Set(Object.values(fileAnalyses).flatMap(a => a.risks.split('\n').filter(Boolean))),
        recommendations: new Set(Object.values(fileAnalyses).flatMap(a => a.recommendations.split('\n').filter(Boolean)))
      }
    };
  }

  private formatAnalysis(combined: any): string {
    return `VISÃO GERAL
Score Médio: ${combined.averageScore}/100
Total de Arquivos: ${combined.totalFiles}
${this.getHealthStatus(combined.averageScore)}

PRINCIPAIS PONTOS DE ATENÇÃO
${Array.from(combined.categories.risks).map(risk => `• ${risk}`).join('\n')}

OPORTUNIDADES DE MELHORIA
${Array.from(combined.categories.recommendations).map(rec => `• ${rec}`).join('\n')}

DETALHES POR ARQUIVO
${Object.entries(combined.fileAnalyses || {}).map(([fileName, analysis]: [string, any]) => {
  const { architecture, maintainability, technicalDebt } = analysis;
  const fileScore = this.calculateFileScore(architecture, maintainability, technicalDebt);
  
  return `${fileName}
• Score de Qualidade: ${fileScore}/100
• Análise de Arquitetura:
${architecture.split('\n').map(line => `  - ${line.trim()}`).join('\n')}
• Análise de Manutenibilidade:
${maintainability.split('\n').map(line => `  - ${line.trim()}`).join('\n')}
• Análise de Dívida Técnica:
${technicalDebt.split('\n').map(line => `  - ${line.trim()}`).join('\n')}`;
}).join('\n\n')}`;
  }

  private getHealthStatus(score: number): string {
    if (score >= 80) return "excelente saúde técnica";
    if (score >= 60) return "boa saúde técnica";
    if (score >= 40) return "saúde técnica moderada";
    return "necessidade significativa de melhorias";
  }

  private calculateFileScore(architecture: string, maintainability: string, technicalDebt: string): number {
    const baseScore = 70;
    let adjustment = 0;

    // Análise de arquitetura (peso 0.4)
    const architectureScore = this.analyzeSection(architecture);
    
    // Análise de manutenibilidade (peso 0.3)
    const maintainabilityScore = this.analyzeSection(maintainability);
    
    // Análise de dívida técnica (peso 0.3)
    const technicalDebtScore = this.analyzeSection(technicalDebt);

    const weightedScore = (architectureScore * 0.4) + (maintainabilityScore * 0.3) + (technicalDebtScore * 0.3);
    return Math.max(0, Math.min(100, Math.round(baseScore + weightedScore)));
  }

  private analyzeSection(text: string): number {
    const positiveIndicators = [
      'bem estruturado', 'modular', 'eficiente', 'robusto', 'testado',
      'documentado', 'escalável', 'manutenível', 'seguro', 'otimizado'
    ];

    const negativeIndicators = [
      'complexo', 'confuso', 'duplicado', 'frágil', 'acoplado',
      'não testado', 'obsoleto', 'inseguro', 'lento', 'problemático'
    ];

    const positiveCount = positiveIndicators.filter(word => text.toLowerCase().includes(word)).length;
    const negativeCount = negativeIndicators.filter(word => text.toLowerCase().includes(word)).length;

    return (positiveCount * 5) - (negativeCount * 5);
  }

  private extractSection(text: string, sectionTitle: string): string {
    const sections = text.split('\n\n');
    const section = sections.find(s => s.startsWith(sectionTitle));
    if (!section) return '';
    
    return section
      .split('\n')
      .slice(1) // Remove o título da seção
      .filter(line => line.trim())
      .join('\n');
  }

  private getFileLanguage(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase() || 'unknown';
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'py': 'Python',
      'java': 'Java',
      'rb': 'Ruby',
      'go': 'Go',
    };
    return languageMap[extension] || extension;
  }
}

interface RepositoryMetrics {
  summary: {
    totalCommits: number;
    activeContributors: number;
    repositoryAge: string;
    stars: number;
    forks: number;
  };
  pullRequestMetrics: {
    total: number;
    merged: number;
    averageTimeToMerge: string;
  };
  codeQualityMetrics: {
    score: number;
    insights: string;
    lastAnalysis: string;
  };
} 