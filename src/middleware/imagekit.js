const { ImageKit } = require("@imagekit/nodejs");

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

exports.uploadFile = async (buffer, fileName) => {
    try {
        console.log('Uploading file to ImageKit:', {
            fileName,
            bufferExists: !!buffer,
            isBuffer: Buffer.isBuffer(buffer)
        });

        if (!buffer) {
            throw new Error('Upload failed: Buffer is missing');
        }

        const result = await imagekit.files.upload({
            file: buffer.toString('base64'),
            fileName: fileName || `file_${Date.now()}`
        });
        return result;
    } catch (error) {
        console.error('ImageKit SDK Error Details:', error);
        throw error;
    }
};

exports.deleteFile = async (fileId) => {
    try {
        await imagekit.files.delete(fileId);
    } catch (error) {
        console.error("Error deleting file from ImageKit:", error);
        throw error;
    }
};