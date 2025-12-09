async function testAPI() {
  const fetch = (await import('node-fetch')).default;
  try {
    console.log('🔍 Testing Dashboard API...\n');

    // First, let's login to get a token
    console.log('1. Testing Login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'blacksleeky84@gmail.com',
        password: 'PraiseAdmin2024!'
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginResponse.status, await loginResponse.text());
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('Token received:', loginData.token ? 'Yes' : 'No');

    // Now test the dashboard stats API
    console.log('\n2. Testing Dashboard Stats API...');
    const statsResponse = await fetch('http://localhost:3000/api/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
      }
    });

    if (!statsResponse.ok) {
      console.error('❌ Stats API failed:', statsResponse.status);
      const errorText = await statsResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const statsData = await statsResponse.json();
    console.log('✅ Stats API successful');
    console.log('\n📊 Dashboard Stats:');
    console.log('Total Users:', statsData.stats.totalUsers);
    console.log('Total Doctors:', statsData.stats.totalDoctors);
    console.log('Total Patients:', statsData.stats.totalPatients);
    console.log('Active Subscriptions:', statsData.stats.activeSubscriptions);
    console.log('Total Revenue:', statsData.stats.totalRevenue);
    console.log('Monthly Revenue:', statsData.stats.monthlyRevenue);
    console.log('Total Appointments:', statsData.stats.totalAppointments);
    console.log('Pending Appointments:', statsData.stats.pendingAppointments);

    console.log('\n📈 Growth Percentages:');
    console.log('User Growth:', statsData.stats.userGrowthPercentage + '%');
    console.log('Revenue Growth:', statsData.stats.revenueGrowthPercentage + '%');
    console.log('Appointment Growth:', statsData.stats.appointmentGrowthPercentage + '%');
    console.log('Subscription Growth:', statsData.stats.subscriptionGrowthPercentage + '%');

    console.log('\n📅 Today\'s Stats:');
    console.log('Today Appointments:', statsData.stats.todayAppointments);
    console.log('Today Revenue:', statsData.stats.todayRevenue);
    console.log('Completed Appointments:', statsData.stats.completedAppointments);

    console.log('\n📊 Chart Data:');
    console.log('User Growth Data:', statsData.userGrowthData);
    console.log('Revenue Data:', statsData.revenueData);
    console.log('Subscription Data:', statsData.subscriptionData);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Wait a moment for the server to start, then test
setTimeout(testAPI, 3000);
