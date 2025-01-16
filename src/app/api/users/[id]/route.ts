export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  return new Response(JSON.stringify({ userId: id, name: `User ${id}` }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
