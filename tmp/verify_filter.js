const mongoose = require('mongoose');

async function verifyFilter() {
    const dbUri = 'mongodb+srv://demo_dev:eZGax8m7gkdZ6Tf9@cluster0.mm7io1m.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0';
    
    try {
        await mongoose.connect(dbUri);
        console.log('Connected to MongoDB');

        // Simulate Landlord 2 (chu_nha2@example.com)
        const landlordId = '697c19245f8f9c0422faa5d6';
        
        const query = {
            nguoiQuanLy: new mongoose.Types.ObjectId(landlordId),
            role: { $nin: ['admin', 'chuNha'] }
        };

        console.log('Query:', JSON.stringify(query, null, 2));

        const users = await mongoose.connection.collection('nguoidungs').find(query).toArray();
        
        console.log(`Found ${users.length} users for landlord ${landlordId}`);
        
        users.forEach(u => {
            console.log(`- ${u.ten} (${u.email}) - Role: ${u.role} - ManagedBy: ${u.nguoiQuanLy}`);
        });

        // Verification checks
        const hasAdmin = users.some(u => u.role === 'admin');
        const hasOtherLandlord = users.some(u => u.role === 'chuNha');
        const allManaged = users.every(u => u.nguoiQuanLy.toString() === landlordId);

        console.log('\nVerification Results:');
        console.log('Contains Admins:', hasAdmin ? '❌ FAILED' : '✅ PASSED');
        console.log('Contains Other Landlords:', hasOtherLandlord ? '❌ FAILED' : '✅ PASSED');
        console.log('All Users Managed by this Landlord:', allManaged ? '✅ PASSED' : '❌ FAILED');

        if (!hasAdmin && !hasOtherLandlord && allManaged) {
            console.log('\nOVERALL STATUS: ✅ ALL TESTS PASSED');
        } else {
            console.log('\nOVERALL STATUS: ❌ SOME TESTS FAILED');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyFilter();
