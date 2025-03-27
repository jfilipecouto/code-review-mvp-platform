"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { InsightCardShadcn } from "@/components/insights/InsightCardShadcn";
import { generatePDF } from '@/lib/pdfGenerator';

// Definir a interface para as métricas
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

// Tipos para os gráficos
interface LineChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    tension: number;
  }[];
}

interface DoughnutChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
  }[];
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [metrics, setMetrics] = useState<RepositoryMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [chartData, setChartData] = useState<{
    commitActivity: LineChartData;
    prQuality: DoughnutChartData;
    codeQuality: DoughnutChartData;
  } | null>(null);

  // Registrar componentes do Chart.js no carregamento inicial
  useEffect(() => {
    ChartJS.register(
      CategoryScale,
      LinearScale,
      PointElement,
      LineElement,
      Title,
      Tooltip,
      Legend,
      ArcElement
    );
  }, []);

  // Atualizar dados dos gráficos quando as métricas mudarem
  useEffect(() => {
    if (metrics) {
      setChartData({
        commitActivity: {
          labels: ["3 meses", "2 meses", "1 mês", "Atual"],
          datasets: [{
            label: "Atividade de Commits",
            data: [
              metrics.summary.totalCommits * 0.2,
              metrics.summary.totalCommits * 0.3,
              metrics.summary.totalCommits * 0.25,
              metrics.summary.totalCommits * 0.25,
            ],
            borderColor: "rgb(75, 192, 192)",
            tension: 0.1,
          }],
        },
        prQuality: {
          labels: ["PRs Merged", "PRs Pendentes"],
          datasets: [{
            data: [
              metrics.pullRequestMetrics.merged,
              metrics.pullRequestMetrics.total - metrics.pullRequestMetrics.merged,
            ],
            backgroundColor: ["rgb(54, 162, 235)", "rgb(255, 99, 132)"],
          }],
        },
        codeQuality: {
          labels: ["Qualidade do Código", "Área de Melhoria"],
          datasets: [{
            data: [
              metrics.codeQualityMetrics.score,
              100 - metrics.codeQualityMetrics.score,
            ],
            backgroundColor: ["rgb(75, 192, 192)", "rgb(255, 205, 86)"],
          }],
        },
      });
    }
  }, [metrics]);

  const analyzeRepo = async () => {
    if (!repoUrl) {
      setError("Por favor, insira a URL do repositório");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
      const match = repoUrl.match(urlPattern);

      if (!match) {
        throw new Error(
          "URL inválida. Use o formato: https://github.com/usuario/repositorio"
        );
      }

      const [, owner, repo] = match;
      const repoFullName = `${owner}/${repo}`;

      const response = await fetch('/api/analyze-repository', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoFullName,
          accessToken: session?.accessToken
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao analisar repositório');
      }

      const results = await response.json();
      setMetrics(results);
    } catch (err) {
      console.error("Erro:", err);
      setError(
        err instanceof Error ? err.message : "Erro ao analisar repositório"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Por favor, faça login para continuar</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 font-sans">
      {metrics && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={generatePDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Gerar Relatório PDF
          </button>
        </div>
      )}

      {/* Todo o conteúdo do dashboard dentro da div com id */}
      <div id="dashboard-content">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/usuario/repositorio"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={analyzeRepo}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? "Analisando..." : "Analisar"}
            </button>
          </div>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>

        {metrics && chartData && (
          <div className="space-y-8">
            {/* Cabeçalho do Repositório */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Métricas do Repositório
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Última análise: {new Date(metrics.codeQualityMetrics.lastAnalysis).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 font-medium">{metrics.summary.stars}</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-1 font-medium">{metrics.summary.forks}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg">
                <div className="flex flex-col text-white">
                  <span className="text-sm opacity-75">Total de Commits</span>
                  <span className="text-3xl font-bold mt-2">{metrics.summary.totalCommits}</span>
                  <span className="text-sm mt-2">Últimos 90 dias</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg">
                <div className="flex flex-col text-white">
                  <span className="text-sm opacity-75">Contribuidores Ativos</span>
                  <span className="text-3xl font-bold mt-2">{metrics.summary.activeContributors}</span>
                  <span className="text-sm mt-2">Desenvolvedores</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg">
                <div className="flex flex-col text-white">
                  <span className="text-sm opacity-75">Pull Requests Merged</span>
                  <span className="text-3xl font-bold mt-2">{metrics.pullRequestMetrics.merged}</span>
                  <span className="text-sm mt-2">De {metrics.pullRequestMetrics.total} PRs</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg">
                <div className="flex flex-col text-white">
                  <span className="text-sm opacity-75">Score de Qualidade</span>
                  <span className="text-3xl font-bold mt-2">{metrics.codeQualityMetrics.score}/100</span>
                  <span className="text-sm mt-2">Análise Técnica</span>
                </div>
              </div>
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Atividade de Desenvolvimento
                </h3>
                <Line
                  data={chartData.commitActivity}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          display: false
                        }
                      }
                    }
                  }}
                />
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Status dos Pull Requests
                </h3>
                <Doughnut
                  data={chartData.prQuality}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                        }
                      }
                    },
                    cutout: '70%'
                  }}
                />
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                  Score de Qualidade
                </h3>
                <Doughnut
                  data={chartData.codeQuality}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                        }
                      }
                    },
                    cutout: '70%'
                  }}
                />
              </div>
            </div>

            {/* Insights de Qualidade */}
            <div className="space-y-6">
              {metrics.codeQualityMetrics.insights.split('\n\n').map((section, index) => {
                if (section.trim().startsWith('VISÃO GERAL')) {
                  const [title, ...content] = section.split('\n');
                  return (
                    <InsightCardShadcn 
                      key={index} 
                      title={title}
                      className="bg-white dark:bg-gray-800"
                    >
                      <div className="prose dark:prose-invert max-w-none">
                        <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                          {content.join('\n')}
                        </p>
                      </div>
                    </InsightCardShadcn>
                  );
                }

                if (section.trim().startsWith('PRINCIPAIS') || 
                    section.trim().startsWith('OPORTUNIDADES') || 
                    section.trim().startsWith('RECOMENDAÇÕES')) {
                  const [title, ...content] = section.split('\n');
                  return (
                    <InsightCardShadcn 
                      key={index} 
                      title={title}
                      className="bg-white dark:bg-gray-800 border-l-4 border-green-500"
                    >
                      <ul className="space-y-2">
                        {content.map((item, i) => (
                          <li key={i} className="text-gray-600 dark:text-gray-300 leading-relaxed">
                            • {item.trim().startsWith('-') ? item.substring(1).trim() : item}
                          </li>
                        ))}
                      </ul>
                    </InsightCardShadcn>
                  );
                }

                if (section.trim().startsWith('DETALHES')) {
                  const [title, ...content] = section.split('\n');
                  return (
                    <InsightCardShadcn 
                      key={index} 
                      title={title}
                      className="bg-gray-50 dark:bg-gray-700"
                    >
                      <div className="grid gap-6 md:grid-cols-2">
                        {content.map((line, i) => {
                          const [fileName, ...analysis] = line.split(':');
                          return (
                            <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {fileName}
                              </h5>
                              <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                                {analysis.join(':')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </InsightCardShadcn>
                  );
                }

                return null;
              })}
            </div>

            {/* Informações Adicionais */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">
                Informações Adicionais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Idade do Repositório</p>
                  <p className="text-lg font-medium">{metrics.summary.repositoryAge}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Tempo Médio até Merge</p>
                  <p className="text-lg font-medium">{metrics.pullRequestMetrics.averageTimeToMerge}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
