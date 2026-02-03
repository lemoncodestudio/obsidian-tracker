import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import ticketsRouter from './routes/tickets'
import todosRouter from './routes/todos'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
// Tags and projects routes are in the tickets router under /meta/*
app.use('/api/tickets', ticketsRouter)
app.use('/api/todos', todosRouter)

// Map /api/tags and /api/projects to the tickets router meta routes
app.use('/api/tags', (req, res, next) => {
  req.url = '/meta/tags' + (req.url === '/' ? '' : req.url)
  ticketsRouter(req, res, next)
})
app.use('/api/projects', (req, res, next) => {
  req.url = '/meta/projects' + (req.url === '/' ? '' : req.url)
  ticketsRouter(req, res, next)
})

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
