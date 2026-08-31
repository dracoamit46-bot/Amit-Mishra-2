export default async () => {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      app: 'HostelOps',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
