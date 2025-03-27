import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { code, language } = await request.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "Você é um especialista em análise técnica de código, focado em fornecer insights relevantes para investidores de startups."
        },
        {
          role: "user",
          content: `
            Analise este código ${language} e forneça insights técnicos relevantes para investidores:
            1. Qualidade geral do código
            2. Boas práticas utilizadas
            3. Potenciais problemas técnicos
            4. Escalabilidade
            5. Manutenibilidade
            6. Sugestões de melhorias
            
            Código para análise:
            ${code}
          `
        }
      ],
      temperature: 0.7,
    });

    return NextResponse.json({
      analysis: response.choices[0].message.content,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro na análise do código:', error);
    return NextResponse.json(
      { error: 'Erro ao analisar o código' },
      { status: 500 }
    );
  }
} 