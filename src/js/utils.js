/**
 * Shared frontend utilities
 */

(function() {
    'use strict';

    /**
     * Read image dimensions from a File object
     * @param {File} file - Image file
     * @returns {Promise<{width:number, height:number}>}
     */
    function getImageDimensions(file) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);

            image.onload = () => {
                const width = image.naturalWidth;
                const height = image.naturalHeight;
                URL.revokeObjectURL(objectUrl);
                resolve({ width, height });
            };

            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Invalid image file'));
            };

            image.src = objectUrl;
        });
    }

    /**
     * Resize an image file to exact target dimensions
     * @param {File} file - Source image file
     * @param {number} targetWidth - Width in pixels
     * @param {number} targetHeight - Height in pixels
     * @param {string} outputType - Output MIME type
     * @returns {Promise<File>} - Resized image file
     */
    function resizeImageToDimensions(file, targetWidth, targetHeight, outputType) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            const objectUrl = URL.createObjectURL(file);

            image.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        URL.revokeObjectURL(objectUrl);
                        reject(new Error('Unable to process image.'));
                        return;
                    }

                    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

                    canvas.toBlob((blob) => {
                        URL.revokeObjectURL(objectUrl);

                        if (!blob) {
                            reject(new Error('Unable to convert resized image.'));
                            return;
                        }

                        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                        const resizedFile = new File([blob], `${nameWithoutExt}.png`, {
                            type: outputType,
                            lastModified: Date.now()
                        });

                        resolve(resizedFile);
                    }, outputType);
                } catch (error) {
                    URL.revokeObjectURL(objectUrl);
                    reject(error);
                }
            };

            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error('Invalid image file'));
            };

            image.src = objectUrl;
        });
    }

    window.ImageUtils = {
        getImageDimensions,
        resizeImageToDimensions
    };
})();
