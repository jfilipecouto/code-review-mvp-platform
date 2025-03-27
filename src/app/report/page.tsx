'use client';

import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import Chart from 'chart.js/auto';

export default function ReportPage({ metrics }) {
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Análise Técnica para Investidores', 20, 20);
    
    // Resumo Executivo
    doc.setFontSize(16);
    doc.text('Resumo Executivo', 20, 40);
    doc.setFontSize(12);
    doc.text(`Velocidade de Desenvolvimento: ${metrics.summary.totalCommits} commits em 90 dias`, 25, 50);
    doc.text(`Equipe Ativa: ${metrics.summary.activeContributors} contribuidores`, 25, 60);
    
    // Métricas de Qualidade
    doc.setFontSize(16);
    doc.text('Métricas de Qualidade', 20, 80);
    doc.setFontSize(12);
    doc.text(`Taxa de Aceitação de PRs: ${metrics.pullRequestMetrics.merged}/${metrics.pullRequestMetrics.total}`, 25, 90);
    doc.text(`Tempo Médio de Resolução: ${metrics.pullRequestMetrics.averageTimeToMerge}`, 25, 100);
    
    // Insights
    doc.setFontSize(16);
    doc.text('Insights para Investidores', 20, 120);
    doc.setFontSize(12);
    doc.text('• Projeto demonstra maturidade no processo de desenvolvimento', 25, 130);
    doc.text('• Equipe mantém alta velocidade de entrega', 25, 140);
    doc.text('• Práticas de código seguem padrões da indústria', 25, 150);
    
    // Análise de Código (IA)
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Análise de Qualidade de Código (IA)', 20, 20);
    doc.setFontSize(12);
    
    const aiAnalysis = metrics.codeQualityMetrics.aiAnalysis;
    const wrappedText = doc.splitTextToSize(aiAnalysis, 170);
    doc.text(wrappedText, 20, 40);

    // Score Geral
    doc.text(`Score de Qualidade: ${metrics.codeQualityMetrics.overallScore}/100`, 20, 160);
    
    // Recomendações
    doc.setFontSize(14);
    doc.text('Recomendações Principais:', 20, 180);
    doc.setFontSize(12);
    metrics.codeQualityMetrics.recommendations.forEach((rec, index) => {
      doc.text(`${index + 1}. ${rec}`, 25, 190 + (index * 10));
    });

    doc.save('analise-tecnica-investidores.pdf');
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Relatório para Investidores</h1>
      
      <div className="mb-6">
        <p className="text-gray-600">
          Gere um relatório profissional com todas as métricas e análises do projeto.
        </p>
      </div>

      <button 
        onClick={generatePDF}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Gerar Relatório PDF
      </button>
    </div>
  );
} 