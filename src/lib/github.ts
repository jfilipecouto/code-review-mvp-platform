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
    const files = await this.octokit.repos.getContent({
      owner,
      repo,
      path: ''
    });

    // Filtrar arquivos relevantes (ex: .js, .ts, .py, etc)
    return files.data.filter(file => 
      /\.(js|ts|py|java|go|rb)$/.test(file.name)
    ).slice(0, 5); // Limitar a 5 arquivos principais
  }

  private async getFileContent(fileInfo: { path: string, owner: string, repo: string }): Promise<string> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: fileInfo.owner,
        repo: fileInfo.repo,
        path: fileInfo.path,
      });

      // A API do GitHub retorna o conteúdo em base64
      if ('content' in response.data && !Array.isArray(response.data)) {
        const content = Buffer.from(response.data.content, 'base64').toString();
        return content;
      }

      throw new Error('Arquivo não encontrado ou é um diretório');
    } catch (error) {
      console.error('Erro ao obter conteúdo do arquivo:', error);
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
          return this.codeAnalysis.analyzeCode(
            content,
            file.name.split('.').pop() || 'unknown'
          );
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

      return {
        qualityScore: this.calculateAverageScore(analysisResults),
        insights: this.combineInsights(analysisResults),
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

  private calculateAverageScore(results: CodeAnalysisResult[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, result) => acc + result.qualityScore, 0);
    return Math.round(sum / results.length);
  }

  private combineInsights(results: CodeAnalysisResult[]): string {
    if (results.length === 0) return "Nenhuma análise disponível.";
    
    return results
      .map((result, index) => `Arquivo ${index + 1}:\n${result.insights}`)
      .join('\n\n');
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