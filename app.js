// Verificar que las dependencias estén cargadas
if (typeof PDFLib === 'undefined') {
    alert('Error: La biblioteca PDFLib no está cargada correctamente. Por favor, recarga la página.');
    throw new Error('PDFLib no está disponible');
}

if (typeof pdfjsLib === 'undefined') {
    alert('Error: La biblioteca PDF.js no está cargada correctamente. Por favor, recarga la página.');
    throw new Error('PDF.js no está disponible');
}

// Obtener elementos del DOM
const pdfInput = document.getElementById('pdfInput');
const watermarkDate = document.getElementById('watermarkDate');
const documentPurpose = document.getElementById('documentPurpose');
const applyWatermark = document.getElementById('applyWatermark');
const pdfPreview = document.getElementById('pdfPreview');
const pdfCanvas = document.getElementById('pdfCanvas');
const downloadLink = document.getElementById('downloadLink');
const resetButton = document.getElementById('resetButton');
const dropArea = document.getElementById('dropArea');
const pdfName = document.getElementById('pdfName');
const closePreview = document.getElementById('closePreview');

// Función para mostrar el preview del PDF
async function showPdfPreview(file) {
    try {
        if (!file || file.type !== 'application/pdf') {
            throw new Error('El archivo seleccionado no es un PDF válido');
        }

        // Mostrar el contenedor y el nombre del archivo inmediatamente
        pdfName.textContent = file.name;
        pdfPreview.classList.remove('hidden');

        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            try {
                console.log('Iniciando carga del PDF...');
                const typedArray = new Uint8Array(this.result);
                const loadingTask = pdfjsLib.getDocument(typedArray);
                console.log('Cargando PDF...');
                const pdf = await loadingTask.promise;
                
                // Mostrar la primera página
                console.log('Obteniendo primera página...');
                const page = await pdf.getPage(1);
                const originalViewport = page.getViewport({ scale: 1.0 });
                
                // Ajustar el canvas al tamaño de la página
                const canvas = pdfCanvas;
                const context = canvas.getContext('2d');
                
                // Calcular la escala para ajustar al ancho del contenedor (menos el padding)
                const containerWidth = canvas.parentElement.clientWidth - 32; // 2rem (32px) de padding
                const scale = containerWidth / originalViewport.width;
                
                // Crear nuevo viewport con la escala calculada
                const viewport = page.getViewport({ scale });
                
                // Establecer dimensiones del canvas
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                
                console.log('Renderizando página...');
                // Renderizar la página
                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;
                
                console.log('PDF renderizado correctamente');
            } catch (error) {
                console.error('Error al renderizar el PDF:', error);
                alert(`Error al mostrar la vista previa del PDF: ${error.message}`);
                clearForm();
            }
        };
        
        fileReader.onerror = function(error) {
            console.error('Error al leer el archivo:', error);
            alert(`Error al leer el archivo: ${error.message}`);
            clearForm();
        };
        
        fileReader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error general:', error);
        alert(`Error: ${error.message}`);
        clearForm();
    }
}

