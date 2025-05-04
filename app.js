// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
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
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Función para mostrar/ocultar el indicador de carga
    function showLoading(show = true) {
        if (show) {
            loadingIndicator.classList.add('visible');
        } else {
            loadingIndicator.classList.remove('visible');
        }
    }

    // Función para verificar dependencias
    function checkDependencies() {
        if (typeof PDFLib === 'undefined') {
            console.error('Error: La biblioteca PDFLib no está cargada correctamente.');
            alert('Error: La biblioteca PDFLib no está cargada correctamente. Por favor, recarga la página o verifica tu conexión a internet.');
            return false;
        }

        if (typeof pdfjsLib === 'undefined') {
            console.error('Error: La biblioteca PDF.js no está cargada correctamente.');
            alert('Error: La biblioteca PDF.js no está cargada correctamente. Por favor, recarga la página o verifica tu conexión a internet.');
            return false;
        }
        
        return true;
    }

    // Función para mostrar el preview del PDF
    async function showPdfPreview(file) {
        try {
            if (!checkDependencies()) {
                alert('Error: Las bibliotecas necesarias no están cargadas correctamente. Por favor, recarga la página.');
                return;
            }
            
            if (!file || file.type !== 'application/pdf') {
                throw new Error('El archivo seleccionado no es un PDF válido');
            }

            // Mostrar el indicador de carga
            showLoading(true);
            
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
                } finally {
                    // Ocultar el indicador de carga
                    showLoading(false);
                }
            };
            
            fileReader.onerror = function(error) {
                console.error('Error al leer el archivo:', error);
                alert(`Error al leer el archivo: ${error.message}`);
                clearForm();
                showLoading(false);
            };
            
            fileReader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('Error general:', error);
            alert(`Error: ${error.message}`);
            clearForm();
            showLoading(false);
        }
    }

    // Función para aplicar la marca de agua
    async function addWatermarkToPdf(pdfFile, date, purpose) {
        try {
            showLoading(true);
            
            // Verificar dependencias
            if (!PDFLib || !pdfjsLib) {
                throw new Error('Las bibliotecas necesarias no están cargadas correctamente');
            }

            // Leer el archivo PDF
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();
            
            if (pages.length === 0) {
                throw new Error('El PDF no contiene páginas');
            }

            // Formatear la fecha para mejor legibilidad
            const [year, month, day] = date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            
            // Crear la marca de agua con múltiples capas y efectos
            const watermarkText = `Válido para ${purpose} ${formattedDate}`;
            
            // Aplicar marca de agua a cada página
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const { width, height } = page.getSize();
                
                // Calcular tamaños basados en las dimensiones de la página
                const mainSize = Math.min(width, height) / 35;
                
                // Patrón de marcas de agua horizontales
                const stepY = mainSize * 10; // Espaciado vertical entre líneas
                
                // Capa 1: Patrón de marcas de agua horizontales principales
                for (let y = 0; y < height; y += stepY) {
                    // Primera línea
                    page.drawText(watermarkText, {
                        x: 20,
                        y: y,
                        size: mainSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                    
                    // Segunda línea (desplazada)
                    page.drawText(watermarkText, {
                        x: width / 2,
                        y: y + mainSize * 2,
                        size: mainSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                }

                // Capa 2: Marca de agua invertida (para dificultar la eliminación)
                for (let y = stepY / 2; y < height; y += stepY) {
                    page.drawText(watermarkText, {
                        x: width - 20,
                        y: y,
                        size: mainSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.3,
                        rotate: PDFLib.degrees(180)
                    });
                }

                // Capa 3: Marca de agua central
                const centerText = `Válido para ${purpose} ${formattedDate}`;
                page.drawText(centerText, {
                    x: width / 2 - 100,
                    y: height / 2,
                    size: mainSize * 1.5,
                    color: PDFLib.rgb(0.5, 0.5, 0.5),
                    opacity: 0.4
                });

                // Capa 4: Bordes con propósito
                const borderText = `Válido para ${purpose} ${formattedDate}`;
                const borderSize = Math.min(width, height) / 40;
                const borderStep = borderSize * 10;
                
                // Borde superior
                for (let x = 0; x < width; x += borderStep) {
                    page.drawText(borderText, {
                        x: x,
                        y: height - 20,
                        size: borderSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                }
                
                // Borde inferior
                for (let x = 0; x < width; x += borderStep) {
                    page.drawText(borderText, {
                        x: x,
                        y: 20,
                        size: borderSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                }
            }

            // Guardar el PDF modificado
            const modifiedPdfBytes = await pdfDoc.save();
            
            // Crear un blob y URL para la descarga
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            // Actualizar el enlace de descarga
            const downloadLink = document.getElementById('downloadLink');
            downloadLink.href = url;
            downloadLink.classList.remove('hidden');
            
            showLoading(false);
            return true;
        } catch (error) {
            console.error('Error al aplicar la marca de agua:', error);
            showLoading(false);
            alert('Error al aplicar la marca de agua: ' + error.message);
            return false;
        }
    }

    // Función para limpiar el formulario
    function clearForm() {
        pdfInput.value = '';
        documentPurpose.value = '';
        
        // Establecer la fecha actual como valor predeterminado
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        watermarkDate.value = `${year}-${month}-${day}`;
        
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
        
        // Convertir la fecha seleccionada a formato local (yyyy-mm-dd)
        const selectedDateStr = watermarkDate.value;
        const selectedDate = new Date(selectedDateStr + 'T00:00:00');
        
        // Obtener fecha actual sin horas, minutos ni segundos
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Ajustar por zona horaria para comparación de fechas
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const todayAdjusted = new Date(today.getTime() - timezoneOffset);
        const selectedDateAdjusted = new Date(selectedDate.getTime() - timezoneOffset);
        
        // Convertir a formato yyyy-mm-dd para comparación
        const todayStr = todayAdjusted.toISOString().split('T')[0];
        const selectedDateAdjustedStr = selectedDateAdjusted.toISOString().split('T')[0];
        
        if (selectedDateAdjustedStr < todayStr) {
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
            showLoading(false);
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
        // Convertir la fecha seleccionada a formato local (yyyy-mm-dd)
        const selectedDateStr = this.value;
        const selectedDate = new Date(selectedDateStr + 'T00:00:00');
        
        // Obtener fecha actual sin horas, minutos ni segundos
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Ajustar por zona horaria para comparación de fechas
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const todayAdjusted = new Date(today.getTime() - timezoneOffset);
        const selectedDateAdjusted = new Date(selectedDate.getTime() - timezoneOffset);
        
        // Convertir a formato yyyy-mm-dd para comparación
        const todayStr = todayAdjusted.toISOString().split('T')[0];
        const selectedDateAdjustedStr = selectedDateAdjusted.toISOString().split('T')[0];
        
        if (selectedDateAdjustedStr < todayStr) {
            alert('La fecha seleccionada no puede ser anterior a la fecha actual.');
            this.value = '';
        }
    });

    // Limpiar formulario al iniciar
    clearForm();
}

