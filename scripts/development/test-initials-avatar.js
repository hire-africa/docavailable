const axios = require('axios');

const BASE_URL = 'https://docavailable-1.onrender.com/api';

async function testInitialsAvatar() {
    console.log('🎨 Testing Initials Avatar Functionality\n');
    
    // Test names to demonstrate different colors
    const testNames = [
        'Dr. Michael Brown',
        'Dr. Sarah Johnson', 
        'Dr. John Smith',
        'Kali Mtosa',
        'Dr. Emily Davis',
        'Dr. Robert Wilson',
        'Dr. Lisa Anderson',
        'Dr. David Martinez'
    ];
    
    console.log('1️⃣ Testing name to initials conversion...');
    testNames.forEach(name => {
        const initials = getInitials(name);
        const color = getColorFromName(name);
        console.log(`   ${name} → ${initials} (${color})`);
    });
    
    console.log('\n2️⃣ Testing color consistency...');
    // Test that the same name always gets the same color
    const testName = 'Dr. Michael Brown';
    const color1 = getColorFromName(testName);
    const color2 = getColorFromName(testName);
    console.log(`   First call: ${color1}`);
    console.log(`   Second call: ${color2}`);
    console.log(`   Consistent: ${color1 === color2 ? '✅ Yes' : '❌ No'}`);
    
    console.log('\n3️⃣ Testing initials generation...');
    const edgeCases = [
        'John',
        'Mary Jane Watson',
        'Dr. A. B. Smith',
        '',
        null,
        'Dr. Jean-Pierre Dubois'
    ];
    
    edgeCases.forEach(name => {
        const initials = getInitials(name || '');
        console.log(`   "${name || 'null'}" → "${initials}"`);
    });
}

// Helper functions (copied from InitialsAvatar component)
function getInitials(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return '?';
    }
    
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
        return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return '#34A853'; // Default green
    }
    
    const colors = [
        '#34A853', // Green
        '#4285F4', // Blue
        '#EA4335', // Red
        '#FBBC04', // Yellow
        '#FF6D01', // Orange
        '#9C27B0', // Purple
        '#00BCD4', // Cyan
        '#FF5722', // Deep Orange
        '#4CAF50', // Light Green
        '#2196F3', // Light Blue
        '#F44336', // Light Red
        '#FF9800', // Light Orange
        '#673AB7', // Deep Purple
        '#009688', // Teal
        '#795548', // Brown
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
        hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
}

testInitialsAvatar();
