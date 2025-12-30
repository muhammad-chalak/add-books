// FILE: assets/js/pdf-helper.js
/**
 * Uses PDF.js to render the first page of a PDF file
 * Returns a dataURL (image/webp)
 */

async function generateCoverFromPDF(file) {
    if (!file || file.type !== 'application/pdf') {
        return null;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1); // First page

        const viewport = page.getViewport({ scale: 1.5 }); // Good quality for thumbnail
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Export compressed image
        return canvas.toDataURL('image/webp', 0.8);
    } catch (e) {
        console.error("Cover generation failed:", e);
        // Fallback: Generate a text-based image on canvas
        return createFallbackCover(file.name);
    }
}

function createFallbackCover(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 450;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = "#1e4d2b";
    ctx.fillRect(0, 0, 300, 450);
    
    // Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("کتێب", 150, 200);
    
    return canvas.toDataURL('image/webp');
}
