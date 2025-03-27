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
    const prompt = `
      Analise este código ${language} e forneça insights técnicos relevantes para investidores:
      1. Qualidade geral do código
      2. Boas práticas utilizadas
      3. Potenciais problemas técnicos
      4. Escalabilidade
      5. Manutenibilidade
      6. Sugestões de melhorias
      
      Código para análise:
      ${codeContent}
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em análise técnica de código, focado em fornecer insights relevantes para investidores de startups."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    return {
      qualityScore: this.extractQualityScore(response.choices[0].message.content),
      insights: response.choices[0].message.content,
      timestamp: new Date().toISOString()
    };
  }

  private extractQualityScore(analysis: string): number {
    // Implementar lógica para extrair uma pontuação de 0-100
    // baseada na análise qualitativa
    return 85; // Exemplo
  }
}

interface CodeAnalysisResult {
  qualityScore: number;
  insights: string;
  timestamp: string;
} 