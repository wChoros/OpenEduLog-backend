import express, { Request, Response } from 'express';

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Simple route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
