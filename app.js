// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    // Get DOM elements
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

    // Function to show/hide the loading indicator
    function showLoading(show = true) {
        if (show) {
            loadingIndicator.classList.add('visible');
        } else {
            loadingIndicator.classList.remove('visible');
        }
    }

    // Function to check dependencies
    function checkDependencies() {
        if (typeof PDFLib === 'undefined') {
            console.error('Error: The PDFLib library is not loaded correctly.');
            alert('Error: The PDFLib library is not loaded correctly. Please reload the page or check your internet connection.');
            return false;
        }

        if (typeof pdfjsLib === 'undefined') {
            console.error('Error: The PDF.js library is not loaded correctly.');
            alert('Error: The PDF.js library is not loaded correctly. Please reload the page or check your internet connection.');
            return false;
        }
        
        return true;
    }

    // Function to show the PDF preview
    async function showPdfPreview(file) {
        try {
            if (!checkDependencies()) {
                alert('Error: The necessary libraries are not loaded correctly. Please reload the page.');
                return;
            }
            
            if (!file || file.type !== 'application/pdf') {
                throw new Error('The selected file is not a valid PDF');
            }

            // Show the loading indicator
            showLoading(true);
            
            // Show the container and the file name immediately
            pdfName.textContent = file.name;
            pdfPreview.classList.remove('hidden');

            const fileReader = new FileReader();
            
            fileReader.onload = async function() {
                try {
                    console.log('Starting PDF load...');
                    const typedArray = new Uint8Array(this.result);
                    const loadingTask = pdfjsLib.getDocument(typedArray);
                    console.log('Loading PDF...');
                    const pdf = await loadingTask.promise;
                    
                    // Show the first page
                    console.log('Getting first page...');
                    const page = await pdf.getPage(1);
                    const originalViewport = page.getViewport({ scale: 1.0 });
                    
                    // Adjust the canvas to the page size
                    const canvas = pdfCanvas;
                    const context = canvas.getContext('2d');
                    
                    // Calculate the scale to fit the container width (minus padding)
                    const containerWidth = canvas.parentElement.clientWidth - 32; // 2rem (32px) of padding
                    const scale = containerWidth / originalViewport.width;
                    
                    // Create a new viewport with the calculated scale
                    const viewport = page.getViewport({ scale });
                    
                    // Set canvas dimensions
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    
                    console.log('Rendering page...');
                    // Render the page
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    console.log('PDF rendered successfully');
                } catch (error) {
                    console.error('Error rendering PDF:', error);
                    alert(`Error showing PDF preview: ${error.message}`);
                    clearForm();
                } finally {
                    // Hide the loading indicator
                    showLoading(false);
                }
            };
            
            fileReader.onerror = function(error) {
                console.error('Error reading file:', error);
                alert(`Error reading file: ${error.message}`);
                clearForm();
                showLoading(false);
            };
            
            fileReader.readAsArrayBuffer(file);
        } catch (error) {
            console.error('General error:', error);
            alert(`Error: ${error.message}`);
            clearForm();
            showLoading(false);
        }
    }

    // Function to apply the watermark
    async function addWatermarkToPdf(pdfFile, date, purpose) {
        try {
            showLoading(true);
            
            // Check dependencies
            if (!PDFLib || !pdfjsLib) {
                throw new Error('The necessary libraries are not loaded correctly');
            }

            // Read the PDF file
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();
            
            if (pages.length === 0) {
                throw new Error('The PDF contains no pages');
            }

            // Format the date for better readability
            const [year, month, day] = date.split('-');
            const formattedDate = `${day}/${month}/${year}`;
            
            // Create the watermark with multiple layers and effects
            const watermarkText = `Valid for ${purpose} ${formattedDate}`;
            
            // Apply watermark to each page
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const { width, height } = page.getSize();
                
                // Calculate sizes based on page dimensions
                const mainSize = Math.min(width, height) / 35;
                
                // Horizontal watermark pattern
                const stepY = mainSize * 10; // Vertical spacing between lines
                
                // Layer 1: Main horizontal watermark pattern
                for (let y = 0; y < height; y += stepY) {
                    // First line
                    page.drawText(watermarkText, {
                        x: 20,
                        y: y,
                        size: mainSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                    
                    // Second line (offset)
                    page.drawText(watermarkText, {
                        x: width / 2,
                        y: y + mainSize * 2,
                        size: mainSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                }

                // Layer 2: Inverted watermark (to make removal difficult)
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

                // Layer 3: Center watermark
                const centerText = `Valid for ${purpose} ${formattedDate}`;
                page.drawText(centerText, {
                    x: width / 2 - 100,
                    y: height / 2,
                    size: mainSize * 1.5,
                    color: PDFLib.rgb(0.5, 0.5, 0.5),
                    opacity: 0.4
                });

                // Layer 4: Borders with purpose
                const borderText = `Valid for ${purpose} ${formattedDate}`;
                const borderSize = Math.min(width, height) / 40;
                const borderStep = borderSize * 10;
                
                // Top border
                for (let x = 0; x < width; x += borderStep) {
                    page.drawText(borderText, {
                        x: x,
                        y: height - 20,
                        size: borderSize,
                        color: PDFLib.rgb(0.5, 0.5, 0.5),
                        opacity: 0.4
                    });
                }
                
                // Bottom border
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

            // Save the modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            
            // Create a blob and URL for download
            const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            // Update the download link
            const downloadLink = document.getElementById('downloadLink');
            downloadLink.href = url;
            downloadLink.classList.remove('hidden');
            
            showLoading(false);
            return true;
        } catch (error) {
            console.error('Error applying watermark:', error);
            showLoading(false);
            alert('Error applying watermark: ' + error.message);
            return false;
        }
    }

    // Function to clear the form
    function clearForm() {
        pdfInput.value = '';
        documentPurpose.value = '';
        
        // Set the current date as the default value
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
        // Restore the state of the apply watermark button
        applyWatermark.disabled = false;
        applyWatermark.textContent = 'Apply Watermark';
        applyWatermark.classList.remove('opacity-50');
    }

    // Function to validate form data
    function validateForm() {
        if (!documentPurpose.value || !watermarkDate.value || !pdfInput.files[0]) {
            alert("You must fill in all fields and select a PDF file.");
            return false;
        }
        if (documentPurpose.value.length > 50) {
            alert("The purpose cannot exceed 50 characters.");
            return false;
        }
        
        // Convert the selected date to local format (yyyy-mm-dd)
        const selectedDateStr = watermarkDate.value;
        const selectedDate = new Date(selectedDateStr + 'T00:00:00');
        
        // Get current date without hours, minutes, or seconds
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Adjust for timezone for date comparison
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const todayAdjusted = new Date(today.getTime() - timezoneOffset);
        const selectedDateAdjusted = new Date(selectedDate.getTime() - timezoneOffset);
        
        // Convert to yyyy-mm-dd format for comparison
        const todayStr = todayAdjusted.toISOString().split('T')[0];
        const selectedDateAdjustedStr = selectedDateAdjusted.toISOString().split('T')[0];
        
        if (selectedDateAdjustedStr < todayStr) {
            alert("The selected date cannot be earlier than the current date.");
            return false;
        }
        return true;
    }

    // UI Events
    applyWatermark.addEventListener('click', async function() {
        if (!validateForm()) return;
        try {
            await addWatermarkToPdf(pdfInput.files[0], watermarkDate.value, documentPurpose.value);
        } catch (error) {
            console.error('Error applying watermark:', error);
            alert('Error applying watermark: ' + error.message);
            applyWatermark.disabled = false;
            applyWatermark.textContent = 'Apply Watermark';
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

    // Drag and drop events
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
                alert('Please select a valid PDF file.');
            }
        }
    });

    // Event for the file input
    pdfInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            showPdfPreview(file);
        }
    });

    // Date validation
    watermarkDate.addEventListener('change', function() {
        // Convert the selected date to local format (yyyy-mm-dd)
        const selectedDateStr = this.value;
        const selectedDate = new Date(selectedDateStr + 'T00:00:00');
        
        // Get current date without hours, minutes, or seconds
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Adjust for timezone for date comparison
        const timezoneOffset = today.getTimezoneOffset() * 60000;
        const todayAdjusted = new Date(today.getTime() - timezoneOffset);
        const selectedDateAdjusted = new Date(selectedDate.getTime() - timezoneOffset);
        
        // Convertir a formato yyyy-mm-dd para comparación
        const todayStr = todayAdjusted.toISOString().split('T')[0];
        const selectedDateAdjustedStr = selectedDateAdjusted.toISOString().split('T')[0];
        
        if (selectedDateAdjustedStr < todayStr) {
            alert('The selected date cannot be earlier than the current date.');
            this.value = '';
        }
    });

    // Clear form on startup
    clearForm();
}
