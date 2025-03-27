import OpenAI from 'openai';

export class CodeAnalysisService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY não está configurada nas variáveis de ambiente');
    }

    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  async analyzeCode(codeContent: string, language: string): Promise<CodeAnalysisResult> {
    const prompt = `Como CTO experiente, forneça uma análise técnica detalhada deste código ${language}, seguindo exatamente esta estrutura:

QUALIDADE E ARQUITETURA (Score: [0-100])
• Avalie a estrutura e organização do código
• Identifique padrões de design utilizados
• Analise a modularidade e reusabilidade
• Verifique princípios SOLID e boas práticas
• Avalie a cobertura de testes

MANUTENIBILIDADE E ESCALABILIDADE (Score: [0-100])
• Analise a complexidade do código
• Avalie a qualidade da documentação
• Verifique o acoplamento entre componentes
• Identifique potenciais gargalos
• Avalie a facilidade de manutenção

DÍVIDA TÉCNICA (Score: [0-100])
• Identifique code smells e problemas
• Analise duplicações e redundâncias
• Avalie dependências e versões
• Verifique práticas obsoletas
• Estime o custo de refatoração

RISCOS E OPORTUNIDADES
• Liste os principais riscos técnicos
• Identifique vulnerabilidades críticas
• Aponte gargalos de performance
• Sugira melhorias prioritárias
• Estime impacto no negócio

RECOMENDAÇÕES PARA INVESTIDORES
• Destaque pontos fortes técnicos
• Identifique áreas de melhoria
• Estime investimentos necessários
• Priorize ações técnicas
• Projete retorno esperado

Forneça uma análise profunda e estratégica, com pontuações específicas e recomendações acionáveis.

Código para análise:
${codeContent}`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em análise técnica de código, focado em fornecer insights estratégicos e acionáveis para investidores de startups."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const analysis = response.choices[0].message.content || '';
    
    return {
      insights: analysis,
      qualityScore: this.extractQualityScore(analysis),
      timestamp: new Date().toISOString()
    };
  }

  private extractQualityScore(analysis: string): number {
    try {
      // Primeiro, procura por scores específicos em cada seção
      const sections = analysis.split('\n\n');
      const scores: number[] = [];

      sections.forEach(section => {
        if (section.includes('Score:')) {
          const match = section.match(/Score:\s*(\d+)/);
          if (match && match[1]) {
            scores.push(parseInt(match[1], 10));
          }
        }
      });

      // Se encontrou scores específicos, calcula a média
      if (scores.length > 0) {
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }

      // Análise baseada em indicadores positivos e negativos
      const positiveIndicators = [
        'excelente', 'ótimo', 'bem estruturado', 'robusto', 'eficiente',
        'seguro', 'testado', 'documentado', 'modular', 'escalável'
      ];

      const negativeIndicators = [
        'problemático', 'risco', 'dívida técnica', 'falha', 'complexo',
        'confuso', 'inseguro', 'não testado', 'obsoleto', 'duplicado'
      ];

      const positiveCount = positiveIndicators.filter(word => 
        analysis.toLowerCase().includes(word)
      ).length;

      const negativeCount = negativeIndicators.filter(word => 
        analysis.toLowerCase().includes(word)
      ).length;

      const baseScore = 70;
      const adjustment = (positiveCount * 5) - (negativeCount * 5);
      return Math.max(0, Math.min(100, baseScore + adjustment));

    } catch (error) {
      console.error('Erro ao extrair score:', error);
      return 70; // Score padrão em caso de erro
    }
  }
}

interface CodeAnalysisResult {
  qualityScore: number;
  insights: string;
  timestamp: string;
} 