const axios = require('axios');

const BASE_URL = 'http://172.20.10.11:8000/api';

async function debugImageSize() {
    try {
        console.log('🔍 Debugging Image Size...\n');

        // Test with the large image from our test script
        let largeImageBase64 = 'data:image/jpeg;base64,';
        const jpegHeader = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        // Repeat the header to create a larger image
        for (let i = 0; i < 200; i++) {
            largeImageBase64 += jpegHeader;
        }

        console.log('Large image base64 length:', largeImageBase64.length);
        console.log('Large image base64 size:', Math.round(largeImageBase64.length / 1024), 'KB');
        
        // Decode to check actual image size
        const base64Data = largeImageBase64.replace('data:image/jpeg;base64,', '');
        const decodedImage = Buffer.from(base64Data, 'base64');
        console.log('Decoded image size:', decodedImage.length, 'bytes');
        console.log('Decoded image size:', Math.round(decodedImage.length / 1024), 'KB');
        console.log('Would pass 1KB validation:', decodedImage.length > 1000);

        // Test with a small image
        const smallImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A';
        
        console.log('\nSmall image base64 length:', smallImageBase64.length);
        const smallBase64Data = smallImageBase64.replace('data:image/jpeg;base64,', '');
        const smallDecodedImage = Buffer.from(smallBase64Data, 'base64');
        console.log('Small decoded image size:', smallDecodedImage.length, 'bytes');
        console.log('Would pass 1KB validation:', smallDecodedImage.length > 1000);

    } catch (error) {
        console.error('❌ Debug failed:', error.message);
    }
}

debugImageSize(); 