// Función para aplicar la marca de agua
async function addWatermarkToPdf(file, date, purpose) {
    if (!file || file.type !== 'application/pdf') {
        alert("Por favor, selecciona un archivo PDF válido.");
        return;
    }

    // Desactivar botón mientras se procesa
    applyWatermark.disabled = true;
    applyWatermark.textContent = 'Procesando...';
    applyWatermark.classList.add('opacity-50');

    try {
        const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Error al leer el archivo'));
            
            reader.readAsArrayBuffer(file);
        });

        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPages();
        
        if (pages.length === 0) {
            throw new Error('El PDF no contiene páginas');
        }

        const fontSize = 14;
        // Formatear la fecha
        const [year, month, day] = date.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        const watermarkText = `Válido para ${purpose} - ${formattedDate}`.toLowerCase();

        // Aplicar marca de agua a cada página
        for (const page of pages) {
            const { width, height } = page.getSize();
            
            // Dos capas de marca de agua
            const patterns = [
                { angle: -30, opacity: 0.15 },  // Diagonal principal
                { angle: 30, opacity: 0.1 }     // Diagonal cruzada
            ];

            for (const pattern of patterns) {
                const textWidth = watermarkText.length * fontSize * 0.44;
                const textHeight = fontSize;
                const stepX = textWidth + 40;
                const stepY = textHeight + 30;

                for (let y = 0; y < height; y += stepY) {
                    const rowOffset = (Math.floor(y / stepY) % 2) * (stepX / 2);
                    for (let x = -stepX; x < width + stepX; x += stepX) {
                        page.drawText(watermarkText, {
                            x: x + rowOffset,
                            y: y,
                            size: fontSize,
                            opacity: pattern.opacity,
                            rotate: PDFLib.degrees(pattern.angle),
                            color: PDFLib.rgb(0.3, 0.3, 0.3)
                        });
                    }
                }
            }
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        // Configurar el enlace de descarga
        downloadLink.href = url;
        downloadLink.download = `${file.name.replace('.pdf', '')}_con_marca_de_agua.pdf`;
        downloadLink.classList.remove('hidden');

        // Mostrar mensaje de éxito
        alert('PDF procesado correctamente. Haz clic en el botón verde para descargar.');
    } catch (error) {
        console.error("Error al procesar el PDF:", error);
        alert(`Error al procesar el PDF: ${error.message}`);
    } finally {
        // Reactivar botón
        applyWatermark.disabled = false;
        applyWatermark.textContent = 'Aplicar marca de agua';
        applyWatermark.classList.remove('opacity-50');
    }
}

// Función para limpiar el formulario
function clearForm() {
    pdfInput.value = '';
    documentPurpose.value = '';
    watermarkDate.value = '';
    pdfPreview.classList.add('hidden');
    if (pdfCanvas) {
        const ctx = pdfCanvas.getContext('2d');
        ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);
    }
    downloadLink.classList.add('hidden');
    if (downloadLink.href) {
        URL.revokeObjectURL(downloadLink.href);
        downloadLink.href = '';
    }
    pdfName.textContent = '';
    // Restaurar el estado del botón de aplicar marca de agua
    applyWatermark.disabled = false;
    applyWatermark.textContent = 'Aplicar marca de agua';
    applyWatermark.classList.remove('opacity-50');
}

// Función para validar los datos del formulario
function validateForm() {
    if (!documentPurpose.value || !watermarkDate.value || !pdfInput.files[0]) {
        alert("Debes completar todos los campos y seleccionar un archivo PDF.");
        return false;
    }
    if (documentPurpose.value.length > 50) {
        alert("El propósito no puede exceder los 50 caracteres.");
        return false;
    }
    const selectedDate = new Date(watermarkDate.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    
    if (selectedDate < today) {
        alert("La fecha seleccionada no puede ser anterior a la fecha actual.");
        return false;
    }
    return true;
}

// Eventos de la interfaz
applyWatermark.addEventListener('click', async function() {
    if (!validateForm()) return;
    try {
        await addWatermarkToPdf(pdfInput.files[0], watermarkDate.value, documentPurpose.value);
    } catch (error) {
        console.error('Error al aplicar marca de agua:', error);
        alert('Error al aplicar la marca de agua: ' + error.message);
        applyWatermark.disabled = false;
        applyWatermark.textContent = 'Aplicar marca de agua';
        applyWatermark.classList.remove('opacity-50');
    }
});

resetButton.addEventListener('click', function() {
    clearForm();
    downloadLink.classList.add('hidden');
});

closePreview.addEventListener('click', function() {
    pdfPreview.classList.add('hidden');
});

// Eventos de arrastrar y soltar
dropArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.add('dragover');
});

dropArea.addEventListener('dragleave', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
});

dropArea.addEventListener('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type === 'application/pdf') {
            pdfInput.files = files;
            showPdfPreview(file);
        } else {
            alert('Por favor, selecciona un archivo PDF válido.');
        }
    }
});

// Evento para el input de archivo
pdfInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        showPdfPreview(file);
    }
});

// Validación de fecha
watermarkDate.addEventListener('change', function() {
    const selectedDate = new Date(this.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
    
    if (selectedDate < today) {
        alert('La fecha seleccionada no puede ser anterior a la fecha actual.');
        this.value = '';
    }
});

// Limpiar formulario al cargar la página
window.addEventListener('load', function() {
    clearForm();
});

