export default function TestPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>✅ Admin Dashboard is Running!</h1>
      <p>If you can see this page, the Next.js app is working correctly.</p>
      <p>Timestamp: {new Date().toISOString()}</p>
      <p>Environment: {process.env.NODE_ENV || 'development'}</p>
    </div>
  );
}
