import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const generatePDF = async () => {
  try {
    // Aguarda um momento para garantir que os gráficos estejam renderizados
    await new Promise(resolve => setTimeout(resolve, 1000));

    const element = document.getElementById('dashboard-content');
    if (!element) {
      console.error('Elemento não encontrado');
      return;
    }

    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: true, // Ativamos o logging para debug
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width
    const pageHeight = 297; // A4 height
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Primeira página
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Páginas adicionais se necessário
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save('dashboard.pdf');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
  }
}; 